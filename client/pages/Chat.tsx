import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  LLMMessage,
  createLLMProvider,
  configStore,
  LLMConfig,
} from "@/lib/llm-service";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  agentName?: string;
}

export default function Chat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load configuration on mount
  useEffect(() => {
    const savedConfig = configStore.load();
    setConfig(savedConfig);
    setIsConfigured(!!savedConfig);

    // Show welcome message if configured
    if (savedConfig) {
      setMessages([
        {
          id: "1",
          role: "agent",
          content: `Hello! I'm using ${savedConfig.provider.toUpperCase()} (${savedConfig.model}). How can I help you today?`,
          timestamp: new Date(Date.now() - 60000),
          agentName: "Agent",
        },
      ]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !config) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Create provider and send message
      const provider = createLLMProvider(config);

      // Convert messages to LLMMessage format
      const llmMessages: LLMMessage[] = messages
        .filter((m) => m.role !== "agent" || m.content !== "")
        .map((m) => ({
          role: m.role === "agent" ? "assistant" : "user",
          content: m.content,
        }))
        .concat({
          role: "user",
          content: userMessage.content,
        });

      // Call LLM API
      const response = await provider.generateResponse(llmMessages);

      // Add agent response
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: response.content,
        timestamp: new Date(),
        agentName: config.provider.toUpperCase(),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get response";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Add error message to chat
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: "agent",
        content: `Sorry, I encountered an error: ${errorMessage}. Please check your API key in Settings.`,
        timestamp: new Date(),
        agentName: "System",
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
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
                  <p className="font-medium">Supported Providers:</p>
                  <ul className="space-y-1">
                    <li>• Z.ai</li>
                    <li>• Claude (Anthropic)</li>
                    <li>• GPT-4 (OpenAI)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full bg-background dark:bg-background">
        {/* Header */}
        <div className="border-b border-border dark:border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground dark:text-foreground">
              Chat
            </h1>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              {config?.provider.toUpperCase()} • {config?.model}
            </p>
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
          {messages.length === 0 ? (
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
                {message.role === "agent" && (
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
                    {message.timestamp.toLocaleTimeString([], {
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

          {isLoading && (
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hover:bg-secondary dark:hover:bg-secondary"
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-card dark:bg-card border-border dark:border-border text-foreground dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
              disabled={isLoading}
            />

            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>

          <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-3">
            Connect to{" "}
            <Button
              asChild
              variant="link"
              className="p-0 h-auto text-xs text-primary"
            >
              <Link to="/settings">Settings</Link>
            </Button>{" "}
            to change your LLM provider.
          </p>
        </div>
      </div>
    </Layout>
  );
}
