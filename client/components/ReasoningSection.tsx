import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReasoningSectionProps {
  reasoning?: string;
  isStreaming?: boolean;
}

export function ReasoningSection({
  reasoning,
  isStreaming,
}: ReasoningSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const wasStreamingRef = useRef(false);

  // Auto-expand when stream starts; auto-collapse only when stream ends
  useEffect(() => {
    // Use setTimeout to avoid calling setState synchronously within effect
    const timeoutId = setTimeout(() => {
      if (isStreaming && !wasStreamingRef.current) {
        // Stream just started — expand to show thinking
        setIsExpanded(true);
        wasStreamingRef.current = true;
      } else if (!isStreaming && wasStreamingRef.current) {
        // Stream just ended — collapse (reasoning is now complete)
        setIsExpanded(false);
        wasStreamingRef.current = false;
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isStreaming]);

  if (!reasoning && !isStreaming) return null;

  return (
    <div className="mb-3 rounded-lg border border-border/60 bg-muted/40 overflow-hidden">
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
      >
        <Brain className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground flex-1">
          {isStreaming && !reasoning ? "Thinking..." : "Reasoning"}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/60">
          {isStreaming && !reasoning ? (
            <div className="flex gap-1 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
              <div
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                style={{ animationDelay: "0.15s" }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                style={{ animationDelay: "0.3s" }}
              />
            </div>
          ) : (
            <p
              className={cn(
                "text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed",
              )}
            >
              {reasoning}
              {isStreaming && (
                <span className="inline-block w-0.5 h-3 bg-muted-foreground animate-pulse ml-0.5 align-middle" />
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
