/**
 * Server Storage Layer
 * ==================
 * JSON file-based storage for sessions and conversations
 * Can be replaced with SQLite or any database later
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { promises as fsPromises } from "fs";

// Data directory
const DATA_DIR = path.join(process.cwd(), ".data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const CONVERSATIONS_FILE = path.join(DATA_DIR, "conversations.json");
const AGENTS_FILE = path.join(DATA_DIR, "agents.json");

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
  agentId?: string; // Optional - which agent this conversation is with
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  persona: string; // e.g., "Research Bot", "Code Wizard", etc.
  systemInstructions: string; // Custom system prompt for this agent
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// ===== Sessions Storage =====

class SessionsStorage {
  private sessions: Map<string, Session> = new Map();
  private saveTimer: NodeJS.Timeout | null = null;
  private needsSave = false;

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

  private async save() {
    try {
      ensureDataDir();
      const sessions = Array.from(this.sessions.values());
      await fsPromises.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error("Error saving sessions:", error);
    }
  }

  private debouncedSave() {
    this.needsSave = true;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      if (this.needsSave) {
        this.save();
        this.needsSave = false;
      }
    }, 50);
  }

  create(): Session {
    const session: Session = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    this.debouncedSave();
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
    this.debouncedSave();
    return session;
  }

  getConfig(sessionId: string): APIConfig | undefined {
    const session = this.sessions.get(sessionId);
    return session?.config;
  }

  delete(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.debouncedSave();
    }
    return deleted;
  }
}

// ===== Conversations Storage =====

class ConversationsStorage {
  private conversations: Map<string, Conversation> = new Map();
  private saveTimer: NodeJS.Timeout | null = null;
  private needsSave = false;

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

  private async save() {
    try {
      ensureDataDir();
      const conversations = Array.from(this.conversations.values());
      await fsPromises.writeFile(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2));
    } catch (error) {
      console.error("Error saving conversations:", error);
    }
  }

  private debouncedSave() {
    this.needsSave = true;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      if (this.needsSave) {
        this.save();
        this.needsSave = false;
      }
    }, 50);
  }

  create(sessionId: string, title: string, agentId?: string): Conversation {
    const conversation: Conversation = {
      id: randomUUID(),
      sessionId,
      agentId,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(conversation.id, conversation);
    this.debouncedSave();
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
    this.debouncedSave();
    return message;
  }

  updateTitle(conversationId: string, title: string): Conversation {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    conversation.title = title;
    conversation.updatedAt = new Date().toISOString();
    this.debouncedSave();
    return conversation;
  }

  delete(conversationId: string): boolean {
    const deleted = this.conversations.delete(conversationId);
    if (deleted) {
      this.debouncedSave();
    }
    return deleted;
  }
}

// ===== Agents Storage =====

class AgentsStorage {
  private agents: Map<string, Agent> = new Map();
  private saveTimer: NodeJS.Timeout | null = null;
  private needsSave = false;

  constructor() {
    this.load();
  }

  private load() {
    ensureDataDir();
    try {
      if (fs.existsSync(AGENTS_FILE)) {
        const data = fs.readFileSync(AGENTS_FILE, "utf-8");
        const agents: Agent[] = JSON.parse(data);
        agents.forEach((a) => this.agents.set(a.id, a));
      }
    } catch (error) {
      console.error("Error loading agents:", error);
    }
  }

  private async save() {
    try {
      ensureDataDir();
      const agents = Array.from(this.agents.values());
      await fsPromises.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2));
    } catch (error) {
      console.error("Error saving agents:", error);
    }
  }

  private debouncedSave() {
    this.needsSave = true;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      if (this.needsSave) {
        this.save();
        this.needsSave = false;
      }
    }, 50);
  }

  create(
    name: string,
    description: string,
    persona: string,
    systemInstructions: string
  ): Agent {
    const agent: Agent = {
      id: randomUUID(),
      name,
      description,
      persona,
      systemInstructions,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.agents.set(agent.id, agent);
    this.debouncedSave();
    return agent;
  }

  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  list(): Agent[] {
    return Array.from(this.agents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  update(
    agentId: string,
    updates: Partial<Omit<Agent, "id" | "createdAt">>
  ): Agent {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const updatedAgent: Agent = {
      ...agent,
      ...updates,
      id: agent.id,
      createdAt: agent.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.agents.set(agentId, updatedAgent);
    this.debouncedSave();
    return updatedAgent;
  }

  delete(agentId: string): boolean {
    const deleted = this.agents.delete(agentId);
    if (deleted) {
      this.debouncedSave();
    }
    return deleted;
  }
}

// ===== Storage Singleton Instances =====

let sessionsStorage: SessionsStorage;
let conversationsStorage: ConversationsStorage;
let agentsStorage: AgentsStorage;

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

function getAgentsStorage(): AgentsStorage {
  if (!agentsStorage) {
    agentsStorage = new AgentsStorage();
  }
  return agentsStorage;
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
    create: (sessionId: string, title: string, agentId?: string) =>
      getConversationsStorage().create(sessionId, title, agentId),
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
  agents: {
    create: (
      name: string,
      description: string,
      persona: string,
      systemInstructions: string
    ) => getAgentsStorage().create(name, description, persona, systemInstructions),
    get: (agentId: string) => getAgentsStorage().get(agentId),
    list: () => getAgentsStorage().list(),
    update: (agentId: string, updates: Partial<Omit<Agent, "id" | "createdAt">>) =>
      getAgentsStorage().update(agentId, updates),
    delete: (agentId: string) => getAgentsStorage().delete(agentId),
  },
};
