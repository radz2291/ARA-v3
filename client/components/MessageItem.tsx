import { cn } from "@/lib/utils";
import { ToolExecutionSteps, ExecutionStep } from "@/components/ToolExecutionSteps";
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
  onStop?: () => void;
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
  onStop,
}: MessageItemProps) {
  const isStreaming = !!isPartialContent;

  if (role === "user") {
    return (
      <div className="group flex justify-end gap-3">
        <div className="flex flex-col items-end max-w-[80%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
          </div>
          {/* Actions — visible on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
            <MessageActions
              messageId={messageId}
              role="user"
              content={content}
              isStreaming={false}
              onEdit={onEdit}
            />
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
          <span className="text-xs font-semibold text-muted-foreground">U</span>
        </div>
      </div>
    );
  }

  // ── Assistant message ────────────────────────────────────────
  return (
    <div className="group flex gap-3">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
        <span className="text-xs font-bold text-primary-foreground">A</span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Reasoning section */}
        {(reasoning || isStreaming) && (
          <ReasoningSection
            reasoning={reasoning}
            isStreaming={isStreaming && !content}
          />
        )}

        {/* Main content */}
        {content ? (
          <div className="relative">
            <MarkdownContent content={content} />
            {/* Streaming cursor */}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-foreground/70 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        ) : isStreaming && (!executionSteps || executionSteps.length === 0) && !reasoning ? (
          /* Initial loading dots — no content yet */
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

        {/* Timestamp + actions — visible on hover (or while streaming for stop) */}
        <div
          className={cn(
            "flex items-center gap-2 mt-2 transition-opacity",
            isStreaming ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <span className="text-xs text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <MessageActions
            messageId={messageId}
            role="assistant"
            content={content}
            reasoning={reasoning}
            isStreaming={isStreaming}
            onRegenerate={onRegenerate}
            onStop={onStop}
          />
        </div>
      </div>
    </div>
  );
}
