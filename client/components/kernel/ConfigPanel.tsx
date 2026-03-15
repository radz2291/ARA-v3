import { useState } from "react";
import { X, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { Agent, Session, Conversation } from "@shared/types";

type ConfigItemType = "agent" | "session" | "conversation";

interface ConfigPanelProps {
  itemType: ConfigItemType;
  data: Agent | Session | Conversation;
  onClose: () => void;
  onUpdated?: (data: Agent | Session | Conversation) => void;
  onDeleted?: () => void;
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

function getLabel(type: ConfigItemType): string {
  switch (type) {
    case "agent":
      return "Agent";
    case "session":
      return "Session";
    case "conversation":
      return "Conversation";
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
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    if (itemType === "agent") {
      setEditedData({ ...(data as Agent) });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedData || itemType !== "agent") return;

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
    }
  };

  const canEdit = itemType === "agent";
  const canDelete = itemType === "agent";

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
                  {msg.createdAt ? formatDate(msg.createdAt) : ""}
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
              {itemType === "agent" && (
                <Badge
                  variant={data.status === "active" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {data.status}
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
          Created: {formatDate(data.createdAt)} · Updated:{" "}
          {formatDate(data.updatedAt || data.createdAt)}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="config" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-5 mt-3 w-fit shrink-0">
            <TabsTrigger value="config">Config</TabsTrigger>
            {itemType === "conversation" && (
              <TabsTrigger value="messages">Messages</TabsTrigger>
            )}
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          {/* Config tab */}
          <TabsContent value="config" className="flex-1 min-h-0 p-5 pt-3">
            <ScrollArea className="h-full">
              {isEditing && canEdit ? (
                renderAgentForm()
              ) : itemType === "agent" ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Description
                    </label>
                    <p className="text-sm mt-1">
                      {(data as Agent).description || "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Persona
                    </label>
                    <p className="text-sm mt-1">
                      {(data as Agent).persona || "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      System Instructions
                    </label>
                    <ScrollArea className="h-48 mt-1 border rounded-md p-3">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {(data as Agent).systemInstructions || "—"}
                      </pre>
                    </ScrollArea>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Tools
                    </label>
                    <p className="text-sm mt-1">
                      {(data as Agent).toolIds.length > 0
                        ? (data as Agent).toolIds.join(", ")
                        : "None"}
                    </p>
                  </div>
                </div>
              ) : itemType === "session" ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Session ID
                    </label>
                    <p className="text-sm mt-1 font-mono">
                      {(data as Session).id}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Config
                    </label>
                    <ScrollArea className="h-48 mt-1 border rounded-md p-3">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {JSON.stringify(
                          (data as Session).config || {},
                          null,
                          2,
                        ) || "—"}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Session ID
                    </label>
                    <p className="text-sm mt-1 font-mono">
                      {(data as Conversation).sessionId}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Agent ID
                    </label>
                    <p className="text-sm mt-1 font-mono">
                      {(data as Conversation).agentId || "—"}
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Messages tab (conversation only) */}
          {itemType === "conversation" && (
            <TabsContent value="messages" className="flex-1 min-h-0 p-5 pt-3">
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
