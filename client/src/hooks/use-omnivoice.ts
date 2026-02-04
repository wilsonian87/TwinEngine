/**
 * Omni-Voice Hooks
 *
 * React hooks for interacting with the Omni-Voice API.
 * Supports streaming responses via Server-Sent Events.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// TYPES
// ============================================================================

export interface OmniVoiceMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: OmniVoiceSource[];
  mlrModified?: boolean;
  complianceIssue?: string | null;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface OmniVoiceSource {
  title?: string;
  body?: string;
  summary?: string;
  similarity?: number;
}

export interface OmniVoiceContext {
  page?: string;
  hcp?: {
    id?: string;
    name?: string;
    specialty?: string;
    tier?: string;
  };
  campaign?: {
    id?: string;
    name?: string;
  };
  therapeuticArea?: string;
  custom?: string;
}

export interface OmniVoiceHealth {
  status: "healthy" | "initializing" | "error";
  agentReady: boolean;
  ragAvailable: boolean;
  mlrAvailable: boolean;
}

interface ChatRequest {
  message: string;
  context?: OmniVoiceContext;
  useRag?: boolean;
  useMlr?: boolean;
}

interface StreamEvent {
  type: "chunk" | "sources" | "complete" | "error";
  content?: string;
  sources?: OmniVoiceSource[];
  mlrModified?: boolean;
  complianceIssue?: string | null;
  message?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const OMNIVOICE_API_URL = import.meta.env.VITE_OMNIVOICE_API_URL || "http://localhost:8080";

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchHealth(): Promise<OmniVoiceHealth> {
  const response = await fetch(`${OMNIVOICE_API_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Failed to fetch Omni-Voice health");
  }

  const data = await response.json();
  return {
    status: data.status,
    agentReady: data.agent_ready,
    ragAvailable: data.rag_available,
    mlrAvailable: data.mlr_available,
  };
}

async function clearHistory(): Promise<void> {
  const response = await fetch(`${OMNIVOICE_API_URL}/api/clear`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to clear history");
  }
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for Omni-Voice health status
 */
export function useOmniVoiceHealth() {
  return useQuery({
    queryKey: ["omnivoice", "health"],
    queryFn: fetchHealth,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
    retry: 1,
  });
}

/**
 * Hook for clearing Omni-Voice conversation history
 */
export function useClearOmniVoiceHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["omnivoice"] });
    },
  });
}

/**
 * Main hook for Omni-Voice chat with streaming support
 */
export function useOmniVoice() {
  const [messages, setMessages] = useState<OmniVoiceMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (request: ChatRequest) => {
      setError(null);

      // Add user message
      const userMessage: OmniVoiceMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: request.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Create placeholder for assistant response
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: OmniVoiceMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Start streaming
      setIsStreaming(true);
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`${OMNIVOICE_API_URL}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: request.message,
            context: request.context,
            use_rag: request.useRag ?? true,
            use_mlr: request.useMlr ?? true,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let sources: OmniVoiceSource[] = [];
        let mlrModified = false;
        let complianceIssue: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event: StreamEvent = JSON.parse(line.slice(6));

                if (event.type === "chunk" && event.content) {
                  fullContent += event.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: fullContent }
                        : m
                    )
                  );
                } else if (event.type === "sources" && event.sources) {
                  sources = event.sources;
                } else if (event.type === "complete") {
                  mlrModified = event.mlrModified || false;
                  complianceIssue = event.complianceIssue || null;
                } else if (event.type === "error") {
                  throw new Error(event.message || "Unknown error");
                }
              } catch (parseError) {
                console.warn("Failed to parse SSE event:", line);
              }
            }
          }
        }

        // Update final message state
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: fullContent,
                  sources,
                  mlrModified,
                  complianceIssue,
                  isStreaming: false,
                }
              : m
          )
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled
          return;
        }

        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);

        // Update message to show error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: `Error: ${errorMessage}`,
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
    clearMessages,
  };
}

/**
 * Hook for managing Omni-Voice context from current page
 */
export function useOmniVoiceContext() {
  const [context, setContext] = useState<OmniVoiceContext>({});

  const updateContext = useCallback((updates: Partial<OmniVoiceContext>) => {
    setContext((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearContext = useCallback(() => {
    setContext({});
  }, []);

  return {
    context,
    updateContext,
    clearContext,
  };
}
