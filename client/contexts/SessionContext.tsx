/**
 * Session Context
 * ===============
 * Global state management for user sessions and conversations
 */

import React, { createContext, useContext, useEffect, useState } from "react";

export interface Conversation {
  id: string;
  agentId?: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SessionContextType {
  sessionId: string | null;
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  isLoadingSession: boolean;
  initializeSession: (id?: string) => Promise<void>;
  conversations: Conversation[];
  isLoadingConversations: boolean;
  loadConversations: () => Promise<void>;
  createNewConversation: (agentId?: string, title?: string) => Promise<Conversation | null>;
  renameConversation: (conversationId: string, newTitle: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  // Branch management
  currentBranchId: string | null;
  availableBranches: string[];
  switchBranch: (branchId: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<string | null>;
  regenerateMessage: (messageId: string) => Promise<string | null>;
  loadBranches: () => Promise<void>;
  // Background streaming
  streamingConversationId: string | null;
  setStreamingConversationId: (id: string | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  // Branch management state
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  // Background streaming
  const [streamingConversationId, setStreamingConversationId] = useState<string | null>(null);

  /**
   * Initialize or restore session
   */
  const initializeSession = async (id?: string) => {
    try {
      setIsLoadingSession(true);

      // Check localStorage for existing session
      const storedSessionId = localStorage.getItem("sessionId");
      const sessionToUse = id || storedSessionId;

      let response;
      if (sessionToUse) {
        // Try to get existing session
        response = await fetch(`/api/sessions/${sessionToUse}`);
        if (!response.ok) {
          throw new Error("Session not found");
        }
      } else {
        // Create new session
        response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      }

      if (!response.ok) {
        throw new Error("Failed to initialize session");
      }

      const data = await response.json();
      const newSessionId = data.id;

      // Store in localStorage
      localStorage.setItem("sessionId", newSessionId);
      setSessionId(newSessionId);

      // Load conversations automatically
      await loadConversationsFromId(newSessionId);
    } catch (error) {
      console.error("Failed to initialize session:", error);
      // Create new session on error
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await response.json();
        localStorage.setItem("sessionId", data.id);
        setSessionId(data.id);
      } catch (createError) {
        console.error("Failed to create new session:", createError);
      }
    } finally {
      setIsLoadingSession(false);
    }
  };

  /**
   * Initialize session on mount
   */
  useEffect(() => {
    initializeSession();
  }, []);

  const loadConversationsFromId = async (id: string) => {
    setIsLoadingConversations(true);
    try {
      const response = await fetch(`/api/sessions/${id}/conversations`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
        if (!currentConversationId && data.conversations.length > 0) {
          setCurrentConversationId(data.conversations[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversations = async () => {
    if (sessionId) {
      await loadConversationsFromId(sessionId);
    }
  };

  const createNewConversation = async (agentId?: string, title: string = "New Conversation"): Promise<Conversation | null> => {
    if (!sessionId) return null;
    try {
      const payload: any = { title };
      if (agentId) payload.agentId = agentId;

      const response = await fetch(`/api/sessions/${sessionId}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newConversation = await response.json();
        setConversations((prev) => [newConversation, ...prev]);
        setCurrentConversationId(newConversation.id);
        return newConversation;
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
    return null;
  };

  const renameConversation = async (conversationId: string, newTitle: string) => {
    if (!sessionId) return;
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/conversations/${conversationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        }
      );

      if (response.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, title: newTitle } : c))
        );
      }
    } catch (error) {
      console.error("Error renaming conversation:", error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!sessionId) return;
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/conversations/${conversationId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (currentConversationId === conversationId) {
          setConversations((prev) => {
            const remaining = prev.filter((c) => c.id !== conversationId);
            setCurrentConversationId(remaining.length > 0 ? remaining[0].id : null);
            return remaining;
          });
        }
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  // Re-fetch conversations if sessionId changes directly (just in case)
  useEffect(() => {
    if (sessionId) {
      loadConversations();
    }
  }, [sessionId]);

  // Load branches when conversation changes
  useEffect(() => {
    if (currentConversationId && sessionId) {
      loadBranches();
    }
  }, [currentConversationId, sessionId]);

  /**
   * Load available branches for current conversation
   */
  const loadBranches = async () => {
    if (!sessionId || !currentConversationId) return;
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/conversations/${currentConversationId}/branches`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableBranches(data.branches || []);
        setCurrentBranchId(data.currentBranchId || "default");
      }
    } catch (error) {
      console.error("Error loading branches:", error);
    }
  };

  /**
   * Switch to a different branch
   */
  const switchBranch = async (branchId: string) => {
    if (!sessionId || !currentConversationId) return;
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/conversations/${currentConversationId}/branches/${branchId}/switch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentBranchId(data.currentBranchId || branchId);
        // Trigger reload of messages in Chat component
      }
    } catch (error) {
      console.error("Error switching branch:", error);
    }
  };

  /**
   * Edit a message and create a new branch
   */
  const editMessage = async (messageId: string, newContent: string): Promise<string | null> => {
    if (!sessionId || !currentConversationId) return null;
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/conversations/${currentConversationId}/messages/${messageId}/edit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentBranchId(data.currentBranchId || data.branchId);
        // Reload branches
        await loadBranches();
        return data.branchId;
      }
    } catch (error) {
      console.error("Error editing message:", error);
    }
    return null;
  };

  /**
   * Regenerate an assistant response in a new branch
   */
  const regenerateMessage = async (messageId: string): Promise<string | null> => {
    if (!sessionId || !currentConversationId) return null;
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/conversations/${currentConversationId}/messages/${messageId}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentBranchId(data.currentBranchId || data.branchId);
        // Reload branches
        await loadBranches();
        return data.branchId;
      }
    } catch (error) {
      console.error("Error regenerating message:", error);
    }
    return null;
  };

  const value: SessionContextType = {
    sessionId,
    currentConversationId,
    setCurrentConversationId,
    isLoadingSession,
    initializeSession,
    conversations,
    isLoadingConversations,
    loadConversations,
    createNewConversation,
    renameConversation,
    deleteConversation,
    // Branch management
    currentBranchId,
    availableBranches,
    switchBranch,
    editMessage,
    regenerateMessage,
    loadBranches,
    // Background streaming
    streamingConversationId,
    setStreamingConversationId,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

/**
 * Hook to use session context
 */
export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
};
