import { cn } from "@/lib/utils";
import { ToolExecutionSteps, ExecutionStep } from "@/components/ToolExecutionSteps";
import { ReasoningSection } from "@/components/ReasoningSection";
import { MarkdownContent } from "@/components/MarkdownContent";
import { MessageActions } from "@/components/MessageActions";
import { BranchNavigation } from "@/components/BranchNavigation";

interface MessageItemProps {
  messageId: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: string;
  executionSteps?: ExecutionStep[];
  isLoading?: boolean;
  currentBranchId?: string | null;
  availableBranches?: string[];
  onEdit?: () => void;
  onRegenerate?: () => void;
  onStop?: () => void;
  onBranchChange?: (branchId: string) => void;
}

export function MessageItem({
  messageId,
  role,
  content,
  reasoning,
  timestamp,
  executionSteps,
  isLoading,
  currentBranchId,
  availableBranches = [],
  onEdit,
  onRegenerate,
  onStop,
  onBranchChange,
}: MessageItemProps) {
  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-in",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {role === "assistant" && (
        <div className="w-8 h-8 rounded-full bg-primary dark:bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary-foreground dark:text-primary-foreground">
            A
          </span>
        </div>
      )}

      <div className="max-w-2xl w-full">
        <div
          className={cn(
            "rounded-lg px-4 py-3",
            role === "user"
              ? "bg-primary dark:bg-primary text-primary-foreground dark:text-primary-foreground"
              : "bg-card dark:bg-card text-foreground dark:text-foreground border border-border dark:border-border"
          )}
        >
          {/* Reasoning section - only for assistant messages */}
          {role === "assistant" && (
            <ReasoningSection reasoning={reasoning} isLoading={isLoading && !content} />
          )}

          {/* Content section */}
          {content ? (
            role === "assistant" ? (
              <MarkdownContent content={content} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{content}</p>
            )
          ) : (
            role === "assistant" &&
            (!executionSteps || executionSteps.length === 0) &&
            isLoading && (
              <div className="flex gap-1 py-1">
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
            )
          )}

          {/* Execution steps */}
          {executionSteps && executionSteps.length > 0 && (
            <ToolExecutionSteps steps={executionSteps} />
          )}

          {/* Timestamp */}
          <p className="text-xs opacity-50 mt-2">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {/* Message actions */}
          <MessageActions
            messageId={messageId}
            role={role}
            content={content}
            reasoning={reasoning}
            isLoading={isLoading}
            onEdit={onEdit}
            onRegenerate={onRegenerate}
            onStop={onStop}
          />
        </div>

        {/* Branch navigation - only for assistant messages */}
        {role === "assistant" && availableBranches.length > 1 && onBranchChange && (
          <BranchNavigation
            currentBranchId={currentBranchId}
            availableBranches={availableBranches}
            onBranchChange={onBranchChange}
            className="mt-2"
          />
        )}
      </div>

      {role === "user" && (
        <div className="w-8 h-8 rounded-full bg-muted dark:bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-muted-foreground dark:text-muted-foreground">
            U
          </span>
        </div>
      )}
    </div>
  );
}
