/**
 * LLM Service - OpenAI integration with server-side forwarding
 * Calls /api/llm endpoint which forwards requests to OpenAI
 */

export interface LLMConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export const OPENAI_MODELS = [
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
  apiKey: string;
}

/**
 * OpenAI Provider - calls /api/llm server endpoint
 */
export class OpenAIProvider {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const response = await fetch("/api/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages,
          model: this.config.model || "gpt-4-turbo",
          temperature: this.config.temperature ?? 0.7,
          max_tokens: this.config.maxTokens ?? 2000,
          apiKey: this.config.apiKey,
        } as LLMRequestBody),
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

  async validateConfig(): Promise<boolean> {
    if (!this.config.apiKey) return false;

    try {
      const response = await fetch("/api/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user" as const, content: "test" }],
          model: this.config.model || "gpt-4-turbo",
          temperature: 0.7,
          max_tokens: 100,
          apiKey: this.config.apiKey,
        } as LLMRequestBody),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create OpenAI provider
 */
export function createLLMProvider(config: LLMConfig): OpenAIProvider {
  return new OpenAIProvider(config);
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
