import { cn } from "@/lib/utils";
import {
  ToolExecutionSteps,
  ExecutionStep,
} from "@/components/ToolExecutionSteps";
import { ReasoningSection } from "@/components/ReasoningSection";
import { MarkdownContent } from "@/components/MarkdownContent";
import { MessageActions } from "@/components/MessageActions";

interface MessageItemProps {
  messageId: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: string;
  executionSteps?: ExecutionStep[];
  isPartialContent?: boolean;
  onEdit?: () => void;
  onRegenerate?: () => void;
}

export function MessageItem({
  messageId,
  role,
  content,
  reasoning,
  timestamp,
  executionSteps,
  isPartialContent,
  onEdit,
  onRegenerate,
}: MessageItemProps) {
  const isStreaming = !!isPartialContent;

  const timeStr = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── User message ─────────────────────────────────────────────
  if (role === "user") {
    return (
      <div className="group flex justify-end gap-3">
        <div className="flex flex-col items-end max-w-[80%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {content}
            </p>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 mt-1 px-1 transition-opacity",
              "opacity-0 group-hover:opacity-100",
            )}
          >
            <MessageActions
              messageId={messageId}
              role="user"
              content={content}
              isStreaming={false}
              onEdit={onEdit}
            />
            <span className="text-xs text-muted-foreground">
              {timeStr}
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
          <span className="text-xs font-semibold text-muted-foreground">U</span>
        </div>
      </div>
    );
  }

  // ── Assistant message ─────────────────────────────────────────
  return (
    <div className="group flex gap-3">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
        <span className="text-xs font-bold text-primary-foreground">A</span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Reasoning section */}
        {(reasoning || (isStreaming && !content)) && (
          <ReasoningSection
            reasoning={reasoning}
            isStreaming={isStreaming && !content}
          />
        )}

        {/* Main content */}
        {content ? (
          <div className="relative">
            <MarkdownContent content={content} />
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-foreground/70 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        ) : isStreaming &&
          (!executionSteps || executionSteps.length === 0) &&
          !reasoning ? (
          <div className="flex gap-1 py-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
            <div
              className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: "0.15s" }}
            />
            <div
              className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: "0.3s" }}
            />
          </div>
        ) : null}

        {/* Tool execution steps */}
        {executionSteps && executionSteps.length > 0 && (
          <ToolExecutionSteps steps={executionSteps} />
        )}

        {/* Bottom row: timestamp + actions */}
        <div
          className={cn(
            "flex items-center gap-2 mt-2 transition-opacity",
            isStreaming ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <span className="text-xs text-muted-foreground">{timeStr}</span>

          <MessageActions
            messageId={messageId}
            role="assistant"
            content={content}
            reasoning={reasoning}
            isStreaming={isStreaming}
            onRegenerate={onRegenerate}
          />
        </div>
      </div>
    </div>
  );
}
