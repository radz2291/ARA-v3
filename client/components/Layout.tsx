import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Plus, Settings, MessageSquare, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-background dark:bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar dark:bg-sidebar border-r border-sidebar-border dark:border-sidebar-border transition-all duration-300",
          !sidebarOpen && "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-sidebar-border dark:border-sidebar-border">
            <Link to="/chat" className="flex flex-col items-center justify-center gap-2">
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
                asChild
                className="w-full bg-sidebar-primary dark:bg-sidebar-primary text-sidebar-primary-foreground dark:text-sidebar-primary-foreground hover:opacity-90"
              >
                <Link to="/chat" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Chat
                </Link>
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
                    : "text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:bg-opacity-50"
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
                    : "text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:bg-opacity-50"
                )}
              >
                <Bot className="w-4 h-4" />
                <span className="text-sm">Agents</span>
              </Link>
            </div>

            {/* Chat History */}
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-sidebar-foreground dark:text-sidebar-foreground uppercase tracking-wider px-4 mb-3 opacity-70">
                Recent Chats
              </h3>
              <div className="space-y-1">
                {/* Placeholder for chat history */}
                <div className="text-xs text-sidebar-foreground dark:text-sidebar-foreground opacity-50 px-4 py-2">
                  No recent chats
                </div>
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
                  : "text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:bg-opacity-50"
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
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
