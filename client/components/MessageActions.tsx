import { Copy, Edit2, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MessageActionsProps {
  messageId: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  isLoading?: boolean;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onStop?: () => void;
}

export function MessageActions({
  messageId,
  role,
  content,
  reasoning,
  isLoading,
  onEdit,
  onRegenerate,
  onStop,
}: MessageActionsProps) {
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      const textToCopy = reasoning ? `${reasoning}\n\n${content}` : content;
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex gap-1 mt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        title="Copy message"
        className="h-8 w-8 p-0 hover:bg-secondary dark:hover:bg-secondary"
      >
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      </Button>

      {isLoading && onStop && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onStop}
          title="Stop response"
          className="h-8 w-8 p-0 hover:bg-destructive/10 dark:hover:bg-destructive/10"
        >
          <Square className="w-3.5 h-3.5 text-destructive" />
        </Button>
      )}

      {role === "user" && onEdit && !isLoading && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          title="Edit message"
          className="h-8 w-8 p-0 hover:bg-secondary dark:hover:bg-secondary"
        >
          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      )}

      {role === "assistant" && onRegenerate && !isLoading && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          title="Regenerate response"
          className="h-8 w-8 p-0 hover:bg-secondary dark:hover:bg-secondary"
        >
          <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
