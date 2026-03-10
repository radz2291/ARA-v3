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
    const { name, description, persona, systemInstructions, toolIds } = req.body;

    if (!name || !description || !persona || !systemInstructions) {
      return res.status(400).json({
        error: "Missing required fields: name, description, persona, systemInstructions",
      });
    }

    const agent = storage.agents.create(
      name,
      description,
      persona,
      systemInstructions,
      toolIds || []
    );

    // Assign tools to agent
    if (toolIds && toolIds.length > 0) {
      for (const toolId of toolIds) {
        try {
          storage.tools.assignToAgent(toolId, agent.id);
        } catch (error) {
          console.warn(`Failed to assign tool ${toolId} to agent:`, error);
        }
      }
    }

    res.status(201).json(agent);
  } catch (error) {
    console.error("Error creating agent:", error);
    res.status(500).json({ error: "Failed to create agent" });
  }
};

export const handleUpdateAgent: RequestHandler = (req, res) => {
  try {
    const { agentId } = req.params;
    const { toolIds, ...otherUpdates } = req.body;

    const agent = storage.agents.get(agentId);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Handle tool assignments if provided
    if (Array.isArray(toolIds)) {
      // Remove tools that are no longer assigned
      const oldToolIds = agent.toolIds || [];
      const toolsToRemove = oldToolIds.filter((id) => !toolIds.includes(id));
      for (const toolId of toolsToRemove) {
        try {
          storage.tools.removeFromAgent(toolId, agentId);
        } catch (error) {
          console.warn(`Failed to remove tool ${toolId} from agent:`, error);
        }
      }

      // Add new tools
      const toolsToAdd = toolIds.filter((id) => !oldToolIds.includes(id));
      for (const toolId of toolsToAdd) {
        try {
          storage.tools.assignToAgent(toolId, agentId);
        } catch (error) {
          console.warn(`Failed to assign tool ${toolId} to agent:`, error);
        }
      }

      // Include toolIds in updates
      otherUpdates.toolIds = toolIds;
    }

    const updatedAgent = storage.agents.update(agentId, otherUpdates);
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

    // Unassign all tools from this agent
    if (agent.toolIds && agent.toolIds.length > 0) {
      for (const toolId of agent.toolIds) {
        try {
          storage.tools.removeFromAgent(toolId, agentId);
        } catch (error) {
          console.warn(`Failed to remove tool ${toolId} from agent:`, error);
        }
      }
    }

    storage.agents.delete(agentId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting agent:", error);
    res.status(500).json({ error: "Failed to delete agent" });
  }
};
