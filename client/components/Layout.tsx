import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Plus,
  Settings,
  MessageSquare,
  Bot,
  Briefcase,
  Loader2,
  Library,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/contexts/SessionContext";
import { useConversationStore } from "@/contexts/ConversationStore";
import { Edit2, Trash2, Check } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    createNewConversation,
    deleteConversation,
    renameConversation,
  } = useSession();
  const { streamingIds } = useConversationStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const isActive = (path: string) => location.pathname === path;

  const handleNewChat = async (e: React.MouseEvent) => {
    e.preventDefault();
    const newConv = await createNewConversation();
    if (newConv) {
      if (location.pathname !== "/chat") {
        navigate("/chat");
      }
    }
  };

  return (
    <div className="flex h-screen bg-background dark:bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar dark:bg-sidebar border-r border-sidebar-border dark:border-sidebar-border transition-all duration-300",
          !sidebarOpen && "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-sidebar-border dark:border-sidebar-border">
            <Link
              to="/chat"
              className="flex flex-col items-center justify-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary dark:bg-sidebar-primary flex items-center justify-center">
                <Bot className="w-5 h-5 text-sidebar-primary-foreground dark:text-sidebar-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-sidebar-foreground dark:text-sidebar-foreground">
                AgentHub
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            <div className="mb-4">
              <Button
                onClick={handleNewChat}
                className="w-full bg-sidebar-primary dark:bg-sidebar-primary text-sidebar-primary-foreground dark:text-sidebar-primary-foreground hover:opacity-90 flex items-center gap-2 justify-center"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </Button>
            </div>

            {/* Main Navigation */}
            <div className="space-y-1">
              <Link
                to="/chat"
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                  isActive("/chat")
                    ? "bg-sidebar-accent dark:bg-sidebar-accent text-sidebar-accent-foreground dark:text-sidebar-accent-foreground"
                    : "text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:bg-opacity-50",
                )}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">Chat</span>
              </Link>

              <Link
                to="/agents"
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                  isActive("/agents")
                    ? "bg-sidebar-accent dark:bg-sidebar-accent text-sidebar-accent-foreground dark:text-sidebar-accent-foreground"
                    : "text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:bg-opacity-50",
                )}
              >
                <Bot className="w-4 h-4" />
                <span className="text-sm">Agents</span>
              </Link>

              <Link
                to="/workspaces"
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                  isActive("/workspaces")
                    ? "bg-sidebar-accent dark:bg-sidebar-accent text-sidebar-accent-foreground dark:text-sidebar-accent-foreground"
                    : "text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:bg-opacity-50",
                )}
              >
                <Briefcase className="w-4 h-4" />
                <span className="text-sm">Workspaces</span>
              </Link>

              <Link
                to="/kernel"
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                  isActive("/kernel")
                    ? "bg-sidebar-accent dark:bg-sidebar-accent text-sidebar-accent-foreground dark:text-sidebar-accent-foreground"
                    : "text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:bg-opacity-50",
                )}
              >
                <Library className="w-4 h-4" />
                <span className="text-sm">Kernel</span>
              </Link>
            </div>

            {/* Chat History */}
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-sidebar-foreground dark:text-sidebar-foreground uppercase tracking-wider px-4 mb-3 opacity-70">
                Recent Chats
              </h3>
              <div className="space-y-1">
                {conversations.length === 0 ? (
                  <div className="text-xs text-sidebar-foreground dark:text-sidebar-foreground opacity-50 px-4 py-2">
                    No recent chats
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group relative flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer transition-colors",
                        currentConversationId === conv.id
                          ? "bg-sidebar-accent dark:bg-sidebar-accent text-sidebar-accent-foreground dark:text-sidebar-accent-foreground"
                          : "text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent/50 dark:hover:bg-sidebar-accent/50",
                      )}
                      onClick={() => {
                        setCurrentConversationId(conv.id);
                        if (location.pathname !== "/chat") {
                          navigate("/chat");
                        }
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                    >
                      {editingId === conv.id ? (
                        <div className="flex gap-2 w-full pr-6">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                renameConversation(conv.id, editingTitle);
                                setEditingId(null);
                              } else if (e.key === "Escape") {
                                setEditingId(null);
                              }
                            }}
                            className="flex-1 text-sm bg-background dark:bg-background border border-border rounded px-2 py-1 text-foreground"
                            autoFocus
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              renameConversation(conv.id, editingTitle);
                              setEditingId(null);
                            }}
                            className="p-1 hover:bg-primary/20 rounded text-foreground"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(null);
                            }}
                            className="p-1 hover:bg-secondary rounded text-foreground"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1.5 min-w-0 pr-8">
                          <span className="text-sm truncate">{conv.title}</span>
                          {streamingIds.has(conv.id) &&
                            conv.id !== currentConversationId && (
                              <Loader2 className="w-3 h-3 shrink-0 animate-spin text-primary" />
                            )}
                        </span>
                      )}

                      {editingId !== conv.id && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(conv.id);
                              setEditingTitle(conv.title);
                            }}
                            className="p-1 hover:bg-sidebar-accent/80 rounded"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Delete this conversation?")) {
                                deleteConversation(conv.id);
                              }
                            }}
                            className="p-1 hover:bg-destructive/20 rounded text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border dark:border-sidebar-border">
            <Link
              to="/settings"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors w-full",
                isActive("/settings")
                  ? "bg-sidebar-accent dark:bg-sidebar-accent text-sidebar-accent-foreground dark:text-sidebar-accent-foreground"
                  : "text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:bg-opacity-50",
              )}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-card dark:bg-card border border-border dark:border-border"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden md:ml-64">
        {/* Close sidebar on mobile when navigating */}
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-30 pointer-events-none md:pointer-events-auto"
          style={{ pointerEvents: sidebarOpen ? "auto" : "none" }}
        />
        {children}
      </main>
    </div>
  );
};
