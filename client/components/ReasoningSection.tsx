import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReasoningSectionProps {
  reasoning?: string;
  isLoading?: boolean;
}

export function ReasoningSection({ reasoning, isLoading }: ReasoningSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no reasoning content
  if (!reasoning && !isLoading) {
    return null;
  }

  return (
    <div className="mb-3 border border-border/50 dark:border-border/50 rounded-lg bg-muted/30 dark:bg-muted/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 dark:hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-xs font-medium text-muted-foreground">
          {isLoading ? "Reasoning..." : "Reasoning"}
        </span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border/50 dark:border-border/50">
          {isLoading ? (
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
          ) : (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {reasoning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
