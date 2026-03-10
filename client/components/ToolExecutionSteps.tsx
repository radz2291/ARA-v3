import React from "react";
import { CheckCircle2, Loader2, XCircle, Terminal, Globe, FileCode, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExecutionStep {
    tool: string;
    status: "executing" | "completed" | "failed";
    timestamp: string;
    result?: any;
    error?: string;
}

interface ToolExecutionStepsProps {
    steps: ExecutionStep[];
}

const getToolIcon = (toolName: string) => {
    const name = toolName.toLowerCase();
    if (name.includes("search")) return <Globe className="w-4 h-4" />;
    if (name.includes("code") || name.includes("exec")) return <Terminal className="w-4 h-4" />;
    if (name.includes("file")) return <FileCode className="w-4 h-4" />;
    if (name.includes("delegate") || name.includes("agent")) return <Users className="w-4 h-4" />;
    return <Terminal className="w-4 h-4" />;
};

export function ToolExecutionSteps({ steps }: ToolExecutionStepsProps) {
    if (!steps || steps.length === 0) return null;

    return (
        <div className="my-4 space-y-3">
            <div className="flex items-center gap-2 mb-2 px-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Execution Flow
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-border via-border to-transparent opacity-50" />
            </div>

            <div className="space-y-4">
                {steps.map((step, index) => (
                    <div
                        key={index}
                        className={cn(
                            "group relative flex gap-4 p-4 rounded-xl border transition-all duration-500 animate-in fade-in slide-in-from-left-4",
                            "bg-card/30 backdrop-blur-md",
                            step.status === "executing" ? "border-primary/30 border-dashed animate-pulse" : "border-border/50 shadow-sm",
                            step.status === "failed" ? "bg-destructive/5 border-destructive/20" : "hover:border-primary/20"
                        )}
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {/* Status Indicator Sidebar */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className={cn(
                                "p-2 rounded-lg transition-colors duration-300",
                                step.status === "completed" ? "bg-green-500/10 text-green-500" :
                                    step.status === "failed" ? "bg-destructive/10 text-destructive" :
                                        "bg-primary/10 text-primary"
                            )}>
                                {step.status === "executing" ? <Loader2 className="w-4 h-4 animate-spin" /> : getToolIcon(step.tool)}
                            </div>
                            {index < steps.length - 1 && (
                                <div className="w-px flex-1 bg-gradient-to-b from-border to-transparent my-1" />
                            )}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <h4 className="text-sm font-bold tracking-tight text-foreground/90">
                                    {step.tool.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                </h4>
                                <div className={cn(
                                    "flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm transition-all duration-300",
                                    step.status === "completed" ? "bg-green-500/5 text-green-600 border-green-500/20" :
                                        step.status === "failed" ? "bg-destructive/5 text-destructive border-destructive/20" :
                                            "bg-primary/5 text-primary border-primary/20"
                                )}>
                                    {step.status === "completed" && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                                    {step.status === "failed" && <XCircle className="w-3 h-3 text-destructive" />}
                                    {step.status.toUpperCase()}
                                </div>
                            </div>

                            {step.status === "completed" && step.result && (
                                <div className="mt-3 group-hover:bg-muted/30 transition-colors bg-muted/20 backdrop-blur-sm border border-border/10 rounded-lg p-3 text-[11px] leading-relaxed font-mono text-muted-foreground/90 overflow-hidden shadow-inner">
                                    <div className="flex items-center gap-1.5 mb-2 text-[10px] font-black text-foreground/30 uppercase tracking-widest">
                                        <Terminal className="w-3 h-3" />
                                        Output
                                    </div>
                                    <div className="max-h-[150px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                        {typeof step.result === "string"
                                            ? step.result
                                            : JSON.stringify(step.result, null, 2)}
                                    </div>
                                </div>
                            )}

                            {step.status === "failed" && step.error && (
                                <div className="mt-3 bg-destructive/5 border border-destructive/10 rounded-lg p-3 text-[11px] text-destructive leading-relaxed">
                                    <div className="font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1 opacity-80">
                                        <XCircle className="w-3 h-3" />
                                        Error Detail
                                    </div>
                                    {step.error}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
