import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("fs", async () => {
  const { vi: _vi } = await import("vitest");
  return {
    default: {
      existsSync: _vi.fn().mockReturnValue(false),
      mkdirSync: _vi.fn(),
      readFileSync: _vi.fn().mockReturnValue("[]"),
      writeFile: _vi.fn(),
    },
    existsSync: _vi.fn().mockReturnValue(false),
    mkdirSync: _vi.fn(),
    readFileSync: _vi.fn().mockReturnValue("[]"),
    writeFile: _vi.fn(),
    promises: {
      writeFile: _vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("test-uuid-1234-5678"),
}));

import { storage, Session, APIConfig } from "../server/storage";
import fs from "fs";

describe("Sessions Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.readFileSync).mockReturnValue("[]");
  });

  describe("create", () => {
    it("should create a new session with generated id and timestamp", () => {
      const session = storage.sessions.create();

      expect(session).toHaveProperty("id");
      expect(session).toHaveProperty("createdAt");
      expect(session.id).toBe("test-uuid-1234-5678");
      expect(session.createdAt).toBeDefined();
    });
  });

  describe("get", () => {
    it("should return undefined for non-existent session", () => {
      const session = storage.sessions.get("non-existent-id");
      expect(session).toBeUndefined();
    });

    it("should return session when it exists", () => {
      const created = storage.sessions.create();
      const retrieved = storage.sessions.get(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe("getOrCreate", () => {
    it("should return existing session if sessionId provided and exists", () => {
      const created = storage.sessions.create();
      const result = storage.sessions.getOrCreate(created.id);
      expect(result.id).toBe(created.id);
    });

    it("should create new session if sessionId provided but does not exist", () => {
      const result = storage.sessions.getOrCreate("non-existent-id");
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("createdAt");
    });

    it("should create new session if no sessionId provided", () => {
      const result = storage.sessions.getOrCreate();
      expect(result).toHaveProperty("id");
    });
  });

  describe("setConfig", () => {
    it("should set config on existing session", () => {
      const session = storage.sessions.create();
      const config: APIConfig = {
        apiKey: "test-key",
        apiUrl: "https://api.example.com",
        model: "gpt-4",
      };

      const updated = storage.sessions.setConfig(session.id, config);
      expect(updated.config).toEqual(config);
    });

    it("should throw error for non-existent session", () => {
      expect(() => {
        storage.sessions.setConfig("non-existent", {
          apiKey: "key",
          model: "model",
        });
      }).toThrow("Session non-existent not found");
    });
  });

  describe("getConfig", () => {
    it("should return undefined if no config set", () => {
      const session = storage.sessions.create();
      const config = storage.sessions.getConfig(session.id);
      expect(config).toBeUndefined();
    });

    it("should return config when set", () => {
      const session = storage.sessions.create();
      const config: APIConfig = {
        apiKey: "test-key",
        model: "gpt-4",
      };
      storage.sessions.setConfig(session.id, config);

      const retrieved = storage.sessions.getConfig(session.id);
      expect(retrieved).toEqual(config);
    });
  });

  describe("delete", () => {
    it("should return false for non-existent session", () => {
      const result = storage.sessions.delete("non-existent");
      expect(result).toBe(false);
    });

    it("should delete existing session", () => {
      const session = storage.sessions.create();
      const result = storage.sessions.delete(session.id);
      expect(result).toBe(true);

      const retrieved = storage.sessions.get(session.id);
      expect(retrieved).toBeUndefined();
    });
  });
});

describe("Conversations Storage", () => {
  let testSession: Session;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.readFileSync).mockReturnValue("[]");
    testSession = storage.sessions.create();
  });

  describe("create", () => {
    it("should create a new conversation", () => {
      const conversation = storage.conversations.create(
        testSession.id,
        "Test Conversation",
      );

      expect(conversation).toHaveProperty("id");
      expect(conversation.sessionId).toBe(testSession.id);
      expect(conversation.title).toBe("Test Conversation");
      expect(conversation.messages).toEqual([]);
      expect(conversation).toHaveProperty("createdAt");
      expect(conversation).toHaveProperty("updatedAt");
    });

    it("should create conversation with optional agentId", () => {
      const agentId = "agent-123";
      const conversation = storage.conversations.create(
        testSession.id,
        "Test",
        agentId,
      );

      expect(conversation.agentId).toBe(agentId);
    });
  });

  describe("get", () => {
    it("should return undefined for non-existent conversation", () => {
      const result = storage.conversations.get("non-existent");
      expect(result).toBeUndefined();
    });

    it("should return conversation when it exists", () => {
      const created = storage.conversations.create(testSession.id, "Test");
      const retrieved = storage.conversations.get(created.id);
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe("listBySession", () => {
    it("should return conversations for a session", () => {
      const conv = storage.conversations.create(testSession.id, "Test");
      const result = storage.conversations.listBySession(testSession.id);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.map((c) => c.id)).toContain(conv.id);
    });
  });

  describe("addMessage", () => {
    it("should add message to conversation", () => {
      const conversation = storage.conversations.create(testSession.id, "Test");
      const message = storage.conversations.addMessage(
        conversation.id,
        "user",
        "Hello world",
      );

      expect(message).toHaveProperty("id");
      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello world");
      expect(message.timestamp).toBeDefined();
    });

    it("should add message with executionSteps", () => {
      const conversation = storage.conversations.create(testSession.id, "Test");
      const executionSteps = [
        { tool: "test", status: "completed" as const, timestamp: "2024-01-01" },
      ];

      const message = storage.conversations.addMessage(
        conversation.id,
        "assistant",
        "Response",
        executionSteps,
      );

      expect(message.executionSteps).toEqual(executionSteps);
    });

    it("should throw error for non-existent conversation", () => {
      expect(() => {
        storage.conversations.addMessage("non-existent", "user", "Hello");
      }).toThrow("Conversation non-existent not found");
    });
  });

  describe("updateTitle", () => {
    it("should update conversation title", () => {
      const conversation = storage.conversations.create(testSession.id, "Old");
      const updated = storage.conversations.updateTitle(conversation.id, "New");

      expect(updated.title).toBe("New");
    });

    it("should throw error for non-existent conversation", () => {
      expect(() => {
        storage.conversations.updateTitle("non-existent", "New Title");
      }).toThrow("Conversation non-existent not found");
    });
  });

  describe("delete", () => {
    it("should return false for non-existent conversation", () => {
      const result = storage.conversations.delete("non-existent");
      expect(result).toBe(false);
    });

    it("should delete existing conversation", () => {
      const conversation = storage.conversations.create(testSession.id, "Test");
      const result = storage.conversations.delete(conversation.id);
      expect(result).toBe(true);

      const retrieved = storage.conversations.get(conversation.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe("updateMessage", () => {
    it("should update message content", () => {
      const conversation = storage.conversations.create(testSession.id, "Test");
      const message = storage.conversations.addMessage(
        conversation.id,
        "user",
        "Original",
      );

      const updated = storage.conversations.updateMessage(
        conversation.id,
        message.id,
        { content: "Updated" },
      );

      expect(updated.content).toBe("Updated");
    });

    it("should throw error for non-existent conversation", () => {
      expect(() => {
        storage.conversations.updateMessage("non-existent", "msg-id", {
          content: "New",
        });
      }).toThrow("Conversation non-existent not found");
    });

    it("should throw error for non-existent message", () => {
      const conversation = storage.conversations.create(testSession.id, "Test");
      expect(() => {
        storage.conversations.updateMessage(conversation.id, "non-existent", {
          content: "New",
        });
      }).toThrow("Message non-existent not found");
    });
  });

  describe("truncateMessages", () => {
    it("should truncate messages to keep only messages up to index", () => {
      const conversation = storage.conversations.create(testSession.id, "Test");
      storage.conversations.addMessage(conversation.id, "user", "Message 1");
      storage.conversations.addMessage(conversation.id, "user", "Message 2");
      storage.conversations.addMessage(conversation.id, "user", "Message 3");

      const result = storage.conversations.truncateMessages(conversation.id, 1);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe("Message 1");
    });

    it("should throw error for non-existent conversation", () => {
      expect(() => {
        storage.conversations.truncateMessages("non-existent", 1);
      }).toThrow("Conversation non-existent not found");
    });
  });

  describe("branch management", () => {
    it("should create branch", () => {
      const conversation = storage.conversations.create(testSession.id, "Test");
      storage.conversations.addMessage(conversation.id, "user", "Message 1");

      const branchId = storage.conversations.createBranch(
        conversation.id,
        "branch-1",
      );

      expect(branchId).toBe("branch-1");
    });

    it("should switch to existing branch", () => {
      const conversation = storage.conversations.create(testSession.id, "Test");
      storage.conversations.addMessage(conversation.id, "user", "Main message");
      storage.conversations.createBranch(conversation.id, "branch-1");

      const result = storage.conversations.switchBranch(
        conversation.id,
        "branch-1",
      );
      expect(result.currentBranchId).toBe("branch-1");
    });

    it("should get all branches", () => {
      const conversation = storage.conversations.create(testSession.id, "Test");
      storage.conversations.addMessage(conversation.id, "user", "Message");
      storage.conversations.createBranch(conversation.id, "branch-1");

      const branches = storage.conversations.getAllBranches(conversation.id);
      expect(branches).toContain("default");
      expect(branches).toContain("branch-1");
    });

    it("should delete branch", () => {
      const conversation = storage.conversations.create(testSession.id, "Test");
      storage.conversations.createBranch(conversation.id, "branch-1");

      const result = storage.conversations.deleteBranch(
        conversation.id,
        "branch-1",
      );
      expect(result).toBe(true);
    });
  });
});
