import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ARTIFACT_TYPES, isArtifactEditable } from "@shared/artifacts";
import { ArtifactEditor } from "./ArtifactEditor";
import { ArtifactVersionHistory } from "./ArtifactVersionHistory";
import { ConversationEditor } from "./ConversationEditor";
import type { Artifact } from "@shared/types";

interface ArtifactPanelProps {
  artifact: Artifact;
  agentName?: string;
  onClose: () => void;
  onUpdated: (artifact: Artifact) => void;
}

export function ArtifactPanel({
  artifact,
  agentName,
  onClose,
  onUpdated,
}: ArtifactPanelProps) {
  const meta = ARTIFACT_TYPES[artifact.type];
  const Icon = meta.icon;
  const editable = isArtifactEditable(artifact);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-background border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border shrink-0">
          <div className={cn("p-2 rounded-lg shrink-0", meta.color)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground text-base leading-tight truncate">
              {artifact.name}
            </h2>
            <div className="flex flex-wrap gap-1 mt-1.5">
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
              {agentName && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {agentName}
                </Badge>
              )}
            </div>
            {artifact.description && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {artifact.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="content" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-5 mt-3 w-fit shrink-0">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="history">
              History
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({artifact.versions.length})
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Content tab */}
          <TabsContent value="content" className="flex-1 min-h-0 p-5 pt-3">
            {editable ? (
              artifact.type === "conversation" ? (
                <ConversationEditor artifact={artifact} onSaved={onUpdated} />
              ) : (
                <ArtifactEditor artifact={artifact} onSaved={onUpdated} />
              )
            ) : (
              <ScrollArea className="h-full">
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {artifact.content || "No content"}
                </pre>
              </ScrollArea>
            )}
          </TabsContent>

          {/* History tab */}
          <TabsContent value="history" className="flex-1 min-h-0 p-5 pt-3">
            <ScrollArea className="h-full">
              <ArtifactVersionHistory
                artifact={artifact}
                onRestored={onUpdated}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
