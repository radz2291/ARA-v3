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

// Z.ai models list for fallback
const ZAI_MODELS = [
  "glm-4.7",
  "glm-4.5-flash",
  "glm-4.5-turbo",
  "glm-4",
  "glm-3-turbo",
];

function isZaiUrl(url?: string): boolean {
  return url?.includes("z.ai") || url?.includes("api/coding/paas") || false;
}

function getChatPath(baseUrl: string): string {
  // Ensure we append /chat/completions if not already present
  if (baseUrl.includes("/chat/completions")) {
    return baseUrl;
  }
  return baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";
}

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
    const isZai = isZaiUrl(baseUrl);

    // Construct the correct endpoint
    let endpoint: string;
    if (isZai) {
      endpoint = getChatPath(baseUrl);
    } else {
      endpoint = `${baseUrl}/chat/completions`;
    }

    // Prepare request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };

    console.log(`[LLM] Calling ${endpoint}`);
    console.log(`[LLM] Is Z.ai: ${isZai}`);
    console.log(`[LLM] Model: ${model}`);
    console.log(`[LLM] Request body:`, JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 2000,
    }, null, 2));

    // Forward request to provider API
    let providerResponse = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 2000,
      }),
    });

    console.log(`[LLM] Response status: ${providerResponse.status}`);


    // Check if provider API call was successful
    if (!providerResponse.ok) {
      const errorText = await providerResponse.text();
      console.error(`[LLM] Error response: ${errorText}`);

      let errorMessage = `Provider API error: ${providerResponse.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        // If not JSON, use the text as error message
        errorMessage = errorText || errorMessage;
      }

      return res.status(providerResponse.status).json({
        message: errorMessage,
      });
    }

    // Forward provider response to client
    const data = await providerResponse.json();
    console.log(`[LLM] Success response received`);
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

    const baseUrl = apiUrl || DEFAULT_OPENAI_URL;
    const isZai = isZaiUrl(baseUrl);

    // Construct the correct endpoint for models
    let modelsEndpoint: string;
    if (isZai) {
      // Z.ai uses /models endpoint (without /chat/completions)
      modelsEndpoint = baseUrl.includes("/chat/completions")
        ? baseUrl.replace("/chat/completions", "/models")
        : (baseUrl.endsWith("/") ? baseUrl + "models" : baseUrl + "/models");
    } else {
      modelsEndpoint = `${baseUrl}/models`;
    }

    console.log(`[Models] Calling ${modelsEndpoint} (isZai: ${isZai})`);

    // Fetch available models from provider
    const modelsResponse = await fetch(modelsEndpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!modelsResponse.ok) {
      console.warn(
        `[Models] Failed to fetch from ${modelsEndpoint}: ${modelsResponse.status}`
      );

      // If Z.ai, use fallback models list
      if (isZai) {
        console.log("[Models] Using Z.ai fallback models list");
        const models = ZAI_MODELS.map((id) => ({
          id,
          name: id,
          owned_by: "z.ai",
        }));
        return res.json({ models });
      }

      return res.json({ models: [] });
    }

    const data = await modelsResponse.json();

    // Filter to chat models
    const allModels = data.data || [];
    const models = allModels
      .filter(
        (model: any) =>
          model.id.includes("glm") ||
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

    console.log(`[Models] Found ${models.length} models from ${isZai ? "Z.ai" : "provider"}`);
    return res.json({ models });
  } catch (error) {
    console.error("Models discovery error:", error);
    // Return empty models list on error instead of failing
    return res.json({ models: [] });
  }
};
