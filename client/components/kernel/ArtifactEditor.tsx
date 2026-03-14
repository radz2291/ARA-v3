import { useState, useEffect, useRef, useCallback } from "react";
import { Save, Loader2, User, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Artifact } from "@shared/types";

interface AgentConfigData {
  name: string;
  description: string;
  persona: string;
  status?: string;
  toolIds?: string[];
}

interface ArtifactEditorProps {
  artifact: Artifact;
  onSaved: (updated: Artifact) => void;
}

export function ArtifactEditor({ artifact, onSaved }: ArtifactEditorProps) {
  const isAgentConfig = artifact.subtype === "agent_config";
  const [content, setContent] = useState(artifact.content);
  const [originalConfig, setOriginalConfig] = useState<AgentConfigData>({
    name: "",
    description: "",
    persona: "",
  });
  const [configData, setConfigData] = useState<AgentConfigData>({
    name: "",
    description: "",
    persona: "",
  });
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const isDirty = isAgentConfig
    ? configData.name !== originalConfig.name ||
      configData.description !== originalConfig.description ||
      configData.persona !== originalConfig.persona
    : content !== artifact.content;

  // Reset when artifact changes
  useEffect(() => {
    setContent(artifact.content);
    if (isAgentConfig) {
      try {
        const parsed = JSON.parse(artifact.content);
        const data = {
          name: parsed.name || "",
          description: parsed.description || "",
          persona: parsed.persona || "",
          status: parsed.status,
          toolIds: parsed.toolIds,
        };
        setConfigData(data);
        setOriginalConfig(data);
      } catch {
        const empty = { name: "", description: "", persona: "" };
        setConfigData(empty);
        setOriginalConfig(empty);
      }
    }
  }, [artifact.id, artifact.content, isAgentConfig]);

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
      const saveContent = isAgentConfig
        ? JSON.stringify(configData, null, 2)
        : content;
      const res = await fetch(`/api/artifacts/${artifact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: saveContent }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated: Artifact = await res.json();
      onSaved(updated);
      toast({
        title: "Saved",
        description: isAgentConfig
          ? "Agent updated."
          : "Artifact content updated.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Could not save artifact.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [
    artifact.id,
    content,
    configData,
    isDirty,
    saving,
    onSaved,
    toast,
    isAgentConfig,
  ]);

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
      {isAgentConfig ? (
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name" className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" />
              Name
            </Label>
            <Input
              id="agent-name"
              value={configData.name}
              onChange={(e) =>
                setConfigData({ ...configData, name: e.target.value })
              }
              placeholder="Agent name"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="agent-description"
              className="flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              Description
            </Label>
            <Input
              id="agent-description"
              value={configData.description}
              onChange={(e) =>
                setConfigData({ ...configData, description: e.target.value })
              }
              placeholder="Brief description of the agent"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-persona" className="flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              Persona
            </Label>
            <Textarea
              id="agent-persona"
              value={configData.persona}
              onChange={(e) =>
                setConfigData({ ...configData, persona: e.target.value })
              }
              placeholder="How the agent should behave, its personality, tone, etc."
              className="min-h-[120px] resize-none"
            />
          </div>
        </div>
      ) : (
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
      )}

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs transition-opacity",
            isDirty
              ? "text-amber-600 dark:text-amber-400 opacity-100"
              : "opacity-0",
          )}
        >
          • Unsaved changes
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {isAgentConfig ? "Click Save to update" : "⌘S to save"}
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
