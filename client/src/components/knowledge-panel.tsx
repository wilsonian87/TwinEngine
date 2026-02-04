/**
 * Knowledge Panel Component
 *
 * A sidebar/panel component for browsing and searching knowledge content.
 * Integrates with the InsightRx knowledge base.
 */

import { useState } from "react";
import { useKnowledgeSearch, useKnowledgeList, KNOWLEDGE_CONTENT_TYPES } from "@/hooks/use-knowledge";
import { useFeatureFlag, INSIGHTRX_FLAGS } from "@/hooks/use-feature-flags";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, BookOpen, Filter, ExternalLink, Loader2 } from "lucide-react";

interface KnowledgePanelProps {
  /** Context to pre-filter results */
  context?: {
    therapeuticArea?: string;
    specialty?: string;
    audience?: string;
  };
  /** Callback when user selects a knowledge item */
  onSelect?: (id: string, title: string, content: string) => void;
  /** Panel title */
  title?: string;
  /** Compact mode for sidebars */
  compact?: boolean;
}

export function KnowledgePanel({
  context,
  onSelect,
  title = "Knowledge Base",
  compact = false,
}: KnowledgePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const [isSearching, setIsSearching] = useState(false);

  // Check if knowledge feature is enabled
  const { isEnabled: knowledgeEnabled, isLoading: flagLoading } = useFeatureFlag(
    INSIGHTRX_FLAGS.KNOWLEDGE
  );

  // Search results
  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError,
  } = useKnowledgeSearch(searchQuery, {
    filters: {
      contentType: selectedType,
      therapeuticArea: context?.therapeuticArea,
      specialty: context?.specialty,
      audience: context?.audience,
    },
    limit: 10,
    enabled: isSearching && searchQuery.length >= 3,
  });

  // Browse mode (when not searching)
  const { data: browseItems, isLoading: browseLoading } = useKnowledgeList({
    limit: compact ? 5 : 10,
    contentType: selectedType,
  });

  const handleSearch = () => {
    if (searchQuery.length >= 3) {
      setIsSearching(true);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Feature flag check
  if (flagLoading) {
    return (
      <Card className={compact ? "w-full" : "w-96"}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!knowledgeEnabled) {
    return (
      <Card className={compact ? "w-full" : "w-96"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Knowledge base feature is not enabled. Contact your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = searchLoading || browseLoading;
  const items = isSearching ? searchResults : browseItems;

  return (
    <Card className={compact ? "w-full" : "w-96"}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          {title}
        </CardTitle>
        {context?.therapeuticArea && (
          <CardDescription className="text-xs">
            Filtered by: {context.therapeuticArea}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-8 h-9"
            />
          </div>
          {isSearching ? (
            <Button variant="outline" size="sm" onClick={handleClearSearch}>
              Clear
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={searchQuery.length < 3}
            >
              Search
            </Button>
          )}
        </div>

        {/* Filter */}
        {!compact && (
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="h-8 text-xs">
              <Filter className="h-3 w-3 mr-2" />
              <SelectValue placeholder="All content types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              {KNOWLEDGE_CONTENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Results */}
        <ScrollArea className={compact ? "h-48" : "h-64"}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : searchError ? (
            <p className="text-sm text-destructive text-center py-4">
              Error loading results
            </p>
          ) : items && items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => (
                <KnowledgeItemCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  content={item.content}
                  contentType={item.contentType}
                  similarity={"similarity" in item ? item.similarity : undefined}
                  compact={compact}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isSearching ? "No results found" : "No knowledge items"}
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// KNOWLEDGE ITEM CARD
// ============================================================================

interface KnowledgeItemCardProps {
  id: string;
  title: string;
  content: string;
  contentType: string;
  similarity?: number;
  compact?: boolean;
  onSelect?: (id: string, title: string, content: string) => void;
}

function KnowledgeItemCard({
  id,
  title,
  content,
  contentType,
  similarity,
  compact,
  onSelect,
}: KnowledgeItemCardProps) {
  const truncatedContent = content.length > 100 ? content.slice(0, 100) + "..." : content;

  return (
    <div
      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => onSelect?.(id, title, content)}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-tight line-clamp-2">{title}</h4>
        {similarity !== undefined && (
          <Badge variant="secondary" className="text-xs shrink-0">
            {Math.round(similarity * 100)}%
          </Badge>
        )}
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {truncatedContent}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-xs">
          {contentType.replace(/_/g, " ")}
        </Badge>
        {onSelect && (
          <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// KNOWLEDGE SEARCH INPUT (Standalone)
// ============================================================================

interface KnowledgeSearchInputProps {
  onSelect: (id: string, title: string, content: string) => void;
  placeholder?: string;
  context?: {
    therapeuticArea?: string;
    specialty?: string;
  };
}

export function KnowledgeSearchInput({
  onSelect,
  placeholder = "Search knowledge base...",
  context,
}: KnowledgeSearchInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data: results, isLoading } = useKnowledgeSearch(query, {
    filters: {
      therapeuticArea: context?.therapeuticArea,
      specialty: context?.specialty,
    },
    limit: 5,
    enabled: query.length >= 3,
  });

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.length >= 3);
          }}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="pl-8"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : results && results.length > 0 ? (
            <div className="py-1">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="px-3 py-2 hover:bg-accent cursor-pointer"
                  onClick={() => {
                    onSelect(result.id, result.title, result.content);
                    setQuery("");
                    setIsOpen(false);
                  }}
                >
                  <p className="text-sm font-medium truncate">{result.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {result.contentType} • {Math.round(result.similarity * 100)}% match
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No results found
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default KnowledgePanel;
