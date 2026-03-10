/**
 * LLM Service - Provider-agnostic abstraction layer
 * Allows for pluggable LLM providers (Claude, GPT-4, Z.ai, etc.)
 */

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export type LLMProvider = "claude" | "gpt4" | "zai" | "ollama";

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

/**
 * Abstract base class for LLM providers
 */
export abstract class BaseLLMProvider {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract generateResponse(
    messages: LLMMessage[]
  ): Promise<LLMResponse>;

  abstract validateConfig(): Promise<boolean>;
}

/**
 * Z.ai Provider Implementation
 */
export class ZaiProvider extends BaseLLMProvider {
  private baseUrl = "https://api.z.ai/v1";

  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error("Z.ai API key not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model || "default",
          messages: messages,
          temperature: this.config.temperature ?? 0.7,
          max_tokens: this.config.maxTokens ?? 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || `Z.ai API error: ${response.status}`
        );
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
      console.error("Z.ai API error:", error);
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    if (!this.config.apiKey) return false;

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Claude Provider Implementation (via Anthropic API)
 */
export class ClaudeProvider extends BaseLLMProvider {
  private baseUrl = "https://api.anthropic.com/v1";

  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error("Claude API key not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.config.model || "claude-3-5-sonnet-20241022",
          max_tokens: this.config.maxTokens ?? 2000,
          messages: messages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || `Claude API error: ${response.status}`
        );
      }

      const data = await response.json();
      return {
        content: data.content[0].text,
        tokens: {
          input: data.usage?.input_tokens || 0,
          output: data.usage?.output_tokens || 0,
        },
      };
    } catch (error) {
      console.error("Claude API error:", error);
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    if (!this.config.apiKey) return false;

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.config.model || "claude-3-5-sonnet-20241022",
          max_tokens: 100,
          messages: [{ role: "user", content: "test" }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * GPT-4 Provider Implementation (via OpenAI API)
 */
export class GPT4Provider extends BaseLLMProvider {
  private baseUrl = "https://api.openai.com/v1";

  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model || "gpt-4-turbo",
          messages: messages,
          temperature: this.config.temperature ?? 0.7,
          max_tokens: this.config.maxTokens ?? 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || `OpenAI API error: ${response.status}`
        );
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
      console.error("OpenAI API error:", error);
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    if (!this.config.apiKey) return false;

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create the appropriate provider
 */
export function createLLMProvider(config: LLMConfig): BaseLLMProvider {
  switch (config.provider) {
    case "zai":
      return new ZaiProvider(config);
    case "claude":
      return new ClaudeProvider(config);
    case "gpt4":
      return new GPT4Provider(config);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
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
