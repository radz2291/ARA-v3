import { useState } from "react";
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
  });

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

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : "Save Agent"}
        </Button>
      </div>
    </form>
  );
}
