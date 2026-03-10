import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface AgentFormData {
  name: string;
  description: string;
  persona: string;
  systemInstructions: string;
  status: "active" | "inactive";
  toolIds?: string[];
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: string;
  functionName: string;
}

export const DEFAULT_PERSONAS = [
  "General Assistant",
  "Research Bot",
  "Code Wizard",
  "Creative Writer",
  "Data Analyst",
  "DevOps Engineer",
  "Content Creator",
  "Business Analyst",
];

interface AgentFormProps {
  initialData?: Partial<AgentFormData>;
  onSubmit: (data: AgentFormData) => void;
  isLoading?: boolean;
}

export function AgentForm({ initialData, onSubmit, isLoading = false }: AgentFormProps) {
  const [formData, setFormData] = useState<AgentFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    persona: initialData?.persona || "",
    systemInstructions: initialData?.systemInstructions || "",
    status: initialData?.status || "active",
    toolIds: initialData?.toolIds || [],
  });

  const [tools, setTools] = useState<Tool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);

  // Load available tools
  useEffect(() => {
    const loadTools = async () => {
      try {
        setToolsLoading(true);
        const response = await fetch("/api/tools");
        if (response.ok) {
          const data = await response.json();
          setTools(data.tools || []);
        }
      } catch (error) {
        console.error("Error loading tools:", error);
      } finally {
        setToolsLoading(false);
      }
    };

    loadTools();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim() || !formData.persona.trim()) {
      alert("Please fill in all required fields");
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Agent Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Research Bot"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Brief description of what this agent does"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={isLoading}
          className="resize-none h-20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="persona">Persona *</Label>
        <Select value={formData.persona} onValueChange={(value) => setFormData({ ...formData, persona: value })}>
          <SelectTrigger id="persona" disabled={isLoading}>
            <SelectValue placeholder="Select or type a persona" />
          </SelectTrigger>
          <SelectContent>
            {DEFAULT_PERSONAS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="systemInstructions">System Instructions *</Label>
        <Textarea
          id="systemInstructions"
          placeholder="Custom system instructions for this agent. This will be prepended to every LLM request."
          value={formData.systemInstructions}
          onChange={(e) => setFormData({ ...formData, systemInstructions: e.target.value })}
          disabled={isLoading}
          className="resize-none h-32 font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as "active" | "inactive" })}>
          <SelectTrigger id="status" disabled={isLoading}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 border-t pt-4 mt-4">
        <Label className="text-base">Tools</Label>
        <p className="text-xs text-muted-foreground">Select tools that this agent can use</p>
        {toolsLoading ? (
          <p className="text-sm text-muted-foreground py-2">Loading tools...</p>
        ) : tools.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No tools available</p>
        ) : (
          <div className="space-y-2">
            {tools.map((tool) => (
              <div key={tool.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 dark:hover:bg-secondary/30 transition-colors">
                <input
                  type="checkbox"
                  id={`tool-${tool.id}`}
                  checked={formData.toolIds?.includes(tool.id) || false}
                  onChange={(e) => {
                    const toolIds = formData.toolIds || [];
                    if (e.target.checked) {
                      setFormData({ ...formData, toolIds: [...toolIds, tool.id] });
                    } else {
                      setFormData({ ...formData, toolIds: toolIds.filter((id) => id !== tool.id) });
                    }
                  }}
                  disabled={isLoading}
                  className="mt-1 rounded"
                />
                <label htmlFor={`tool-${tool.id}`} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground dark:text-foreground">{tool.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-secondary dark:bg-secondary text-secondary-foreground dark:text-secondary-foreground font-mono">
                      {tool.functionName}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">{tool.description}</p>
                </label>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {formData.toolIds?.length ? `${formData.toolIds.length} tool${formData.toolIds.length !== 1 ? 's' : ''} selected` : 'No tools selected'}
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : "Save Agent"}
        </Button>
      </div>
    </form>
  );
}
