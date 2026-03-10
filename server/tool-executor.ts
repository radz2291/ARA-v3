/**
 * Tool Executor
 * =============
 * Executes tools (web search, file ops, code exec) for agents
 * Provides a sandboxed execution environment with safety checks
 */

import { storage, Tool } from "./storage";
import { randomUUID } from "crypto";

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  toolId: string;
  toolName: string;
  success: boolean;
  output: unknown;
  error?: string;
  executionTime: number;
}

/**
 * Tool execution context (runtime data)
 */
export interface ToolContext {
  workspaceId?: string;
  agentId?: string;
  sessionId?: string;
}

/**
 * Web Search Tool Implementation
 */
async function executeWebSearch(
  input: Record<string, unknown>,
  _context: ToolContext
): Promise<unknown> {
  const { query } = input as { query: string };

  if (!query || typeof query !== "string") {
    throw new Error("Web search requires 'query' parameter (string)");
  }

  // TODO: Implement actual web search
  // For now, return mock results
  const results = [
    {
      title: `Search result for "${query}"`,
      url: "https://example.com/search",
      snippet: "This is a mock search result.",
      relevance: 0.95,
    },
  ];

  return {
    query,
    resultCount: results.length,
    results,
    timestamp: new Date().toISOString(),
  };
}

/**
 * File Operations Tool Implementation
 */
