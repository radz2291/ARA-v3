import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type EntityType =
  | "all"
  | "artifact"
  | "agent"
  | "session"
  | "conversation";

export interface KernelFiltersState {
  type: EntityType;
  subtype: string;
  agentId: string;
  search: string;
}

interface Agent {
  id: string;
  name: string;
}

interface KernelFiltersProps {
  filters: KernelFiltersState;
  onChange: (filters: KernelFiltersState) => void;
  agents: Agent[];
}

// Entity type options
const TYPE_OPTIONS: { label: string; value: EntityType }[] = [
  { label: "All", value: "all" },
  { label: "Artifacts", value: "artifact" },
  { label: "Agents", value: "agent" },
  { label: "Sessions", value: "session" },
  { label: "Conversations", value: "conversation" },
];

export function KernelFilters({
  filters,
  onChange,
  agents,
}: KernelFiltersProps) {
  const update = (patch: Partial<KernelFiltersState>) =>
    onChange({ ...filters, ...patch });

  const hasActiveFilters =
    filters.type !== "all" || filters.agentId || filters.search;

  return (
    <div className="flex flex-col gap-3">
      {/* Type chips */}
      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => update({ type: opt.value, subtype: "" })}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
              filters.type === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Secondary filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Agent dropdown */}
        {agents.length > 0 && (
          <Select
            value={filters.agentId || "all"}
            onValueChange={(val) =>
              update({ agentId: val === "all" ? "" : val })
            }
          >
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search artifacts..."
            className="pl-8 h-9 text-sm"
          />
          {filters.search && (
            <button
              onClick={() => update({ search: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({ type: "all", subtype: "", agentId: "", search: "" })
            }
            className="h-9 text-sm text-muted-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
