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
const WORKSPACES_FILE = path.join(DATA_DIR, "workspaces.json");
const TOOLS_FILE = path.join(DATA_DIR, "tools.json");

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
  id: string; // NEW - unique message identifier
  role: "user" | "assistant" | "tool";
  content: string;
  reasoning?: string; // NEW - extracted from reasoning_content
  timestamp: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  executionSteps?: any[];
  parentMessageId?: string; // ID of the message this is a response to
  rootMessageId?: string; // ID of the root message of this conversation
  children?: string[]; // IDs of child messages (for tree traversal)
  isPartialContent?: boolean; // true when streaming, false when complete
}

export interface Conversation {
  id: string;
  sessionId: string;
  agentId?: string; // Optional - which agent this conversation is with
  title: string;
  messages: Message[];
  messageGraph?: Record<
    string,
    { parentMessageId?: string; children: string[] }
  >; // DAG structure for tree navigation
  rootMessageId?: string; // ID of the first message in the conversation
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  persona: string; // e.g., "Research Bot", "Code Wizard", etc.
  systemInstructions: string; // Custom system prompt for this agent
  toolIds: string[]; // IDs of tools assigned to this agent
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  agentIds: string[]; // IDs of agents in this workspace
  leadAgentId?: string; // Coordinator/orchestrator agent
  fileSystem: Record<string, string>; // File path -> content mapping
  executionContext: Record<string, unknown>; // Shared state
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: "web_search" | "file_ops" | "code_exec" | "custom";
  functionName: string; // Sanitized name for function calling (e.g., "web_search", "file_ops")
  inputSchema: Record<string, unknown>; // JSON Schema for input validation
  outputSchema: Record<string, unknown>; // JSON Schema for output
  assignedAgentIds: string[]; // Which agents can use this tool
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
      await fsPromises.writeFile(
        SESSIONS_FILE,
        JSON.stringify(sessions, null, 2),
      );
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

