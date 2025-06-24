#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ClaudeCodeServer } from './server.js';
import { InMemoryEventStore } from './in-memory-event-store.js';

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Create Express app
const app = express();

// CORS setup
app.use(cors({
  origin: ['http://localhost', 'http://127.0.0.1', /^http:\/\/192\.168\./, /^http:\/\/10\./, /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Mcp-Session-Id', 'Accept'],
  exposedHeaders: ['Mcp-Session-Id']
}));

// Note: Do not use express.json() middleware for MCP endpoints
// The StreamableHTTPServerTransport needs to handle the raw request body

// Main MCP endpoint
app.post('/mcp', async (req, res) => {
  console.error('[Streamable HTTP] Received MCP request');
  
  try {
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;
    
    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId) {
      // New session - create transport
      const eventStore = new InMemoryEventStore();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore, // Enable resumability
        onsessioninitialized: (sessionId) => {
          // Store the transport by session ID when session is initialized
          console.error(`[Streamable HTTP] Session initialized with ID: ${sessionId}`);
          transports[sessionId] = transport;
        }
      });
      
      // Create a new server instance for this session
      const server = new ClaudeCodeServer();
      await server.connectTransport(transport);
      console.error('[Streamable HTTP] Server connected to transport');
    } else {
      // Session ID provided but not found
      res.status(400).send('Invalid session ID');
      return;
    }
    
    // Handle the request - the transport will parse the body
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('[Streamable HTTP] Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
});

// SSE endpoint for resumability
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  
  console.error('[Streamable HTTP] SSE request for session:', sessionId);
  
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  // Check for Last-Event-ID header for resumability
  const lastEventId = req.headers['last-event-id'] as string | undefined;
  
  try {
    await transports[sessionId].handleRequest(req, res, { lastEventId });
  } catch (error) {
    console.error('[Streamable HTTP] Error handling SSE request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    transport: 'streamable_http',
    protocol_version: '2024-11-05',
    sessions: Object.keys(transports).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Session deletion endpoint
app.delete('/mcp', (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  
  if (sessionId && transports[sessionId]) {
    delete transports[sessionId];
    console.error(`[Streamable HTTP] Session deleted: ${sessionId}`);
    res.json({ success: true, message: 'Session deleted' });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// Start the server
const port = parseInt(process.env.PORT || '3456');
app.listen(port, '0.0.0.0', () => {
  console.error(`[Streamable HTTP] Claude Code MCP server running on port ${port}`);
  console.error(`[Streamable HTTP] MCP endpoint: http://0.0.0.0:${port}/mcp`);
  console.error(`[Streamable HTTP] Health endpoint: http://0.0.0.0:${port}/health`);
  console.error(`[Streamable HTTP] Session management:`);
  console.error(`[Streamable HTTP]   POST   /mcp - Initialize new session or handle request`);
  console.error(`[Streamable HTTP]   GET    /mcp - SSE endpoint for resumability`);
  console.error(`[Streamable HTTP]   DELETE /mcp - Delete session`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.error('[Streamable HTTP] Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.error('[Streamable HTTP] Received SIGINT, shutting down gracefully');
  process.exit(0);
});