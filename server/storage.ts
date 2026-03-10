/**
 * Server Storage Layer
 * ==================
 * JSON file-based storage for sessions and conversations
 * Can be replaced with SQLite or any database later
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Data directory
const DATA_DIR = path.join(process.cwd(), ".data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const CONVERSATIONS_FILE = path.join(DATA_DIR, "conversations.json");

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ===== Type Definitions =====

export interface APIConfig {
  apiKey: string;
  apiUrl?: string;
  model: string;
}

export interface Session {
  id: string;
  createdAt: string;
  config?: APIConfig;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  sessionId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// ===== Sessions Storage =====

class SessionsStorage {
  private sessions: Map<string, Session> = new Map();

  constructor() {
    this.load();
  }

  private load() {
    ensureDataDir();
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const data = fs.readFileSync(SESSIONS_FILE, "utf-8");
        const sessions: Session[] = JSON.parse(data);
        sessions.forEach((s) => this.sessions.set(s.id, s));
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  }

  private save() {
    try {
      ensureDataDir();
      const sessions = Array.from(this.sessions.values());
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error("Error saving sessions:", error);
    }
  }

  create(): Session {
    const session: Session = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    this.save();
    return session;
  }

  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  getOrCreate(sessionId?: string): Session {
    if (sessionId && this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }
    return this.create();
  }

  setConfig(sessionId: string, config: APIConfig): Session {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    session.config = config;
    this.save();
    return session;
  }

  getConfig(sessionId: string): APIConfig | undefined {
    const session = this.sessions.get(sessionId);
    return session?.config;
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}

// ===== Conversations Storage =====

class ConversationsStorage {
  private conversations: Map<string, Conversation> = new Map();

  constructor() {
    this.load();
  }

  private load() {
    ensureDataDir();
    try {
      if (fs.existsSync(CONVERSATIONS_FILE)) {
        const data = fs.readFileSync(CONVERSATIONS_FILE, "utf-8");
        const conversations: Conversation[] = JSON.parse(data);
        conversations.forEach((c) => this.conversations.set(c.id, c));
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  }

  private save() {
    try {
      ensureDataDir();
      const conversations = Array.from(this.conversations.values());
      fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2));
    } catch (error) {
      console.error("Error saving conversations:", error);
    }
  }

  create(sessionId: string, title: string): Conversation {
    const conversation: Conversation = {
      id: randomUUID(),
      sessionId,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(conversation.id, conversation);
    this.save();
    return conversation;
  }

  get(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  listBySession(sessionId: string): Conversation[] {
    const convs = Array.from(this.conversations.values());
    return convs
      .filter((c) => c.sessionId === sessionId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }

  addMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string
  ): Message {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const message: Message = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    this.save();
    return message;
  }

  updateTitle(conversationId: string, title: string): Conversation {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    conversation.title = title;
    conversation.updatedAt = new Date().toISOString();
    this.save();
    return conversation;
  }

  delete(conversationId: string): boolean {
    return this.conversations.delete(conversationId);
  }
}

// ===== Storage Singleton Instances =====

let sessionsStorage: SessionsStorage;
let conversationsStorage: ConversationsStorage;

function getSessionsStorage(): SessionsStorage {
  if (!sessionsStorage) {
    sessionsStorage = new SessionsStorage();
  }
  return sessionsStorage;
}

function getConversationsStorage(): ConversationsStorage {
  if (!conversationsStorage) {
    conversationsStorage = new ConversationsStorage();
  }
  return conversationsStorage;
}

// ===== Public API =====

export const storage = {
  sessions: {
    create: () => getSessionsStorage().create(),
    get: (sessionId: string) => getSessionsStorage().get(sessionId),
    getOrCreate: (sessionId?: string) => getSessionsStorage().getOrCreate(sessionId),
    setConfig: (sessionId: string, config: APIConfig) =>
      getSessionsStorage().setConfig(sessionId, config),
    getConfig: (sessionId: string) =>
      getSessionsStorage().getConfig(sessionId),
    delete: (sessionId: string) => getSessionsStorage().delete(sessionId),
  },
  conversations: {
    create: (sessionId: string, title: string) =>
      getConversationsStorage().create(sessionId, title),
    get: (conversationId: string) =>
      getConversationsStorage().get(conversationId),
    listBySession: (sessionId: string) =>
      getConversationsStorage().listBySession(sessionId),
    addMessage: (
      conversationId: string,
      role: "user" | "assistant",
      content: string
    ) => getConversationsStorage().addMessage(conversationId, role, content),
    updateTitle: (conversationId: string, title: string) =>
      getConversationsStorage().updateTitle(conversationId, title),
    delete: (conversationId: string) =>
      getConversationsStorage().delete(conversationId),
  },
};
