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
  workspaceId?: string; // Context for file operations
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

/**
 * Streaming LLM Request Handler
 * Emits Server-Sent Events for real-time feedback during tool execution
 */
export const handleLLMStream: RequestHandler = async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens, apiKey, apiUrl, sessionId } =
      req.body as LLMRequest;

    // Validate required fields
    if (!messages || messages.length === 0) {
      return res.status(400).json({ message: "Messages are required" });
    }

    // Setup SSE response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    };

    // Get API key and URL from either session config or request body
    let finalApiKey = apiKey;
    let finalApiUrl = apiUrl;
    let finalModel = model;

    if (sessionId) {
      const config = storage.sessions.getConfig(sessionId);
      if (config) {
        finalApiKey = config.apiKey;
        finalApiUrl = config.apiUrl;
        finalModel = config.model;
      }
    }

    // Validate API key
    if (!finalApiKey) {
      sendEvent({ type: "error", message: "API key is required" });
      return res.end();
    }

    if (!finalModel) {
      sendEvent({ type: "error", message: "Model is required" });
      return res.end();
    }

    sendEvent({ type: "start", model: finalModel });

    // Use custom URL or default to OpenAI
    const baseUrl = finalApiUrl || DEFAULT_OPENAI_URL;
    const isZai = isZaiUrl(baseUrl);

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

    // --- RECURSIVE TOOL EXECUTION LOOP WITH STREAMING ---
    let loopCount = 0;
    const MAX_LOOPS = 5;
    const conversationMessages = [...messages];

    while (loopCount < MAX_LOOPS) {
      const currentBody = {
        ...openaiBody,
        messages: conversationMessages,
        stream: true,
      };

      console.log("[LLM Debug] Fetching endpoint:", endpoint);
      console.log("[LLM Debug] Payload messages:", conversationMessages.length);

      let providerResponse = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(currentBody),
      });

      console.log("[LLM Debug] Provider Response Status:", providerResponse.status);

      if (!providerResponse.ok) {
        const errorText = await providerResponse.text();
        console.error("[LLM Debug] Provider Error:", errorText);
        sendEvent({ type: "error", message: `Provider API error: ${providerResponse.status} - ${errorText}` });
        return res.end();
      }

      sendEvent({ type: "debug", message: `Provider Fetch OK. Status: ${providerResponse.status}. Headers: ${JSON.stringify(Object.fromEntries(providerResponse.headers.entries()))}` });

      let contentAccumulator = "";
      let toolCalls: any[] = [];

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      // Ensure body exists
      if (!providerResponse.body) {
        sendEvent({ type: "error", message: "Empty stream response from provider" });
        return res.end();
      }

      // Read from the provider stream chunks
      if (!providerResponse.body) {
        sendEvent({ type: "error", message: "Empty stream response from provider" });
        return res.end();
      }

      const reader = providerResponse.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.choices && data.choices[0].delta) {
              const delta = data.choices[0].delta;

              if (delta.reasoning_content) {
                contentAccumulator += delta.reasoning_content;
                sendEvent({ type: "response", content: delta.reasoning_content });
              }

              if (delta.content) {
                // DEBUG: console.log("Extracted content:", delta.content);
                contentAccumulator += delta.content;
                // Emit content immediately to UI
                sendEvent({ type: "response", content: delta.content });
              }

              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index;
                  if (!toolCalls[idx]) {
                    toolCalls[idx] = {
                      id: tc.id || `call_${Date.now()}_${idx}`,
                      type: "function",
                      function: { name: tc.function?.name || "", arguments: "" }
                    };
                  }
                  if (tc.function?.arguments) {
                    toolCalls[idx].function.arguments += tc.function.arguments;
                  }
                }
              }
            }
          } catch (e) {
            console.warn("[LLM Stream] failed to parse SSE chunk:", buffer.trim());
          }
        }
      }

      // After stream completes, flush remaining buffer
      if (buffer.trim() && buffer.trim().startsWith("data: ") && buffer.trim() !== "data: [DONE]") {
        try {
          const data = JSON.parse(buffer.trim().slice(6));
          if (data.choices && data.choices[0].delta) {
            const delta = data.choices[0].delta;

            if (delta.reasoning_content) {
              contentAccumulator += delta.reasoning_content;
              sendEvent({ type: "response", content: delta.reasoning_content });
            }

            if (delta.content) {
              contentAccumulator += delta.content;
              // Emit content immediately to UI
              sendEvent({ type: "response", content: delta.content });
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index;
                if (!toolCalls[idx]) {
                  toolCalls[idx] = {
                    id: tc.id || `call_${Date.now()}_${idx}`,
                    type: "function",
                    function: { name: tc.function?.name || "", arguments: "" }
                  };
                }
                if (tc.function?.arguments) {
                  toolCalls[idx].function.arguments += tc.function.arguments;
                }
              }
            }
          }
        } catch (e) {
          console.warn("[LLM Stream] failed to parse SSE chunk in final buffer:", buffer.trim());
        }
      }

      // Check if any tool calls were accumulated
      const validToolCalls = toolCalls.filter(Boolean);

      if (validToolCalls.length === 0) {
        // No tools, stream is done. Break loop.
        break;
      }

      sendEvent({ type: "thinking", message: `Executing ${validToolCalls.length} tool(s)...` });

      // Add the assistant's tool_calls message to history
      const messageToPush: any = { role: "assistant", tool_calls: validToolCalls };
      if (contentAccumulator) messageToPush.content = contentAccumulator;
      conversationMessages.push(messageToPush);

      // Execute each tool call
      for (const toolCall of validToolCalls) {
        const toolName = toolCall.function.name;
        let toolArgs = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch (e) {
          console.error("Invalid JSON inside tool arguments:", toolCall.function.arguments);
        }

        sendEvent({ type: "tool_start", toolName, input: toolArgs });

        try {
          let output: any;
          const toolStartTime = Date.now();

          // SPECIAL HANDLING: Delegate Task
          if (toolName === "delegate_task" || toolName === "Delegate Task") {
            const { agentId, task } = toolArgs as any;
            const targetAgent = storage.agents.get(agentId);
            if (!targetAgent) {
              throw new Error(`Target agent not found: ${agentId}`);
            }

            const subMessages = [
              { role: "system", content: targetAgent.systemInstructions },
              { role: "user", content: task }
            ];

            const subData = await callProvider(endpoint, headers, {
              ...openaiBody,
              messages: subMessages,
              tools: undefined,
              stream: false, // Wait for sub-agent fully
            });

            output = {
              agentName: targetAgent.name,
              response: subData.choices[0]?.message?.content || "No response from sub-agent"
            };
          } else {
            // Standard tool execution
            const contextOptions = {
              workspaceId: req.body.workspaceId,
              agentId: req.body.agentId,
              sessionId: req.body.sessionId || sessionId
            };
            const result = await executeToolByName(toolName, toolArgs, contextOptions);
            output = result.output || result.error || "Success";
          }

          const duration = Date.now() - toolStartTime;
          sendEvent({
            type: "tool_result",
            toolName,
            output,
            duration
          });

          // Add tool result to messages
          conversationMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: typeof output === 'string' ? output : JSON.stringify(output)
          });
        } catch (err: any) {
          console.error(`[LLM Stream] Tool execution failed: ${toolName}`, err);
          sendEvent({
            type: "tool_error",
            toolName,
            error: err.message
          });

          conversationMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolName,
            content: `Error: ${err.message}`
          });
        }
      }

      console.log(`[LLM Stream] Calling provider again (loop ${loopCount + 1})...`);
      loopCount++;
    }

    // Send completion event
    sendEvent({ type: "complete" });
    return res.end();
  } catch (error) {
    console.error("LLM stream error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ type: "error", message: `Server error: ${errorMessage}` })}\n\n`);
    return res.end();
  }
};
