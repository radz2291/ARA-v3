import { RequestHandler } from "express";
import { storage, Agent } from "../storage";

export const handleListAgents: RequestHandler = (_req, res) => {
  try {
    const agents = storage.agents.list();
    res.json(agents);
  } catch (error) {
    console.error("Error listing agents:", error);
    res.status(500).json({ error: "Failed to list agents" });
  }
};

export const handleGetAgent: RequestHandler = (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = storage.agents.get(agentId);

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    res.json(agent);
  } catch (error) {
    console.error("Error getting agent:", error);
    res.status(500).json({ error: "Failed to get agent" });
  }
};

export const handleCreateAgent: RequestHandler = (req, res) => {
  try {
    const { name, description, persona, systemInstructions } = req.body;

    if (!name || !description || !persona || !systemInstructions) {
      return res.status(400).json({
        error: "Missing required fields: name, description, persona, systemInstructions",
      });
    }

    const agent = storage.agents.create(name, description, persona, systemInstructions);
    res.status(201).json(agent);
  } catch (error) {
    console.error("Error creating agent:", error);
    res.status(500).json({ error: "Failed to create agent" });
  }
};

export const handleUpdateAgent: RequestHandler = (req, res) => {
  try {
    const { agentId } = req.params;
    const updates = req.body;

    const agent = storage.agents.get(agentId);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const updatedAgent = storage.agents.update(agentId, updates);
    res.json(updatedAgent);
  } catch (error) {
    console.error("Error updating agent:", error);
    res.status(500).json({ error: "Failed to update agent" });
  }
};

export const handleDeleteAgent: RequestHandler = (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = storage.agents.get(agentId);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    storage.agents.delete(agentId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting agent:", error);
    res.status(500).json({ error: "Failed to delete agent" });
  }
};
