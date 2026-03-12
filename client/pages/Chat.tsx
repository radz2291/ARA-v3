import { useState, useRef, useEffect } from "react";
import { Send, Plus, AlertCircle, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";
import {
  LLMMessage,
  createLLMProvider,
  configStore,
  LLMConfig,
  OpenAIProvider,
} from "@/lib/llm-service";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/contexts/SessionContext";
import { ToolExecutionSteps, ExecutionStep } from "@/components/ToolExecutionSteps";
import { MessageList } from "@/components/MessageList";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string; // NEW - extracted from reasoning_content
  timestamp: string;
  executionSteps?: ExecutionStep[];
  parentMessageId?: string; // NEW - ID of the message this is a response to
  branchId?: string; // NEW - which branch this message belongs to
  isPartialContent?: boolean; // NEW - true when streaming, false when complete
}

// interface Conversation moved to SessionContext

interface Agent {
  id: string;
  name: string;
  description: string;
  persona: string;
  systemInstructions: string;
  status: "active" | "inactive";
  toolIds?: string[];
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
  leadAgentId?: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export default function Chat() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const {
    sessionId: contextSessionId,
    currentConversationId: contextConversationId,
    setCurrentConversationId: setContextConversationId,
    isLoadingSession,
    conversations,
    isLoadingConversations,
    renameConversation,
    currentBranchId,
    availableBranches,
    switchBranch,
  } = useSession();

  // Get sessionId, conversationId, workspaceId, and agentId from URL params
  const urlSessionId = searchParams.get("sessionId");
  const urlConversationId = searchParams.get("conversationId");
  const workspaceId = searchParams.get("workspaceId");
  const urlAgentId = searchParams.get("agentId");
  const sessionId = urlSessionId || contextSessionId;
  const currentConversationId = urlConversationId || contextConversationId;