  list(): Session[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
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
      await fsPromises.writeFile(
        CONVERSATIONS_FILE,
        JSON.stringify(conversations, null, 2),
      );
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
      messageGraph: {},
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

  list(): Conversation[] {
    return Array.from(this.conversations.values()).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  listBySession(sessionId: string): Conversation[] {
    const convs = Array.from(this.conversations.values());
    return convs
      .filter((c) => c.sessionId === sessionId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }

  addMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    executionSteps?: any[],
    reasoning?: string,
    parentMessageId?: string,
  ): Message {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const messageId = randomUUID();

    // Determine root message ID (first message in conversation)
    let rootMessageId = conversation.rootMessageId;
    if (!rootMessageId) {
      // This is the first message in the conversation
      rootMessageId = messageId;
      conversation.rootMessageId = rootMessageId;
    }

    // Initialize messageGraph if needed
    if (!conversation.messageGraph) {
      conversation.messageGraph = {};
    }

    const message: Message = {
      id: messageId,
      role,
      content,
      timestamp: new Date().toISOString(),
      executionSteps,
      reasoning,
      parentMessageId,
      rootMessageId,
      isPartialContent: false,
    };

    // Add to messageGraph: update parent's children and add new node
    if (parentMessageId) {
      if (!conversation.messageGraph[parentMessageId]) {
        conversation.messageGraph[parentMessageId] = { children: [] };
      }
      conversation.messageGraph[parentMessageId].children.push(messageId);
    }

    // Add new message to graph
    conversation.messageGraph[messageId] = {
      parentMessageId: parentMessageId || undefined,
      children: [],
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

  updateMessage(
    conversationId: string,
    messageId: string,
    updates: Partial<Message>,
  ): Message {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const messageIndex = conversation.messages.findIndex(
      (m) => m.id === messageId,
    );
    if (messageIndex === -1) {
      throw new Error(`Message ${messageId} not found`);
    }

    conversation.messages[messageIndex] = {
      ...conversation.messages[messageIndex],
      ...updates,
    };

    conversation.updatedAt = new Date().toISOString();
    this.debouncedSave();
    return conversation.messages[messageIndex];
  }

  /**
   * Slice conversation messages to keep only messages up to (but not including)
   * the given index, then persist. Used by edit and regenerate to ensure the
   * truncated state is saved even if no further addMessage call follows.
   */
  truncateMessages(
    conversationId: string,
    keepUpToIndex: number,
  ): Conversation {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    conversation.messages = conversation.messages.slice(0, keepUpToIndex);
    conversation.updatedAt = new Date().toISOString();
    this.debouncedSave();
    return conversation;
  }

  /**
   * Get the message tree for a conversation starting from root.
   * Returns a map of messageId -> { parentMessageId, children, message }
   */
  getMessageTree(
    conversationId: string,
  ): Record<
    string,
    { parentMessageId?: string; children: string[]; message?: Message }
  > {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Build a map of all messages by ID
    const messageMap: Record<string, Message> = {};

    // Collect all messages
    if (conversation.messages) {
      conversation.messages.forEach((m) => {
        messageMap[m.id] = m;
      });
    }

    // Build tree from messageGraph
    const tree: Record<
      string,
      { parentMessageId?: string; children: string[]; message?: Message }
    > = {};

    // Initialize from messageGraph if available
    if (conversation.messageGraph) {
      Object.keys(conversation.messageGraph).forEach((msgId) => {
        tree[msgId] = {
          parentMessageId: conversation.messageGraph![msgId].parentMessageId,
          children: conversation.messageGraph![msgId].children,
        };
      });
    }

    // Add messages to tree nodes
    Object.keys(tree).forEach((msgId) => {
      if (messageMap[msgId]) {
        tree[msgId].message = messageMap[msgId];
      }
    });

    return tree;
  }

  /**
   * Get all descendant messages from a given message ID
   */
  getMessageDescendants(conversationId: string, messageId: string): Message[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    if (!conversation.messageGraph || !conversation.messageGraph[messageId]) {
      return [];
    }

    const descendants: Message[] = [];
    const visited = new Set<string>();
    const queue = [...conversation.messageGraph[messageId].children];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Find the message
      const message = conversation.messages.find((m) => m.id === currentId);

      if (message) {
        descendants.push(message);
        // Add children to queue
        if (conversation.messageGraph[currentId]) {
          queue.push(...conversation.messageGraph[currentId].children);
        }
      }
    }

    return descendants;
  }

  /**
   * Get the path from root to a specific message
   */
  getMessagePath(conversationId: string, messageId: string): Message[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const path: Message[] = [];
    let currentId: string | undefined = messageId;

    while (currentId) {
      // Find message
      const message = conversation.messages.find((m) => m.id === currentId);

      if (message) {
        path.unshift(message);
        currentId = message.parentMessageId;
      } else {
        break;
      }
    }

    return path;
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
    systemInstructions: string,
    toolIds: string[] = [],
  ): Agent {
    const agent: Agent = {
      id: randomUUID(),
      name,
      description,
      persona,
      systemInstructions,
      toolIds,
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
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  update(
    agentId: string,
    updates: Partial<Omit<Agent, "id" | "createdAt">>,
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

// ===== Workspaces Storage =====

class WorkspacesStorage {
  private workspaces: Map<string, Workspace> = new Map();
  private saveTimer: NodeJS.Timeout | null = null;
  private needsSave = false;

  constructor() {
    this.load();
  }

  private load() {
    ensureDataDir();
    try {
      if (fs.existsSync(WORKSPACES_FILE)) {
        const data = fs.readFileSync(WORKSPACES_FILE, "utf-8");
        const workspaces: Workspace[] = JSON.parse(data);
        workspaces.forEach((w) => this.workspaces.set(w.id, w));
      }
    } catch (error) {
      console.error("Error loading workspaces:", error);
    }
  }

  private async save() {
    try {
      ensureDataDir();
      const workspaces = Array.from(this.workspaces.values());
      await fsPromises.writeFile(
        WORKSPACES_FILE,
        JSON.stringify(workspaces, null, 2),
      );
    } catch (error) {
      console.error("Error saving workspaces:", error);
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
    agentIds: string[],
    leadAgentId?: string,
  ): Workspace {
    const workspace: Workspace = {
      id: randomUUID(),
      name,
      description,
      agentIds,
      leadAgentId,
      fileSystem: {},
      executionContext: {},
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workspaces.set(workspace.id, workspace);
    this.debouncedSave();
    return workspace;
  }

  get(workspaceId: string): Workspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  list(): Workspace[] {
    return Array.from(this.workspaces.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  update(
    workspaceId: string,
    updates: Partial<Omit<Workspace, "id" | "createdAt">>,
  ): Workspace {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const updatedWorkspace: Workspace = {
      ...workspace,
      ...updates,
      id: workspace.id,
      createdAt: workspace.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.workspaces.set(workspaceId, updatedWorkspace);
    this.debouncedSave();
    return updatedWorkspace;
  }

  delete(workspaceId: string): boolean {
    const deleted = this.workspaces.delete(workspaceId);
    if (deleted) {
      this.debouncedSave();
    }
    return deleted;
  }

  addFile(workspaceId: string, filePath: string, content: string): Workspace {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }
    workspace.fileSystem[filePath] = content;
    workspace.updatedAt = new Date().toISOString();
    this.debouncedSave();
    return workspace;
  }

  getFile(workspaceId: string, filePath: string): string | undefined {
    const workspace = this.workspaces.get(workspaceId);
    return workspace?.fileSystem[filePath];
  }

  deleteFile(workspaceId: string, filePath: string): Workspace {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }
    delete workspace.fileSystem[filePath];
    workspace.updatedAt = new Date().toISOString();
    this.debouncedSave();
    return workspace;
  }

  updateContext(
    workspaceId: string,
    contextUpdates: Record<string, unknown>,
  ): Workspace {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }
    workspace.executionContext = {
      ...workspace.executionContext,
      ...contextUpdates,
    };
    workspace.updatedAt = new Date().toISOString();
    this.debouncedSave();
    return workspace;
  }
}

// ===== Tools Storage =====

class ToolsStorage {
  private tools: Map<string, Tool> = new Map();
  private saveTimer: NodeJS.Timeout | null = null;
  private needsSave = false;

  constructor() {
    this.load();
  }

  private load() {
    ensureDataDir();
    try {
      if (fs.existsSync(TOOLS_FILE)) {
        const data = fs.readFileSync(TOOLS_FILE, "utf-8");
        const tools: Tool[] = JSON.parse(data);
        tools.forEach((t) => this.tools.set(t.id, t));
      }
    } catch (error) {
      console.error("Error loading tools:", error);
    }
  }

  private async save() {
    try {
      ensureDataDir();
      const tools = Array.from(this.tools.values());
      await fsPromises.writeFile(TOOLS_FILE, JSON.stringify(tools, null, 2));
    } catch (error) {
      console.error("Error saving tools:", error);
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
    type: Tool["type"],
    inputSchema: Record<string, unknown>,
    outputSchema: Record<string, unknown>,
    assignedAgentIds: string[] = [],
    functionName?: string,
  ): Tool {
    // Auto-generate functionName if not provided
    const generatedFunctionName =
      functionName || name.replace(/\s+/g, "_").toLowerCase();

    const tool: Tool = {
      id: randomUUID(),
      name,
      description,
      type,
      functionName: generatedFunctionName,
      inputSchema,
      outputSchema,
      assignedAgentIds,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tools.set(tool.id, tool);
    this.debouncedSave();
    return tool;
  }

  get(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  list(): Tool[] {
    return Array.from(this.tools.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  listByType(type: Tool["type"]): Tool[] {
    return this.list().filter((t) => t.type === type);
  }

  listByAgent(agentId: string): Tool[] {
    return this.list().filter((t) => t.assignedAgentIds.includes(agentId));
  }

  update(
    toolId: string,
    updates: Partial<Omit<Tool, "id" | "createdAt">>,
  ): Tool {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const updatedTool: Tool = {
      ...tool,
      ...updates,
      id: tool.id,
      createdAt: tool.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.tools.set(toolId, updatedTool);
    this.debouncedSave();
    return updatedTool;
  }

  assignToAgent(toolId: string, agentId: string): Tool {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }
    if (!tool.assignedAgentIds.includes(agentId)) {
      tool.assignedAgentIds.push(agentId);
      tool.updatedAt = new Date().toISOString();
      this.debouncedSave();
    }
    return tool;
  }

  removeFromAgent(toolId: string, agentId: string): Tool {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }
    tool.assignedAgentIds = tool.assignedAgentIds.filter(
      (id) => id !== agentId,
    );
    tool.updatedAt = new Date().toISOString();
    this.debouncedSave();
    return tool;
  }

  delete(toolId: string): boolean {
    const deleted = this.tools.delete(toolId);
    if (deleted) {
      this.debouncedSave();
    }
    return deleted;
  }
}

// ===== Artifact Types =====

export interface ArtifactVersion {
  id: string;
  version: number;
  content: string;
  createdAt: string;
  note?: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: "system_prompt" | "conversation" | "system_config";
  subtype?: string;
  description?: string;
  agentId?: string;
  content: string;
  versions: ArtifactVersion[];
  createdAt: string;
  updatedAt: string;
}
// ===== Artifacts Storage =====

const ARTIFACTS_FILE = path.join(DATA_DIR, "artifacts.json");

class ArtifactsStorage {
  private artifacts: Map<string, Artifact> = new Map();
  private saveTimer: NodeJS.Timeout | null = null;
  private needsSave = false;

  constructor() {
    this.load();
  }

  private load() {
    ensureDataDir();
    try {
      if (fs.existsSync(ARTIFACTS_FILE)) {
        const data = fs.readFileSync(ARTIFACTS_FILE, "utf-8");
        const artifacts: Artifact[] = JSON.parse(data);
        artifacts.forEach((a) => this.artifacts.set(a.id, a));
      }
    } catch (error) {
      console.error("Error loading artifacts:", error);
    }
  }

  private async save() {
    try {
      ensureDataDir();
      const artifacts = Array.from(this.artifacts.values());
      await fsPromises.writeFile(
        ARTIFACTS_FILE,
        JSON.stringify(artifacts, null, 2),
      );
    } catch (error) {
      console.error("Error saving artifacts:", error);
    }
  }

  private debouncedSave() {
    this.needsSave = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      if (this.needsSave) {
        this.save();
        this.needsSave = false;
      }
    }, 50);
  }

  create(
    data: Omit<Artifact, "id" | "versions" | "createdAt" | "updatedAt">,
  ): Artifact {
    const now = new Date().toISOString();
    const artifact: Artifact = {
      ...data,
      id: randomUUID(),
      versions: [
        {
          id: randomUUID(),
          version: 1,
          content: data.content,
          createdAt: now,
          note: "Initial version",
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    this.artifacts.set(artifact.id, artifact);
    this.debouncedSave();
    return artifact;
  }

  get(artifactId: string): Artifact | undefined {
    return this.artifacts.get(artifactId);
  }

  list(filters?: {
    type?: Artifact["type"];
    subtype?: string;
    agentId?: string;
    search?: string;
  }): Artifact[] {
    let results = Array.from(this.artifacts.values());
    if (filters?.type) results = results.filter((a) => a.type === filters.type);
    if (filters?.subtype)
      results = results.filter((a) => a.subtype === filters.subtype);
    if (filters?.agentId)
      results = results.filter((a) => a.agentId === filters.agentId);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.description ?? "").toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q),
      );
    }
    return results.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  update(artifactId: string, newContent: string, note?: string): Artifact {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) throw new Error(`Artifact ${artifactId} not found`);

    const nextVersion = artifact.versions.length + 1;
    const now = new Date().toISOString();

    // Save current content as a version before replacing
    artifact.versions.push({
      id: randomUUID(),
      version: nextVersion,
      content: newContent,
      createdAt: now,
      note: note ?? `Version ${nextVersion}`,
    });
    artifact.content = newContent;
    artifact.updatedAt = now;

    this.artifacts.set(artifactId, artifact);
    this.debouncedSave();
    return artifact;
  }

  updateMeta(
    artifactId: string,
    updates: Partial<Pick<Artifact, "name" | "description" | "subtype">>,
  ): Artifact {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) throw new Error(`Artifact ${artifactId} not found`);
    Object.assign(artifact, updates, { updatedAt: new Date().toISOString() });
    this.debouncedSave();
    return artifact;
  }

  restore(artifactId: string, versionId: string): Artifact {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) throw new Error(`Artifact ${artifactId} not found`);

    const targetVersion = artifact.versions.find((v) => v.id === versionId);
    if (!targetVersion) throw new Error(`Version ${versionId} not found`);

    const now = new Date().toISOString();
    const nextVersion = artifact.versions.length + 1;
    artifact.versions.push({
      id: randomUUID(),
      version: nextVersion,
      content: targetVersion.content,
      createdAt: now,
      note: `Restored from v${targetVersion.version}`,
    });
    artifact.content = targetVersion.content;
    artifact.updatedAt = now;

    this.artifacts.set(artifactId, artifact);
    this.debouncedSave();
    return artifact;
  }

  delete(artifactId: string): boolean {
    const deleted = this.artifacts.delete(artifactId);
    if (deleted) this.debouncedSave();
    return deleted;
  }
}

// ===== Storage Singleton Instances =====

let sessionsStorage: SessionsStorage;
let conversationsStorage: ConversationsStorage;
let agentsStorage: AgentsStorage;
let workspacesStorage: WorkspacesStorage;
let toolsStorage: ToolsStorage;
let artifactsStorage: ArtifactsStorage;

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

function getWorkspacesStorage(): WorkspacesStorage {
  if (!workspacesStorage) {
    workspacesStorage = new WorkspacesStorage();
  }
  return workspacesStorage;
}

function getToolsStorage(): ToolsStorage {
  if (!toolsStorage) {
    toolsStorage = new ToolsStorage();
  }
  return toolsStorage;
}

function getArtifactsStorage(): ArtifactsStorage {
  if (!artifactsStorage) {
    artifactsStorage = new ArtifactsStorage();
  }
  return artifactsStorage;
}

// ===== Public API =====

export const storage = {
  sessions: {
    create: () => getSessionsStorage().create(),
    get: (sessionId: string) => getSessionsStorage().get(sessionId),
    getOrCreate: (sessionId?: string) =>
      getSessionsStorage().getOrCreate(sessionId),
    setConfig: (sessionId: string, config: APIConfig) =>
      getSessionsStorage().setConfig(sessionId, config),
    getConfig: (sessionId: string) => getSessionsStorage().getConfig(sessionId),
    delete: (sessionId: string) => getSessionsStorage().delete(sessionId),
    list: () => getSessionsStorage().list(),
  },
  conversations: {
    create: (sessionId: string, title: string, agentId?: string) =>
      getConversationsStorage().create(sessionId, title, agentId),
    get: (conversationId: string) =>
      getConversationsStorage().get(conversationId),
    list: () => getConversationsStorage().list(),
    listBySession: (sessionId: string) =>
      getConversationsStorage().listBySession(sessionId),
    addMessage: (
      conversationId: string,
      role: "user" | "assistant",
      content: string,
      executionSteps?: any[],
      reasoning?: string,
      parentMessageId?: string,
    ) =>
      getConversationsStorage().addMessage(
        conversationId,
        role,
        content,
        executionSteps,
        reasoning,
        parentMessageId,
      ),
    updateTitle: (conversationId: string, title: string) =>
      getConversationsStorage().updateTitle(conversationId, title),
    delete: (conversationId: string) =>
      getConversationsStorage().delete(conversationId),
    updateMessage: (
      conversationId: string,
      messageId: string,
      updates: Partial<Message>,
    ) =>
      getConversationsStorage().updateMessage(
        conversationId,
        messageId,
        updates,
      ),
    truncateMessages: (conversationId: string, keepUpToIndex: number) =>
      getConversationsStorage().truncateMessages(conversationId, keepUpToIndex),
    // Tree traversal
    getMessageTree: (conversationId: string) =>
      getConversationsStorage().getMessageTree(conversationId),
    getMessageDescendants: (conversationId: string, messageId: string) =>
      getConversationsStorage().getMessageDescendants(
        conversationId,
        messageId,
      ),
    getMessagePath: (conversationId: string, messageId: string) =>
      getConversationsStorage().getMessagePath(conversationId, messageId),
  },
  agents: {
    create: (
      name: string,
      description: string,
      persona: string,
      systemInstructions: string,
      toolIds?: string[],
    ) =>
      getAgentsStorage().create(
        name,
        description,
        persona,
        systemInstructions,
        toolIds || [],
      ),
    get: (agentId: string) => getAgentsStorage().get(agentId),
    list: () => getAgentsStorage().list(),
    update: (
      agentId: string,
      updates: Partial<Omit<Agent, "id" | "createdAt">>,
    ) => getAgentsStorage().update(agentId, updates),
    delete: (agentId: string) => getAgentsStorage().delete(agentId),
  },
  workspaces: {
    create: (
      name: string,
      description: string,
      agentIds: string[],
      leadAgentId?: string,
    ) =>
      getWorkspacesStorage().create(name, description, agentIds, leadAgentId),
    get: (workspaceId: string) => getWorkspacesStorage().get(workspaceId),
    list: () => getWorkspacesStorage().list(),
    update: (
      workspaceId: string,
      updates: Partial<Omit<Workspace, "id" | "createdAt">>,
    ) => getWorkspacesStorage().update(workspaceId, updates),
    delete: (workspaceId: string) => getWorkspacesStorage().delete(workspaceId),
    addFile: (workspaceId: string, filePath: string, content: string) =>
      getWorkspacesStorage().addFile(workspaceId, filePath, content),
    getFile: (workspaceId: string, filePath: string) =>
      getWorkspacesStorage().getFile(workspaceId, filePath),
    deleteFile: (workspaceId: string, filePath: string) =>
      getWorkspacesStorage().deleteFile(workspaceId, filePath),
    updateContext: (
      workspaceId: string,
      contextUpdates: Record<string, unknown>,
    ) => getWorkspacesStorage().updateContext(workspaceId, contextUpdates),
  },
  tools: {
    create: (
      name: string,
      description: string,
      type: Tool["type"],
      inputSchema: Record<string, unknown>,
      outputSchema: Record<string, unknown>,
      assignedAgentIds?: string[],
      functionName?: string,
    ) =>
      getToolsStorage().create(
        name,
        description,
        type,
        inputSchema,
        outputSchema,
        assignedAgentIds,
        functionName,
      ),
    get: (toolId: string) => getToolsStorage().get(toolId),
    list: () => getToolsStorage().list(),
    listByType: (type: Tool["type"]) => getToolsStorage().listByType(type),
    listByAgent: (agentId: string) => getToolsStorage().listByAgent(agentId),
    update: (
      toolId: string,
      updates: Partial<Omit<Tool, "id" | "createdAt">>,
    ) => getToolsStorage().update(toolId, updates),
    assignToAgent: (toolId: string, agentId: string) =>
      getToolsStorage().assignToAgent(toolId, agentId),
    removeFromAgent: (toolId: string, agentId: string) =>
      getToolsStorage().removeFromAgent(toolId, agentId),
    delete: (toolId: string) => getToolsStorage().delete(toolId),
  },
  artifacts: {
    create: (
      data: Omit<Artifact, "id" | "versions" | "createdAt" | "updatedAt">,
    ) => getArtifactsStorage().create(data),
    get: (artifactId: string) => getArtifactsStorage().get(artifactId),
    list: (filters?: {
      type?: Artifact["type"];
      subtype?: string;
      agentId?: string;
      search?: string;
    }) => getArtifactsStorage().list(filters),
    update: (artifactId: string, content: string, note?: string) =>
      getArtifactsStorage().update(artifactId, content, note),
    updateMeta: (
      artifactId: string,
      updates: Partial<Pick<Artifact, "name" | "description" | "subtype">>,
    ) => getArtifactsStorage().updateMeta(artifactId, updates),
    restore: (artifactId: string, versionId: string) =>
      getArtifactsStorage().restore(artifactId, versionId),
    delete: (artifactId: string) => getArtifactsStorage().delete(artifactId),
  },
};
