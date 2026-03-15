/**
 * Kernel Data Routes
 * ==================
 * Aggregated data endpoints for Kernel synchronization
 */

import { RequestHandler } from "express";
import { storage } from "../storage";

// Type for items returned by the kernel data endpoint
export type KernelDataItemType =
  | "conversation"
  | "agent"
  | "session"
  | "artifact";

export interface KernelDataItem<T = unknown> {
  type: KernelDataItemType;
  data: T;
}

interface KernelDataResponse {
  items: KernelDataItem[];
  counts: {
    conversations: number;
    agents: number;
    sessions: number;
    artifacts: number;
  };
}

// Lightweight metadata for kernel list endpoint
export interface KernelListItem {
  id: string;
  name: string;
  type: KernelDataItemType;
  subtype?: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number; // For conversations: message count, for artifacts: version count, for agents: tool count
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
 */
export const handleGetKernelList: RequestHandler = (_req, res) => {
  try {
    // Fetch metadata only from storage (lightweight list)
    const sessions = storage.sessions.listMetadata();
    const agents = storage.agents.listMetadata();
    const conversations = storage.conversations.listMetadata();
    const artifacts = storage.artifacts.listMetadata();

    // Combine all items
    const items: KernelListItem[] = [
      ...sessions,
      ...agents,
      ...conversations,
      ...artifacts,
    ];

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

/**
 * GET /api/kernel/data
 * Returns all storage data with type information for Kernel synchronization
 */
export const handleGetKernelData: RequestHandler = (_req, res) => {
  try {
    // Fetch all data from storage
    const sessions = storage.sessions.list();
    const agents = storage.agents.list();
    const conversations = storage.conversations.list();
    const artifacts = storage.artifacts.list();

    // Build response with typed items
    const items: KernelDataItem[] = [];

    // Add sessions
    for (const session of sessions) {
      items.push({
        type: "session",
        data: session,
      });
    }

    // Add agents
    for (const agent of agents) {
      items.push({
        type: "agent",
        data: agent,
      });
    }

    // Add conversations
    for (const conversation of conversations) {
      items.push({
        type: "conversation",
        data: conversation,
      });
    }

    // Add artifacts
    for (const artifact of artifacts) {
      items.push({
        type: "artifact",
        data: artifact,
      });
    }

    const response: KernelDataResponse = {
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
    console.error("Error getting kernel data:", error);
    res.status(500).json({ error: "Failed to get kernel data" });
  }
};
