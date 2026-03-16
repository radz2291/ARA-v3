import { useState } from "react";
import { X, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { Agent, Session, Conversation, Artifact } from "@shared/types";

type ConfigItemType = "agent" | "session" | "conversation" | "artifact";

interface ConfigPanelProps {
  itemType: ConfigItemType;
  data: Agent | Session | Conversation | Artifact;
  onClose: () => void;
  onUpdated?: (data: Agent | Session | Conversation | Artifact) => void;
  onDeleted?: () => void;
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    // Special handling for messages array - show count
    if (value.length > 0 && "role" in (value[0] as object)) {
      return `${value.length} message${value.length === 1 ? "" : "s"}`;
    }
    return value.join(", ") || "—";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function renderKeyValuePairs(data: Agent | Session | Conversation) {
  const entries = Object.entries(data);

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => {
        // Skip messages in non-conversation types (though they're not there)
        if (key === "messageGraph") return null;

        // Handle nested config object for sessions
        if (key === "config" && value && typeof value === "object") {
          return (
            <div key={key}>
              <label className="text-xs font-medium text-muted-foreground">
                {formatKey(key)}
              </label>
              <div className="mt-1 space-y-2 pl-3 border-l-2 border-muted">
                {Object.entries(value as Record<string, unknown>).map(
                  ([nestedKey, nestedValue]) => (
                    <div key={nestedKey}>
                      <label className="text-xs font-medium text-muted-foreground">
                        {formatKey(nestedKey)}
                      </label>
                      <p className="text-sm mt-0.5 font-mono">
                        {nestedKey === "apiKey"
                          ? nestedValue
                            ? "••••••••"
                            : "—"
                          : formatValue(nestedValue)}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          );
        }

        return (
          <div key={key}>
            <label className="text-xs font-medium text-muted-foreground">
              {formatKey(key)}
            </label>
            <p className="text-sm mt-1 font-mono whitespace-pre-wrap">
              {key === "id" || key.endsWith("Id")
                ? formatValue(value)
                : formatValue(value)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function renderCuratedKeyValuePairs(
  data: Agent | Session | Conversation,
  itemType: ConfigItemType,
) {
  if (itemType === "agent") {
    const agent = data as Agent;
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Name
          </label>
          <p className="text-sm mt-1">{agent.name || "—"}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Description
          </label>
          <p className="text-sm mt-1 whitespace-pre-wrap">
            {agent.description || "—"}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Persona
          </label>
          <p className="text-sm mt-1 whitespace-pre-wrap">
            {agent.persona || "—"}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            System Instructions
          </label>
          <p className="text-sm mt-1 whitespace-pre-wrap">
            {agent.systemInstructions || "—"}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <p className="text-sm mt-1">{agent.status || "—"}</p>
        </div>
      </div>
    );
  }

  if (itemType === "session") {
    const session = data as Session;
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Model
          </label>
          <p className="text-sm mt-1">{session.config?.model || "—"}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            API URL
          </label>
          <p className="text-sm mt-1">{session.config?.apiUrl || "—"}</p>
        </div>
      </div>
    );
  }

  if (itemType === "conversation") {
    const conv = data as Conversation;
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Title
          </label>
          <p className="text-sm mt-1 whitespace-pre-wrap">
            {conv.title || "—"}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Session ID
          </label>
          <p className="text-sm mt-1">{conv.sessionId || "—"}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Agent ID
          </label>
          <p className="text-sm mt-1">{conv.agentId || "—"}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Message Count
          </label>
          <p className="text-sm mt-1">{conv.messages?.length ?? 0}</p>
        </div>
      </div>
    );
  }

  return null;
}

function getLabel(type: ConfigItemType): string {
  switch (type) {
    case "agent":
      return "Agent";
    case "session":
      return "Session";
    case "conversation":
      return "Conversation";
    case "artifact":
      return "Artifact";
  }
}

function getIcon(type: ConfigItemType) {
  switch (type) {
    case "agent":
      return "👤";
    case "session":
      return "⚙️";
    case "conversation":
      return "💬";
    case "artifact":
      return "📄";
  }
}

export function ConfigPanel({
  itemType,
  data,
  onClose,
  onUpdated,
  onDeleted,
}: ConfigPanelProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Agent | null>(null);
  const [editedSession, setEditedSession] = useState<{
    model: string;
    apiUrl: string;
  } | null>(null);
  const [editedConversationTitle, setEditedConversationTitle] =
    useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    if (itemType === "agent") {
      setEditedData({ ...(data as Agent) });
    } else if (itemType === "session") {
      const session = data as Session;
      setEditedSession({
        model: session.config?.model || "",
        apiUrl: session.config?.apiUrl || "",
      });
    } else if (itemType === "conversation") {
      setEditedConversationTitle((data as Conversation).title);
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (itemType === "agent" && editedData) {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/agents/${editedData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editedData),
        });

        if (!res.ok) throw new Error("Failed to update");

        const updated = await res.json();
        onUpdated?.(updated);
        setIsEditing(false);
        toast({ title: "Saved", description: "Agent updated successfully." });
      } catch {
        toast({
          title: "Error",
          description: "Could not update agent.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    } else if (itemType === "session" && editedSession) {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/sessions/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editedSession),
        });

        if (!res.ok) throw new Error("Failed to update");

        const updated = await res.json();
        onUpdated?.(updated);
        setIsEditing(false);
        toast({ title: "Saved", description: "Session updated successfully." });
      } catch {
        toast({
          title: "Error",
          description: "Could not update session.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    } else if (itemType === "conversation") {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/conversations/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: editedConversationTitle }),
        });

        if (!res.ok) throw new Error("Failed to update");

        const updated = await res.json();
        onUpdated?.(updated);
        setIsEditing(false);
        toast({
          title: "Saved",
          description: "Conversation updated successfully.",
        });
      } catch {
        toast({
          title: "Error",
          description: "Could not update conversation.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete this ${itemType}? This cannot be undone.`))
      return;

    if (itemType === "agent") {
      try {
        await fetch(`/api/agents/${data.id}`, { method: "DELETE" });
        onDeleted?.();
        onClose();
        toast({ title: "Deleted", description: `${itemType} removed.` });
      } catch {
        toast({
          title: "Error",
          description: `Could not delete ${itemType}.`,
          variant: "destructive",
        });
      }
    } else if (itemType === "session") {
      try {
        await fetch(`/api/sessions/${data.id}`, { method: "DELETE" });
        onDeleted?.();
        onClose();
        toast({ title: "Deleted", description: "Session removed." });
      } catch {
        toast({
          title: "Error",
          description: "Could not delete session.",
          variant: "destructive",
        });
      }
    } else if (itemType === "conversation") {
      try {
        const conv = data as Conversation;
        await fetch(
          `/api/sessions/${conv.sessionId}/conversations/${data.id}`,
          {
            method: "DELETE",
          },
        );
        onDeleted?.();
        onClose();
        toast({ title: "Deleted", description: "Conversation removed." });
      } catch {
        toast({
          title: "Error",
          description: "Could not delete conversation.",
          variant: "destructive",
        });
      }
    } else if (itemType === "artifact") {
      try {
        await fetch(`/api/artifacts/${data.id}`, { method: "DELETE" });
        onDeleted?.();
        onClose();
        toast({ title: "Deleted", description: "Artifact removed." });
      } catch {
        toast({
          title: "Error",
          description: "Could not delete artifact.",
          variant: "destructive",
        });
      }
    }
  };

  const canEdit =
    itemType === "agent" ||
    itemType === "session" ||
    itemType === "conversation";
  const canDelete =
    itemType === "agent" ||
    itemType === "session" ||
    itemType === "conversation" ||
    itemType === "artifact";

  // Render agent form
  const renderAgentForm = () => {
    if (!editedData) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Name
          </label>
          <input
            type="text"
            value={editedData.name}
            onChange={(e) =>
              setEditedData({ ...editedData, name: e.target.value })
            }
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Description
          </label>
          <input
            type="text"
            value={editedData.description}
            onChange={(e) =>
              setEditedData({ ...editedData, description: e.target.value })
            }
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Persona
          </label>
          <input
            type="text"
            value={editedData.persona}
            onChange={(e) =>
              setEditedData({ ...editedData, persona: e.target.value })
            }
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            System Instructions
          </label>
          <textarea
            value={editedData.systemInstructions}
            onChange={(e) =>
              setEditedData({
                ...editedData,
                systemInstructions: e.target.value,
              })
            }
            rows={8}
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background font-mono"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Tool IDs
          </label>
          <input
            type="text"
            value={editedData.toolIds.join(", ")}
            onChange={(e) =>
              setEditedData({
                ...editedData,
                toolIds: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select
            value={editedData.status}
            onChange={(e) =>
              setEditedData({
                ...editedData,
                status: e.target.value as "active" | "inactive",
              })
            }
            className="px-2 py-1 text-sm border rounded-md bg-background"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
    );
  };

  // Render session form
  const renderSessionForm = () => {
    if (!editedSession) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Model
          </label>
          <input
            type="text"
            value={editedSession.model}
            onChange={(e) =>
              setEditedSession({ ...editedSession, model: e.target.value })
            }
            placeholder="e.g., gpt-4o"
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            API URL
          </label>
          <input
            type="text"
            value={editedSession.apiUrl}
            onChange={(e) =>
              setEditedSession({ ...editedSession, apiUrl: e.target.value })
            }
            placeholder="e.g., https://api.openai.com/v1"
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>
      </div>
    );
  };

  // Render conversation form
  const renderConversationForm = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Title
          </label>
          <input
            type="text"
            value={editedConversationTitle}
            onChange={(e) => setEditedConversationTitle(e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>
      </div>
    );
  };

  // Render JSON view
  const renderJsonView = () => {
    const json = JSON.stringify(data, null, 2);
    return (
      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
        {json}
      </pre>
    );
  };

  // Render conversation messages
  const renderConversationMessages = () => {
    const conv = data as Conversation;
    return (
      <div className="space-y-3">
        {conv.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          conv.messages.map((msg, idx) => (
            <div key={msg.id || idx} className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {msg.role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {msg.timestamp ? formatDate(msg.timestamp) : ""}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-background border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border shrink-0">
          <div className="p-2 rounded-lg bg-muted text-lg">
            {getIcon(itemType)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground text-base leading-tight truncate">
              {itemType === "agent"
                ? (data as Agent).name
                : itemType === "conversation"
                  ? (data as Conversation).title
                  : "Session"}
            </h2>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <Badge variant="outline" className="text-xs">
                {getLabel(itemType)}
              </Badge>
              {itemType === "agent" && (data as Agent).status && (
                <Badge
                  variant={
                    (data as Agent).status === "active"
                      ? "default"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {(data as Agent).status}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && !isEditing && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="px-5 py-2 border-b border-border text-xs text-muted-foreground">
          Created: {formatDate(data.createdAt)}
          {"updatedAt" in data && data.updatedAt && (
            <> · Updated: {formatDate(data.updatedAt)}</>
          )}
        </div>

        {/* Tabs */}
        <Tabs
          defaultValue={itemType === "conversation" ? "content" : "info"}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="mx-5 mt-3 w-fit shrink-0">
            {itemType === "conversation" && (
              <TabsTrigger value="content">Content</TabsTrigger>
            )}
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          {/* Info tab */}
          <TabsContent value="info" className="flex-1 min-h-0 p-5 pt-3">
            <ScrollArea className="h-full">
              {isEditing && canEdit
                ? itemType === "agent"
                  ? renderAgentForm()
                  : itemType === "session"
                    ? renderSessionForm()
                    : itemType === "conversation"
                      ? renderConversationForm()
                      : null
                : renderCuratedKeyValuePairs(data, itemType)}
            </ScrollArea>
          </TabsContent>

          {/* Content tab (conversation only) */}
          {itemType === "conversation" && (
            <TabsContent value="content" className="flex-1 min-h-0 p-5 pt-3">
              <ScrollArea className="h-full">
                {renderConversationMessages()}
              </ScrollArea>
            </TabsContent>
          )}

          {/* JSON tab */}
          <TabsContent value="json" className="flex-1 min-h-0 p-5 pt-3">
            <ScrollArea className="h-full">{renderJsonView()}</ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Edit actions */}
        {isEditing && canEdit && (
          <div className="flex justify-end gap-2 p-5 border-t border-border shrink-0">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
