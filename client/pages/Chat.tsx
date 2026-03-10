import { useState, useRef, useEffect } from "react";
import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  agentName?: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "agent",
      content:
        "Hello! I'm your AI assistant. How can I help you today? You can ask me anything, and I'll do my best to assist.",
      timestamp: new Date(Date.now() - 60000),
      agentName: "Claude",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

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

    // Simulate agent response
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content:
          "I understand. That's an interesting question. I'm still learning about your specific needs. In a production system, I would process your message and provide a thoughtful response. For now, this is a demonstration of the chat interface.",
        timestamp: new Date(),
        agentName: "Claude",
      };
      setMessages((prev) => [...prev, agentMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-background dark:bg-background">
        {/* Header */}
        <div className="border-b border-border dark:border-border px-6 py-4">
          <h1 className="text-xl font-semibold text-foreground dark:text-foreground">
            Chat
          </h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            Conversation with Claude Agent
          </p>
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
                  <p className="text-sm">{message.content}</p>
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
              placeholder="Message Claude..."
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
            This is a demonstration of the AgentHub interface. Connect your AI
            models to start chatting.
          </p>
        </div>
      </div>
    </Layout>
  );
}
