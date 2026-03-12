import { useRef, useEffect } from "react";
import { MessageItem } from "@/components/MessageItem";
import { ExecutionStep } from "@/components/ToolExecutionSteps";

interface Message {
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

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isLoadingConversation?: boolean;
  currentBranchId?: string | null;
  availableBranches?: string[];
  onEdit?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onStop?: (messageId: string) => void;
  onBranchChange?: (branchId: string) => void;
  loadingMessageId?: string | null;
}

export function MessageList({
  messages,
  isLoading,
  isLoadingConversation,
  currentBranchId,
  availableBranches = [],
  onEdit,
  onRegenerate,
  onStop,
  onBranchChange,
  loadingMessageId,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
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
          <MessageItem
            key={message.id}
            messageId={message.id}
            role={message.role}
            content={message.content}
            reasoning={message.reasoning}
            timestamp={message.timestamp}
            executionSteps={message.executionSteps}
            isLoading={isLoading && loadingMessageId === message.id}
            currentBranchId={currentBranchId}
            availableBranches={availableBranches}
            onEdit={onEdit ? () => onEdit(message.id) : undefined}
            onRegenerate={onRegenerate ? () => onRegenerate(message.id) : undefined}
            onStop={onStop ? () => onStop(message.id) : undefined}
            onBranchChange={onBranchChange}
          />
        ))
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
