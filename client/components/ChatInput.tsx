import { useRef } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  placeholder?: string;
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  onKeyDown,
  disabled,
  isStreaming,
  onStop,
  placeholder = "Message... (Enter to send, Shift+Enter for new line)",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  };

  return (
    <div className="border-t border-border bg-background px-4 py-4 shrink-0">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={onSubmit}>
          <div className="relative flex items-end gap-2 bg-card border border-border rounded-xl px-4 py-3 shadow-sm focus-within:ring-1 focus-within:ring-ring transition-shadow">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={adjustTextareaHeight}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                "flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm min-h-[24px] max-h-[200px]",
                disabled && "opacity-50",
              )}
            />
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onStop}
                className="shrink-0 h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Stop generating"
              >
                <Square className="w-4 h-4 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || disabled}
                className="shrink-0 h-8 w-8 rounded-lg"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
