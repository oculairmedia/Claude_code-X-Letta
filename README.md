# Claude Code ⨯ Letta Integration Configuration

This repository contains the configuration files for integrating Claude Code MCP instances with the Letta MCP server using HTTP transport.

## Overview

This configuration enables Claude Code clients to connect to the Letta MCP server at `http://192.168.50.90:3001/mcp` using the MCP Streamable HTTP protocol (2025-06-18 specification).

## Migration Summary

All configurations have been migrated from SSE (Server-Sent Events) transport to HTTP transport to connect with the new Letta MCP Streamable HTTP implementation.

## Directory Structure

```
├── claude-desktop/                 # Claude Desktop app configurations
│   └── claude_desktop_config.json  # Main Claude Desktop MCP config
├── configs/
│   ├── letta-mcp/                 # Letta MCP client configurations
│   │   ├── root-letta-mcp_config.json          # /root/.letta/mcp_config.json
│   │   ├── claude-code-mcp-config.json         # /opt/stacks/claude-code-mcp/letta-mcp-config.json
│   │   └── opt-letta-mcp_config.json           # /opt/letta/mcp_config.json
│   └── environment/               # Environment variable configs
│       └── environment            # /etc/claude-mcp/environment
└── systemd-services/              # Systemd service configurations
    ├── claude-mcp.service         # /opt/stacks/claude-code-mcp/claude-mcp.service
    ├── claude-mcp-enhanced.service # /opt/stacks/claude-code-mcp/claude-mcp-enhanced.service
    └── claude-mcp-system.service  # /etc/systemd/system/claude-mcp.service
```

## Configuration Changes Made

### 1. Claude Desktop Configuration
- **File**: `claude-desktop/claude_desktop_config.json`
- **Change**: Updated `letta-tools` URL from `/sse` to `/mcp` endpoint
- **Before**: `http://192.168.50.90:3001/sse`
- **After**: `http://192.168.50.90:3001/mcp`

### 2. Letta MCP Client Configurations
All Letta MCP configuration files updated to use HTTP transport:

- **Transport**: Changed from `sse` to `http`
- **URL**: Updated to use `/mcp` endpoint instead of `/sse`
- **Server Name**: Renamed `sse-server` to `letta-server` for clarity

### 3. Environment Configuration
- **File**: `configs/environment/environment`
- **Change**: `MCP_TRANSPORT=sse` → `MCP_TRANSPORT=http`

### 4. Systemd Service Configurations
All service files updated to use HTTP transport:

- **Transport Environment**: `MCP_TRANSPORT=sse` → `MCP_TRANSPORT=http`
- **Executable**: `server-sse.js --sse` → `server.js --http`

## Letta MCP Server Details

- **Endpoint**: `http://192.168.50.90:3001/mcp`
- **Protocol**: MCP Streamable HTTP (2025-06-18)
- **Health Check**: `http://192.168.50.90:3001/health`
- **Available Tools**: 11 Letta management tools (list_agents, create_agent, send_message, etc.)

## Installation/Deployment

To apply these configurations:

1. **Copy Claude Desktop config**:
   ```bash
   cp claude-desktop/claude_desktop_config.json /home/mcp-user/.config/Claude/
   ```

2. **Copy Letta MCP configs**:
   ```bash
   cp configs/letta-mcp/root-letta-mcp_config.json /root/.letta/mcp_config.json
   cp configs/letta-mcp/claude-code-mcp-config.json /opt/stacks/claude-code-mcp/letta-mcp-config.json
   cp configs/letta-mcp/opt-letta-mcp_config.json /opt/letta/mcp_config.json
   ```

3. **Copy and configure environment**:
   ```bash
   cp configs/environment/environment.example /etc/claude-mcp/environment
   # Edit /etc/claude-mcp/environment and add your actual API keys
   ```

4. **Copy systemd services**:
   ```bash
   cp systemd-services/claude-mcp.service /opt/stacks/claude-code-mcp/
   cp systemd-services/claude-mcp-enhanced.service /opt/stacks/claude-code-mcp/
   cp systemd-services/claude-mcp-system.service /etc/systemd/system/claude-mcp.service
   ```

5. **Reload and restart services**:
   ```bash
   systemctl daemon-reload
   systemctl restart claude-mcp
   ```

## Testing

Verify the HTTP endpoint is working:

```bash
# Health check
curl http://192.168.50.90:3001/health

# Test initialization
curl -X POST http://192.168.50.90:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}}'
```

## Security Features

The Letta MCP server includes:
- Origin validation for DNS rebinding protection
- Session management with UUID generation
- Event store for connection recovery
- Localhost binding for security

## Related Repositories

- **Letta MCP Server**: https://github.com/oculairmedia/Letta-MCP-server
- **Claude Code MCP**: https://github.com/steipete/claude-code-mcp

## Changelog

- **2025-06-21**: Initial migration from SSE to HTTP transport
- **2025-06-21**: Configured all claude_code MCP instances to use `http://192.168.50.90:3001/mcp`