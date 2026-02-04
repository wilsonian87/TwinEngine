/**
 * Omni-Voice Chat Widget
 *
 * Floating chat widget for conversational AI assistance.
 * Supports streaming responses, context injection, and keyboard shortcuts.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Send,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Trash2,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  useOmniVoice,
  useOmniVoiceHealth,
  useClearOmniVoiceHistory,
  type OmniVoiceMessage,
  type OmniVoiceContext,
} from "@/hooks/use-omnivoice";

// ============================================================================
// TYPES
// ============================================================================

interface OmniVoiceChatProps {
  /** Initial context to inject */
  context?: OmniVoiceContext;
  /** Callback when context changes */
  onContextChange?: (context: OmniVoiceContext) => void;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// MESSAGE COMPONENT
// ============================================================================

function ChatMessage({ message }: { message: OmniVoiceMessage }) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 mb-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-blue-600 text-white"
        )}
      >
        {isUser ? (
          <span className="text-xs font-medium">You</span>
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex-1 min-w-0",
          isUser ? "text-right" : "text-left"
        )}
      >
        <div
          className={cn(
            "inline-block rounded-lg px-3 py-2 max-w-[85%] text-sm",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-muted-foreground">Thinking...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>

        {/* Metadata */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {message.mlrModified && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Compliance adjusted
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {message.complianceIssue || "Response modified for compliance"}
                </TooltipContent>
              </Tooltip>
            )}

            {message.sources && message.sources.length > 0 && (
              <Collapsible open={showSources} onOpenChange={setShowSources}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    {message.sources.length} sources
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-2 bg-muted/50 rounded-md space-y-1">
                    {message.sources.map((source, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-muted-foreground">
                          {source.title?.slice(0, 50) || "Source"}...
                        </span>
                        {source.similarity && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {Math.round(source.similarity * 100)}%
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OmniVoiceChat({
  context,
  onContextChange,
  className,
}: OmniVoiceChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
    clearMessages,
  } = useOmniVoice();

  const { data: health, isLoading: healthLoading } = useOmniVoiceHealth();
  const clearHistory = useClearOmniVoiceHistory();

  // Keyboard shortcut (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        if (!isOpen) {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
      // Escape to close
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;

    sendMessage({
      message: input.trim(),
      context,
    });
    setInput("");
  }, [input, isStreaming, sendMessage, context]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    clearMessages();
    clearHistory.mutate();
  };

  const isReady = health?.status === "healthy" && health?.agentReady;

  // Minimized button
  if (!isOpen) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setIsOpen(true)}
            className={cn(
              "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg",
              "bg-blue-600 hover:bg-blue-700 text-white",
              className
            )}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Omni-Voice Assistant</p>
          <p className="text-xs text-muted-foreground">Press Cmd+K</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Card
      className={cn(
        "fixed shadow-2xl border-2 flex flex-col overflow-hidden transition-all duration-200",
        isExpanded
          ? "bottom-0 right-0 w-full h-full md:bottom-6 md:right-6 md:w-[500px] md:h-[700px] md:rounded-lg"
          : "bottom-6 right-6 w-[380px] h-[500px] rounded-lg",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-blue-600 text-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <div>
            <h3 className="font-semibold text-sm">Omni-Voice</h3>
            <p className="text-xs text-blue-100">Field Sales Advisor</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {healthLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-200" />
          ) : isReady ? (
            <Tooltip>
              <TooltipTrigger>
                <CheckCircle2 className="h-4 w-4 text-green-300" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Agent ready</p>
                {health?.ragAvailable && <p className="text-xs">RAG enabled</p>}
                {health?.mlrAvailable && <p className="text-xs">MLR filter active</p>}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-4 w-4 text-yellow-300" />
              </TooltipTrigger>
              <TooltipContent>
                Agent initializing...
              </TooltipContent>
            </Tooltip>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-blue-500"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-blue-500"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Context indicator */}
      {context && Object.keys(context).length > 0 && (
        <div className="px-3 py-1.5 bg-blue-50 border-b text-xs text-blue-700 flex items-center gap-2">
          <Info className="h-3 w-3" />
          <span>
            Context: {context.page || ""}
            {context.hcp?.name ? ` - ${context.hcp.name}` : ""}
            {context.therapeuticArea ? ` - ${context.therapeuticArea}` : ""}
          </span>
        </div>
      )}

      {/* Messages */}
      <ScrollArea
        ref={scrollRef}
        className="flex-1 p-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-30" />
            <p className="font-medium">Welcome to Omni-Voice</p>
            <p className="text-sm">
              Your field sales advisor with 20+ years of pharma experience.
            </p>
            <div className="mt-4 text-xs space-y-1">
              <p>Try asking:</p>
              <p className="italic">"How do I prioritize a new territory?"</p>
              <p className="italic">"What's the best approach for oncologists?"</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-background">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Omni-Voice..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isStreaming || !isReady}
          />
          <div className="flex flex-col gap-1">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming || !isReady}
              size="icon"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            {messages.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClear}
                    disabled={isStreaming}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear conversation</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </Card>
  );
}

export default OmniVoiceChat;
