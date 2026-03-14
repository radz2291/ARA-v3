import { FileText, MessageSquare, Settings, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Artifact } from "@shared/types";

interface ArtifactCardProps {
  artifact: Artifact;
  agentName?: string;
  onClick: () => void;
  onDelete: () => void;
}

const TYPE_META: Record<
  Artifact["type"],
  { icon: React.ElementType; label: string; color: string }
> = {
  system_prompt: {
    icon: FileText,
    label: "System Prompt",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  },
  conversation: {
    icon: MessageSquare,
    label: "Conversation",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  system_config: {
    icon: Settings,
    label: "Config",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ArtifactCard({ artifact, agentName, onClick, onDelete }: ArtifactCardProps) {
  const meta = TYPE_META[artifact.type];
  const Icon = meta.icon;

  const excerpt = artifact.content
    ? artifact.content.slice(0, 120).replace(/\n/g, " ").trim() +
      (artifact.content.length > 120 ? "…" : "")
    : "No content";

  return (
    <div
      onClick={onClick}
      className="group relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete artifact"
        className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Icon + type badge */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("p-2 rounded-lg shrink-0", meta.color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate pr-6">
            {artifact.name}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge
              variant="secondary"
              className={cn("text-xs px-1.5 py-0", meta.color)}
            >
              {meta.label}
            </Badge>
            {artifact.subtype && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {artifact.subtype.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Agent link */}
      {agentName && (
        <p className="text-xs text-muted-foreground mb-2">
          Agent: <span className="font-medium text-foreground">{agentName}</span>
        </p>
      )}

      {/* Content excerpt */}
      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
        {excerpt}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {formatDate(artifact.updatedAt)}
        </span>
        <span className="text-xs text-muted-foreground">
          v{artifact.versions.length}
        </span>
      </div>
    </div>
  );
}
