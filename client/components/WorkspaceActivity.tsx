import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Clock, Tool, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Tool call record
 */
export interface ToolCall {
  id: string;
  agentId: string;
  agentName: string;
  toolName: string;
  toolType: "web_search" | "file_ops" | "code_exec" | "custom";
  input: Record<string, unknown>;
  status: "pending" | "executing" | "completed" | "failed";
  output?: unknown;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

/**
 * Agent action record
 */
export interface AgentAction {
  id: string;
  agentId: string;
  agentName: string;
  actionType: "thinking" | "tool_call" | "response" | "error";
  message?: string;
  toolCall?: ToolCall;
  timestamp: string;
  duration?: number; // in milliseconds
}

interface WorkspaceActivityProps {
  activities: AgentAction[];
  isLoading?: boolean;
}

export const WorkspaceActivity = ({
  activities,
  isLoading = false,
}: WorkspaceActivityProps) => {
  const getIcon = (activity: AgentAction) => {
    switch (activity.actionType) {
      case "thinking":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "tool_call":
        return <Tool className="w-4 h-4 text-purple-500" />;
      case "response":
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "failed":
        return "text-red-600 dark:text-red-400";
      case "executing":
        return "text-yellow-600 dark:text-yellow-400";
      case "pending":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const formatTimestamp = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card className="h-full flex flex-col bg-card dark:bg-card border-border dark:border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Activity Log</CardTitle>
        <CardDescription>Agent actions and tool usage</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Loading activity...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No activity yet. Start a conversation to see agent actions.</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="p-3 rounded-md bg-background dark:bg-background border border-border dark:border-border"
            >
              <div className="flex gap-2 items-start">
                {getIcon(activity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground dark:text-foreground">
                        {activity.agentName}
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground capitalize">
                        {activity.actionType.replace("_", " ")}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>

                  {/* Tool Call Details */}
                  {activity.toolCall && (
                    <div className="mt-2 pl-4 border-l border-border dark:border-border">
                      <p className="text-xs font-medium text-foreground dark:text-foreground">
                        {activity.toolCall.toolName}
                      </p>
                      <span
                        className={`text-xs font-medium capitalize ${getStatusColor(
                          activity.toolCall.status
                        )}`}
                      >
                        {activity.toolCall.status}
                      </span>

                      {activity.toolCall.status === "completed" &&
                        activity.toolCall.output && (
                          <div className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground truncate">
                            Output: {JSON.stringify(activity.toolCall.output).substring(0, 50)}...
                          </div>
                        )}

                      {activity.toolCall.status === "failed" &&
                        activity.toolCall.error && (
                          <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                            Error: {activity.toolCall.error}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Message */}
                  {activity.message && (
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1 truncate">
                      {activity.message}
                    </p>
                  )}

                  {/* Duration */}
                  {activity.duration !== undefined && (
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                      Took {(activity.duration / 1000).toFixed(2)}s
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default WorkspaceActivity;
