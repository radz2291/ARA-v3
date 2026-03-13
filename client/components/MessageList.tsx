import { useRef, useEffect } from "react";
import { MessageItem } from "@/components/MessageItem";
import { ExecutionStep } from "@/components/ToolExecutionSteps";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: string;
  executionSteps?: ExecutionStep[];
  parentMessageId?: string;
  isPartialContent?: boolean;
}

interface MessageListProps {
  messages: Message[];
  isLoadingConversation?: boolean;
  onEdit?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onStop?: () => void;
}

export function MessageList({
  messages,
  isLoadingConversation,
  onEdit,
  onRegenerate,
  onStop,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoadingConversation && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
            <div
              className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: "0.1s" }}
            />
            <div
              className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
          <p className="text-sm">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            How can I help?
          </h2>
          <p className="text-muted-foreground text-sm">
            Ask anything — I'm ready to assist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;

          return (
            <MessageItem
              key={message.id}
              messageId={message.id}
              role={message.role}
              content={message.content}
              reasoning={message.reasoning}
              timestamp={message.timestamp}
              executionSteps={message.executionSteps}
              isPartialContent={!!message.isPartialContent}
              onEdit={onEdit ? () => onEdit(message.id) : undefined}
              onRegenerate={
                message.role === "assistant" && onRegenerate
                  ? () => onRegenerate(message.id)
                  : undefined
              }
              onStop={isLast && message.isPartialContent ? onStop : undefined}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
