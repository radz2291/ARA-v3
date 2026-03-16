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
 * - limit: Max items to return (for pagination)
 * - before: Cursor timestamp for pagination (items before this date)
 */
export const handleGetKernelList: RequestHandler = (req, res) => {
  try {
    const { type, search, agentId, limit, before } = req.query;

    // Parse pagination options
    const limitNum = limit ? parseInt(String(limit), 10) : undefined;
    const cursor = before ? String(before) : undefined;

    // Fetch full session data to access config.model
    const sessions = storage.sessions.list();
    const agents = storage.agents.listMetadata({ limit: limitNum, cursor });
    const conversations = storage.conversations.listMetadata({
      limit: limitNum,
      cursor,
    });
    const artifacts = storage.artifacts.listMetadata({
      limit: limitNum,
      cursor,
    });

    // Resolve session agentId from first conversation and use config.model for name
    const resolvedSessions: KernelListItem[] = sessions.map((session) => {
      // Find first conversation for this session to get agent
      const firstConv = conversations.find(
        (conv) => conv.sessionId === session.id,
      );
      const agentIdFromConv = firstConv?.agentId;

      return {
        id: session.id,
        name: session.config?.model || "session",
        type: "session" as const,
        subtype: agentIdFromConv ? session.config?.model : "Unassigned",
        createdAt: session.createdAt,
        updatedAt: session.createdAt,
        itemCount: 0,
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

    // Apply cursor filter to combined items (for sessions which use list())
    if (cursor) {
      const cursorTime = new Date(cursor).getTime();
      items = items.filter(
        (item) => new Date(item.updatedAt).getTime() < cursorTime,
      );
    }

    // Apply limit to combined items
    if (limitNum && limitNum > 0) {
      items = items.slice(0, limitNum);
    }

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