async function executeFileOps(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { operation, filePath, content } = input as {
    operation: string;
    filePath: string;
    content?: string;
  };

  if (!operation || !filePath) {
    throw new Error(
      "File operations require 'operation' and 'filePath' parameters"
    );
  }

  if (!context.workspaceId) {
    throw new Error("File operations require a workspace context");
  }

  const validOps = ["read", "write", "append", "delete"];
  if (!validOps.includes(operation)) {
    throw new Error(
      `Invalid operation. Must be one of: ${validOps.join(", ")}`
    );
  }

  try {
    switch (operation) {
      case "read": {
        const fileContent = storage.workspaces.getFile(
          context.workspaceId,
          filePath
        );
        if (!fileContent) {
          throw new Error(`File not found: ${filePath}`);
        }
        return {
          operation: "read",
          filePath,
          content: fileContent,
          size: fileContent.length,
        };
      }

      case "write": {
        if (content === undefined) {
          throw new Error("Write operation requires 'content' parameter");
        }
        storage.workspaces.addFile(context.workspaceId, filePath, content as string);
        return {
          operation: "write",
          filePath,
          size: (content as string).length,
          success: true,
        };
      }

      case "append": {
        if (content === undefined) {
          throw new Error("Append operation requires 'content' parameter");
        }
        const existing =
          storage.workspaces.getFile(context.workspaceId, filePath) || "";
        storage.workspaces.addFile(
          context.workspaceId,
          filePath,
          existing + content
        );
        return {
          operation: "append",
          filePath,
          size: (existing + content).length,
          success: true,
        };
      }

      case "delete": {
        storage.workspaces.deleteFile(context.workspaceId, filePath);
        return {
          operation: "delete",
          filePath,
          success: true,
        };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error: any) {
    throw new Error(`File operation failed: ${error.message}`);
  }
}

/**
 * Code Execution Tool Implementation
 * NOTE: This is a basic implementation. In production, use a proper sandbox
 * like vm2, isolated-vm, or a separate service (Docker container, etc.)
 */
async function executeCode(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { code, language } = input as { code: string; language: string };

  if (!code || typeof code !== "string") {
    throw new Error("Code execution requires 'code' parameter (string)");
  }

  const lang = language || "javascript";

  // Supported languages
  const supportedLangs = ["javascript", "js"];
  if (!supportedLangs.includes(lang.toLowerCase())) {
    throw new Error(
      `Language not supported. Supported: ${supportedLangs.join(", ")}`
    );
  }

  try {
    // NOTE: This is a simplified implementation
    // In production, use a proper sandbox like vm2 or isolated-vm
    // For now, we prevent dangerous operations and run in a controlled way

    if (
      code.includes("require(") ||
      code.includes("import ") ||
      code.includes("eval(") ||
      code.includes("Function(")
    ) {
      throw new Error("Dangerous operations not allowed in sandboxed code");
    }

    // For now, return a mock execution result
    // A real implementation would execute the code and capture output
    return {
      language: lang,
      code,
      output: "Code execution is in sandbox mode. Full execution coming soon.",
      executionTime: 10, // milliseconds
      status: "success",
    };
  } catch (error: any) {
    throw new Error(`Code execution failed: ${error.message}`);
  }
}

/**
 * Tool executor - routes to specific tool implementation
 */
async function executeTool(
  tool: Tool,
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  try {
    let output: unknown;

    switch (tool.type) {
      case "web_search":
        output = await executeWebSearch(input, context);
        break;
      case "file_ops":
        output = await executeFileOps(input, context);
        break;
      case "code_exec":
        output = await executeCode(input, context);
        break;
      case "custom":
        throw new Error("Custom tool execution not yet implemented");
      default:
        throw new Error(`Unknown tool type: ${tool.type}`);
    }

    return {
      toolId: tool.id,
      toolName: tool.name,
      success: true,
      output,
      executionTime: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      toolId: tool.id,
      toolName: tool.name,
      success: false,
      output: null,
      error: error.message || String(error),
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Execute a tool by ID
 */
export async function executeTooById(
  toolId: string,
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const tool = storage.tools.get(toolId);
  if (!tool) {
    throw new Error(`Tool not found: ${toolId}`);
  }

  return executeTool(tool, input, context);
}

/**
 * Execute a tool by name
 */
export async function executeToolByName(
  toolName: string,
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const tools = storage.tools.list();
  const tool = tools.find((t) => t.name === toolName);

  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`);
  }

  return executeTool(tool, input, context);
}

/**
 * Initialize default essential tools (called once on server start)
 */
export function initializeEssentialTools(): void {
  const existingTools = storage.tools.list();

  // Check if tools already exist
  const webSearchExists = existingTools.some((t) => t.type === "web_search");
  const fileOpsExists = existingTools.some((t) => t.type === "file_ops");
  const codeExecExists = existingTools.some((t) => t.type === "code_exec");

  // Web Search Tool
  if (!webSearchExists) {
    storage.tools.create(
      "Web Search",
      "Search the web for information",
      "web_search",
      {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
        },
        required: ["query"],
      },
      {
        type: "object",
        properties: {
          query: { type: "string" },
          resultCount: { type: "number" },
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
                snippet: { type: "string" },
                relevance: { type: "number" },
              },
            },
          },
          timestamp: { type: "string" },
        },
      }
    );
  }

  // File Operations Tool
  if (!fileOpsExists) {
    storage.tools.create(
      "File Operations",
      "Read, write, and manage files in the workspace",
      "file_ops",
      {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["read", "write", "append", "delete"],
            description: "File operation to perform",
          },
          filePath: {
            type: "string",
            description: "Path to the file",
          },
          content: {
            type: "string",
            description: "Content to write or append (for write/append operations)",
          },
        },
        required: ["operation", "filePath"],
      },
      {
        type: "object",
        properties: {
          operation: { type: "string" },
          filePath: { type: "string" },
          content: { type: "string" },
          size: { type: "number" },
          success: { type: "boolean" },
        },
      }
    );
  }

  // Code Execution Tool
  if (!codeExecExists) {
    storage.tools.create(
      "Code Execution",
      "Execute code in a sandboxed environment",
      "code_exec",
      {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "Code to execute",
          },
          language: {
            type: "string",
            enum: ["javascript", "js"],
            description: "Programming language (default: javascript)",
          },
        },
        required: ["code"],
      },
      {
        type: "object",
        properties: {
          language: { type: "string" },
          code: { type: "string" },
          output: { type: "string" },
          executionTime: { type: "number" },
          status: { type: "string" },
        },
      }
    );
  }

  console.log("Essential tools initialized");
}