  const setCurrentConversationId = (id: string | null) => {
    setContextConversationId(id);
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [workspaceAgents, setWorkspaceAgents] = useState<Agent[]>([]);
  const [agentTools, setAgentTools] = useState<any[]>([]);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load configuration and conversations on mount
  useEffect(() => {
    const savedConfig = configStore.load();
    setConfig(savedConfig);
    setIsConfigured(!!savedConfig);
  }, []);

  // Update context with URL params if provided
  useEffect(() => {
    if (urlConversationId && !contextConversationId) {
      setContextConversationId(urlConversationId);
    }
  }, [urlConversationId, contextConversationId]);

  // Load workspace if workspaceId is provided
  useEffect(() => {
    if (workspaceId) {
      loadWorkspace(workspaceId);
    }
  }, [workspaceId]);

  // Load agent if agentId is provided in URL
  useEffect(() => {
    if (urlAgentId) {
      loadAgent(urlAgentId);
    }
  }, [urlAgentId]);

  const loadWorkspace = async (id: string) => {
    try {
      setIsLoadingWorkspace(true);
      const response = await fetch(`/api/workspaces/${id}`);
      if (response.ok) {
        const workspaceData = await response.json();
        setWorkspace(workspaceData);
        // Load all agents in the workspace
        const agentPromises = workspaceData.agentIds.map((agentId: string) =>
          fetch(`/api/agents/${agentId}`).then((r) => (r.ok ? r.json() : null))
        );
        const agents = await Promise.all(agentPromises);
        setWorkspaceAgents(agents.filter((a): a is Agent => a !== null));
      }
    } catch (error) {
      console.error("Error loading workspace:", error);
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  const loadAgent = async (agentId: string) => {
    try {
      setIsLoadingAgent(true);
      const response = await fetch(`/api/agents/${agentId}`);
      if (response.ok) {
        const agentData = await response.json();
        setAgent(agentData);

        try {
          const toolsResponse = await fetch(`/api/agents/${agentId}/tools`);
          if (toolsResponse.ok) {
            const toolsData = await toolsResponse.json();
            setAgentTools(toolsData.tools || []);
          }
        } catch (e) {
          console.error("Failed to load agent tools", e);
        }
      }
    } catch (error) {
      console.error("Error loading agent:", error);
    } finally {
      setIsLoadingAgent(false);
    }
  };

  const loadConversationMessages = async () => {
    if (!currentConversationId || !sessionId) return;
    setIsLoadingConversation(true);
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/conversations/${currentConversationId}`
      );
      if (response.ok) {
        const data = await response.json();
        const loadedMessages = (data.messages || []).map((m: any, idx: number) => ({
          ...m,
          id: m.id || `msg-${Date.now()}-${idx}`
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConversation(false);
    }
  };

  // Load conversation messages when currentConversationId changes
  useEffect(() => {
    if (!currentConversationId || !sessionId) return;
    loadConversationMessages();
  }, [currentConversationId, sessionId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !config || !currentConversationId || !sessionId) return;

    const userContent = input;
    setInput("");
    setIsLoading(true);

    try {
      // Create user message for local state
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userContent,
        timestamp: new Date().toISOString(),
      };

      const assistantMessageId = (Date.now() + 1).toString();
      const initialAssistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        reasoning: "",
        timestamp: new Date().toISOString(),
        executionSteps: [],
        isPartialContent: true,
      };

      // Immediately update UI with user message and empty assistant message
      setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
      setCurrentStreamingMessageId(assistantMessageId);

      // Create AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Parallelize: Start user message save and LLM call concurrently
      const isFirstMessage = messages.length === 0;
      const userSavePromise = fetch(
        `/api/sessions/${sessionId}/conversations/${currentConversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "user",
            content: userContent,
          }),
        }
      );

      // Call LLM API with sessionId and agent system instructions
      const provider = createLLMProvider(config, sessionId);
      const llmMessages: LLMMessage[] = [];

      // Add agent system instructions if available
      if (agent?.systemInstructions) {
        llmMessages.push({
          role: "system" as const,
          content: agent.systemInstructions,
        });
      }

      // Add conversation history
      llmMessages.push(
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      );

      // Add user message
      llmMessages.push({
        role: "user" as const,
        content: userContent,
      });

      const formattedTools = agentTools.length > 0
        ? OpenAIProvider.formatToolsForOpenAI(agentTools)
        : undefined;

      const llmPromise = provider.streamResponse(llmMessages, formattedTools, workspaceId || undefined, (event) => {
        if (event.type === "reasoning") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, reasoning: (m.reasoning || "") + (event.content || "") }
                : m
            )
          );
        } else if (event.type === "response") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: (m.content || "") + (event.content || "") }
                : m
            )
          );
        } else if (event.type === "tool_start") {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === assistantMessageId) {
                const steps = m.executionSteps || [];
                return {
                  ...m,
                  executionSteps: [
                    ...steps,
                    {
                      tool: event.toolName,
                      status: "executing",
                      timestamp: new Date().toISOString(),
                    },
                  ],
                };
              }
              return m;
            })
          );
        } else if (event.type === "tool_result" || event.type === "tool_error") {
          const isError = event.type === "tool_error";
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === assistantMessageId) {
                const steps = [...(m.executionSteps || [])];
                const lastIdx = [...steps]
                  .reverse()
                  .findIndex((s) => s.tool === event.toolName && s.status === "executing");

                if (lastIdx !== -1) {
                  const actualIdx = steps.length - 1 - lastIdx;
                  steps[actualIdx] = {
                    ...steps[actualIdx],
                    status: isError ? "failed" : "completed",
                    result: event.result,
                    error: event.error,
                    timestamp: new Date().toISOString(),
                  };
                  return { ...m, executionSteps: steps };
                }
              }
              return m;
            })
          );
        }
      }, abortController.signal);

      // Wait for stream to finish
      const finalContent = await llmPromise;

      // Background: Auto-rename conversation if first message (fire-and-forget)
      if (isFirstMessage) {
        const firstLineWords = userContent.split(" ").slice(0, 5).join(" ");
        const title = firstLineWords.length > 50
          ? firstLineWords.slice(0, 50) + "..."
          : firstLineWords;
        renameConversation(currentConversationId, title).catch((error) => {
          console.error("Failed to auto-rename conversation:", error);
        });
      }

      // Background: Save assistant message (fire-and-forget)
      setMessages((currentMessages) => {
        const finalAssistantMessage = currentMessages.find(m => m.id === assistantMessageId);
        fetch(
          `/api/sessions/${sessionId}/conversations/${currentConversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "assistant",
              content: finalContent,
              reasoning: finalAssistantMessage?.reasoning || "",
              executionSteps: finalAssistantMessage?.executionSteps || [],
            }),
          }
        ).catch((error) => {
          console.error("Failed to save assistant message:", error);
          toast({
            title: "Warning",
            description: "Failed to save assistant response. Please refresh to verify.",
            variant: "destructive",
          });
        });
        return currentMessages;
      });

      // Mark message as complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, isPartialContent: false } : m
        )
      );

      // Ensure user save completes
      await userSavePromise;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // Stop was called - message is already in state as partial
        toast({
          title: "Response stopped",
          description: "The response was interrupted by user",
        });
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get response";

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setIsSavingMessage(false);
      setCurrentStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setCurrentStreamingMessageId(null);
    }
  };

  if (!isConfigured) {
    return (
      <Layout>
        <div className="flex flex-col h-full bg-background dark:bg-background">
          {/* Header */}
          <div className="border-b border-border dark:border-border px-6 py-4">
            <h1 className="text-xl font-semibold text-foreground dark:text-foreground">
              Chat
            </h1>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              Configure your LLM to get started
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="max-w-md w-full bg-card dark:bg-card border border-border dark:border-border rounded-lg p-8 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground dark:text-foreground mb-2">
                No LLM Configured
              </h2>
              <p className="text-muted-foreground dark:text-muted-foreground mb-6">
                You need to set up your LLM provider and API key to start
                chatting.
              </p>

              <div className="space-y-3">
                <Button
                  asChild
                  className="w-full bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground"
                >
                  <Link to="/settings">Configure LLM</Link>
                </Button>

                <div className="text-sm text-muted-foreground dark:text-muted-foreground space-y-2">
                  <p className="font-medium">Configure in Settings to:</p>
                  <ul className="space-y-1">
                    <li>• Set your API key</li>
                    <li>• Add custom provider URL</li>
                    <li>• Discover available models</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  return (
    <Layout>
      <div className="flex h-full bg-background dark:bg-background">

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border dark:border-border">
          {/* Header */}
          <div className="border-b border-border dark:border-border px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                {isLoadingConversation || isLoadingAgent || isLoadingWorkspace ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  <>
                    <h1 className="text-xl font-semibold text-foreground dark:text-foreground">
                      {workspace
                        ? workspace.name
                        : agent
                          ? `Chat with ${agent.name}`
                          : currentConversation?.title || "Chat"}
                    </h1>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                      {workspace ? (
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {workspaceAgents.length} agent{workspaceAgents.length !== 1 ? "s" : ""} • {workspace.description}
                        </span>
                      ) : agent ? (
                        <>
                          <span className="font-medium">{agent.persona}</span> • {agent.description}
                        </>
                      ) : (
                        <>
                          {config?.apiUrl
                            ? new URL(config.apiUrl).hostname || "Custom Provider"
                            : "OpenAI"}{" "}
                          • {config?.model}
                        </>
                      )}
                    </p>
                  </>
                )}
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hover:bg-secondary dark:hover:bg-secondary"
              >
                <Link to="/settings">Settings</Link>
              </Button>
            </div>

            {/* Workspace Agent Selector */}
            {workspace && workspaceAgents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {workspaceAgents.map((workspaceAgent) => (
                  <Button
                    key={workspaceAgent.id}
                    variant={agent?.id === workspaceAgent.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => loadAgent(workspaceAgent.id)}
                    className="text-xs"
                  >
                    {workspaceAgent.name}
                    {workspace.leadAgentId === workspaceAgent.id && (
                      <span className="ml-1 text-xs">(Lead)</span>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <MessageList
            messages={messages}
            isLoading={isLoading}
            isLoadingConversation={isLoadingConversation}
            currentBranchId={currentBranchId}
            availableBranches={availableBranches}
            loadingMessageId={currentStreamingMessageId}
            onEdit={(messageId) => {
              // TODO: Implement edit UI
              console.log("Edit message:", messageId);
            }}
            onRegenerate={(messageId) => {
              // TODO: Implement regenerate
              console.log("Regenerate message:", messageId);
            }}
            onStop={handleStopStreaming}
            onBranchChange={(branchId) => {
              switchBranch(branchId).then(() => {
                loadConversationMessages();
              });
            }}
          />

          {/* Input Area */}
          <div className="border-t border-border dark:border-border px-6 py-4 bg-background dark:bg-background">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-card dark:bg-card border-border dark:border-border text-foreground dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                disabled={isLoading || !currentConversationId}
              />

              <Button
                type="submit"
                size="icon"
                disabled={
                  !input.trim() || isLoading || !currentConversationId
                }
                className="bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
