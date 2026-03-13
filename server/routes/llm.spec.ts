import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../storage", () => ({
  storage: {
    sessions: {
      getConfig: vi.fn(),
    },
    agents: {
      get: vi.fn(),
    },
  },
}));

vi.mock("../tool-executor", () => ({
  executeToolByName: vi.fn(),
}));

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
  res.setHeader = vi.fn();
  res.write = vi.fn();
  res.end = vi.fn();
  return res;
}

describe("LLM Routes - Request Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleLLMRequest validation", () => {
    it("should return 400 if messages are empty array", async () => {
      const { handleLLMRequest } = await import("./llm");

      const req = createMockRequest({
        body: { messages: [], model: "gpt-4", apiKey: "test-key" },
      });
      const res = createMockResponse();

      await handleLLMRequest(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 if messages is missing", async () => {
      const { handleLLMRequest } = await import("./llm");

      const req = createMockRequest({
        body: { model: "gpt-4", apiKey: "test-key" },
      });
      const res = createMockResponse();

      await handleLLMRequest(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 if apiKey is missing", async () => {
      const { handleLLMRequest } = await import("./llm");

      const req = createMockRequest({
        body: {
          messages: [{ role: "user", content: "Hello" }],
          model: "gpt-4",
        },
      });
      const res = createMockResponse();

      await handleLLMRequest(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 if model is missing", async () => {
      const { handleLLMRequest } = await import("./llm");

      const req = createMockRequest({
        body: {
          messages: [{ role: "user", content: "Hello" }],
          apiKey: "test-key",
        },
      });
      const res = createMockResponse();

      await handleLLMRequest(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("handleModelsDiscovery validation", () => {
    it("should return 400 if apiKey is missing", async () => {
      const { handleModelsDiscovery } = await import("./llm");

      const req = createMockRequest({
        body: {},
      });
      const res = createMockResponse();

      await handleModelsDiscovery(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("handleLLMStream validation", () => {
    it("should return 400 if messages are empty", async () => {
      const { handleLLMStream } = await import("./llm");

      const req = createMockRequest({
        body: { messages: [], model: "gpt-4", apiKey: "test-key" },
      });
      const res = createMockResponse();

      await handleLLMStream(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should set SSE headers", async () => {
      const { handleLLMStream } = await import("./llm");

      const req = createMockRequest({
        body: {
          messages: [{ role: "user", content: "Hello" }],
          model: "gpt-4",
          apiKey: "test-key",
        },
      });
      const res = createMockResponse();

      try {
        await handleLLMStream(req as Request, res as Response);
      } catch (error) {
        // Expected to throw due to mock response
      }

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/event-stream",
      );
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");
      expect(res.setHeader).toHaveBeenCalledWith("Connection", "keep-alive");
    });
  });
});
