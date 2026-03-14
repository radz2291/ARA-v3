import { useState, useEffect, useRef, useCallback } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Artifact } from "@shared/types";

interface ArtifactEditorProps {
  artifact: Artifact;
  onSaved: (updated: Artifact) => void;
}

export function ArtifactEditor({ artifact, onSaved }: ArtifactEditorProps) {
  const [content, setContent] = useState(artifact.content);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const isDirty = content !== artifact.content;

  // Reset when artifact changes
  useEffect(() => {
    setContent(artifact.content);
  }, [artifact.id, artifact.content]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 200)}px`;
  }, [content]);

  const save = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/artifacts/${artifact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated: Artifact = await res.json();
      onSaved(updated);
      toast({ title: "Saved", description: "Artifact content updated." });
    } catch {
      toast({ title: "Error", description: "Could not save artifact.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [artifact.id, content, isDirty, saving, onSaved, toast]);

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
    <div className="flex flex-col gap-3 h-full">
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={cn(
            "w-full resize-none rounded-lg border bg-background text-sm text-foreground",
            "p-3 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40",
            "min-h-[200px] transition-colors",
            isDirty ? "border-primary/60" : "border-border",
          )}
          placeholder="Enter content here..."
          spellCheck={false}
        />
      </div>

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs transition-opacity",
            isDirty ? "text-amber-600 dark:text-amber-400 opacity-100" : "opacity-0",
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
            disabled={!isDirty || saving}
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
