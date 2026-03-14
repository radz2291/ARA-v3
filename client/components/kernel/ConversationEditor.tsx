import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Artifact } from "@shared/types";

interface ConversationData {
  title: string;
  messages: Array<{
    role: "user" | "assistant" | "tool";
    content: string;
    timestamp?: string;
  }>;
  agentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ConversationEditorProps {
  artifact: Artifact;
  onSaved: (updated: Artifact) => void;
}

export function ConversationEditor({
  artifact,
  onSaved,
}: ConversationEditorProps) {
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState<ConversationData["messages"]>([]);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();

  // Parse content on mount and when artifact changes
  useEffect(() => {
    try {
      const parsed: ConversationData = JSON.parse(artifact.content);
      setTitle(parsed.title || "");
      setMessages(parsed.messages || []);
    } catch {
      // If not JSON, treat content as plain text
      setTitle(artifact.name || "");
      setMessages([]);
    }
  }, [artifact.id, artifact.content, artifact.name]);

  const isTitleDirty =
    title !==
    (() => {
      try {
        return JSON.parse(artifact.content).title || "";
      } catch {
        return artifact.name || "";
      }
    })();

  const isMessagesDirty =
    JSON.stringify(messages) !==
    (() => {
      try {
        return JSON.stringify(JSON.parse(artifact.content).messages || []);
      } catch {
        return "[]";
      }
    })();

  const hasDirty = isTitleDirty || isMessagesDirty;

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
  };

  const handleMessageChange = (index: number, newContent: string) => {
    const newMessages = [...messages];
    newMessages[index] = { ...newMessages[index], content: newContent };
    setMessages(newMessages);
    setIsDirty(true);
  };

  const save = useCallback(async () => {
    if (!hasDirty || saving) return;
    setSaving(true);
    try {
      const content = JSON.stringify({
        title,
        messages,
        agentId: (() => {
          try {
            return JSON.parse(artifact.content).agentId;
          } catch {
            return undefined;
          }
        })(),
        createdAt: (() => {
          try {
            return JSON.parse(artifact.content).createdAt;
          } catch {
            return undefined;
          }
        })(),
        updatedAt: new Date().toISOString(),
      });

      const res = await fetch(`/api/artifacts/${artifact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated: Artifact = await res.json();
      onSaved(updated);
      setIsDirty(false);
      toast({ title: "Saved", description: "Conversation updated." });
    } catch {
      toast({
        title: "Error",
        description: "Could not save conversation.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [artifact.id, title, messages, hasDirty, saving, onSaved, toast]);

  // Cmd/Ctrl+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Title input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className={cn(
            "w-full rounded-lg border bg-background text-sm text-foreground",
            "px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40",
            isTitleDirty ? "border-primary/60" : "border-border",
          )}
          placeholder="Conversation title..."
        />
      </div>

      {/* Messages list */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <label className="text-sm font-medium text-foreground">
          Messages ({messages.length})
        </label>
        <ScrollArea className="flex-1 border rounded-lg">
          <div className="p-3 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No messages in this conversation
              </p>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-2 p-3 rounded-lg border",
                    msg.role === "user"
                      ? "bg-muted/50 border-border"
                      : "bg-background border-border",
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {msg.role === "user" ? (
                      <User className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Bot className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground capitalize">
                        {msg.role}
                      </span>
                      {msg.timestamp && (
                        <span className="text-xs text-muted-foreground/60">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <textarea
                      value={msg.content}
                      onChange={(e) =>
                        handleMessageChange(index, e.target.value)
                      }
                      className={cn(
                        "w-full resize-none rounded border bg-background text-sm text-foreground",
                        "p-2 focus:outline-none focus:ring-1 focus:ring-primary/40",
                        "min-h-[60px] border-border",
                      )}
                      placeholder={`${msg.role} message...`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between pt-2 border-t">
        <span
          className={cn(
            "text-xs transition-opacity",
            hasDirty
              ? "text-amber-600 dark:text-amber-400 opacity-100"
              : "opacity-0",
          )}
        >
          • Unsaved changes
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">
            ⌘S to save
          </span>
          <Button
            size="sm"
            onClick={save}
            disabled={!hasDirty || saving}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
