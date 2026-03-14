import { RequestHandler } from "express";
import { storage } from "../storage";

// GET /api/artifacts
export const handleListArtifacts: RequestHandler = (req, res) => {
  const { type, subtype, agentId, search } = req.query as Record<
    string,
    string
  >;
  const artifacts = storage.artifacts.list({
    type: type as any,
    subtype,
    agentId,
    search,
  });
  res.json(artifacts);
};

// POST /api/artifacts
export const handleCreateArtifact: RequestHandler = (req, res) => {
  const { name, type, subtype, description, agentId, sourceId, content } =
    req.body;
  if (!name || !type || content === undefined) {
    res.status(400).json({ error: "name, type, and content are required" });
    return;
  }
  const artifact = storage.artifacts.create({
    name,
    type,
    subtype,
    description,
    agentId,
    sourceId,
    content,
  });
  res.status(201).json(artifact);
};

// GET /api/artifacts/:id
export const handleGetArtifact: RequestHandler = (req, res) => {
  const artifact = storage.artifacts.get(req.params.id);
  if (!artifact) {
    res.status(404).json({ error: "Artifact not found" });
    return;
  }
  res.json(artifact);
};

// PATCH /api/artifacts/:id  — update content (auto-versions) or metadata
export const handleUpdateArtifact: RequestHandler = (req, res) => {
  const { content, note, name, description, subtype } = req.body;
  try {
    let artifact = storage.artifacts.get(req.params.id);
    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    if (content !== undefined) {
      artifact = storage.artifacts.update(req.params.id, content, note);

      // Two-way sync: if it's a system_prompt linked to an agent, update agent instructions
      if (artifact.type === "system_prompt" && artifact.agentId) {
        try {
          storage.agents.update(artifact.agentId, {
            systemInstructions: content,
          });
        } catch {
          // agent may have been deleted; ignore
        }
      }

      // Two-way sync: if it's a model_config, update session config
      if (
        artifact.type === "system_config" &&
        artifact.subtype === "model_config" &&
        artifact.sourceId
      ) {
        try {
          const parsed = JSON.parse(content);
          storage.sessions.setConfig(artifact.sourceId, parsed);
        } catch {
          // invalid JSON or session gone; ignore
        }
      }

      // Two-way sync: if it's an agent_config, update the agent
      if (
        artifact.type === "system_config" &&
        artifact.subtype === "agent_config" &&
        artifact.sourceId
      ) {
        try {
          const parsed = JSON.parse(content);
          const agentId = artifact.sourceId.replace("agent_config:", "");
          storage.agents.update(agentId, {
            name: parsed.name,
            description: parsed.description,
            persona: parsed.persona,
            status: parsed.status,
            toolIds: parsed.toolIds,
          });
        } catch {
          // invalid JSON or agent gone; ignore
        }
      }

      // Two-way sync: if it's a conversation, update the source conversation
      if (artifact.type === "conversation" && artifact.sourceId) {
        try {
          const parsed = JSON.parse(content);
          const conversationId = artifact.sourceId;
          const conversation = storage.conversations.get(conversationId);
          if (!conversation) {
            return; // conversation was deleted
          }

          // Update messages first (if provided)
          if (parsed.messages !== undefined) {
            conversation.messages = parsed.messages.map((msg: any) => ({
              id: msg.id || crypto.randomUUID(),
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp || new Date().toISOString(),
              executionSteps: msg.executionSteps,
              reasoning: msg.reasoning,
              parentMessageId: msg.parentMessageId,
              rootMessageId: msg.rootMessageId,
              isPartialContent: msg.isPartialContent ?? false,
            }));
            conversation.updatedAt = new Date().toISOString();
          }

          // Update title (which also triggers save) or just trigger save
          if (parsed.title !== undefined) {
            storage.conversations.updateTitle(conversationId, parsed.title);
          } else if (parsed.messages !== undefined) {
            // If only messages are being updated, trigger save by re-setting title
            storage.conversations.updateTitle(
              conversationId,
              conversation.title,
            );
          }
        } catch {
          // invalid JSON or conversation gone; ignore
        }
      }
    }

    if (
      name !== undefined ||
      description !== undefined ||
      subtype !== undefined
    ) {
      artifact = storage.artifacts.updateMeta(req.params.id, {
        name,
        description,
        subtype,
      });
    }

    res.json(artifact);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
};

// DELETE /api/artifacts/:id
export const handleDeleteArtifact: RequestHandler = (req, res) => {
  // Check if this is an agent_config artifact before deleting
  const artifact = storage.artifacts.get(req.params.id);
  const isAgentConfig =
    artifact?.type === "system_config" &&
    artifact?.subtype === "agent_config" &&
    artifact?.sourceId;

  const deleted = storage.artifacts.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Artifact not found" });
    return;
  }

  // Two-way sync: if it's an agent_config, delete the source agent
  if (isAgentConfig) {
    try {
      const agentId = artifact.sourceId!.replace("agent_config:", "");
      // Unassign tools first
      if (artifact.agentId) {
        const agent = storage.agents.get(agentId);
        if (agent?.toolIds) {
          for (const toolId of agent.toolIds) {
            try {
              storage.tools.removeFromAgent(toolId, agentId);
            } catch {
              // ignore
            }
          }
        }
      }
      storage.agents.delete(agentId);
    } catch {
      // agent may have been already deleted; ignore
    }
  }

  // Two-way sync: if it's a conversation, delete the source conversation
  if (artifact?.type === "conversation" && artifact?.sourceId) {
    try {
      storage.conversations.delete(artifact.sourceId);
    } catch {
      // conversation may have been already deleted; ignore
    }
  }

  res.json({ success: true });
};

