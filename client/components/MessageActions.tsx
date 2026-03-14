import { Copy, Edit2, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface MessageActionsProps {
  messageId: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  isStreaming?: boolean;
  /** Use light (inverted) icon colors — for use on primary-color backgrounds */
  light?: boolean;
  onEdit?: () => void;
  onRegenerate?: () => void;
}

export function MessageActions({
  messageId,
  role,
  content,
  reasoning,
  isStreaming,
  light,
  onEdit,
  onRegenerate,
}: MessageActionsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  if (isStreaming) {
    // While streaming: hide actions
    return null;
  }

  const iconCls = light
    ? "text-primary-foreground/60 hover:text-primary-foreground"
    : "text-muted-foreground hover:text-foreground";

  return (
    <div className="flex items-center gap-0.5">
      {/* Copy */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        title="Copy"
        className={`h-7 w-7 ${iconCls}`}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </Button>

      {/* Edit — user messages only */}
      {role === "user" && onEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          title="Edit message"
          className={`h-7 w-7 ${iconCls}`}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
      )}

      {/* Regenerate — assistant messages only */}
      {role === "assistant" && onRegenerate && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRegenerate}
          title="Regenerate response"
          className={`h-7 w-7 ${iconCls}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
