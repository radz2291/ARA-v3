/**
 * Workspace Routes
 * ================
 * CRUD endpoints for workspace management
 * Workspaces are sandboxed, multi-agent collaboration environments
 */

import { RequestHandler } from "express";
import { storage, Workspace } from "../storage";

// Create workspace
export const createWorkspace: RequestHandler = (req, res) => {
  try {
    const { name, description, agentIds, leadAgentId } = req.body;

    if (!name || !agentIds || !Array.isArray(agentIds)) {
      return res.status(400).json({
        error: "Missing required fields: name, agentIds (array)",
      });
    }

    const workspace = storage.workspaces.create(
      name,
      description || "",
      agentIds,
      leadAgentId
    );

    res.json({ success: true, workspace });
  } catch (error) {
    console.error("Error creating workspace:", error);
    res.status(500).json({ error: "Failed to create workspace" });
  }
};

// Get workspace by ID
export const getWorkspace: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const workspace = storage.workspaces.get(id);

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json(workspace);
  } catch (error) {
    console.error("Error fetching workspace:", error);
    res.status(500).json({ error: "Failed to fetch workspace" });
  }
};

// List all workspaces
export const listWorkspaces: RequestHandler = (req, res) => {
  try {
    const workspaces = storage.workspaces.list();
    res.json({ workspaces });
  } catch (error) {
    console.error("Error listing workspaces:", error);
    res.status(500).json({ error: "Failed to list workspaces" });
  }
};

// Update workspace
export const updateWorkspace: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const workspace = storage.workspaces.update(id, updates);

    res.json({ success: true, workspace });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error updating workspace:", error);
    res.status(500).json({ error: "Failed to update workspace" });
  }
};

// Delete workspace
export const deleteWorkspace: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const deleted = storage.workspaces.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json({ success: true, message: "Workspace deleted" });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    res.status(500).json({ error: "Failed to delete workspace" });
  }
};

// Add file to workspace
export const addWorkspaceFile: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const { filePath, content } = req.body;

    if (!filePath || content === undefined) {
      return res.status(400).json({
        error: "Missing required fields: filePath, content",
      });
    }

    const workspace = storage.workspaces.addFile(id, filePath, content);

    res.json({ success: true, workspace });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error adding file:", error);
    res.status(500).json({ error: "Failed to add file" });
  }
};

// Get file from workspace
export const getWorkspaceFile: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const { filePath } = req.query;

    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ error: "Missing query parameter: filePath" });
    }

    const content = storage.workspaces.getFile(id, filePath);

    if (content === undefined) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({ filePath, content });
  } catch (error) {
    console.error("Error getting file:", error);
    res.status(500).json({ error: "Failed to get file" });
  }
};

// Delete file from workspace
export const deleteWorkspaceFile: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: "Missing required field: filePath" });
    }

    const workspace = storage.workspaces.deleteFile(id, filePath);

    res.json({ success: true, workspace });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
};

// Update workspace execution context
export const updateWorkspaceContext: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const contextUpdates = req.body;

    if (!contextUpdates || typeof contextUpdates !== "object") {
      return res.status(400).json({ error: "Invalid context updates object" });
    }

    const workspace = storage.workspaces.updateContext(id, contextUpdates);

    res.json({ success: true, workspace });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error updating context:", error);
    res.status(500).json({ error: "Failed to update context" });
  }
};
