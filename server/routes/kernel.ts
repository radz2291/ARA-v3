/**
 * Kernel Data Routes
 * ==================
 * Aggregated data endpoints for Kernel synchronization
 */

import { RequestHandler } from "express";
import { storage } from "../storage";

// Type for items returned by the kernel list endpoint
export type KernelDataItemType =
  | "conversation"
  | "agent"
  | "session"
  | "artifact";

// Lightweight metadata for kernel list endpoint
export interface KernelListItem {
  id: string;
  name: string;
  type: KernelDataItemType;
  subtype?: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number; // For conversations: message count, for artifacts: version count, for agents: tool count
  agentId?: string; // For filtering by agent
}

interface KernelListResponse {
  items: KernelListItem[];
  counts: {
    conversations: number;
    agents: number;
    sessions: number;
    artifacts: number;
  };
}

/**
 * GET /api/kernel/list
 * Returns lightweight metadata only for all kernel items
 * No content, messages, or full data - just for display in the grid
 *
 * Query params:
 * - type: Filter by item type (conversation, agent, session, artifact)
 * - search: Search in name field
 * - agentId: Filter by agentId (for artifacts/sessions)
 */
export const handleGetKernelList: RequestHandler = (req, res) => {
  try {
    const { type, search, agentId } = req.query;

    // Fetch metadata only from storage (lightweight list)
    const sessions = storage.sessions.listMetadata();
    const agents = storage.agents.listMetadata();
    const conversations = storage.conversations.listMetadata();
    const artifacts = storage.artifacts.listMetadata();

    // Build a map of session ID to agent ID from conversations
    const sessionToAgentMap = new Map<string, string>();
    conversations.forEach((conv) => {
      if (
        conv.sessionId &&
        conv.agentId &&
        !sessionToAgentMap.has(conv.sessionId)
      ) {
        sessionToAgentMap.set(conv.sessionId, conv.agentId);
      }
    });

    // Resolve session agentId from conversations and derive name from latest conversation
    const resolvedSessions = sessions.map((session) => {
      const agentIdFromConv = sessionToAgentMap.get(session.id);
      // Get conversations for this session
      const sessionConvs = conversations.filter(
        (c) => c.sessionId === session.id,
      );
      const latestConv = sessionConvs.length > 0 ? sessionConvs[0] : null;

      return {
        ...session,
        name: session.name || "session",
        agentId: agentIdFromConv,
      };
    });

    // Combine all items
    let items: KernelListItem[] = [
      ...resolvedSessions,
      ...agents,
      ...conversations,
      ...artifacts,
    ];

    // Apply filters
    if (type) {
      items = items.filter((item) => item.type === type);
    }

    if (search) {
      const searchLower = String(search).toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(searchLower),
      );
    }

    if (agentId) {
      // Filter by agentId field
      items = items.filter((item) => item.agentId === agentId);
    }

    const response: KernelListResponse = {
      items,
      counts: {
        conversations: conversations.length,
        agents: agents.length,
        sessions: sessions.length,
        artifacts: artifacts.length,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting kernel list:", error);
    res.status(500).json({ error: "Failed to get kernel list" });
  }
};
