import { useState, useEffect, useCallback, useRef } from "react";
import { Library, Loader2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { KernelFilters, type KernelFiltersState } from "@/components/kernel/KernelFilters";
import { ArtifactCard } from "@/components/kernel/ArtifactCard";
import { ArtifactPanel } from "@/components/kernel/ArtifactPanel";
import { useToast } from "@/hooks/use-toast";
import type { Artifact } from "@shared/types";

interface Agent {
  id: string;
  name: string;
}

const DEFAULT_FILTERS: KernelFiltersState = {
  type: "all",
  subtype: "",
  agentId: "",
  search: "",
};

export default function Kernel() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filters, setFilters] = useState<KernelFiltersState>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const isFirstMount = useRef(true);
  const { toast } = useToast();

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));

  // Load agents once
  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then(setAgents)
      .catch(() => {});
  }, []);

  // Sync then load artifacts on mount
  const syncAndLoad = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch("/api/artifacts/sync", { method: "POST" });
    } catch {
      // sync failure is non-fatal
    } finally {
      setSyncing(false);
    }
    await loadArtifacts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    syncAndLoad();
  }, [syncAndLoad]);

  const loadArtifacts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type && filters.type !== "all") params.set("type", filters.type);
      if (filters.subtype) params.set("subtype", filters.subtype);
      if (filters.agentId) params.set("agentId", filters.agentId);
      if (filters.search) params.set("search", filters.search);
      const res = await fetch(`/api/artifacts?${params}`);
      const data = await res.json();
      setArtifacts(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Error", description: "Could not load artifacts.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Reload when filters change (but not on first mount — syncAndLoad handles that)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    loadArtifacts();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this artifact? This cannot be undone.")) return;
    try {
      await fetch(`/api/artifacts/${id}`, { method: "DELETE" });
      setArtifacts((prev) => prev.filter((a) => a.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast({ title: "Deleted", description: "Artifact removed." });
    } catch {
      toast({ title: "Error", description: "Could not delete artifact.", variant: "destructive" });
    }
  };

  const handleUpdated = (updated: Artifact) => {
    setArtifacts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const selectedArtifact = artifacts.find((a) => a.id === selectedId) ?? null;

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Library className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Kernel</h1>
                <p className="text-sm text-muted-foreground">
                  Your AI's central library — instructions, configs, and conversations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {syncing && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Syncing…
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={syncAndLoad}
                disabled={syncing}
                className="gap-1.5"
              >
                <Loader2 className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                Sync
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4">
            <KernelFilters filters={filters} onChange={setFilters} agents={agents} />
          </div>
        </div>

        {/* Library grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : artifacts.length === 0 ? (
            <EmptyState hasFilters={
              filters.type !== "all" ||
              !!filters.subtype ||
              !!filters.agentId ||
              !!filters.search
            } />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {artifacts.map((artifact) => (
                <ArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  agentName={artifact.agentId ? agentMap[artifact.agentId] : undefined}
                  onClick={() => setSelectedId(artifact.id)}
                  onDelete={() => handleDelete(artifact.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over panel */}
      {selectedArtifact && (
        <ArtifactPanel
          artifact={selectedArtifact}
          agentName={selectedArtifact.agentId ? agentMap[selectedArtifact.agentId] : undefined}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
        />
      )}
    </Layout>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-60 text-center gap-3">
      <div className="p-4 rounded-full bg-muted">
        <Library className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-foreground">
          {hasFilters ? "No artifacts match your filters" : "Your library is empty"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {hasFilters
            ? "Try clearing your filters to see all artifacts."
            : "Click Sync to import your agents and configs as artifacts."}
        </p>
      </div>
    </div>
  );
}
