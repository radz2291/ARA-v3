import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleLLMRequest, handleModelsDiscovery } from "./routes/llm";
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
  handleAddMessage,
  handleUpdateConversation,
  handleDeleteConversation,
} from "./routes/conversations";

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
  app.post("/api/llm/models", handleModelsDiscovery);

  // Session routes
  app.post("/api/sessions", handleCreateSession);
  app.get("/api/sessions/:sessionId", handleGetSession);
  app.post("/api/sessions/:sessionId/config", handleSaveConfig);
  app.get("/api/sessions/:sessionId/config", handleGetConfig);
  app.delete("/api/sessions/:sessionId", handleDeleteSession);

  // Conversation routes
  app.post("/api/sessions/:sessionId/conversations", handleCreateConversation);
  app.get("/api/sessions/:sessionId/conversations", handleListConversations);
  app.get(
    "/api/sessions/:sessionId/conversations/:conversationId",
    handleGetConversation
  );
  app.post(
    "/api/sessions/:sessionId/conversations/:conversationId/messages",
    handleAddMessage
  );
  app.patch(
    "/api/sessions/:sessionId/conversations/:conversationId",
    handleUpdateConversation
  );
  app.delete(
    "/api/sessions/:sessionId/conversations/:conversationId",
    handleDeleteConversation
  );

  return app;
}
