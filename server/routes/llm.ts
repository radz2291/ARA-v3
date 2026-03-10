import { RequestHandler } from "express";

interface LLMRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  model: string;
  temperature: number;
  max_tokens: number;
  apiKey: string;
  apiUrl?: string;
}

interface ModelsRequest {
  apiKey: string;
  apiUrl?: string;
}

const DEFAULT_OPENAI_URL = "https://api.openai.com/v1";

export const handleLLMRequest: RequestHandler = async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens, apiKey, apiUrl } =
      req.body as LLMRequest;

    // Validate required fields
    if (!apiKey) {
      return res.status(400).json({ message: "API key is required" });
    }

    if (!messages || messages.length === 0) {
      return res.status(400).json({ message: "Messages are required" });
    }

    if (!model) {
      return res.status(400).json({ message: "Model is required" });
    }

    // Use custom URL or default to OpenAI
    const baseUrl = apiUrl || DEFAULT_OPENAI_URL;

    // Forward request to provider API
    const providerResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 2000,
      }),
    });

    // Check if provider API call was successful
    if (!providerResponse.ok) {
      const error = await providerResponse.json();
      const errorMessage =
        error.error?.message || `Provider API error: ${providerResponse.status}`;

      return res.status(providerResponse.status).json({
        message: errorMessage,
        error: error.error,
      });
    }

    // Forward provider response to client
    const data = await providerResponse.json();
    return res.json(data);
  } catch (error) {
    console.error("LLM request error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      message: `Server error: ${errorMessage}`,
    });
  }
};

export const handleModelsDiscovery: RequestHandler = async (req, res) => {
  try {
    const { apiKey, apiUrl } = req.body as ModelsRequest;

    if (!apiKey) {
      return res.status(400).json({ message: "API key is required" });
    }

    // Use custom URL or default to OpenAI
    const baseUrl = apiUrl || DEFAULT_OPENAI_URL;

    // Fetch available models from provider
    const modelsResponse = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!modelsResponse.ok) {
      // If models endpoint fails, return empty list
      console.warn(
        `Failed to fetch models: ${modelsResponse.status}`,
        await modelsResponse.text()
      );
      return res.json({ models: [] });
    }

    const data = await modelsResponse.json();

    // Filter to chat models (exclude embedding and other models)
    const models = (data.data || [])
      .filter(
        (model: any) =>
          model.id.includes("gpt") ||
          model.id.includes("claude") ||
          model.id.includes("mistral") ||
          model.id.includes("llama") ||
          model.id.includes("neural")
      )
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        owned_by: model.owned_by,
      }))
      .sort((a: any, b: any) => a.id.localeCompare(b.id));

    return res.json({ models });
  } catch (error) {
    console.error("Models discovery error:", error);
    // Return empty models list on error instead of failing
    return res.json({ models: [] });
  }
};
