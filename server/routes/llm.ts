import { RequestHandler } from "express";
import { storage } from "../storage";
import { executeToolByName } from "../tool-executor";

interface LLMRequest {
  messages: any[]; // Accept any format to let llm-service pass tool_calls
  model: string;
  temperature: number;
  max_tokens: number;
  apiKey?: string; // Optional - will use server-stored config if sessionId provided
  apiUrl?: string;
  sessionId?: string; // Use server-stored config
  tools?: any[]; // Function definitions for tool calling
  tool_choice?: string | any;
}

interface ModelsRequest {
  apiKey?: string;
  apiUrl?: string;
  sessionId?: string;
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

async function callProvider(endpoint: string, headers: any, body: any) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Provider API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export const handleLLMRequest: RequestHandler = async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens, apiKey, apiUrl, sessionId } =
      req.body as LLMRequest;

    // Validate required fields
    if (!messages || messages.length === 0) {
      return res.status(400).json({ message: "Messages are required" });
    }

    // Get API key and URL from either session config or request body
    let finalApiKey = apiKey;
    let finalApiUrl = apiUrl;
    let finalModel = model;

    if (sessionId) {
      // Try to use server-stored config from session
      const config = storage.sessions.getConfig(sessionId);
      if (config) {
        finalApiKey = config.apiKey;
        finalApiUrl = config.apiUrl;
        finalModel = config.model;
      }
      // If session doesn't have config, fall back to apiKey from request body
    }

    // Validate API key
    if (!finalApiKey) {
      return res.status(400).json({ message: "API key is required" });
    }

    if (!finalModel) {
      return res.status(400).json({ message: "Model is required" });
    }

    // Use custom URL or default to OpenAI
    const baseUrl = finalApiUrl || DEFAULT_OPENAI_URL;
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
      "Authorization": `Bearer ${finalApiKey}`,
    };

    console.log(`[LLM] Calling ${endpoint}`);
    console.log(`[LLM] Is Z.ai: ${isZai}`);
    console.log(`[LLM] Model: ${finalModel}`);
    console.log(`[LLM] Request body:`, JSON.stringify({
      model: finalModel,
      messages: messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 2000,
    }, null, 2));

    const openaiBody: any = {
      model: finalModel,
      messages: messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 2000,
    };

    if (req.body.tools) {
      openaiBody.tools = req.body.tools;
      openaiBody.tool_choice = req.body.tool_choice || "auto";
    }

    // Forward request to provider API
    let providerResponse = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(openaiBody),
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
    let data = await providerResponse.json();
    console.log(`[LLM] Success response received`);

    // --- RECURSIVE TOOL EXECUTION LOOP ---
    let loopCount = 0;
    const MAX_LOOPS = 5;
    const executionSteps: any[] = [];

    while (loopCount < MAX_LOOPS) {
      const message = data.choices[0]?.message;
      const toolCalls = message?.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        break; // No more tool calls, return final response
      }

      console.log(`[LLM] Loop ${loopCount + 1}: Executing ${toolCalls.length} tool calls`);

      // Add the assistant's tool_calls message to history
      messages.push(message);

      // Execute each tool call
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`[LLM] Executing tool: ${toolName}`);

        // Add to execution steps for UI visibility
        executionSteps.push({
          tool: toolName,
          status: "executing",
          timestamp: new Date().toISOString()
        });

        try {
          let output: any;

          // SPECIAL HANDLING: Delegate Task
          if (toolName === "delegate_task" || toolName === "Delegate Task") {
            const { agentId, task } = toolArgs;
            console.log(`[LLM] Delegating task to agent ${agentId}: ${task}`);

            const targetAgent = storage.agents.get(agentId);
            if (!targetAgent) {
              throw new Error(`Target agent not found: ${agentId}`);
            }

            // Simple delegation: Call the same LLM with the agent's system prompt and the task
            const subMessages = [
              { role: "system", content: targetAgent.systemInstructions },
              { role: "user", content: task }
            ];

            const subData = await callProvider(endpoint, headers, {
              ...openaiBody,
              messages: subMessages,
              tools: undefined, // Don't pass tools to sub-agent for now to avoid complexity
            });

            output = {
              agentName: targetAgent.name,
              response: subData.choices[0]?.message?.content || "No response from sub-agent"
            };
          } else {
            // Standard tool execution
            const result = await executeToolByName(toolName, toolArgs, {});
            output = result.output || result.error || "Success";
          }

          // Update execution steps with result
          const lastStep = executionSteps[executionSteps.length - 1];
          if (lastStep) {
            lastStep.status = "completed";
            lastStep.result = output;
          }

          // Add tool result to messages
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: typeof output === 'string' ? output : JSON.stringify(output)
          });
        } catch (err: any) {
          console.error(`[LLM] Tool execution failed: ${toolName}`, err);

          const lastStep = executionSteps[executionSteps.length - 1];
          if (lastStep) {
            lastStep.status = "failed";
            lastStep.error = err.message;
          }

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolName,
            content: `Error: ${err.message}`
          });
        }
      }

      // Call LLM again with results
      console.log(`[LLM] Calling provider again with ${messages.length} messages...`);
      console.log(`[LLM] Loop Payload:`, JSON.stringify({
        ...openaiBody,
        messages: messages,
      }, null, 2));

      data = await callProvider(endpoint, headers, {
        ...openaiBody,
        messages: messages,
      });
      loopCount++;
    }
    // --- END LOOP ---

    // Attach steps to the response so the UI can display them
    return res.json({
      ...data,
      executionSteps
    });
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
    const { apiKey, apiUrl, sessionId } = req.body as ModelsRequest;

    // Get API key and URL from either session config or request body
    let finalApiKey = apiKey;
    let finalApiUrl = apiUrl;

    if (sessionId) {
      // Try to use server-stored config from session
      const config = storage.sessions.getConfig(sessionId);
      if (config) {
        finalApiKey = config.apiKey;
        finalApiUrl = config.apiUrl;
      }
      // If session doesn't have config, fall back to apiKey from request body
    }

    if (!finalApiKey) {
      return res.status(400).json({ message: "API key is required" });
    }

    const baseUrl = finalApiUrl || DEFAULT_OPENAI_URL;
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
        Authorization: `Bearer ${finalApiKey}`,
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
