import { Button } from "@/components/ui/button";

interface Agent {
  id: string;
  name: string;
  description: string;
  persona: string;
  systemInstructions: string;
  status: "active" | "inactive";
  toolIds?: string[];
}

interface AgentPanelProps {
  workspaceAgents: Agent[];
  selectedAgentId?: string;
  leadAgentId?: string;
  onAgentSelect: (agentId: string) => void;
}

export function AgentPanel({
  workspaceAgents,
  selectedAgentId,
  leadAgentId,
  onAgentSelect,
}: AgentPanelProps) {
  if (workspaceAgents.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5 ml-4">
      {workspaceAgents.map((wa) => (
        <Button
          key={wa.id}
          variant={selectedAgentId === wa.id ? "default" : "outline"}
          size="sm"
          onClick={() => onAgentSelect(wa.id)}
          className="text-xs h-7"
        >
          {wa.name}
          {leadAgentId === wa.id && (
            <span className="ml-1 text-xs opacity-70">(Lead)</span>
          )}
        </Button>
      ))}
    </div>
  );
}
