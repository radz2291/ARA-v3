import { useState } from "react";
import { RotateCcw, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Artifact, ArtifactVersion } from "@shared/types";

interface ArtifactVersionHistoryProps {
  artifact: Artifact;
  onRestored: (updated: Artifact) => void;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ArtifactVersionHistory({ artifact, onRestored }: ArtifactVersionHistoryProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const { toast } = useToast();

  // Versions newest-first; the last version is the "current" one
  const sorted = [...artifact.versions].sort((a, b) => b.version - a.version);
  const currentVersionId = sorted[0]?.id;

  const handleRestore = async (version: ArtifactVersion) => {
    if (version.id === currentVersionId) return;
    setRestoringId(version.id);
    try {
      const res = await fetch(`/api/artifacts/${artifact.id}/restore/${version.id}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Restore failed");
      const updated: Artifact = await res.json();
      onRestored(updated);
      toast({
        title: "Restored",
        description: `Content restored to v${version.version}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Could not restore version.",
        variant: "destructive",
      });
    } finally {
      setRestoringId(null);
    }
  };

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No version history yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((version) => {
        const isCurrent = version.id === currentVersionId;
        const isRestoring = restoringId === version.id;

        return (
          <div
            key={version.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border transition-colors",
              isCurrent
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-card",
            )}
          >
            {/* Version number */}
            <div
              className={cn(
                "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              v{version.version}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {isCurrent && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-primary" : "text-foreground",
                  )}
                >
                  {isCurrent ? "Current version" : `Version ${version.version}`}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDateTime(version.createdAt)}
              </p>
              {version.note && (
                <p className="text-xs text-muted-foreground italic mt-0.5 truncate">
                  {version.note}
                </p>
              )}
              {/* Content preview */}
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 font-mono leading-relaxed">
                {version.content.slice(0, 100).replace(/\n/g, " ")}
                {version.content.length > 100 ? "…" : ""}
              </p>
            </div>

            {/* Restore button */}
            {!isCurrent && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRestore(version)}
                disabled={isRestoring || restoringId !== null}
                className="shrink-0 gap-1.5 h-8"
              >
                {isRestoring ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Restore
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
