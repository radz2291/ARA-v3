/**
 * LLM Service - OpenAI-compatible API integration with server-side forwarding
 * Supports custom providers with auto-discovery of available models
 */

export interface LLMConfig {
  apiKey: string;
  apiUrl?: string; // Custom provider URL, defaults to OpenAI
  model: string;
  temperature?: number;
  maxTokens?: number;
}

// Default OpenAI models - can be overridden by discovered models
export const DEFAULT_MODELS = [
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
] as const;

export interface LLMMessage {
  role: "user" | "assistant" | "system" | "function";
  content: string;
  name?: string; // For function messages
}

export interface ToolFunction {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

export interface LLMResponse {
  content: string;
  tokens?: {
    input: number;
    output: number;
  };
  toolCalls?: Array<{
    id: string;
    function: {
      name: string;
      arguments: string; // JSON string
    };
  }>;
}

export interface LLMRequestBody {
  messages: LLMMessage[];
  model: string;
  temperature: number;
  max_tokens: number;
  apiKey?: string; // Optional - use sessionId for server-side config instead
  apiUrl?: string;
  sessionId?: string; // Use server-stored config if provided
  tools?: ToolFunction[]; // Function definitions for tool calling
  tool_choice?: string; // "auto", "required", or specific function name
}

export interface DiscoveredModel {
  id: string;
  name?: string;
  owned_by?: string;
}

/**
 * OpenAI-compatible Provider - calls /api/llm server endpoint
 * Can use either apiKey (from config) or sessionId (server-stored config)
 */
export class OpenAIProvider {
  private config: LLMConfig;
  private sessionId?: string;

  constructor(config: LLMConfig, sessionId?: string) {
    this.config = config;
    this.sessionId = sessionId;
  }

  async generateResponse(
    messages: LLMMessage[],
    tools?: ToolFunction[]
  ): Promise<LLMResponse> {
    // Always have a fallback apiKey if available
    if (!this.sessionId && !this.config.apiKey) {
      throw new Error("API key not configured");
    }

    try {
      const requestBody: LLMRequestBody = {
        messages: messages,
        model: this.config.model || "gpt-4-turbo",
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 2000,
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
        requestBody.tool_choice = "auto"; // Let model decide when to use tools
      }

      // Try to use sessionId for server-side config, but always include apiKey as fallback
      if (this.sessionId) {
        requestBody.sessionId = this.sessionId;
      }

      // Always include apiKey as a fallback (server will try sessionId first if provided)
      if (this.config.apiKey) {
        requestBody.apiKey = this.config.apiKey;
        requestBody.apiUrl = this.config.apiUrl;
      }

      const response = await fetch("/api/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `LLM API error: ${response.status}`);
      }

      const data = await response.json();

      // Handle tool calls in response
      const toolCalls = data.choices[0]?.message?.tool_calls;

      return {
        content: data.choices[0]?.message?.content || "",
        tokens: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
        },
        toolCalls: toolCalls?.map((call: any) => ({
          id: call.id,
          function: {
            name: call.function.name,
            arguments: call.function.arguments,
          },
        })),
      };
    } catch (error) {
      console.error("LLM API error:", error);
      throw error;
    }
  }

  /**
   * Convert tools/functions to OpenAI tool format
   */
  static formatToolsForOpenAI(tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>): ToolFunction[] {
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name.replace(/\s+/g, "_").toLowerCase(), // Sanitize name for function calling
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  async discoverModels(): Promise<DiscoveredModel[]> {
    if (!this.sessionId && !this.config.apiKey) {
      return DEFAULT_MODELS as any;
    }

    try {
      const requestBody: any = {};

      // Use either sessionId or apiKey
      if (this.sessionId) {
        requestBody.sessionId = this.sessionId;
      } else {
        requestBody.apiKey = this.config.apiKey;
        requestBody.apiUrl = this.config.apiUrl;
      }

      const response = await fetch("/api/llm/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.warn("Failed to discover models, using defaults");
        return DEFAULT_MODELS as any;
      }

      const data = await response.json();
      return data.models || DEFAULT_MODELS;
    } catch (error) {
      console.warn("Error discovering models:", error);
      return DEFAULT_MODELS as any;
    }
  }

  async validateConfig(): Promise<boolean> {
    if (!this.sessionId && !this.config.apiKey) return false;

    try {
      // Simpler validation test message
      await this.generateResponse([
        { role: "user", content: "Say 'ok' briefly." },
      ]);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create OpenAI-compatible provider
 * @param config - LLM configuration (apiKey, apiUrl, model, etc.)
 * @param sessionId - Optional session ID for server-stored configuration
 */
export function createLLMProvider(config: LLMConfig, sessionId?: string): OpenAIProvider {
  return new OpenAIProvider(config, sessionId);
}

/**
 * Configuration storage
 * For security: API keys are NEVER stored in localStorage
 * They are stored server-side only and accessed via sessionId
 */
class LLMConfigStore {
  private config: LLMConfig | null = null;

  // Load non-sensitive config from localStorage (temperature, maxTokens only)
  load(): LLMConfig | null {
    // Try to load from localStorage - only safe fields
    const stored = localStorage.getItem("llm_config_safe");
    if (stored) {
      try {
        const safeConfig = JSON.parse(stored);
        // Return with empty apiKey - never from localStorage
        return {
          apiKey: "",
          apiUrl: "",
          model: "gpt-4-turbo",
          ...safeConfig,
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  // Save only safe fields (temperature, maxTokens) to localStorage
  save(config: LLMConfig): void {
    // NEVER save API keys - only safe fields
    const safeConfig = {
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    };
    localStorage.setItem("llm_config_safe", JSON.stringify(safeConfig));
    // In-memory config is never used for API calls anymore
    this.config = null;
  }

  getCurrent(): LLMConfig | null {
    return this.config;
  }

  clear(): void {
    localStorage.removeItem("llm_config_safe");
    this.config = null;
  }
}

export const configStore = new LLMConfigStore();
