import { RequestHandler } from "express";

interface LLMRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  model: string;
  temperature: number;
  max_tokens: number;
  apiKey: string;
}

export const handleLLMRequest: RequestHandler = async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens, apiKey } =
      req.body as LLMRequest;

    // Validate required fields
    if (!apiKey) {
      return res.status(400).json({ message: "OpenAI API key is required" });
    }

    if (!messages || messages.length === 0) {
      return res.status(400).json({ message: "Messages are required" });
    }

    if (!model) {
      return res.status(400).json({ message: "Model is required" });
    }

    // Forward request to OpenAI API
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
      }
    );

    // Check if OpenAI API call was successful
    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      const errorMessage =
        error.error?.message || `OpenAI API error: ${openaiResponse.status}`;

      return res.status(openaiResponse.status).json({
        message: errorMessage,
        error: error.error,
      });
    }

    // Forward OpenAI response to client
    const data = await openaiResponse.json();
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
