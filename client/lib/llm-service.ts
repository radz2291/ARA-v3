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
  role: "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  tokens?: {
    input: number;
    output: number;
  };
}

export interface LLMRequestBody {
  messages: LLMMessage[];
  model: string;
  temperature: number;
  max_tokens: number;
  apiKey?: string; // Optional - use sessionId for server-side config instead
  apiUrl?: string;
  sessionId?: string; // Use server-stored config if provided
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

  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    // Use sessionId if available for server-side config, otherwise use apiKey
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

      // Use either sessionId or apiKey
      if (this.sessionId) {
        requestBody.sessionId = this.sessionId;
      } else {
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
      return {
        content: data.choices[0].message.content,
        tokens: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      console.error("LLM API error:", error);
      throw error;
    }
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
      const requestBody: LLMRequestBody = {
        messages: [{ role: "user" as const, content: "test" }],
        model: this.config.model || "gpt-4-turbo",
        temperature: 0.7,
        max_tokens: 100,
      };

      // Use either sessionId or apiKey
      if (this.sessionId) {
        requestBody.sessionId = this.sessionId;
      } else {
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
      return response.ok;
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
 * Configuration storage (in-memory with localStorage persistence)
 */
class LLMConfigStore {
  private config: LLMConfig | null = null;

  load(): LLMConfig | null {
    // Try to load from localStorage
    const stored = localStorage.getItem("llm_config");
    if (stored) {
      try {
        this.config = JSON.parse(stored);
        return this.config;
      } catch {
        return null;
      }
    }
    return null;
  }

  save(config: LLMConfig): void {
    // Never store API keys in localStorage in production
    // This is for demo purposes only - use secure storage/environment variables
    const safeConfig = { ...config, apiKey: "***REDACTED***" };
    localStorage.setItem("llm_config", JSON.stringify(safeConfig));
    this.config = config;
  }

  getCurrent(): LLMConfig | null {
    return this.config;
  }

  clear(): void {
    localStorage.removeItem("llm_config");
    this.config = null;
  }
}

export const configStore = new LLMConfigStore();
