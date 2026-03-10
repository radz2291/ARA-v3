/**
 * Session Context
 * ===============
 * Global state management for user sessions and conversations
 */

import React, { createContext, useContext, useEffect, useState } from "react";

interface SessionContextType {
  sessionId: string | null;
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  isLoadingSession: boolean;
  initializeSession: (id?: string) => Promise<void>;
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

      // Load first conversation if available
      const conversationsResponse = await fetch(
        `/api/sessions/${newSessionId}/conversations`
      );
      if (conversationsResponse.ok) {
        const convData = await conversationsResponse.json();
        if (convData.conversations.length > 0) {
          setCurrentConversationId(convData.conversations[0].id);
        }
      }
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

  const value: SessionContextType = {
    sessionId,
    currentConversationId,
    setCurrentConversationId,
    isLoadingSession,
    initializeSession,
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
