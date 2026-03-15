import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  handleLLMRequest,
  handleLLMStream,
  handleModelsDiscovery,
} from "./routes/llm";
import {
  handleCreateSession,
  handleGetSession,
  handleSaveConfig,
  handleGetConfig,
  handleDeleteSession,
} from "./routes/sessions";
import {
  handleCreateConversation,
  handleListConversations,
  handleGetConversation,
  handleGetConversationById,
  handleAddMessage,
  handleUpdateConversation,
  handleDeleteConversation,
  handleEditMessage,
  handleRegenerateMessage,
} from "./routes/conversations";
import {
  handleListAgents,
  handleGetAgent,
  handleCreateAgent,
  handleUpdateAgent,
  handleDeleteAgent,
} from "./routes/agents";
import {
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceFile,
  getWorkspaceFile,
  deleteWorkspaceFile,
  updateWorkspaceContext,
} from "./routes/workspaces";
import {
  createTool,
  getTool,
  listTools,
  listToolsByType,
  listToolsByAgent,
  updateTool,
  assignToolToAgent,
  removeToolFromAgent,
  deleteTool,
} from "./routes/tools";
import { initializeEssentialTools } from "./tool-executor";
import {
  handleListArtifacts,
  handleCreateArtifact,
  handleGetArtifact,
  handleUpdateArtifact,
  handleDeleteArtifact,
  handleRestoreArtifact,
} from "./routes/artifacts";
import { handleGetKernelList, handleGetKernelData } from "./routes/kernel";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  app.post("/api/llm", handleLLMRequest);
  app.post("/api/llm/stream", handleLLMStream);
  app.post("/api/llm/models", handleModelsDiscovery);

  // Session routes
  app.post("/api/sessions", handleCreateSession);
  app.get("/api/sessions/:sessionId", handleGetSession);
  app.post("/api/sessions/:sessionId/config", handleSaveConfig);
  app.get("/api/sessions/:sessionId/config", handleGetConfig);
  app.delete("/api/sessions/:sessionId", handleDeleteSession);

  // Conversation routes
  app.get("/api/conversations/:id", handleGetConversationById);
  app.post("/api/sessions/:sessionId/conversations", handleCreateConversation);
  app.get("/api/sessions/:sessionId/conversations", handleListConversations);
  app.get(
    "/api/sessions/:sessionId/conversations/:conversationId",
    handleGetConversation,
  );
  app.post(
    "/api/sessions/:sessionId/conversations/:conversationId/messages",
    handleAddMessage,
  );
  app.patch(
    "/api/sessions/:sessionId/conversations/:conversationId",
    handleUpdateConversation,
  );
  app.delete(
    "/api/sessions/:sessionId/conversations/:conversationId",
    handleDeleteConversation,
  );

  // Message editing and regeneration routes
  app.post(
    "/api/sessions/:sessionId/conversations/:conversationId/messages/:messageId/edit",
    handleEditMessage,
  );
  app.post(
    "/api/sessions/:sessionId/conversations/:conversationId/messages/:messageId/regenerate",
    handleRegenerateMessage,
  );

  // Agent routes
  app.get("/api/agents", handleListAgents);
  app.post("/api/agents", handleCreateAgent);
  app.get("/api/agents/:agentId", handleGetAgent);
  app.patch("/api/agents/:agentId", handleUpdateAgent);
  app.delete("/api/agents/:agentId", handleDeleteAgent);

  // Workspace routes
  app.post("/api/workspaces", createWorkspace);
  app.get("/api/workspaces", listWorkspaces);
  app.get("/api/workspaces/:id", getWorkspace);
  app.patch("/api/workspaces/:id", updateWorkspace);
  app.delete("/api/workspaces/:id", deleteWorkspace);
  app.post("/api/workspaces/:id/files", addWorkspaceFile);
  app.get("/api/workspaces/:id/files", getWorkspaceFile);
  app.delete("/api/workspaces/:id/files", deleteWorkspaceFile);
  app.patch("/api/workspaces/:id/context", updateWorkspaceContext);

  // Tool routes
  app.post("/api/tools", createTool);
  app.get("/api/tools", listTools);
  app.get("/api/tools/:id", getTool);
  app.patch("/api/tools/:id", updateTool);
  app.delete("/api/tools/:id", deleteTool);
  app.get("/api/tools/type/:type", listToolsByType);
  app.get("/api/agents/:agentId/tools", listToolsByAgent);
  app.post("/api/tools/assign", assignToolToAgent);
  app.post("/api/tools/unassign", removeToolFromAgent);

  // Artifact (Kernel) routes
  app.get("/api/artifacts", handleListArtifacts);
  app.post("/api/artifacts", handleCreateArtifact);
  app.get("/api/artifacts/:id", handleGetArtifact);
  app.patch("/api/artifacts/:id", handleUpdateArtifact);
  app.delete("/api/artifacts/:id", handleDeleteArtifact);
  app.post("/api/artifacts/:id/restore/:versionId", handleRestoreArtifact);

  // Kernel aggregated routes
  app.get("/api/kernel/list", handleGetKernelList);
  app.get("/api/kernel/data", handleGetKernelData);

  // Initialize essential tools on server start
  initializeEssentialTools();

  return app;
}
