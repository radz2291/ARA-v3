/**
 * ConversationStore
 * =================
 * Global registry that owns every conversation's messages and streaming state.
 * Each conversation is completely isolated — navigation never touches another
 * conversation's stream. This is the "Chrome-tab" model.
 *
 * Architecture:
 *   - `convStates`  — React state: Record<convId, ConvState> (drives re-renders)
 *   - `abortRefs`   — plain Map: convId → AbortController (no re-renders needed)
 *   - `accumRefs`   — plain Map: convId → { content, reasoning, steps } (streaming acc)
 *
 * Key invariants:
 *   1. Only `setConvState` triggers React re-renders; raw ref mutations do not.
 *   2. `startStream()` is fire-and-forget; the caller does not need to await it.
 *   3. `stopStream(id)` aborts only that conversation's controller.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  LLMMessage,
  LLMConfig,
  OpenAIProvider,
  createLLMProvider,
} from "@/lib/llm-service";
import { ExecutionStep } from "@/components/ToolExecutionSteps";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: string;
  executionSteps?: ExecutionStep[];
  isPartialContent?: boolean;
}

interface ConvState {
  messages: Message[];
  isStreaming: boolean;
  /** True while the initial server fetch is in flight */
  isLoading: boolean;
}

interface StreamOpts {
  sessionId: string;
  conversationId: string;
  config: LLMConfig;
  agentTools: any[];
  workspaceId?: string | null;
  /** Called when the stream finishes so the caller can auto-rename, etc. */
  onFinished?: (conversationId: string) => void;
}

interface ConversationStoreContextType {
  /** Get the live state for one conversation (safe to call with undefined id) */
  getConvState: (convId: string | null | undefined) => ConvState;
  /** Patch a single message inside a conversation by its ID */
  patchConvMessage: (
    convId: string,
    messageId: string,
    updates: Partial<Message>,
  ) => void;
  /** Set messages for a conversation (e.g. after loading from server) */
  setConvMessages: (convId: string, messages: Message[]) => void;
  /** Mark a conversation as loading */
  setConvLoading: (convId: string, loading: boolean) => void;
  /** Start a stream for a conversation (fire-and-forget) */
  startStream: (llmMessages: LLMMessage[], opts: StreamOpts) => void;
  /** Stop streaming for a specific conversation */
  stopStream: (convId: string) => void;
  /** IDs of all conversations currently streaming */
  streamingIds: Set<string>;
  /** Load a conversation's messages from server (skips if already has messages or streaming) */
  loadMessages: (
    convId: string,
    sessionId: string,
    forceReload?: boolean,
  ) => Promise<Message[]>;
}

// ─── Context ────────────────────────────────────────────────────────────────

const ConversationStoreContext = createContext<
  ConversationStoreContextType | undefined
>(undefined);

const EMPTY_STATE: ConvState = {
  messages: [],
  isStreaming: false,
  isLoading: false,
};

// ─── Provider ───────────────────────────────────────────────────────────────

