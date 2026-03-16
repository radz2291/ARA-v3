/**
 * Session Routes
 * ==============
 * Endpoints for managing user sessions and API configurations
 */

import { RequestHandler } from "express";
import { storage, APIConfig, Session } from "../storage";

/**
 * POST /api/sessions
 * Create a new session or retrieve existing one
 */
export const handleCreateSession: RequestHandler = (req, res) => {
  try {
    const { sessionId } = req.body;

    let session: Session;
    if (sessionId) {
      // Try to get existing session
      const existing = storage.sessions.get(sessionId);
      if (existing) {
        session = existing;
      } else {
        // Session doesn't exist, create new one
        session = storage.sessions.create();
      }
    } else {
      // Create new session
      session = storage.sessions.create();
    }

    return res.json({
      id: session.id,
      createdAt: session.createdAt,
      hasConfig: !!session.config,
    });
  } catch (error) {
    console.error("Error creating session:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create session";
    return res.status(500).json({ message });
  }
};

/**
 * GET /api/sessions/:sessionId
 * Get session info
 */
export const handleGetSession: RequestHandler = (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = storage.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    return res.json({
      id: session.id,
      createdAt: session.createdAt,
      config: session.config
        ? { model: session.config.model, apiUrl: session.config.apiUrl }
        : undefined,
    });
  } catch (error) {
    console.error("Error getting session:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get session";
    return res.status(500).json({ message });
  }
};

/**
 * POST /api/sessions/:sessionId/config
 * Save or update API configuration for a session
 */
export const handleSaveConfig: RequestHandler = (req, res) => {
  try {
    const { sessionId } = req.params;
    const { apiKey, apiUrl, model } = req.body as APIConfig;

    // Validate required fields
    if (!apiKey) {
      return res.status(400).json({ message: "API key is required" });
    }

    if (!model) {
      return res.status(400).json({ message: "Model is required" });
    }

    // Ensure session exists
    let session = storage.sessions.get(sessionId);
    if (!session) {
      session = storage.sessions.create();
    }

    // Save configuration
    const config: APIConfig = {
      apiKey,
      apiUrl: apiUrl || undefined,
      model,
    };

    const updatedSession = storage.sessions.setConfig(sessionId, config);

    return res.json({
      id: updatedSession.id,
      createdAt: updatedSession.createdAt,
      configSaved: true,
    });
  } catch (error) {
    console.error("Error saving config:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save config";
    return res.status(500).json({ message });
  }
};

/**
 * GET /api/sessions/:sessionId/config
 * Get API configuration for a session (without exposing the API key)
 */
export const handleGetConfig: RequestHandler = (req, res) => {
  try {
    const { sessionId } = req.params;

    const config = storage.sessions.getConfig(sessionId);
    if (!config) {
      return res.status(404).json({ message: "Configuration not found" });
    }

    // Never expose the API key to the client
    return res.json({
      apiUrl: config.apiUrl || undefined,
      model: config.model,
      configured: true,
    });
  } catch (error) {
    console.error("Error getting config:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get config";
    return res.status(500).json({ message });
  }
};

/**
 * DELETE /api/sessions/:sessionId
 * Delete a session and all its conversations
 */
export const handleDeleteSession: RequestHandler = (req, res) => {
  try {
    const { sessionId } = req.params;

    // Delete all conversations for this session
    const conversations = storage.conversations.listBySession(sessionId);
    conversations.forEach((conv) => {
      storage.conversations.delete(conv.id);
    });

    // Delete session
    const deleted = storage.sessions.delete(sessionId);

    if (!deleted) {
      return res.status(404).json({ message: "Session not found" });
    }

    return res.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete session";
    return res.status(500).json({ message });
  }
};
