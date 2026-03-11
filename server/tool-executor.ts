/**
 * Tool Executor
 * =============
 * Executes tools (web search, file ops, code exec) for agents
 * Provides a sandboxed execution environment with safety checks
 */

import { storage, Tool } from "./storage";
import { randomUUID } from "crypto";
import ivm from "isolated-vm";

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
 * Uses isolated-vm for safe V8 sandbox execution
 * Provides industry-standard isolation with strict resource limits
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

  const startTime = Date.now();

  try {
    // Create a new isolate with memory limits (128MB)
    const isolate = new ivm.Isolate({ memoryLimit: 128 });

    // Create a context within the isolate
    const context_obj = await isolate.createContext();

    // Prepare safe sandbox environment
    const jail = context_obj.global;

    // We can't safely inject complex Node objects like console directly.
    // Instead we will inject a simple string-based logger.
    jail.setSync("global", jail.derefInto());

    // Set up basic environment (JSON and Math are built-in to isolated-vm contexts anyway)
    // Create a mock console that captures logs
    await context_obj.eval(`
      const _logs = [];
      global.console = {
        log: (...args) => _logs.push(args.join(' ')),
        error: (...args) => _logs.push('[ERR] ' + args.join(' ')),
        warn: (...args) => _logs.push('[WARN] ' + args.join(' ')),
      };
      
      // Wrapper to catch the logs and the final result
      global._runCode = function() {
        let _result;
        try {
          // Eval the user code
          _result = eval(${JSON.stringify(code)});
        } catch (e) {
          throw e;
        }
        return JSON.stringify({ result: _result, logs: _logs });
      }
    `);

    // Execute code with 5-second timeout
    const sandboxResult = await context_obj.eval(`global._runCode()`, {
      timeout: 5000,
      filename: "sandbox.js",
    });

    const executionTime = Date.now() - startTime;

    // Parse the result safely
    let parsedResult;
    try {
      parsedResult = JSON.parse(sandboxResult as string);
    } catch {
      parsedResult = { result: sandboxResult, logs: [] };
    }

    let output = parsedResult.result;

    // If output is undefined but there are logs, return the logs as output
    if (output === undefined && parsedResult.logs.length > 0) {
      output = parsedResult.logs.join('\\n');
    } else if (parsedResult.logs.length > 0) {
      output = `${parsedResult.logs.join('\\n')}\\n\\n=> ${output}`;
    }

    return {
      language: lang,
      code,
      output,
      status: "success",
      executionTime,
    };
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    const errorMsg = error.message || String(error);

    // Provide helpful error messages
    let userFriendlyError = errorMsg;
    if (errorMsg.includes("timeout")) {
      userFriendlyError = "Code execution timeout (exceeded 5 seconds)";
    } else if (errorMsg.includes("SyntaxError")) {
      userFriendlyError = `Syntax error: ${errorMsg}`;
    } else if (errorMsg.includes("ReferenceError")) {
      userFriendlyError = `Reference error: ${errorMsg}`;
    }

    return {
      language: lang,
      code,
      output: null,
      error: userFriendlyError,
      status: "error",
      executionTime,
    };
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
        if (tool.name === "get_weather") {
          const { location } = input as { location: string };
          output = `The current weather in ${location || "Unknown"} is 22°C and Partly Cloudy with 45% humidity.`;
        } else {
          throw new Error(`Custom execution for ${tool.name} not implemented`);
        }
        break;
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
 * Matches by functionName (from provider) or falls back to human-readable name
 */
export async function executeToolByName(
  toolName: string,
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const tools = storage.tools.list();
  // Try matching by functionName first (what the LLM provider sends)
  // Then fall back to human-readable name, or normalized snake_case name
  const normalizedName = toolName.toLowerCase().replace(/_/g, " ");

  const tool = tools.find(
    (t) =>
      t.functionName === toolName ||
      t.name === toolName ||
      t.name.toLowerCase() === normalizedName
  );

  if (!tool) {
    throw new Error(`Tool not found at execution layer: ${toolName}`);
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
      },
      [],
      "web_search"
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
      },
      [],
      "file_ops"
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
      },
      [],
      "code_exec"
    );
  }

  // Delegate Task Tool (for Multi-Agent Orchestration)
  const delegateTaskExists = existingTools.some((t) => t.name === "Delegate Task");
  if (!delegateTaskExists) {
    storage.tools.create(
      "Delegate Task",
      "Delegate a task to another agent. Use this to collaborate with specialists.",
      "custom",
      {
        type: "object",
        properties: {
          agentId: {
            type: "string",
            description: "ID of the agent to delegate to",
          },
          task: {
            type: "string",
            description: "The specific task or prompt for the delegated agent",
          },
        },
        required: ["agentId", "task"],
      },
      {
        type: "object",
        properties: {
          response: { type: "string" },
          success: { type: "boolean" },
        },
      },
      [],
      "delegate_task"
    );
  }

  // Weather Tool (For Verification)
  const weatherToolExists = existingTools.some((t) => t.name === "get_weather");
  if (!weatherToolExists) {
    storage.tools.create(
      "get_weather",
      "Get the current weather in a given location",
      "custom", // Use custom type to implement dedicated mock logic
      {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA",
          },
        },
        required: ["location"],
      },
      {
        type: "object",
        properties: {
          location: { type: "string" },
          temperature: { type: "string" },
          condition: { type: "string" },
        },
      },
      [],
      "get_weather"
    );
  }

  console.log("Essential tools initialized");
}
