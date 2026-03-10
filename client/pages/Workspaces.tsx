import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/contexts/SessionContext";

interface Agent {
  id: string;
  name: string;
}

interface Tool {
  id: string;
  name: string;
  type: "web_search" | "file_ops" | "code_exec" | "custom";
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
  leadAgentId?: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceFormData {
  name: string;
  description: string;
  agentIds: string[];
  leadAgentId?: string;
}

export default function Workspaces() {
  const navigate = useNavigate();
  const { createNewConversation } = useSession();
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<WorkspaceFormData>({
    name: "",
    description: "",
    agentIds: [],
    leadAgentId: undefined,
  });

  // Load workspaces, agents, and tools
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [workspacesRes, agentsRes, toolsRes] = await Promise.all([
        fetch("/api/workspaces"),
        fetch("/api/agents"),
        fetch("/api/tools"),
      ]);

      if (!workspacesRes.ok || !agentsRes.ok || !toolsRes.ok) {
        throw new Error("Failed to load data");
      }

      const workspacesData = await workspacesRes.json();
      const agentsData = await agentsRes.json();
      const toolsData = await toolsRes.json();

      setWorkspaces(workspacesData.workspaces || []);
      setAgents(agentsData || []);
      setTools(toolsData.tools || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!formData.name || formData.agentIds.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create workspace");
      const newWorkspace = await response.json();
      setWorkspaces([newWorkspace.workspace, ...workspaces]);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating workspace:", error);
      alert("Failed to create workspace");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateWorkspace = async () => {
    if (!selectedWorkspace || !formData.name || formData.agentIds.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to update workspace");
      const updatedWorkspace = await response.json();
      setWorkspaces(
        workspaces.map((w) =>
          w.id === updatedWorkspace.workspace.id ? updatedWorkspace.workspace : w
        )
      );
      setIsEditDialogOpen(false);
      setSelectedWorkspace(null);
      resetForm();
    } catch (error) {
      console.error("Error updating workspace:", error);
      alert("Failed to update workspace");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/workspaces/${workspaceToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete workspace");
      setWorkspaces(workspaces.filter((w) => w.id !== workspaceToDelete.id));
      setIsDeleteDialogOpen(false);
      setWorkspaceToDelete(null);
    } catch (error) {
      console.error("Error deleting workspace:", error);
      alert("Failed to delete workspace");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartChat = async (workspaceId: string) => {
    try {
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace || workspace.agentIds.length === 0) {
        alert("Workspace has no agents");
        return;
      }

      // Create a conversation with the lead agent or first agent
      const agentId = workspace.leadAgentId || workspace.agentIds[0];
      const conversation = await createNewConversation(
        agentId,
        `${workspace.name} - Multi-Agent Chat`
      );

      if (conversation) {
        navigate(
          `/chat?conversationId=${conversation.id}&workspaceId=${workspaceId}&agentId=${agentId}`
        );
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to start chat: ${message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      agentIds: [],
      leadAgentId: undefined,
    });
  };

  const openEditDialog = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setFormData({
      name: workspace.name,
      description: workspace.description,
      agentIds: workspace.agentIds,
      leadAgentId: workspace.leadAgentId,
    });
    setIsEditDialogOpen(true);
  };

  const toggleAgentSelection = (agentId: string) => {
    setFormData((prev) => ({
      ...prev,
      agentIds: prev.agentIds.includes(agentId)
        ? prev.agentIds.filter((id) => id !== agentId)
        : [...prev.agentIds, agentId],
    }));
  };

  const getAgentName = (agentId: string): string => {
    return agents.find((a) => a.id === agentId)?.name || "Unknown Agent";
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-background dark:bg-background">
        {/* Header */}
        <div className="border-b border-border dark:border-border px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground dark:text-foreground">
                Workspaces
              </h1>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                Create and manage multi-agent collaboration environments
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setIsCreateDialogOpen(true);
              }}
              className="bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Workspace
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading workspaces...</p>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-12 max-w-md mx-auto">
              <p className="text-muted-foreground mb-4">
                No workspaces created yet
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(true);
                }}
                className="bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Workspace
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-w-5xl">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6 hover:border-primary dark:hover:border-primary transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
                          {workspace.name}
                        </h2>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            workspace.status === "active"
                              ? "bg-green-500/10 text-green-700 dark:text-green-400"
                              : "bg-gray-500/10 text-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {workspace.status === "active" ? "Active" : "Archived"}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-4">
                        {workspace.description}
                      </p>

                      <div className="flex flex-wrap gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Agents:
                          </span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {workspace.agentIds.length > 0 ? (
                              workspace.agentIds.map((agentId) => (
                                <span
                                  key={agentId}
                                  className="inline-block bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary px-2 py-1 rounded text-xs font-medium"
                                >
                                  {getAgentName(agentId)}
                                  {workspace.leadAgentId === agentId && (
                                    <span className="ml-1">(Lead)</span>
                                  )}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">No agents</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-muted-foreground dark:text-muted-foreground">
                            Created:
                          </span>
                          <span className="text-foreground dark:text-foreground font-medium block mt-1">
                            {new Date(workspace.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={() => handleStartChat(workspace.id)}
                        variant="ghost"
                        size="sm"
                        className="hover:bg-secondary dark:hover:bg-secondary"
                        title="Start multi-agent chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => openEditDialog(workspace)}
                        variant="ghost"
                        size="sm"
                        className="hover:bg-secondary dark:hover:bg-secondary"
                        title="Edit workspace"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setWorkspaceToDelete(workspace);
                          setIsDeleteDialogOpen(true);
                        }}
                        variant="ghost"
                        size="sm"
                        className="hover:bg-destructive/10 dark:hover:bg-destructive/10 hover:text-destructive"
                        title="Delete workspace"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Set up a multi-agent collaboration environment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ws-name">Workspace Name *</Label>
              <Input
                id="ws-name"
                placeholder="e.g., Research Team"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="ws-description">Description</Label>
              <Textarea
                id="ws-description"
                placeholder="What is this workspace for?"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label>Select Agents *</Label>
              {agents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No agents available. Create agents first.
                </p>
              ) : (
                <div className="space-y-2">
                  {agents.map((agent) => (
                    <label
                      key={agent.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.agentIds.includes(agent.id)}
                        onChange={() => toggleAgentSelection(agent.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{agent.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {formData.agentIds.length > 0 && (
              <div>
                <Label htmlFor="lead-agent">Lead Agent (Coordinator)</Label>
                <select
                  id="lead-agent"
                  value={formData.leadAgentId || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      leadAgentId: e.target.value || undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="">None</option>
                  {formData.agentIds.map((agentId) => (
                    <option key={agentId} value={agentId}>
                      {getAgentName(agentId)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              onClick={handleCreateWorkspace}
              disabled={isSaving}
              className="w-full bg-primary hover:opacity-90"
            >
              {isSaving ? "Creating..." : "Create Workspace"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Workspace Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>
              Update the workspace configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-ws-name">Workspace Name *</Label>
              <Input
                id="edit-ws-name"
                placeholder="e.g., Research Team"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="edit-ws-description">Description</Label>
              <Textarea
                id="edit-ws-description"
                placeholder="What is this workspace for?"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label>Select Agents *</Label>
              {agents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No agents available.
                </p>
              ) : (
                <div className="space-y-2">
                  {agents.map((agent) => (
                    <label
                      key={agent.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.agentIds.includes(agent.id)}
                        onChange={() => toggleAgentSelection(agent.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{agent.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {formData.agentIds.length > 0 && (
              <div>
                <Label htmlFor="edit-lead-agent">Lead Agent (Coordinator)</Label>
                <select
                  id="edit-lead-agent"
                  value={formData.leadAgentId || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      leadAgentId: e.target.value || undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="">None</option>
                  {formData.agentIds.map((agentId) => (
                    <option key={agentId} value={agentId}>
                      {getAgentName(agentId)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              onClick={handleUpdateWorkspace}
              disabled={isSaving}
              className="w-full bg-primary hover:opacity-90"
            >
              {isSaving ? "Updating..." : "Update Workspace"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workspaceToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              disabled={isSaving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSaving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
