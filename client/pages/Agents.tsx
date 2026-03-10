import { Plus, Edit2, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { Link } from "react-router-dom";

interface Agent {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  model: string;
  conversations: number;
}

const MOCK_AGENTS: Agent[] = [
  {
    id: "1",
    name: "Claude",
    description: "General purpose AI assistant with balanced capabilities",
    status: "active",
    model: "Claude 3.5 Sonnet",
    conversations: 5,
  },
  {
    id: "2",
    name: "Research Bot",
    description: "Specialized in gathering and analyzing research papers",
    status: "active",
    model: "GPT-4 Turbo",
    conversations: 12,
  },
  {
    id: "3",
    name: "Code Wizard",
    description: "Expert in software development and debugging",
    status: "active",
    model: "Claude 3 Opus",
    conversations: 8,
  },
  {
    id: "4",
    name: "Creative Writer",
    description: "Specialized in creative writing and storytelling",
    status: "inactive",
    model: "Claude 3 Sonnet",
    conversations: 3,
  },
];

export default function Agents() {
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
            <Button className="bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Create Agent
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-4 max-w-5xl">
            {MOCK_AGENTS.map((agent) => (
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
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          agent.status === "active"
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

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground dark:text-muted-foreground">
                          Model:{" "}
                        </span>
                        <span className="text-foreground dark:text-foreground font-medium">
                          {agent.model}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground dark:text-muted-foreground">
                          Conversations:{" "}
                        </span>
                        <span className="text-foreground dark:text-foreground font-medium">
                          {agent.conversations}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="hover:bg-secondary dark:hover:bg-secondary"
                    >
                      <Link to="/chat">
                        <MessageSquare className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-secondary dark:hover:bg-secondary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-destructive/10 dark:hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
