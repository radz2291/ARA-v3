import { z } from "zod";
import { ExecutionStep } from "./api";

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

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  reasoning?: string;
  timestamp: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  executionSteps?: ExecutionStep[];
  parentMessageId?: string;
  isPartialContent?: boolean;
}

export interface Conversation {
  id: string;
  sessionId: string;
  agentId?: string;
  title: string;
  messages: Message[];
  messageGraph?: Record<string, { children: string[] }>;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  persona: string;
  systemInstructions: string;
  toolIds: string[];
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
  leadAgentId?: string;
  fileSystem: Record<string, string>;
  executionContext: Record<string, unknown>;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: "web_search" | "file_ops" | "code_exec" | "custom";
  functionName: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  assignedAgentIds: string[];
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export const APIConfigSchema = z.object({
  apiKey: z.string(),
  apiUrl: z.string().optional(),
  model: z.string(),
});

export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

export const ExecutionStepSchema = z.object({
  tool: z.string(),
  status: z.enum(["executing", "completed", "failed"]),
  timestamp: z.string(),
  result: z.union([z.string(), z.record(z.unknown())]).optional(),
  error: z.string().optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "tool"]),
  content: z.string(),
  reasoning: z.string().optional(),
  timestamp: z.string(),
  name: z.string().optional(),
  tool_call_id: z.string().optional(),
  tool_calls: z.array(ToolCallSchema).optional(),
  executionSteps: z.array(ExecutionStepSchema).optional(),
  parentMessageId: z.string().optional(),
  isPartialContent: z.boolean().optional(),
});

export const SessionSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  config: APIConfigSchema.optional(),
});

export const ConversationSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  agentId: z.string().optional(),
  title: z.string(),
  messages: z.array(MessageSchema),
  messageGraph: z
    .record(z.object({ children: z.array(z.string()) }))
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  persona: z.string(),
  systemInstructions: z.string(),
  toolIds: z.array(z.string()),
  status: z.enum(["active", "inactive"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  agentIds: z.array(z.string()),
  leadAgentId: z.string().optional(),
  fileSystem: z.record(z.string()),
  executionContext: z.record(z.unknown()),
  status: z.enum(["active", "archived"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(["web_search", "file_ops", "code_exec", "custom"]),
  functionName: z.string(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  assignedAgentIds: z.array(z.string()),
  status: z.enum(["active", "inactive"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
