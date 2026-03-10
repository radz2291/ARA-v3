import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Zap,
  Brain,
  Network,
  Shield,
  GitBranch,
  Sparkles,
} from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Navigation */}
      <nav className="border-b border-border dark:border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary dark:bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground dark:text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground dark:text-foreground">
              AgentHub
            </span>
          </div>
          <div className="flex gap-4">
            <Button asChild variant="ghost">
              <Link to="/chat">Sign In</Link>
            </Button>
            <Button asChild className="bg-primary dark:bg-primary hover:opacity-90">
              <Link to="/chat">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-foreground dark:text-foreground mb-6 leading-tight">
            Build, Manage & Deploy{" "}
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              AI Agents
            </span>
          </h1>
          <p className="text-xl text-muted-foreground dark:text-muted-foreground max-w-2xl mx-auto mb-8">
            Create intelligent agents with customizable capabilities, tools, and
            protocols. Collaborate, communicate, and orchestrate multi-agent
            workflows in isolated workspaces.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground"
            >
              <Link to="/chat" className="flex items-center gap-2">
                Start Building
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/agents">View Agents</Link>
            </Button>
          </div>
        </div>

        {/* Demo Card */}
        <div className="bg-card dark:bg-card border border-border dark:border-border rounded-xl p-8 mb-24">
          <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-lg p-12 text-center min-h-64 flex items-center justify-center">
            <div>
              <p className="text-muted-foreground dark:text-muted-foreground mb-4">
                Interactive Chat Interface
              </p>
              <h3 className="text-2xl font-bold text-foreground dark:text-foreground mb-4">
                Talk to Your Agents
              </h3>
              <Button asChild className="bg-primary dark:bg-primary hover:opacity-90">
                <Link to="/chat">Try Demo Chat</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-24">
          <h2 className="text-4xl font-bold text-foreground dark:text-foreground text-center mb-16">
            Powerful Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6 hover:border-primary dark:hover:border-primary transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-primary dark:text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
                Multiple AI Models
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Support for Claude, GPT-4, and other LLMs. Choose the best model
                for each agent's needs.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6 hover:border-primary dark:hover:border-primary transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary dark:text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
                Customizable Tools
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Assign and create custom tools for agents. Enable web search,
                file operations, APIs, and more.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6 hover:border-primary dark:hover:border-primary transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/10 flex items-center justify-center mb-4">
                <Network className="w-6 h-6 text-primary dark:text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
                Agent Communication
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Enable direct inter-agent communication. Delegate tasks and
                collaborate seamlessly.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6 hover:border-primary dark:hover:border-primary transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary dark:text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
                Isolated Workspaces
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Sandboxed environments with defined resource limits and full
                observability.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6 hover:border-primary dark:hover:border-primary transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/10 flex items-center justify-center mb-4">
                <GitBranch className="w-6 h-6 text-primary dark:text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
                Protocol System
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                JIT context injection with default and custom protocols. Safety
                and memory management.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-card dark:bg-card border border-border dark:border-border rounded-lg p-6 hover:border-primary dark:hover:border-primary transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary dark:text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
                Full Observability
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Real-time monitoring, detailed logs, and replay capabilities for
                all agent actions.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-card dark:bg-card border border-border dark:border-border rounded-xl p-12 text-center">
          <h2 className="text-3xl font-bold text-foreground dark:text-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground dark:text-muted-foreground mb-8 max-w-xl mx-auto">
            Create your first AI agent and start building intelligent
            applications today. No credit card required.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-primary dark:bg-primary hover:opacity-90 text-primary-foreground dark:text-primary-foreground"
          >
            <Link to="/chat" className="flex items-center gap-2">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border dark:border-border mt-24">
        <div className="max-w-6xl mx-auto px-6 py-12 text-center">
          <p className="text-muted-foreground dark:text-muted-foreground">
            © 2024 AgentHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
