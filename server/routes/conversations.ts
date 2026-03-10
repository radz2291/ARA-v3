/**
 * Conversation Routes
 * ===================
 * Endpoints for managing conversations and messages within sessions
 */

import { RequestHandler } from "express";
import { storage } from "../storage";

/**
 * POST /api/sessions/:sessionId/conversations
 * Create a new conversation
 */
export const handleCreateConversation: RequestHandler = (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, agentId } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    // Verify session exists
    const session = storage.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Create conversation with optional agentId
    const conversation = storage.conversations.create(sessionId, title, agentId);

    return res.json({
      id: conversation.id,
      sessionId: conversation.sessionId,
      agentId: conversation.agentId,
      title: conversation.title,
      createdAt: conversation.createdAt,
      messages: [],
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create conversation";
    return res.status(500).json({ message });
  }
};

/**
 * GET /api/sessions/:sessionId/conversations
 * List all conversations for a session
 */
export const handleListConversations: RequestHandler = (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists
    const session = storage.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Get conversations
    const conversations = storage.conversations.listBySession(sessionId);

    return res.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        agentId: c.agentId,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c.messages.length,
      })),
    });
  } catch (error) {
    console.error("Error listing conversations:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to list conversations";
    return res.status(500).json({ message });
  }
};

/**
 * GET /api/sessions/:sessionId/conversations/:conversationId
 * Get a specific conversation with all its messages
 */
export const handleGetConversation: RequestHandler = (req, res) => {
  try {
    const { sessionId, conversationId } = req.params;

    // Verify session exists
    const session = storage.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Get conversation
    const conversation = storage.conversations.get(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Verify conversation belongs to session
    if (conversation.sessionId !== sessionId) {
      return res.status(403).json({ message: "Conversation not in session" });
    }

    return res.json({
      id: conversation.id,
      sessionId: conversation.sessionId,
      agentId: conversation.agentId,
      title: conversation.title,
      messages: conversation.messages,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    });
  } catch (error) {
    console.error("Error getting conversation:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get conversation";
    return res.status(500).json({ message });
  }
};

/**
 * POST /api/sessions/:sessionId/conversations/:conversationId/messages
 * Add a message to a conversation
 */
export const handleAddMessage: RequestHandler = (req, res) => {
  try {
    const { sessionId, conversationId } = req.params;
    const { role, content } = req.body;

    // Validate required fields
    if (!role || !content) {
      return res.status(400).json({ message: "Role and content are required" });
    }

    if (role !== "user" && role !== "assistant") {
      return res.status(400).json({ message: "Role must be 'user' or 'assistant'" });
    }

    // Verify session exists
    const session = storage.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Get conversation
    const conversation = storage.conversations.get(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Verify conversation belongs to session
    if (conversation.sessionId !== sessionId) {
      return res.status(403).json({ message: "Conversation not in session" });
    }

    // Add message
    const message = storage.conversations.addMessage(conversationId, role, content);

    return res.json({
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    });
  } catch (error) {
    console.error("Error adding message:", error);
    const message =
      error instanceof Error ? error.message : "Failed to add message";
    return res.status(500).json({ message });
  }
};

/**
 * PATCH /api/sessions/:sessionId/conversations/:conversationId
 * Update conversation (e.g., title)
 */
export const handleUpdateConversation: RequestHandler = (req, res) => {
  try {
    const { sessionId, conversationId } = req.params;
    const { title } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    // Verify session exists
    const session = storage.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Get conversation
    const conversation = storage.conversations.get(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Verify conversation belongs to session
    if (conversation.sessionId !== sessionId) {
      return res.status(403).json({ message: "Conversation not in session" });
    }

    // Update title
    const updated = storage.conversations.updateTitle(conversationId, title);

    return res.json({
      id: updated.id,
      title: updated.title,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error("Error updating conversation:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update conversation";
    return res.status(500).json({ message });
  }
};

/**
 * DELETE /api/sessions/:sessionId/conversations/:conversationId
 * Delete a conversation
 */
export const handleDeleteConversation: RequestHandler = (req, res) => {
  try {
    const { sessionId, conversationId } = req.params;

    // Verify session exists
    const session = storage.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Get conversation
    const conversation = storage.conversations.get(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Verify conversation belongs to session
    if (conversation.sessionId !== sessionId) {
      return res.status(403).json({ message: "Conversation not in session" });
    }

    // Delete conversation
    const deleted = storage.conversations.delete(conversationId);

    if (!deleted) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    return res.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete conversation";
    return res.status(500).json({ message });
  }
};
