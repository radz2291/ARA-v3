/**
 * Tool Routes
 * ===========
 * CRUD endpoints for tool management
 * Tools are capabilities that agents can use to perform actions
 */

import { RequestHandler } from "express";
import { storage, Tool } from "../storage";

// Create tool
export const createTool: RequestHandler = (req, res) => {
  try {
    const {
      name,
      description,
      type,
      inputSchema,
      outputSchema,
      assignedAgentIds,
    } = req.body;

    if (
      !name ||
      !description ||
      !type ||
      !inputSchema ||
      !outputSchema
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: name, description, type, inputSchema, outputSchema",
      });
    }

    const validTypes = ["web_search", "file_ops", "code_exec", "custom"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid tool type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    const tool = storage.tools.create(
      name,
      description,
      type,
      inputSchema,
      outputSchema,
      assignedAgentIds || []
    );

    res.json({ success: true, tool });
  } catch (error) {
    console.error("Error creating tool:", error);
    res.status(500).json({ error: "Failed to create tool" });
  }
};

// Get tool by ID
export const getTool: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const tool = storage.tools.get(id);

    if (!tool) {
      return res.status(404).json({ error: "Tool not found" });
    }

    res.json(tool);
  } catch (error) {
    console.error("Error fetching tool:", error);
    res.status(500).json({ error: "Failed to fetch tool" });
  }
};

// List all tools
export const listTools: RequestHandler = (req, res) => {
  try {
    const tools = storage.tools.list();
    res.json({ tools });
  } catch (error) {
    console.error("Error listing tools:", error);
    res.status(500).json({ error: "Failed to list tools" });
  }
};

// List tools by type
export const listToolsByType: RequestHandler = (req, res) => {
  try {
    const { type } = req.params;

    const validTypes = ["web_search", "file_ops", "code_exec", "custom"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid tool type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    const tools = storage.tools.listByType(type as Tool["type"]);
    res.json({ tools });
  } catch (error) {
    console.error("Error listing tools by type:", error);
    res.status(500).json({ error: "Failed to list tools by type" });
  }
};

// List tools assigned to an agent
export const listToolsByAgent: RequestHandler = (req, res) => {
  try {
    const { agentId } = req.params;
    const tools = storage.tools.listByAgent(agentId);
    res.json({ tools });
  } catch (error) {
    console.error("Error listing agent tools:", error);
    res.status(500).json({ error: "Failed to list agent tools" });
  }
};

// Update tool
export const updateTool: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const tool = storage.tools.update(id, updates);

    res.json({ success: true, tool });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error updating tool:", error);
    res.status(500).json({ error: "Failed to update tool" });
  }
};

// Assign tool to agent
export const assignToolToAgent: RequestHandler = (req, res) => {
  try {
    const { toolId, agentId } = req.body;

    if (!toolId || !agentId) {
      return res.status(400).json({
        error: "Missing required fields: toolId, agentId",
      });
    }

    const tool = storage.tools.assignToAgent(toolId, agentId);

    res.json({ success: true, tool });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error assigning tool:", error);
    res.status(500).json({ error: "Failed to assign tool" });
  }
};

// Remove tool from agent
export const removeToolFromAgent: RequestHandler = (req, res) => {
  try {
    const { toolId, agentId } = req.body;

    if (!toolId || !agentId) {
      return res.status(400).json({
        error: "Missing required fields: toolId, agentId",
      });
    }

    const tool = storage.tools.removeFromAgent(toolId, agentId);

    res.json({ success: true, tool });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error removing tool:", error);
    res.status(500).json({ error: "Failed to remove tool" });
  }
};

// Delete tool
export const deleteTool: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const deleted = storage.tools.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Tool not found" });
    }

    res.json({ success: true, message: "Tool deleted" });
  } catch (error) {
    console.error("Error deleting tool:", error);
    res.status(500).json({ error: "Failed to delete tool" });
  }
};