export const ConversationStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // React state — drives component re-renders
  const [convStates, setConvStates] = useState<Record<string, ConvState>>({});

  // Mutable refs — no re-renders triggered
  const abortRefs = useRef<Map<string, AbortController>>(new Map());
  const accumRefs = useRef<
    Map<string, { content: string; reasoning: string; steps: ExecutionStep[] }>
  >(new Map());

  // Per-conversation fetch version counter — incremented on each new fetch and
  // on explicit setConvMessages calls. If a fetch completes and its capturedVersion
  // no longer matches, the result is a stale overwrite and must be discarded.
  const fetchVersionRefs = useRef<Map<string, number>>(new Map());

  // ── Derived ──────────────────────────────────────────────────────────────

  const streamingIds = new Set<string>(
    Object.entries(convStates)
      .filter(([, s]) => s.isStreaming)
      .map(([id]) => id),
  );

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getConvState = useCallback(
    (convId: string | null | undefined): ConvState => {
      if (!convId) return EMPTY_STATE;
      return convStates[convId] ?? EMPTY_STATE;
    },
    [convStates],
  );

  const patchConv = useCallback((convId: string, patch: Partial<ConvState>) => {
    setConvStates((prev) => ({
      ...prev,
      [convId]: { ...(prev[convId] ?? EMPTY_STATE), ...patch },
    }));
  }, []);

  const setConvMessages = useCallback(
    (convId: string, messages: Message[]) => {
      // Invalidate any in-flight fetch so it won't overwrite this explicit update
      fetchVersionRefs.current.set(
        convId,
        (fetchVersionRefs.current.get(convId) ?? 0) + 1,
      );
      patchConv(convId, { messages });
    },
    [patchConv],
  );

  /** Update a single message inside a conversation without touching any other messages. */
  const patchConvMessage = useCallback(
    (convId: string, messageId: string, updates: Partial<Message>) => {
      setConvStates((prev) => {
        const state = prev[convId];
        if (!state) return prev;
        return {
          ...prev,
          [convId]: {
            ...state,
            messages: state.messages.map((m) =>
              m.id === messageId ? { ...m, ...updates } : m,
            ),
          },
        };
      });
    },
    [],
  );

  const setConvLoading = useCallback(
    (convId: string, loading: boolean) => {
      patchConv(convId, { isLoading: loading });
    },
    [patchConv],
  );

  const stopStream = useCallback((convId: string) => {
    abortRefs.current.get(convId)?.abort();
    abortRefs.current.delete(convId);
  }, []);

  // ── loadMessages ─────────────────────────────────────────────────────────

  const loadMessages = useCallback(
    async (
      convId: string,
      sessionId: string,
      forceReload = false,
    ): Promise<Message[]> => {
      const existing = convStates[convId];
      // Skip if already loaded (unless forced), or if currently streaming
      if (!forceReload && (existing?.messages.length ?? 0) > 0) {
        return existing!.messages;
      }
      if (convStates[convId]?.isStreaming) {
        return convStates[convId].messages;
      }

      patchConv(convId, { isLoading: true });
      // Capture the current fetch version — if it changes before this fetch returns,
      // a newer explicit update happened and this stale result must be discarded.
      const fetchVersion = (fetchVersionRefs.current.get(convId) ?? 0) + 1;
      fetchVersionRefs.current.set(convId, fetchVersion);
      try {
        const res = await fetch(
          `/api/sessions/${sessionId}/conversations/${convId}`,
        );
        if (res.ok) {
          const data = await res.json();
          const loaded: Message[] = (data.messages || []).map(
            (m: any, idx: number) => ({
              ...m,
              id: m.id || `msg-${Date.now()}-${idx}`,
            }),
          );
          // Guard 1: discard if a newer explicit setConvMessages invalidated this fetch
          // Guard 2: discard if streaming started while fetch was in-flight
          const currentVersion = fetchVersionRefs.current.get(convId) ?? 0;
          if (currentVersion !== fetchVersion) {
            patchConv(convId, { isLoading: false });
            return loaded; // Return result but don't write to store
          }
          if (!convStates[convId]?.isStreaming) {
            patchConv(convId, { messages: loaded, isLoading: false });
          } else {
            patchConv(convId, { isLoading: false });
          }
          return loaded;
        }
      } catch (err) {
        console.error("ConversationStore: loadMessages error", err);
      }
      patchConv(convId, { isLoading: false });
      return [];
    },
    // convStates is needed to check if already loaded/streaming
    [patchConv, convStates],
  );

  // ── startStream ──────────────────────────────────────────────────────────

  const startStream = useCallback(
    (llmMessages: LLMMessage[], opts: StreamOpts) => {
      const {
        sessionId,
        conversationId,
        config,
        agentTools,
        workspaceId,
        onFinished,
      } = opts;

      // Build initial assistant placeholder
      const assistantTempId = `temp-assistant-${Date.now()}`;
      const placeholder: Message = {
        id: assistantTempId,
        role: "assistant",
        content: "",
        reasoning: "",
        timestamp: new Date().toISOString(),
        executionSteps: [],
        isPartialContent: true,
      };

      // Seed accumulator
      accumRefs.current.set(conversationId, {
        content: "",
        reasoning: "",
        steps: [],
      });

      // Append placeholder to existing messages
      setConvStates((prev) => {
        const existing = prev[conversationId] ?? EMPTY_STATE;
        return {
          ...prev,
          [conversationId]: {
            ...existing,
            messages: [...existing.messages, placeholder],
            isStreaming: true,
          },
        };
      });

      // Set up fresh AbortController (cancel any previous stream for this conv)
      abortRefs.current.get(conversationId)?.abort();
      const controller = new AbortController();
      abortRefs.current.set(conversationId, controller);

      // Helper: patch a single message inside this conversation
      const patchMsg = (updater: (m: Message) => Message) => {
        setConvStates((prev) => {
          const state = prev[conversationId];
          if (!state) return prev;
          return {
            ...prev,
            [conversationId]: {
              ...state,
              messages: state.messages.map((m) =>
                m.id === assistantTempId ? updater(m) : m,
              ),
            },
          };
        });
      };

      // Run the stream asynchronously — fire and forget
      (async () => {
        const provider = createLLMProvider(config, sessionId);
        const formattedTools =
          agentTools.length > 0
            ? OpenAIProvider.formatToolsForOpenAI(agentTools)
            : undefined;

        try {
          await provider.streamResponse(
            llmMessages,
            formattedTools,
            workspaceId || undefined,
            (event) => {
              const acc = accumRefs.current.get(conversationId);
              if (!acc) return;

              if (event.type === "reasoning") {
                acc.reasoning += event.content || "";
                patchMsg((m) => ({ ...m, reasoning: acc.reasoning }));
              } else if (event.type === "response") {
                acc.content += event.content || "";
                patchMsg((m) => ({ ...m, content: acc.content }));
              } else if (event.type === "tool_start") {
                const step: ExecutionStep = {
                  tool: event.toolName,
                  status: "executing",
                  timestamp: new Date().toISOString(),
                };
                acc.steps.push(step);
                patchMsg((m) => ({
                  ...m,
                  executionSteps: [...acc.steps],
                }));
              } else if (
                event.type === "tool_result" ||
                event.type === "tool_error"
              ) {
                const isError = event.type === "tool_error";
                const lastIdx = [...acc.steps]
                  .reverse()
                  .findIndex(
                    (s) =>
                      s.tool === event.toolName && s.status === "executing",
                  );
                if (lastIdx !== -1) {
                  const actualIdx = acc.steps.length - 1 - lastIdx;
                  acc.steps[actualIdx] = {
                    ...acc.steps[actualIdx],
                    status: isError ? "failed" : "completed",
                    result: event.result,
                    error: event.error,
                    timestamp: new Date().toISOString(),
                  };
                }
                patchMsg((m) => ({
                  ...m,
                  executionSteps: [...acc.steps],
                }));
              }
            },
            controller.signal,
          );

          // ── Save to server ───────────────────────────────────────────────
          const acc = accumRefs.current.get(conversationId) ?? {
            content: "",
            reasoning: "",
            steps: [],
          };
          try {
            const assistantResp = await fetch(
              `/api/sessions/${sessionId}/conversations/${conversationId}/messages`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  role: "assistant",
                  content: acc.content,
                  reasoning: acc.reasoning,
                  executionSteps: acc.steps,
                }),
              },
            );

            if (assistantResp.ok) {
              const saved = await assistantResp.json();
              // Replace temp ID with server-assigned ID
              setConvStates((prev) => {
                const state = prev[conversationId];
                if (!state) return prev;
                return {
                  ...prev,
                  [conversationId]: {
                    ...state,
                    messages: state.messages.map((m) =>
                      m.id === assistantTempId
                        ? { ...m, id: saved.id, isPartialContent: false }
                        : m,
                    ),
                  },
                };
              });
            } else {
              // Failed to save — at least clear the streaming indicator
              patchMsg((m) => ({ ...m, isPartialContent: false }));
            }
          } catch (saveErr) {
            console.error("ConversationStore: save error", saveErr);
            patchMsg((m) => ({ ...m, isPartialContent: false }));
          }

          onFinished?.(conversationId);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            // User stopped — clear partial indicator
            patchMsg((m) => ({ ...m, isPartialContent: false }));
          } else {
            patchMsg((m) => ({ ...m, isPartialContent: false }));
            console.error("ConversationStore: stream error", err);
          }
        } finally {
          // Always clear streaming flag
          setConvStates((prev) => {
            const state = prev[conversationId];
            if (!state) return prev;
            return {
              ...prev,
              [conversationId]: { ...state, isStreaming: false },
            };
          });
          abortRefs.current.delete(conversationId);
          accumRefs.current.delete(conversationId);
        }
      })();
    },
    [],
  );

  // ── Context value ─────────────────────────────────────────────────────────

  const value: ConversationStoreContextType = {
    getConvState,
    patchConvMessage,
    setConvMessages,
    setConvLoading,
    startStream,
    stopStream,
    streamingIds,
    loadMessages,
  };

  return (
    <ConversationStoreContext.Provider value={value}>
      {children}
    </ConversationStoreContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useConversationStore = (): ConversationStoreContextType => {
  const ctx = useContext(ConversationStoreContext);
  if (!ctx) {
    throw new Error(
      "useConversationStore must be used within ConversationStoreProvider",
    );
  }
  return ctx;
};
