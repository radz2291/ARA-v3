import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../storage", () => ({
  storage: {
    sessions: {
      get: vi.fn(),
    },
    conversations: {
      create: vi.fn(),
      get: vi.fn(),
      listBySession: vi.fn(),
      addMessage: vi.fn(),
      updateTitle: vi.fn(),
      delete: vi.fn(),
      getAllBranches: vi.fn(),
      getBranchMessages: vi.fn(),
      createBranch: vi.fn(),
      switchBranch: vi.fn(),
      deleteBranch: vi.fn(),
      updateMessage: vi.fn(),
      truncateMessages: vi.fn(),
    },
  },
}));

import { storage } from "../storage";
import {
  handleCreateConversation,
  handleListConversations,
  handleGetConversation,
  handleAddMessage,
  handleUpdateConversation,
  handleDeleteConversation,
} from "./conversations";
import { Request, Response } from "express";

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("Conversation Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleCreateConversation", () => {
    it("should create a new conversation", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "session-123",
      });
      (
        storage.conversations.create as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        id: "conv-123",
        sessionId: "session-123",
        title: "Test",
        agentId: undefined,
        messages: [],
        createdAt: "2024-01-01T00:00:00.000Z",
      });

      const req = createMockRequest({
        params: { sessionId: "session-123" },
        body: { title: "Test" },
      });
      const res = createMockResponse();

      await handleCreateConversation(req as Request, res as Response);

      expect(storage.conversations.create).toHaveBeenCalledWith(
        "session-123",
        "Test",
        undefined,
      );
      expect(res.json).toHaveBeenCalledWith({
        id: "conv-123",
        sessionId: "session-123",
        agentId: undefined,
        title: "Test",
        createdAt: "2024-01-01T00:00:00.000Z",
        messages: [],
      });
    });

    it("should return 404 when session not found", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue(
        undefined,
      );

      const req = createMockRequest({
        params: { sessionId: "non-existent" },
        body: { title: "Test" },
      });
      const res = createMockResponse();

      await handleCreateConversation(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("handleListConversations", () => {
    it("should list conversations for a session", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "session-123",
      });
      (
        storage.conversations.listBySession as ReturnType<typeof vi.fn>
      ).mockReturnValue([
        {
          id: "conv-1",
          title: "First",
          messages: [{ id: "msg-1" }],
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const req = createMockRequest({
        params: { sessionId: "session-123" },
      });
      const res = createMockResponse();

      await handleListConversations(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        conversations: [
          {
            id: "conv-1",
            agentId: undefined,
            title: "First",
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
            messageCount: 1,
          },
        ],
      });
    });

    it("should return 404 when session not found", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue(
        undefined,
      );

      const req = createMockRequest({
        params: { sessionId: "non-existent" },
      });
      const res = createMockResponse();

      await handleListConversations(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("handleGetConversation", () => {
    it("should return conversation when found", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "session-123",
      });
      (storage.conversations.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "conv-123",
        sessionId: "session-123",
        title: "Test",
        messages: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      const req = createMockRequest({
        params: { sessionId: "session-123", conversationId: "conv-123" },
      });
      const res = createMockResponse();

      await handleGetConversation(req as Request, res as Response);

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 404 when conversation not found", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "session-123",
      });
      (storage.conversations.get as ReturnType<typeof vi.fn>).mockReturnValue(
        undefined,
      );

      const req = createMockRequest({
        params: { sessionId: "session-123", conversationId: "non-existent" },
      });
      const res = createMockResponse();

      await handleGetConversation(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("handleAddMessage", () => {
    it("should add message to conversation", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "session-123",
      });
      (storage.conversations.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "conv-123",
        sessionId: "session-123",
        messages: [],
      });
      (
        storage.conversations.addMessage as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        id: "msg-123",
        role: "user",
        content: "Hello",
        timestamp: "2024-01-01T00:00:00.000Z",
      });

      const req = createMockRequest({
        params: { sessionId: "session-123", conversationId: "conv-123" },
        body: { role: "user", content: "Hello" },
      });
      const res = createMockResponse();

      await handleAddMessage(req as Request, res as Response);

      expect(storage.conversations.addMessage).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("handleUpdateConversation", () => {
    it("should update conversation title", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "session-123",
      });
      (storage.conversations.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "conv-123",
        sessionId: "session-123",
      });
      (
        storage.conversations.updateTitle as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        id: "conv-123",
        title: "New Title",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      const req = createMockRequest({
        params: { sessionId: "session-123", conversationId: "conv-123" },
        body: { title: "New Title" },
      });
      const res = createMockResponse();

      await handleUpdateConversation(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        id: "conv-123",
        title: "New Title",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
    });
  });

  describe("handleDeleteConversation", () => {
    it("should delete conversation", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "session-123",
      });
      (storage.conversations.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "conv-123",
        sessionId: "session-123",
      });
      (
        storage.conversations.delete as ReturnType<typeof vi.fn>
      ).mockReturnValue(true);

      const req = createMockRequest({
        params: { sessionId: "session-123", conversationId: "conv-123" },
      });
      const res = createMockResponse();

      await handleDeleteConversation(req as Request, res as Response);

      expect(storage.conversations.delete).toHaveBeenCalledWith("conv-123");
      expect(res.json).toHaveBeenCalledWith({ deleted: true });
    });

    it("should return 404 when conversation not found", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "session-123",
      });
      (storage.conversations.get as ReturnType<typeof vi.fn>).mockReturnValue(
        undefined,
      );

      const req = createMockRequest({
        params: { sessionId: "session-123", conversationId: "non-existent" },
      });
      const res = createMockResponse();

      await handleDeleteConversation(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
