import { useState, useEffect, useCallback, useRef } from "react";
import { Send, AlertCircle, Users, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";
import { LLMMessage, configStore, LLMConfig } from "@/lib/llm-service";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/contexts/SessionContext";
import { useConversationStore } from "@/contexts/ConversationStore";
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

// Re-export Message type so downstream components can import it from here if needed
export type { Message } from "@/contexts/ConversationStore";

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
  } = useSession();

  const {
    getConvState,
    setConvMessages,
    startStream,
    stopStream,
    loadMessages,
    patchConvMessage,
  } = useConversationStore();

  const urlSessionId = searchParams.get("sessionId");
  const urlConversationId = searchParams.get("conversationId");
  const workspaceId = searchParams.get("workspaceId");
  const urlAgentId = searchParams.get("agentId");
  const sessionId = urlSessionId || contextSessionId;
  const currentConversationId = urlConversationId || contextConversationId;

  const setCurrentConversationId = (id: string | null) => {
    setContextConversationId(id);
  };

  // ── Local UI-only state (not streaming concerns) ─────────────────────────
  const [input, setInput] = useState("");
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [workspaceAgents, setWorkspaceAgents] = useState<Agent[]>([]);
  const [agentTools, setAgentTools] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // ── Read current conversation's state from the global store ─────────────
  const convState = getConvState(currentConversationId);
  const messages = convState.messages;
  const isStreaming = convState.isStreaming;
  const isLoadingConversation = convState.isLoading;

  // ── Load configuration on mount ──────────────────────────────────────────
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
    if (workspaceId) loadWorkspace(workspaceId);
  }, [workspaceId]);

  // Load agent if agentId is provided in URL
  useEffect(() => {
    if (urlAgentId) loadAgent(urlAgentId);
  }, [urlAgentId]);

  // ── Load messages when conversation changes ──────────────────────────────
  useEffect(() => {
    if (!currentConversationId || !sessionId) return;
    // loadMessages is smart: skips if already loaded or streaming
    loadMessages(currentConversationId, sessionId);
  }, [currentConversationId, sessionId]);

  // ── Side-loaded data ─────────────────────────────────────────────────────
  const loadWorkspace = async (id: string) => {
    try {
      setIsLoadingWorkspace(true);
      const response = await fetch(`/api/workspaces/${id}`);
      if (response.ok) {
        const workspaceData = await response.json();
        setWorkspace(workspaceData);
        const agentPromises = workspaceData.agentIds.map((agentId: string) =>
          fetch(`/api/agents/${agentId}`).then((r) => (r.ok ? r.json() : null)),
        );
        const agents = await Promise.all(agentPromises);
        setWorkspaceAgents(agents.filter((a): a is Agent => a !== null));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load workspace",
        variant: "destructive",
      });
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
          toast({
            title: "Error",
            description: "Failed to load agent tools",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load agent",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAgent(false);
    }
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (
      !input.trim() ||
      !config ||
      !currentConversationId ||
      !sessionId ||
      isStreaming
    )
      return;

    const userContent = input.trim();
    setInput("");

    // Get fresh messages directly from store for LLM history
    // This ensures we have the latest state after any previous updates
    const currentConvState = getConvState(currentConversationId);
    const currentMessages = currentConvState.messages;
    const isFirstMessage = currentMessages.length === 0;
    const lastExistingMsgId = currentMessages.slice(-1)[0]?.id;

    const userTempId = `temp-user-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Build history with the new user message
    const historyWithUser = [
      ...currentMessages,
      {
        id: userTempId,
        role: "user" as const,
        content: userContent,
        timestamp,
      },
    ];

    // Optimistically add user message to the store immediately
    setConvMessages(currentConversationId, historyWithUser);

    // Save user message to server (fire & forget)
    const userSavePromise = fetch(
      `/api/sessions/${sessionId}/conversations/${currentConversationId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content: userContent,
          parentMessageId: lastExistingMsgId,
        }),
      },
    );

    // Build LLM message history
    const llmMessages: LLMMessage[] = [];
    if (agent?.systemInstructions) {
      llmMessages.push({ role: "system", content: agent.systemInstructions });
    }
    llmMessages.push(
      ...historyWithUser.map((m) => ({
        role: m.role as any,
        content: m.content,
      })),
    );

    // Fire-and-forget stream — the store owns it from here
    const convId = currentConversationId;
    startStream(llmMessages, {
      sessionId,
      conversationId: convId,
      config,
      agentTools,
      workspaceId,
      parentMessageId: userTempId,
      onFinished: async (finishedConvId) => {
        // Auto-rename on first message
        if (isFirstMessage) {
          const words = userContent.split(" ").slice(0, 5).join(" ");
          const title = words.length > 50 ? words.slice(0, 50) + "..." : words;
          renameConversation(finishedConvId, title).catch(() => {});
        }
        // Notify if user is viewing a different conversation
        if (finishedConvId !== convId) {
          const conv = conversations.find((c) => c.id === finishedConvId);
          toast({
            title: "Response ready",
            description: `Response ready in '${conv?.title || "Conversation"}'`,
          });
        }
      },
    });

    // Sync server-assigned user message ID without overwriting other messages
    // (e.g. the streaming assistant placeholder added by startStream)
    try {
      const userResp = await userSavePromise;
      if (userResp.ok) {
        const savedUser = await userResp.json();
        patchConvMessage(convId, userTempId, { id: savedUser.id });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to save message",
        variant: "destructive",
      });
    }
  };

  const handleStopStreaming = () => {
    if (currentConversationId) {
      stopStream(currentConversationId);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (!sessionId || !currentConversationId || !config || isStreaming) return;
    const convId = currentConversationId;

    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/conversations/${convId}/messages/${messageId}/regenerate`,
        { method: "POST" },
      );
      if (!response.ok) {
        throw new Error("Regeneration failed");
      }
      const result = await response.json();

      // Use the truncated messages returned directly from the server response.
      // This avoids a secondary GET request that could race with the initial load fetch.
      const truncatedMessages: import("@/contexts/ConversationStore").Message[] =
        result.messages.map((m: any, idx: number) => ({
          ...m,
          id: m.id || `msg-${Date.now()}-${idx}`,
        }));

      // Update the store immediately with the authoritative truncated list
      setConvMessages(convId, truncatedMessages);

      const llmMessages: LLMMessage[] = [];
      if (agent?.systemInstructions) {
        llmMessages.push({ role: "system", content: agent.systemInstructions });
      }
      llmMessages.push(
        ...truncatedMessages.map((m) => ({
          role: m.role as any,
          content: m.content,
        })),
      );

      const lastUserMsg = [...truncatedMessages]
        .reverse()
        .find((m) => m.role === "user");
      startStream(llmMessages, {
        sessionId,
        conversationId: convId,
        config,
        agentTools,
        workspaceId,
        parentMessageId: lastUserMsg?.id,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Regeneration failed",
        variant: "destructive",
      });
    }
  };

  const handleEditSave = async () => {
    if (!editingMessageId || !currentConversationId || !config || !sessionId)
      return;
    const convId = currentConversationId;

    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/conversations/${convId}/messages/${editingMessageId}/edit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editContent }),
        },
      );
      if (!response.ok) {
        throw new Error("Edit failed");
      }
      const result = await response.json();
      setIsEditDialogOpen(false);
      setEditingMessageId(null);

      if (result.messages) {
        // Use the truncated messages returned directly from the server
        const truncatedMessages: import("@/contexts/ConversationStore").Message[] =
          result.messages.map((m: any, idx: number) => ({
            ...m,
            id: m.id || `msg-${Date.now()}-${idx}`,
          }));

        // Update the store immediately with the authoritative truncated list
        setConvMessages(convId, truncatedMessages);

        const llmMessages: LLMMessage[] = [];
        if (agent?.systemInstructions) {
          llmMessages.push({
            role: "system",
            content: agent.systemInstructions,
          });
        }
        llmMessages.push(
          ...truncatedMessages.map((m) => ({
            role: m.role as any,
            content: m.content,
          })),
        );

        const lastUserMsg = [...truncatedMessages]
          .reverse()
          .find((m) => m.role === "user");
        startStream(llmMessages, {
          sessionId,
          conversationId: convId,
          config,
          agentTools,
          workspaceId,
          parentMessageId: lastUserMsg?.id,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Edit failed",
        variant: "destructive",
      });
    }
  };

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
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

  // ─── Not configured screen ────────────────────────────────────────────────
  if (!isConfigured) {
    return (
      <Layout>
        <div className="flex flex-col h-full">
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-sm">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No LLM Configured
              </h2>
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

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId,
  );

  return (
    <Layout>
      <div className="flex flex-col h-full bg-background">
        {/* ─── Header ─── */}
        <div className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex-1 min-w-0">
            {isLoadingConversation && messages.length === 0 ? (
              <div className="h-5 w-40 bg-muted animate-pulse rounded" />
            ) : (
              <h1 className="text-base font-semibold text-foreground truncate">
                {workspace
                  ? workspace.name
                  : agent
                    ? `Chat with ${agent.name}`
                    : currentConversation?.title || "New Chat"}
              </h1>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {workspace ? (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {workspaceAgents.length} agent
                  {workspaceAgents.length !== 1 ? "s" : ""}
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
        />

        {/* ─── Edit Message Dialog ─── */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Message</DialogTitle>
              <DialogDescription>
                Editing will update the message and generate a fresh response.
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
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSave}
                disabled={!editContent.trim() || isStreaming}
              >
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
                  disabled={!currentConversationId}
                  rows={1}
                  className={cn(
                    "flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm min-h-[24px] max-h-[200px]",
                    !currentConversationId && "opacity-50",
                  )}
                />
                {isStreaming ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleStopStreaming}
                    className="shrink-0 h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Stop generating"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() || !currentConversationId}
                    className="shrink-0 h-8 w-8 rounded-lg"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
