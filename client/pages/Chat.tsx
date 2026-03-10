import { useState, useRef, useEffect } from "react";
import { Send, Plus, AlertCircle, Trash2, Edit2, Check, X } from "lucide-react";
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
} from "@/lib/llm-service";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/contexts/SessionContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  agentId?: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  persona: string;
  systemInstructions: string;
  status: "active" | "inactive";
}

export default function Chat() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { sessionId: contextSessionId, currentConversationId: contextConversationId, setCurrentConversationId: setContextConversationId, isLoadingSession } = useSession();

  // Get sessionId and conversationId from URL params if provided, otherwise use context
  const urlSessionId = searchParams.get("sessionId");
  const urlConversationId = searchParams.get("conversationId");
  const sessionId = urlSessionId || contextSessionId;
  const currentConversationId = urlConversationId || contextConversationId;

  const setCurrentConversationId = (id: string | null) => {
    setContextConversationId(id);
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Load agent if agentId is provided in URL
  useEffect(() => {
    const agentId = searchParams.get("agentId");
    if (agentId) {
      loadAgent(agentId);
    }
  }, [searchParams]);

  // Load conversations when sessionId changes
  // Skip isLoadingSession check if we have sessionId from URL (it might be initializing)
  useEffect(() => {
    if (!sessionId) return;
    if (isLoadingSession && !urlSessionId) return; // Only wait for context if no URL param
    loadConversations();
  }, [sessionId, isLoadingSession, urlSessionId]);

  // Load conversation messages when currentConversationId changes
  useEffect(() => {
    if (!currentConversationId || !sessionId) return;
    loadConversationMessages();
  }, [currentConversationId, sessionId, urlConversationId]);

  const loadConversations = async () => {
    if (!sessionId) return;
    setIsLoadingConversations(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/conversations`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);

        // If no conversation is selected, select the first one
        if (!currentConversationId && data.conversations.length > 0) {
          setCurrentConversationId(data.conversations[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadAgent = async (agentId: string) => {
    try {
      setIsLoadingAgent(true);
      const response = await fetch(`/api/agents/${agentId}`);
      if (response.ok) {
        const agentData = await response.json();
        setAgent(agentData);
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
        setMessages(data.messages || []);
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

  const createNewConversation = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation" }),
      });

      if (response.ok) {
        const newConversation = await response.json();
        setConversations((prev) => [newConversation, ...prev]);
        setCurrentConversationId(newConversation.id);
        setMessages([]);
        toast({
          title: "Success",
          description: "New conversation created",
        });
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    }
  };

  const renameConversation = async (conversationId: string, newTitle: string) => {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/conversations/${conversationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        }
      );

      if (response.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, title: newTitle } : c))
        );
        toast({
          title: "Success",
          description: "Conversation renamed",
        });
      }
    } catch (error) {
      console.error("Error renaming conversation:", error);
      toast({
        title: "Error",
        description: "Failed to rename conversation",
        variant: "destructive",
      });
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/conversations/${conversationId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (currentConversationId === conversationId) {
          const remaining = conversations.filter((c) => c.id !== conversationId);
          setCurrentConversationId(remaining.length > 0 ? remaining[0].id : null);
          setMessages([]);
        }
        toast({
          title: "Success",
          description: "Conversation deleted",
        });
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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

      // Immediately update UI with user message
      setMessages((prev) => [...prev, userMessage]);

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

      const llmPromise = provider.generateResponse(llmMessages);

      // Wait for LLM response (don't wait for user save)
      const response = await llmPromise;

      // Create assistant message and update UI optimistically
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

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
      fetch(
        `/api/sessions/${sessionId}/conversations/${currentConversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "assistant",
            content: response.content,
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

      // Ensure user save completes
      await userSavePromise;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get response";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsSavingMessage(false);
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
        {/* Sidebar */}
        <div className="w-64 border-r border-border dark:border-border flex flex-col bg-card dark:bg-card">
          {/* New Conversation Button */}
          <div className="p-4 border-b border-border dark:border-border">
            <Button
              onClick={createNewConversation}
              className="w-full gap-2 bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No conversations yet. Start a new one!
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group relative rounded-lg p-3 cursor-pointer transition-colors",
                      currentConversationId === conversation.id
                        ? "bg-primary/10 text-primary dark:bg-primary/10"
                        : "hover:bg-secondary dark:hover:bg-secondary text-foreground dark:text-foreground"
                    )}
                    onClick={() => setCurrentConversationId(conversation.id)}
                  >
                    <div className="pr-8">
                      {editingConversationId === conversation.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-1 text-sm bg-background dark:bg-background border border-border dark:border-border rounded px-2 py-1"
                            autoFocus
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              renameConversation(conversation.id, editingTitle);
                              setEditingConversationId(null);
                            }}
                            className="p-1 hover:bg-primary/20 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingConversationId(null);
                            }}
                            className="p-1 hover:bg-secondary rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium truncate">
                            {conversation.title}
                          </p>
                          <p className="text-xs opacity-50">
                            {conversation.messageCount} messages
                          </p>
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {editingConversationId !== conversation.id && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingConversationId(conversation.id);
                            setEditingTitle(conversation.title);
                          }}
                          className="p-1 hover:bg-primary/20 rounded"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                "Are you sure you want to delete this conversation?"
                              )
                            ) {
                              deleteConversation(conversation.id);
                            }
                          }}
                          className="p-1 hover:bg-destructive/20 rounded text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-border dark:border-border px-6 py-4 flex items-center justify-between">
            <div>
              {isLoadingConversation || isLoadingAgent ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <h1 className="text-xl font-semibold text-foreground dark:text-foreground">
                    {agent ? `Chat with ${agent.name}` : currentConversation?.title || "Chat"}
                  </h1>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    {agent ? (
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.length === 0 && !isLoadingConversation ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-2">
                    Start a Conversation
                  </h2>
                  <p className="text-muted-foreground dark:text-muted-foreground">
                    Ask me anything and I'll help you out.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 animate-slide-in",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary dark:bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary-foreground dark:text-primary-foreground">
                        A
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-2xl rounded-lg px-4 py-3",
                      message.role === "user"
                        ? "bg-primary dark:bg-primary text-primary-foreground dark:text-primary-foreground"
                        : "bg-card dark:bg-card text-foreground dark:text-foreground border border-border dark:border-border"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-50 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-muted dark:bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-muted-foreground dark:text-muted-foreground">
                        U
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}

            {(isLoading || isSavingMessage) && (
              <div className="flex gap-3 justify-start animate-slide-in">
                <div className="w-8 h-8 rounded-full bg-primary dark:bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary-foreground dark:text-primary-foreground">
                    A
                  </span>
                </div>
                <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

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
