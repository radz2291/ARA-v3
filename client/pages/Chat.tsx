import { useState, useRef, useEffect, useCallback } from "react";
import { Send, AlertCircle, Users, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { ExecutionStep } from "@/components/ToolExecutionSteps";
import { MessageList } from "@/components/MessageList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: string;
  executionSteps?: ExecutionStep[];
  parentMessageId?: string;
  branchId?: string;
  isPartialContent?: boolean;
}

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
    conversations,
    renameConversation,
    currentBranchId,
    availableBranches,
    switchBranch,
    editMessage,
    regenerateMessage,
    setStreamingConversationId,
  } = useSession();

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
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [workspaceAgents, setWorkspaceAgents] = useState<Agent[]>([]);
  const [agentTools, setAgentTools] = useState<any[]>([]);

  // Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Refs for streaming
  const abortControllerRef = useRef<AbortController | null>(null);
  const assistantRef = useRef<{
    content: string;
    reasoning: string;
    steps: ExecutionStep[];
  }>({ content: "", reasoning: "", steps: [] });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track the conversation ID that is currently streaming (to guard setMessages calls)
  const streamingConvIdRef = useRef<string | null>(null);

  // Load configuration on mount
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

  // When conversation changes, clear streaming ref so safeUpdateMessage stops affecting
  // the new conversation's messages — but do NOT abort the stream.
  // This allows background streaming to continue while the user browses.
  useEffect(() => {
    streamingConvIdRef.current = null;
  }, [currentConversationId]);

  // Load workspace if workspaceId is provided
  useEffect(() => {
    if (workspaceId) loadWorkspace(workspaceId);
  }, [workspaceId]);

  // Load agent if agentId is provided in URL
  useEffect(() => {
    if (urlAgentId) loadAgent(urlAgentId);
  }, [urlAgentId]);

  const loadWorkspace = async (id: string) => {
    try {
      setIsLoadingWorkspace(true);
      const response = await fetch(`/api/workspaces/${id}`);
      if (response.ok) {
        const workspaceData = await response.json();
        setWorkspace(workspaceData);
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

  /** Load messages for the current conversation; returns the loaded array */
  const loadConversationMessages = useCallback(async (): Promise<Message[]> => {
    if (!currentConversationId || !sessionId) return [];
    setIsLoadingConversation(true);
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/conversations/${currentConversationId}`
      );
      if (response.ok) {
        const data = await response.json();
        const loaded: Message[] = (data.messages || []).map((m: any, idx: number) => ({
          ...m,
          id: m.id || `msg-${Date.now()}-${idx}`,
        }));
        setMessages(loaded);
        return loaded;
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
    return [];
  }, [currentConversationId, sessionId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentConversationId || !sessionId) return;
    loadConversationMessages();
  }, [currentConversationId, sessionId]);

  /** Core streaming helper — call this with the prepared llmMessages array */
  const streamAssistantResponse = async (
    llmMessages: LLMMessage[],
    conversationIdForStream: string
  ): Promise<void> => {
    if (!config || !sessionId) return;

    // Reset accumulator ref
    assistantRef.current = { content: "", reasoning: "", steps: [] };

    const assistantTempId = `temp-assistant-${Date.now()}`;
    const initialAssistantMessage: Message = {
      id: assistantTempId,
      role: "assistant",
      content: "",
      reasoning: "",
      timestamp: new Date().toISOString(),
      executionSteps: [],
      isPartialContent: true,
    };

    streamingConvIdRef.current = conversationIdForStream;
    setMessages((prev) => [...prev, initialAssistantMessage]);
    setIsLoading(true);
    setStreamingConversationId(conversationIdForStream);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const provider = createLLMProvider(config, sessionId);
    const formattedTools =
      agentTools.length > 0 ? OpenAIProvider.formatToolsForOpenAI(agentTools) : undefined;

    /** Safely update messages only if still streaming for this conversation */
    const safeUpdateMessage = (updater: (m: Message) => Message) => {
      if (streamingConvIdRef.current !== conversationIdForStream) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantTempId ? updater(m) : m))
      );
    };

    try {
      await provider.streamResponse(
        llmMessages,
        formattedTools,
        workspaceId || undefined,
        (event) => {
          if (event.type === "reasoning") {
            assistantRef.current.reasoning += event.content || "";
            safeUpdateMessage((m) => ({ ...m, reasoning: assistantRef.current.reasoning }));
          } else if (event.type === "response") {
            assistantRef.current.content += event.content || "";
            safeUpdateMessage((m) => ({ ...m, content: assistantRef.current.content }));
          } else if (event.type === "tool_start") {
            const step: ExecutionStep = {
              tool: event.toolName,
              status: "executing",
              timestamp: new Date().toISOString(),
            };
            assistantRef.current.steps.push(step);
            safeUpdateMessage((m) => ({
              ...m,
              executionSteps: [...assistantRef.current.steps],
            }));
          } else if (event.type === "tool_result" || event.type === "tool_error") {
            const isError = event.type === "tool_error";
            const steps = assistantRef.current.steps;
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
            }
            safeUpdateMessage((m) => ({
              ...m,
              executionSteps: [...assistantRef.current.steps],
            }));
          }
        },
        abortController.signal
      );

      // Save assistant message using accumulated ref (avoids stale state)
      try {
        const assistantResp = await fetch(
          `/api/sessions/${sessionId}/conversations/${conversationIdForStream}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "assistant",
              content: assistantRef.current.content,
              reasoning: assistantRef.current.reasoning,
              executionSteps: assistantRef.current.steps,
            }),
          }
        );

        if (assistantResp.ok) {
          const savedAssistant = await assistantResp.json();
          // Sync server-assigned ID back to state
          if (streamingConvIdRef.current === conversationIdForStream) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantTempId
                  ? { ...m, id: savedAssistant.id, isPartialContent: false }
                  : m
              )
            );
          }
        } else {
          console.error("Failed to save assistant message:", assistantResp.status);
          safeUpdateMessage((m) => ({ ...m, isPartialContent: false }));
        }
      } catch (saveError) {
        console.error("Failed to save assistant message:", saveError);
        safeUpdateMessage((m) => ({ ...m, isPartialContent: false }));
      }

      // Notify if user navigated away during streaming
      if (
        streamingConvIdRef.current !== conversationIdForStream ||
        conversationIdForStream !== currentConversationId
      ) {
        const conv = conversations.find((c) => c.id === conversationIdForStream);
        toast({
          title: "Response ready",
          description: `Response ready in '${conv?.title || "Conversation"}'`,
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // User stopped — mark as no longer streaming
        safeUpdateMessage((m) => ({ ...m, isPartialContent: false }));
      } else {
        safeUpdateMessage((m) => ({ ...m, isPartialContent: false }));
        throw error;
      }
    } finally {
      setIsLoading(false);
      setStreamingConversationId(null);
      streamingConvIdRef.current = null;
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !config || !currentConversationId || !sessionId || isCurrentConvLoading) return;

    const userContent = input.trim();
    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userTempId = `temp-user-${Date.now()}`;
    const userMessage: Message = {
      id: userTempId,
      role: "user",
      content: userContent,
      timestamp: new Date().toISOString(),
    };

    // Capture the current messages BEFORE adding new message to avoid stale closure
    const capturedHistory = [...messages, userMessage];
    const isFirstMessage = messages.length === 0;

    // Add user message to UI immediately
    setMessages((prev) => [...prev, userMessage]);

    // Save user message to server (fire & forget — sync ID after streaming)
    const userSavePromise = fetch(
      `/api/sessions/${sessionId}/conversations/${currentConversationId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: userContent }),
      }
    );

    // Build LLM history from captured snapshot (no stale state)
    const llmMessages: LLMMessage[] = [];
    if (agent?.systemInstructions) {
      llmMessages.push({ role: "system", content: agent.systemInstructions });
    }
    llmMessages.push(
      ...capturedHistory.map((m) => ({ role: m.role as any, content: m.content }))
    );

    try {
      await streamAssistantResponse(llmMessages, currentConversationId);

      if (isFirstMessage) {
        const words = userContent.split(" ").slice(0, 5).join(" ");
        const title = words.length > 50 ? words.slice(0, 50) + "..." : words;
        renameConversation(currentConversationId, title).catch(() => {});
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to get response";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }

    // Sync server-assigned user message ID
    try {
      const userResp = await userSavePromise;
      if (userResp.ok) {
        const savedUser = await userResp.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === userTempId ? { ...m, id: savedUser.id } : m))
        );
      }
    } catch (e) {
      console.error("User save failed:", e);
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = async (messageId: string) => {
    // Only block regenerate if THIS conversation is currently streaming
    const isThisConvStreaming = isLoading && streamingConvIdRef.current === currentConversationId;
    if (!sessionId || !currentConversationId || !config || isThisConvStreaming) return;

    try {
      // Server creates new branch and removes old assistant message
      const branchId = await regenerateMessage(messageId);
      if (!branchId) return;

      // Load fresh messages for the new branch
      const loadedMessages = await loadConversationMessages();

      // Build LLM history from freshly loaded messages (no stale closure)
      const llmMessages: LLMMessage[] = [];
      if (agent?.systemInstructions) {
        llmMessages.push({ role: "system", content: agent.systemInstructions });
      }
      llmMessages.push(
        ...loadedMessages.map((m) => ({ role: m.role as any, content: m.content }))
      );

      await streamAssistantResponse(llmMessages, currentConversationId);
    } catch (error) {
      console.error("Regenerate error:", error);
      toast({ title: "Error", description: "Regeneration failed", variant: "destructive" });
    }
  };

  const handleEditSave = async () => {
    if (!editingMessageId || !currentConversationId || !config || !sessionId) return;

    try {
      const branchId = await editMessage(editingMessageId, editContent);
      setIsEditDialogOpen(false);
      setEditingMessageId(null);

      if (branchId) {
        // Load the updated messages for the new branch
        const loadedMessages = await loadConversationMessages();

        // Build LLM history from loaded messages
        const llmMessages: LLMMessage[] = [];
        if (agent?.systemInstructions) {
          llmMessages.push({ role: "system", content: agent.systemInstructions });
        }
        llmMessages.push(
          ...loadedMessages.map((m) => ({ role: m.role as any, content: m.content }))
        );

        await streamAssistantResponse(llmMessages, currentConversationId);
      }
    } catch (error) {
      console.error("Edit error:", error);
      toast({ title: "Error", description: "Edit failed", variant: "destructive" });
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  };

  const handleBranchChange = async (branchId: string) => {
    await switchBranch(branchId);
    await loadConversationMessages();
  };

  // ─── Not configured screen ────────────────────────────────────────────────
  if (!isConfigured) {
    return (
      <Layout>
        <div className="flex flex-col h-full">
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-sm">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No LLM Configured</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Set up your LLM provider and API key to start chatting.
              </p>
              <Button asChild className="w-full">
                <Link to="/settings">Configure LLM</Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // True only when the CURRENT conversation is streaming (not a background one)
  const isCurrentConvLoading =
    isLoading && streamingConvIdRef.current === currentConversationId;

  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  return (
    <Layout>
      <div className="flex flex-col h-full bg-background">
        {/* ─── Header ─── */}
        <div className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex-1 min-w-0">
            {isLoadingConversation && messages.length === 0 ? (
              <div className="h-5 w-40 bg-muted animate-pulse rounded" />
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-base font-semibold text-foreground truncate">
                  {workspace
                    ? workspace.name
                    : agent
                      ? `Chat with ${agent.name}`
                      : currentConversation?.title || "New Chat"}
                </h1>
                {/* Branch navigation */}
                {availableBranches.length > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={availableBranches.indexOf(currentBranchId || "default") <= 0}
                      onClick={() => {
                        const idx = availableBranches.indexOf(currentBranchId || "default");
                        if (idx > 0) handleBranchChange(availableBranches[idx - 1]);
                      }}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {availableBranches.indexOf(currentBranchId || "default") + 1} /{" "}
                      {availableBranches.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={
                        availableBranches.indexOf(currentBranchId || "default") >=
                        availableBranches.length - 1
                      }
                      onClick={() => {
                        const idx = availableBranches.indexOf(currentBranchId || "default");
                        if (idx < availableBranches.length - 1)
                          handleBranchChange(availableBranches[idx + 1]);
                      }}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {workspace ? (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {workspaceAgents.length} agent{workspaceAgents.length !== 1 ? "s" : ""}
                </span>
              ) : agent ? (
                agent.persona
              ) : (
                config?.model
              )}
            </p>
          </div>

          {/* Workspace agent selector */}
          {workspace && workspaceAgents.length > 0 && (
            <div className="flex flex-wrap gap-1.5 ml-4">
              {workspaceAgents.map((wa) => (
                <Button
                  key={wa.id}
                  variant={agent?.id === wa.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => loadAgent(wa.id)}
                  className="text-xs h-7"
                >
                  {wa.name}
                  {workspace.leadAgentId === wa.id && (
                    <span className="ml-1 text-xs opacity-70">(Lead)</span>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Messages ─── */}
        <MessageList
          messages={messages}
          isLoadingConversation={isLoadingConversation}
          onEdit={(messageId) => {
            const msg = messages.find((m) => m.id === messageId);
            if (!msg) return;
            setEditingMessageId(messageId);
            setEditContent(msg.content || "");
            setIsEditDialogOpen(true);
          }}
          onRegenerate={handleRegenerate}
          onStop={handleStopStreaming}
        />

        {/* ─── Edit Message Dialog ─── */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Message</DialogTitle>
              <DialogDescription>
                Editing will create a new branch and generate a fresh response.
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="edit-content" className="mb-2 block">
                Message
              </Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={!editContent.trim() || isLoading}>
                Save & Regenerate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Input Area ─── */}
        <div className="border-t border-border bg-background px-4 py-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSendMessage}>
              <div className="relative flex items-end gap-2 bg-card border border-border rounded-xl px-4 py-3 shadow-sm focus-within:ring-1 focus-within:ring-ring transition-shadow">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={adjustTextareaHeight}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder={
                    !currentConversationId
                      ? "Select or create a conversation to start chatting..."
                      : "Message... (Enter to send, Shift+Enter for new line)"
                  }
                  disabled={isCurrentConvLoading || !currentConversationId}
                  rows={1}
                  className={cn(
                    "flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm",
                    "min-h-[24px] max-h-[200px] leading-6"
                  )}
                />
                <div className="flex items-center gap-1 shrink-0">
                  {isCurrentConvLoading ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={handleStopStreaming}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      title="Stop generating"
                    >
                      <Square className="w-4 h-4 fill-current" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!input.trim() || !currentConversationId || isCurrentConvLoading}
                      className="h-8 w-8"
                      title="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                AI can make mistakes. Verify important information.
              </p>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
