import { useState, useEffect, useRef } from "react";
import { Library, Loader2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import {
  KernelFilters,
  type KernelFiltersState,
} from "@/components/kernel/KernelFilters";
import { KernelCard } from "@/components/kernel/KernelCard";
import { ArtifactPanel } from "@/components/kernel/ArtifactPanel";
import { ConfigPanel } from "@/components/kernel/ConfigPanel";
import { useToast } from "@/hooks/use-toast";
import type {
  Artifact,
  Agent,
  Conversation,
  Session,
  KernelDataItemType,
} from "@shared/types";

// Lightweight list item from /api/kernel/list
interface KernelListItem {
  id: string;
  name: string;
  type: KernelDataItemType;
  subtype?: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
}

interface KernelListResponse {
  items: KernelListItem[];
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
  const [listItems, setListItems] = useState<KernelListItem[]>([]);
  const [counts, setCounts] = useState({
    conversations: 0,
    agents: 0,
    sessions: 0,
    artifacts: 0,
  });
  const [filters, setFilters] = useState<KernelFiltersState>(DEFAULT_FILTERS);
  const [agentList, setAgentList] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<KernelDataItemType | null>(
    null,
  );

  // Full data for selected item (lazy loaded)
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(
    null,
  );
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const isFirstMount = useRef(true);
  const { toast } = useToast();

  // Load agents list
  const loadAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      const data: Agent[] = await res.json();
      setAgentList(data);
    } catch (error) {
      console.error("Failed to load agents:", error);
    }
  };

  // Load lightweight kernel list with optional filters
  const loadKernelList = async (filterParams?: KernelFiltersState) => {
    setLoading(true);
    try {
      // Build query params from filters
      const params = new URLSearchParams();
      if (filterParams?.type && filterParams.type !== "all") {
        params.set("type", filterParams.type);
      }
      if (filterParams?.search) {
        params.set("search", filterParams.search);
      }
      if (filterParams?.agentId) {
        params.set("agentId", filterParams.agentId);
      }

      const queryString = params.toString();
      const url = queryString
        ? `/api/kernel/list?${queryString}`
        : "/api/kernel/list";
      const res = await fetch(url);
      const data: KernelListResponse = await res.json();
      setListItems(data.items);
      setCounts(data.counts);
    } catch {
      toast({
        title: "Error",
        description: "Could not load kernel list.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKernelList();
    loadAgents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when filters change (but not on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    loadKernelList(filters);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch full detail when item is selected
  const handleItemClick = async (item: KernelListItem) => {
    console.log("[Kernel] handleItemClick called:", item.type, item.id);
    setSelectedId(item.id);
    setSelectedType(item.type);
    setDetailLoading(true);

    try {
      let endpoint = "";
      switch (item.type) {
        case "artifact":
          endpoint = `/api/artifacts/${item.id}`;
          break;
        case "agent":
          endpoint = `/api/agents/${item.id}`;
          break;
        case "conversation":
          endpoint = `/api/conversations/${item.id}`;
          break;
        case "session":
          endpoint = `/api/sessions/${item.id}`;
          break;
      }

      console.log("[Kernel] Fetching endpoint:", endpoint);
      const res = await fetch(endpoint);
      console.log("[Kernel] Response status:", res.status);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

      const data = await res.json();

      switch (item.type) {
        case "artifact":
          setSelectedArtifact(data as Artifact);
          break;
        case "agent":
          setSelectedAgent(data as Agent);
          break;
        case "conversation":
          setSelectedConversation(data as Conversation);
          break;
        case "session":
          setSelectedSession(data as Session);
          break;
      }
    } catch (error) {
      console.error("[Kernel] Error loading details:", error);
      toast({
        title: "Error",
        description: `Could not load ${item.type} details. ${error instanceof Error ? error.message : ""}`,
        variant: "destructive",
      });
      setSelectedId(null);
      setSelectedType(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this artifact? This cannot be undone.")) return;
    try {
      await fetch(`/api/artifacts/${id}`, { method: "DELETE" });
      setListItems((prev) => prev.filter((a) => a.id !== id));
      setCounts((prev) => ({ ...prev, artifacts: prev.artifacts - 1 }));
      if (selectedId === id) {
        setSelectedId(null);
        setSelectedType(null);
        setSelectedArtifact(null);
      }
      toast({ title: "Deleted", description: "Artifact removed." });
    } catch {
      toast({
        title: "Error",
        description: "Could not delete artifact.",
        variant: "destructive",
      });
    }
  };

  const handleArtifactUpdated = (updated: Artifact) => {
    setSelectedArtifact(updated);
    // Update list item name if changed
    setListItems((prev) =>
      prev.map((item) =>
        item.id === updated.id ? { ...item, name: updated.name } : item,
      ),
    );
  };

  const handleArtifactDeleted = (deletedId: string) => {
    setListItems((prev) => prev.filter((item) => item.id !== deletedId));
  };

  const handleAgentDeleted = (deletedId: string) => {
    setListItems((prev) => prev.filter((item) => item.id !== deletedId));
    setCounts((prev) => ({ ...prev, agents: Math.max(0, prev.agents - 1) }));
    setAgentList((prev) => prev.filter((agent) => agent.id !== deletedId));
    setSelectedId(null);
    setSelectedType(null);
    setSelectedAgent(null);
  };

  const handleConversationDeleted = (deletedId: string) => {
    setListItems((prev) => prev.filter((item) => item.id !== deletedId));
    setCounts((prev) => ({
      ...prev,
      conversations: Math.max(0, prev.conversations - 1),
    }));
    setSelectedId(null);
    setSelectedType(null);
    setSelectedConversation(null);
  };

  const handleSessionDeleted = (deletedId: string) => {
    setListItems((prev) => prev.filter((item) => item.id !== deletedId));
    setCounts((prev) => ({
      ...prev,
      sessions: Math.max(0, prev.sessions - 1),
    }));
    setSelectedId(null);
    setSelectedType(null);
    setSelectedSession(null);
  };

  const handleAgentUpdated = (updated: Agent) => {
    setSelectedAgent(updated);
    // Update list item name if changed
    setListItems((prev) =>
      prev.map((item) =>
        item.id === updated.id ? { ...item, name: updated.name } : item,
      ),
    );
  };

  // Build a combined list of all kernel items for display
  type KernelDisplayItem = {
    itemType: KernelDataItemType;
    type: KernelDataItemType; // Alias for handleItemClick compatibility
    id: string;
    name: string;
    subtype?: string;
    createdAt: string;
    updatedAt: string;
    itemCount?: number;
  };

  const allItems: KernelDisplayItem[] = listItems.map((item) => ({
    itemType: item.type,
    type: item.type,
    id: item.id,
    name: item.name,
    subtype: item.subtype,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    itemCount: item.itemCount,
  }));

  // Show loading indicator in panel area when fetching detail
  const showDetailLoading =
    detailLoading &&
    selectedId &&
    !selectedArtifact &&
    !selectedAgent &&
    !selectedConversation &&
    !selectedSession;

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
                    {counts.agents} agent{counts.agents !== 1 ? "s" : ""} ·{" "}
                    {counts.conversations} conversation
                    {counts.conversations !== 1 ? "s" : ""} · {counts.sessions}{" "}
                    session{counts.sessions !== 1 ? "s" : ""} ·{" "}
                    {counts.artifacts} artifact
                    {counts.artifacts !== 1 ? "s" : ""}
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
              agents={agentList}
            />
          </div>
        </div>

        {/* Library grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : allItems.length === 0 ? (
            <EmptyState hasFilters={!!filters.search} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allItems.map((item) => (
                <KernelCard
                  key={item.id}
                  itemType={item.itemType}
                  data={item}
                  onClick={() => handleItemClick(item)}
                  onDelete={
                    item.itemType === "artifact"
                      ? () => handleDelete(item.id)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading indicator in panel area */}
      {showDetailLoading && (
        <div className="fixed inset-y-0 right-0 w-[480px] bg-background border-l border-border shadow-lg flex items-center justify-center z-40">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading details...</p>
          </div>
        </div>
      )}

      {/* Slide-over panel */}
      {selectedArtifact && selectedType === "artifact" && (
        <ArtifactPanel
          artifact={selectedArtifact}
          onClose={() => {
            setSelectedId(null);
            setSelectedType(null);
            setSelectedArtifact(null);
          }}
          onUpdated={handleArtifactUpdated}
          onDeleted={() => handleArtifactDeleted(selectedArtifact.id)}
        />
      )}

      {/* Config panel for agents, conversations, sessions */}
      {selectedType === "agent" && selectedAgent && (
        <ConfigPanel
          itemType="agent"
          data={selectedAgent}
          onClose={() => {
            setSelectedId(null);
            setSelectedType(null);
            setSelectedAgent(null);
          }}
          onUpdated={(updated) => handleAgentUpdated(updated as Agent)}
          onDeleted={() => handleAgentDeleted(selectedAgent.id)}
        />
      )}

      {selectedType === "conversation" && selectedConversation && (
        <ConfigPanel
          itemType="conversation"
          data={selectedConversation}
          onClose={() => {
            setSelectedId(null);
            setSelectedType(null);
            setSelectedConversation(null);
          }}
          onDeleted={() => handleConversationDeleted(selectedConversation.id)}
        />
      )}

      {selectedType === "session" && selectedSession && (
        <ConfigPanel
          itemType="session"
          data={selectedSession}
          onClose={() => {
            setSelectedId(null);
            setSelectedType(null);
            setSelectedSession(null);
          }}
          onDeleted={() => handleSessionDeleted(selectedSession.id)}
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
