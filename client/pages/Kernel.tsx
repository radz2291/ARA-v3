import { useState, useEffect, useRef } from "react";
import { Library, Loader2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import {
  KernelFilters,
  type KernelFiltersState,
} from "@/components/kernel/KernelFilters";
import { KernelCard } from "@/components/kernel/KernelCard";
import { ArtifactPanel } from "@/components/kernel/ArtifactPanel";
import { useToast } from "@/hooks/use-toast";
import type { Artifact, Agent, Conversation, Session } from "@shared/types";

type KernelDataItemType = "conversation" | "agent" | "session" | "artifact";

interface KernelDataItem<T = unknown> {
  type: KernelDataItemType;
  data: T;
}

interface KernelDataResponse {
  items: KernelDataItem[];
  counts: {
    conversations: number;
    agents: number;
    sessions: number;
    artifacts: number;
  };
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filters, setFilters] = useState<KernelFiltersState>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isFirstMount = useRef(true);
  const { toast } = useToast();

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));

  // Load all kernel data from aggregated endpoint
  const loadKernelData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kernel/data");
      const data: KernelDataResponse = await res.json();

      // Parse items by type
      const newAgents: Agent[] = [];
      const newArtifacts: Artifact[] = [];
      const newConversations: Conversation[] = [];
      const newSessions: Session[] = [];

      for (const item of data.items) {
        switch (item.type) {
          case "agent":
            newAgents.push(item.data as Agent);
            break;
          case "artifact":
            newArtifacts.push(item.data as Artifact);
            break;
          case "conversation":
            newConversations.push(item.data as Conversation);
            break;
          case "session":
            newSessions.push(item.data as Session);
            break;
        }
      }

      setAgents(newAgents);
      setArtifacts(newArtifacts);
      setConversations(newConversations);
      setSessions(newSessions);
    } catch {
      toast({
        title: "Error",
        description: "Could not load kernel data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKernelData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when filters change (but not on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    loadKernelData();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this artifact? This cannot be undone.")) return;
    try {
      await fetch(`/api/artifacts/${id}`, { method: "DELETE" });
      setArtifacts((prev) => prev.filter((a) => a.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast({ title: "Deleted", description: "Artifact removed." });
    } catch {
      toast({
        title: "Error",
        description: "Could not delete artifact.",
        variant: "destructive",
      });
    }
  };

  const handleUpdated = (updated: Artifact) => {
    setArtifacts((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
  };

  const selectedArtifact = artifacts.find((a) => a.id === selectedId) ?? null;

  // Build a combined list of all kernel items for display
  type KernelDisplayItem =
    | { itemType: "artifact"; data: Artifact }
    | { itemType: "agent"; data: Agent }
    | { itemType: "conversation"; data: Conversation }
    | { itemType: "session"; data: Session };

  const allItems: KernelDisplayItem[] = [
    ...artifacts.map((a) => ({ itemType: "artifact" as const, data: a })),
    ...agents.map((a) => ({ itemType: "agent" as const, data: a })),
    ...conversations.map((c) => ({
      itemType: "conversation" as const,
      data: c,
    })),
    ...sessions.map((s) => ({ itemType: "session" as const, data: s })),
  ];

  // Filter items based on current filters
  const filteredItems = allItems.filter((item) => {
    // Search filter - apply to all types
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      let matches = false;
      if (item.itemType === "artifact") {
        const artifact = item.data;
        matches =
          artifact.name?.toLowerCase().includes(searchLower) ||
          artifact.content?.toLowerCase().includes(searchLower) ||
          artifact.description?.toLowerCase().includes(searchLower);
      } else if (item.itemType === "agent") {
        const agent = item.data;
        matches = agent.name?.toLowerCase().includes(searchLower);
      } else if (item.itemType === "conversation") {
        const conv = item.data;
        matches = conv.title?.toLowerCase().includes(searchLower);
      } else if (item.itemType === "session") {
        // Sessions don't have obvious searchable fields, skip
        matches = false;
      }
      if (!matches) return false;
    }
    return true;
  });

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
                  Your AI's central library — instructions, configs, and
                  conversations
                </p>
                {!loading && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {agents.length} agent{agents.length !== 1 ? "s" : ""} ·{" "}
                    {conversations.length} conversation
                    {conversations.length !== 1 ? "s" : ""} · {sessions.length}{" "}
                    session{sessions.length !== 1 ? "s" : ""} ·{" "}
                    {artifacts.length} artifact
                    {artifacts.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4">
            <KernelFilters
              filters={filters}
              onChange={setFilters}
              agents={agents}
            />
          </div>
        </div>

        {/* Library grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState hasFilters={!!filters.search} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <KernelCard
                  key={item.data.id}
                  itemType={item.itemType}
                  data={item.data}
                  agentName={
                    item.itemType === "artifact" && item.data.agentId
                      ? agentMap[item.data.agentId]
                      : undefined
                  }
                  onClick={() => setSelectedId(item.data.id)}
                  onDelete={
                    item.itemType === "artifact"
                      ? () => handleDelete(item.data.id)
                      : undefined
                  }
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
          agentName={
            selectedArtifact.agentId
              ? agentMap[selectedArtifact.agentId]
              : undefined
          }
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
          {hasFilters ? "No items match your filters" : "Your library is empty"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {hasFilters
            ? "Try clearing your filters to see all items."
            : "Start a conversation or create an agent to see items here."}
        </p>
      </div>
    </div>
  );
}
