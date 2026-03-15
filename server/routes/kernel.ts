/**
 * Kernel Data Routes
 * ==================
 * Aggregated data endpoint for Kernel synchronization
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
