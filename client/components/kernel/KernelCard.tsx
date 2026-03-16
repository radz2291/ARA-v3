import { FileText, Trash2, User, MessageSquare, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Artifact, Agent, Conversation, Session } from "@shared/types";
import { getArtifactMeta } from "@shared/artifacts";

type KernelItemType = "artifact" | "agent" | "conversation" | "session";

// Lightweight data for list view (from /api/kernel/list)
interface KernelListData {
  id: string;
  name: string;
  type: KernelItemType;
  subtype?: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  // Optional full data fields for artifacts
  content?: string;
  agentId?: string;
  versions?: Array<{ id: string }>;
}

interface KernelCardProps {
  itemType: KernelItemType;
  data: Artifact | Agent | Conversation | Session | KernelListData;
  agentName?: string;
  onClick: () => void;
  onDelete?: () => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMessageCount(content: string): number | null {
  try {
    const parsed = JSON.parse(content);
    return typeof parsed.messageCount === "number" ? parsed.messageCount : null;
  } catch {
    return null;
  }
}

// Artifact-specific render
function ArtifactCard({
  artifact,
  agentName,
  onClick,
  onDelete,
}: {
  artifact: Artifact | KernelListData;
  agentName?: string;
  onClick: () => void;
  onDelete: () => void;
}) {
  const artifactType = artifact.type as Artifact["type"];
  const meta = getArtifactMeta(artifactType);
  const Icon = meta?.icon ?? FileText;

  // Handle both full data and lightweight data
  const excerpt = artifact.content
    ? artifact.content.slice(0, 120).replace(/\n/g, " ").trim() +
      (artifact.content.length > 120 ? "…" : "")
    : "No content";

  const versionCount =
    artifact.versions?.length ??
    ("itemCount" in artifact ? artifact.itemCount : null) ??
    0;

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
        <div className={cn("p-2 rounded-lg shrink-0", meta?.color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate pr-6">
            {artifact.name}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge
              variant="secondary"
              className={cn("text-xs px-1.5 py-0", meta?.color)}
            >
              {meta?.label}
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
          Agent:{" "}
          <span className="font-medium text-foreground">{agentName}</span>
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
          {"itemCount" in artifact && artifact.type === "conversation"
            ? (() => {
                const count = artifact.content
                  ? getMessageCount(artifact.content)
                  : artifact.itemCount;
                return count !== null && count !== undefined
                  ? `${count} message${count === 1 ? "" : "s"}`
                  : `v${versionCount}`;
              })()
            : `v${versionCount}`}
        </span>
      </div>
    </div>
  );
}

// Simple card for non-artifact items
function SimpleCard({
  itemType,
  data,
  onClick,
}: {
  itemType: KernelItemType;
  data: Agent | Conversation | Session | KernelListData;
  onClick: () => void;
}) {
  const getIcon = () => {
    switch (itemType) {
      case "agent":
        return <User className="w-4 h-4" />;
      case "conversation":
        return <MessageSquare className="w-4 h-4" />;
      case "session":
        return <Terminal className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (itemType) {
      case "agent":
        return "Agent";
      case "conversation":
        return "Conversation";
      case "session":
        return "Session";
    }
  };

  const getTitle = () => {
    // Handle lightweight data
    if ("name" in data && itemType !== "conversation") {
      return data.name || `Unnamed ${itemType}`;
    }
    if (itemType === "conversation") {
      return "name" in data
        ? data.name
        : (data as Conversation).title || "Untitled Conversation";
    }
    switch (itemType) {
      case "agent":
        return (data as Agent).name || "Unnamed Agent";
      case "session":
        return "Session";
    }
  };

  const getSubtitle = () => {
    switch (itemType) {
      case "agent":
        return "";
      case "conversation": {
        // Handle lightweight data with itemCount
        if ("itemCount" in data && data.itemCount !== undefined) {
          return `${data.itemCount} message${data.itemCount !== 1 ? "s" : ""}`;
        }
        const conv = data as Conversation;
        const msgCount = conv.messages?.length || 0;
        return `${msgCount} message${msgCount !== 1 ? "s" : ""}`;
      }
      case "session":
        return "";
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getLabel()}
            </Badge>
          </div>
          <h3 className="font-medium text-sm truncate mt-1">{getTitle()}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {getSubtitle()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDate(data.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function KernelCard({
  itemType,
  data,
  agentName,
  onClick,
  onDelete,
}: KernelCardProps) {
  if (itemType === "artifact") {
    return (
      <ArtifactCard
        artifact={data as Artifact | KernelListData}
        agentName={agentName}
        onClick={onClick}
        onDelete={onDelete!}
      />
    );
  }

  return (
    <SimpleCard
      itemType={itemType}
      data={data as Agent | Conversation | Session | KernelListData}
      onClick={onClick}
    />
  );
}