// POST /api/artifacts/:id/restore/:versionId
export const handleRestoreArtifact: RequestHandler = (req, res) => {
  try {
    const artifact = storage.artifacts.restore(
      req.params.id,
      req.params.versionId,
    );

    // Two-way sync after restore
    if (artifact.type === "system_prompt" && artifact.agentId) {
      try {
        storage.agents.update(artifact.agentId, {
          systemInstructions: artifact.content,
        });
      } catch {
        // ignore
      }
    }

    res.json(artifact);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
};

// POST /api/artifacts/sync — idempotent seed from existing data
export const handleSyncArtifacts: RequestHandler = async (req, res) => {
  const synced: string[] = [];

  // Sync agents → system_prompt artifacts
  const agents = storage.agents.list();
  for (const agent of agents) {
    const artifact = storage.artifacts.upsertBySourceId({
      name: `${agent.name} — System Instructions`,
      type: "system_prompt",
      subtype: "agent_instructions",
      description: `System instructions for agent: ${agent.name}`,
      agentId: agent.id,
      sourceId: agent.id,
      content: agent.systemInstructions || "",
    });
    synced.push(artifact.id);
  }

  // Sync agents → agent_config artifacts
  for (const agent of agents) {
    const configContent = JSON.stringify(
      {
        name: agent.name,
        description: agent.description,
        persona: agent.persona,
        status: agent.status,
        toolIds: agent.toolIds,
      },
      null,
      2,
    );
    const artifact = storage.artifacts.upsertBySourceId({
      name: `${agent.name} — Agent Config`,
      type: "system_config",
      subtype: "agent_config",
      description: `Configuration for agent: ${agent.name}`,
      agentId: agent.id,
      sourceId: `agent_config:${agent.id}`,
      content: configContent,
    });
    synced.push(artifact.id);
  }

  // Sync sessions → model_config artifacts
  const sessions = storage.sessions.list();
  for (const session of sessions) {
    if (!session.config) continue;
    const configContent = JSON.stringify(
      {
        apiKey: "", // Masked/empty for security
        apiUrl: session.config.apiUrl || "",
        model: session.config.model,
      },
      null,
      2,
    );
    const artifact = storage.artifacts.upsertBySourceId({
      name: "Model Config",
      type: "system_config",
      subtype: "model_config",
      description: `LLM configuration for session`,
      sourceId: session.id,
      content: configContent,
    });
    synced.push(artifact.id);
  }

  // Sync conversations → conversation artifacts
  for (const session of sessions) {
    const conversations = storage.conversations.listBySession(session.id);
    for (const conversation of conversations) {
      const content = JSON.stringify({
        title: conversation.title,
        messages: conversation.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
        agentId: conversation.agentId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      });
      const artifact = storage.artifacts.upsertBySourceId({
        name: conversation.title,
        type: "conversation",
        description: `Conversation: ${conversation.title}`,
        agentId: conversation.agentId,
        sourceId: conversation.id,
        content,
      });
      synced.push(artifact.id);
    }
  }

  res.json({ synced: synced.length, ids: synced });
};
