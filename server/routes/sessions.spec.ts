import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../storage", () => ({
  storage: {
    sessions: {
      create: vi.fn().mockReturnValue({
        id: "session-123",
        createdAt: "2024-01-01T00:00:00.000Z",
      }),
      get: vi.fn(),
      getOrCreate: vi.fn(),
      setConfig: vi.fn(),
      getConfig: vi.fn(),
      delete: vi.fn(),
    },
    conversations: {
      listBySession: vi.fn().mockReturnValue([]),
      delete: vi.fn(),
    },
  },
}));

import { storage } from "../storage";
import {
  handleCreateSession,
  handleGetSession,
  handleSaveConfig,
  handleGetConfig,
  handleDeleteSession,
} from "./sessions";
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

const mockNext = vi.fn();
const _next = () => mockNext();

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("Session Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleCreateSession", () => {
    it("should create a new session without sessionId", async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      const handler = handleCreateSession[1];
      await handler(req as Request, res as Response);

      expect(storage.sessions.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        id: "session-123",
        createdAt: "2024-01-01T00:00:00.000Z",
        hasConfig: false,
      });
    });

    it("should return existing session if sessionId provided and exists", async () => {
      const existingSession = {
        id: "existing-session",
        createdAt: "2024-01-01T00:00:00.000Z",
        config: { apiKey: "key", model: "model" },
      };
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue(
        existingSession,
      );

      const req = createMockRequest({
        body: { sessionId: "existing-session" },
      });
      const res = createMockResponse();

      const handler = handleCreateSession[1];
      await handler(req as Request, res as Response);

      expect(storage.sessions.get).toHaveBeenCalledWith("existing-session");
      expect(res.json).toHaveBeenCalledWith({
        id: "existing-session",
        createdAt: "2024-01-01T00:00:00.000Z",
        hasConfig: true,
      });
    });

    it("should handle errors and return 500", async () => {
      (storage.sessions.create as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          throw new Error("Create failed");
        },
      );

      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      const handler = handleCreateSession[1];
      await handler(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("handleGetSession", () => {
    it("should return session when found", async () => {
      const session = {
        id: "session-123",
        createdAt: "2024-01-01T00:00:00.000Z",
        config: { apiKey: "key", model: "model" },
      };
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue(
        session,
      );

      const req = createMockRequest({ params: { sessionId: "session-123" } });
      const res = createMockResponse();

      await handleGetSession(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        id: "session-123",
        createdAt: "2024-01-01T00:00:00.000Z",
        hasConfig: true,
      });
    });

    it("should return 404 when session not found", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue(
        undefined,
      );

      const req = createMockRequest({ params: { sessionId: "non-existent" } });
      const res = createMockResponse();

      await handleGetSession(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("handleSaveConfig", () => {
    it("should save config and return success", async () => {
      const session = {
        id: "session-123",
        createdAt: "2024-01-01T00:00:00.000Z",
        config: {
          apiKey: "key",
          apiUrl: "https://api.example.com",
          model: "gpt-4",
        },
      };
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue(
        session,
      );
      (storage.sessions.setConfig as ReturnType<typeof vi.fn>).mockReturnValue(
        session,
      );

      const req = createMockRequest({
        params: { sessionId: "session-123" },
        body: {
          apiKey: "key",
          apiUrl: "https://api.example.com",
          model: "gpt-4",
        },
      });
      const res = createMockResponse();

      const handler = handleSaveConfig[1];
      await handler(req as Request, res as Response);

      expect(storage.sessions.setConfig).toHaveBeenCalledWith("session-123", {
        apiKey: "key",
        apiUrl: "https://api.example.com",
        model: "gpt-4",
      });
      expect(res.json).toHaveBeenCalledWith({
        id: "session-123",
        createdAt: "2024-01-01T00:00:00.000Z",
        configSaved: true,
      });
    });

    it("should handle errors and return 500", async () => {
      (
        storage.sessions.setConfig as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw new Error("Save failed");
      });

      const req = createMockRequest({
        params: { sessionId: "session-123" },
        body: { apiKey: "key", model: "gpt-4" },
      });
      const res = createMockResponse();

      const handler = handleSaveConfig[1];
      await handler(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("handleGetConfig", () => {
    it("should return config when exists", async () => {
      (storage.sessions.getConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        apiKey: "key",
        apiUrl: "https://api.example.com",
        model: "gpt-4",
      });

      const req = createMockRequest({ params: { sessionId: "session-123" } });
      const res = createMockResponse();

      await handleGetConfig(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        apiUrl: "https://api.example.com",
        model: "gpt-4",
        configured: true,
      });
    });

    it("should return 404 when config not found", async () => {
      (storage.sessions.getConfig as ReturnType<typeof vi.fn>).mockReturnValue(
        undefined,
      );

      const req = createMockRequest({ params: { sessionId: "session-123" } });
      const res = createMockResponse();

      await handleGetConfig(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("handleDeleteSession", () => {
    it("should delete session and return success", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: "session-123",
        createdAt: "2024-01-01T00:00:00.000Z",
      });
      (
        storage.conversations.listBySession as ReturnType<typeof vi.fn>
      ).mockReturnValue([]);
      (storage.sessions.delete as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );

      const req = createMockRequest({ params: { sessionId: "session-123" } });
      const res = createMockResponse();

      await handleDeleteSession(req as Request, res as Response);

      expect(storage.sessions.delete).toHaveBeenCalledWith("session-123");
      expect(res.json).toHaveBeenCalledWith({ deleted: true });
    });

    it("should return 404 when session not found", async () => {
      (storage.sessions.get as ReturnType<typeof vi.fn>).mockReturnValue(
        undefined,
      );

      const req = createMockRequest({ params: { sessionId: "non-existent" } });
      const res = createMockResponse();

      await handleDeleteSession(req as Request, res as Response);

      expect(res.json).toHaveBeenCalled();
    });
  });
});
