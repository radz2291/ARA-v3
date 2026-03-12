import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  /** 1-based index of the current branch at this message position */
  branchCurrentIndex?: number;
  /** Total number of branches at this message position */
  branchTotal?: number;
  onPrevBranch?: () => void;
  onNextBranch?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onStop?: () => void;
}

/** Compact branch navigation shown inside a message bubble */
function BranchNav({
  currentIndex,
  total,
  onPrev,
  onNext,
  light = false,
}: {
  currentIndex: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  light?: boolean;
}) {
  const textCls = light
    ? "text-primary-foreground/70"
    : "text-muted-foreground";
  const btnCls = light
    ? "hover:bg-primary-foreground/10 text-primary-foreground/70 disabled:opacity-30"
    : "hover:bg-muted text-muted-foreground disabled:opacity-30";

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onPrev}
        disabled={!onPrev}
        className={cn(
          "h-5 w-5 flex items-center justify-center rounded transition-colors",
          btnCls
        )}
        title="Previous version"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>
      <span className={cn("text-xs tabular-nums select-none px-0.5", textCls)}>
        {currentIndex} / {total}
      </span>
      <button
        onClick={onNext}
        disabled={!onNext}
        className={cn(
          "h-5 w-5 flex items-center justify-center rounded transition-colors",
          btnCls
        )}
        title="Next version"
      >
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

export function MessageItem({
  messageId,
  role,
  content,
  reasoning,
  timestamp,
  executionSteps,
  isPartialContent,
  branchCurrentIndex,
  branchTotal,
  onPrevBranch,
  onNextBranch,
  onEdit,
  onRegenerate,
  onStop,
}: MessageItemProps) {
  const isStreaming = !!isPartialContent;
  const hasBranches = branchCurrentIndex !== undefined && branchTotal !== undefined && branchTotal > 1;

  const timeStr = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── User message ─────────────────────────────────────────────
  if (role === "user") {
    return (
      <div className="group flex justify-end gap-3">
        <div className="flex flex-col items-end max-w-[80%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>

            {/* Branch navigation + timestamp row — always visible when branched */}
            <div
              className={cn(
                "flex items-center gap-2 mt-2 pt-2 border-t border-primary-foreground/20",
                hasBranches ? "opacity-100" : "opacity-0 group-hover:opacity-70 transition-opacity"
              )}
            >
              <span className="text-xs text-primary-foreground/60 flex-1">{timeStr}</span>
              {hasBranches && (
                <BranchNav
                  currentIndex={branchCurrentIndex}
                  total={branchTotal}
                  onPrev={onPrevBranch}
                  onNext={onNextBranch}
                  light
                />
              )}
              <MessageActions
                messageId={messageId}
                role="user"
                content={content}
                isStreaming={false}
                onEdit={onEdit}
                light
              />
            </div>
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
        ) : isStreaming && (!executionSteps || executionSteps.length === 0) && !reasoning ? (
          <div className="flex gap-1 py-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.15s" }} />
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.3s" }} />
          </div>
        ) : null}

        {/* Tool execution steps */}
        {executionSteps && executionSteps.length > 0 && (
          <ToolExecutionSteps steps={executionSteps} />
        )}

        {/* Bottom row: timestamp + branch nav + actions */}
        <div
          className={cn(
            "flex items-center gap-2 mt-2 transition-opacity",
            isStreaming || hasBranches ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <span className="text-xs text-muted-foreground">{timeStr}</span>

          {/* Branch navigation for assistant */}
          {hasBranches && (
            <BranchNav
              currentIndex={branchCurrentIndex}
              total={branchTotal}
              onPrev={onPrevBranch}
              onNext={onNextBranch}
            />
          )}

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
