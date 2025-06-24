import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { EventStore } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

/**
 * A simple in-memory implementation of the EventStore interface for resumability
 * For production use, consider using a persistent storage solution
 */
export class InMemoryEventStore implements EventStore {
  private events: Map<string, { streamId: string; message: JSONRPCMessage }> = new Map();

  /**
   * Generate a unique event ID for a given stream ID
   */
  private generateEventId(streamId: string): string {
    return `${streamId}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)}`;
  }

  /**
   * Extract stream ID from event ID
   */
  private getStreamIdFromEventId(eventId: string): string {
    const parts = eventId.split('_');
    return parts.length > 0 ? parts[0] : '';
  }

  /**
   * Store an event with a generated event ID
   * Implements EventStore.storeEvent
   */
  async storeEvent(streamId: string, message: JSONRPCMessage): Promise<string> {
    const eventId = this.generateEventId(streamId);
    this.events.set(eventId, { streamId, message });
    return eventId;
  }

  /**
   * Replay events that occurred after a specific event ID
   * Implements EventStore.replayEventsAfter
   */
  async replayEventsAfter(
    lastEventId: string,
    {
      send,
    }: { send: (eventId: string, message: JSONRPCMessage) => Promise<void> }
  ): Promise<string> {
    if (!lastEventId || !this.events.has(lastEventId)) {
      return '';
    }

    // Extract stream ID from event ID
    const streamId = this.getStreamIdFromEventId(lastEventId);
    if (!streamId) {
      return '';
    }

    let foundLastEvent = false;

    // Sort events by eventId (chronological order)
    const sortedEvents = [...this.events.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    for (const [
      eventId,
      { streamId: eventStreamId, message },
    ] of sortedEvents) {
      // Only include events from the same stream
      if (eventStreamId !== streamId) {
        continue;
      }

      // Start sending events after lastEventId
      if (eventId === lastEventId) {
        foundLastEvent = true;
        continue;
      }

      if (foundLastEvent) {
        await send(eventId, message);
      }
    }
    return streamId;
  }
}