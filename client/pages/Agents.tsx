import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { Link, useNavigate } from "react-router-dom";
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
import { AgentForm, AgentFormData } from "@/components/AgentForm";
import { useSession } from "@/contexts/SessionContext";

interface Agent {
  id: string;
  name: string;
  description: string;
  persona: string;
  systemInstructions: string;
  toolIds?: string[];
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

interface Tool {
  id: string;
  name: string;
  functionName: string;
  description: string;
  type: string;
}

export default function Agents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { createNewConversation } = useSession();

  // Load agents and tools
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadAgents(), loadTools()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTools = async () => {
    try {
      const response = await fetch("/api/tools");
      if (!response.ok) throw new Error("Failed to load tools");
      const data = await response.json();
      setTools(data.tools || []);
    } catch (error) {
      console.error("Error loading tools:", error);
    }
  };

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/agents");
      if (!response.ok) throw new Error("Failed to load agents");
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error("Error loading agents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentTools = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent?.toolIds) return [];
    return tools.filter((t) => agent.toolIds!.includes(t.id));
  };

  const getToolTypeColor = (type: string) => {
    switch (type) {
      case "web_search":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "file_ops":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
      case "code_exec":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "custom":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const handleCreateAgent = async (formData: AgentFormData) => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error("Failed to create agent");
      const newAgent = await response.json();
      setAgents([newAgent, ...agents]);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Error creating agent:", error);
      alert("Failed to create agent");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAgent = async (formData: AgentFormData) => {
    if (!selectedAgent) return;
    try {
      setIsSaving(true);
      const response = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error("Failed to update agent");
      const updatedAgent = await response.json();
      setAgents(agents.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)));
      setIsEditDialogOpen(false);
      setSelectedAgent(null);
    } catch (error) {
      console.error("Error updating agent:", error);
      alert("Failed to update agent");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;
    try {
      setIsSaving(true);
      const response = await fetch(`/api/agents/${agentToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete agent");
      setAgents(agents.filter((a) => a.id !== agentToDelete.id));
      setIsDeleteDialogOpen(false);
      setAgentToDelete(null);
    } catch (error) {
      console.error("Error deleting agent:", error);
      alert("Failed to delete agent");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChatWithAgent = async (agentId: string) => {
    try {
      const agentName = agents.find((a) => a.id === agentId)?.name || "Agent";
      const conversation = await createNewConversation(agentId, `Chat with ${agentName}`);

      if (conversation) {
        navigate(`/chat?conversationId=${conversation.id}&agentId=${agentId}`);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to start chat: ${message}`);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-background dark:bg-background">
        {/* Header */}
        <div className="border-b border-border dark:border-border px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground dark:text-foreground">
                Agents
              </h1>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                Create, configure, and manage your AI agents
              </p>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Agent
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading agents...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-12 max-w-md mx-auto">
              <p className="text-muted-foreground mb-4">No agents created yet</p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Agent
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-w-5xl">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6 hover:border-primary dark:hover:border-primary transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
                          {agent.name}
                        </h2>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${agent.status === "active"
                              ? "bg-green-500/10 text-green-700 dark:text-green-400"
                              : "bg-gray-500/10 text-gray-700 dark:text-gray-400"
                            }`}
                        >
                          {agent.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-4">
                        {agent.description}
                      </p>

                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground dark:text-muted-foreground">
                              Persona:{" "}
                            </span>
                            <span className="text-foreground dark:text-foreground font-medium">
                              {agent.persona}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground dark:text-muted-foreground">
                              Created:{" "}
                            </span>
                            <span className="text-foreground dark:text-foreground font-medium">
                              {new Date(agent.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Tools Display */}
                        {getAgentTools(agent.id).length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground dark:text-muted-foreground mb-2">
                              Tools ({getAgentTools(agent.id).length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {getAgentTools(agent.id).map((tool) => (
                                <span
                                  key={tool.id}
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${getToolTypeColor(tool.type)}`}
                                  title={tool.description}
                                >
                                  {tool.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={() => handleChatWithAgent(agent.id)}
                        variant="ghost"
                        size="sm"
                        className="hover:bg-secondary dark:hover:bg-secondary"
                        title="Chat with this agent"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedAgent(agent);
                          setIsEditDialogOpen(true);
                        }}
                        variant="ghost"
                        size="sm"
                        className="hover:bg-secondary dark:hover:bg-secondary"
                        title="Edit agent"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setAgentToDelete(agent);
                          setIsDeleteDialogOpen(true);
                        }}
                        variant="ghost"
                        size="sm"
                        className="hover:bg-destructive/10 dark:hover:bg-destructive/10 hover:text-destructive"
                        title="Delete agent"
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

      {/* Create Agent Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Set up a new AI agent with custom instructions and persona
            </DialogDescription>
          </DialogHeader>
          <AgentForm onSubmit={handleCreateAgent} isLoading={isSaving} />
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>
              Update the agent configuration
            </DialogDescription>
          </DialogHeader>
          {selectedAgent && (
            <AgentForm
              initialData={selectedAgent}
              onSubmit={handleUpdateAgent}
              isLoading={isSaving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{agentToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAgent}
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
