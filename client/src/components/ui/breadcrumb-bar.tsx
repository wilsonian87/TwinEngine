/**
 * BreadcrumbBar Component
 *
 * Phase 13.1: Shows navigation context path with clickable breadcrumbs.
 * Uses NavigationContext to track drill-down navigation.
 *
 * @example
 * <BreadcrumbBar />
 * // Renders: Dashboard > Email Fatigue > HCP Explorer (filtered)
 */

import React from 'react';
import { Link } from 'wouter';
import { ChevronRight, Home, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigationSafe, type PathItem } from '@/contexts/navigation-context';

// ============================================================================
// TYPES
// ============================================================================

export interface BreadcrumbBarProps {
  /** Optional override for the path (if not using context) */
  path?: PathItem[];
  /** Show home icon for first item */
  showHome?: boolean;
  /** Optional callback when item is clicked */
  onNavigate?: (item: PathItem, index: number) => void;
  /** Show clear button */
  showClear?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BreadcrumbBar({
  path: pathOverride,
  showHome = true,
  onNavigate,
  showClear = false,
  className,
}: BreadcrumbBarProps) {
  const navigation = useNavigationSafe();
  const path = pathOverride || navigation?.path || [];

  // Don't render if no path
  if (path.length === 0) {
    return null;
  }

  const handleClick = (item: PathItem, index: number) => {
    if (onNavigate) {
      onNavigate(item, index);
    }
  };

  const handleClear = () => {
    navigation?.clear();
  };

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={cn(
        'flex items-center gap-1 text-sm',
        'px-4 py-2 bg-muted/30 rounded-lg',
        className
      )}
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {path.map((item, index) => {
          const isLast = index === path.length - 1;
          const isFirst = index === 0;

          return (
            <li key={`${item.href}-${index}`} className="flex items-center gap-1">
              {/* Separator (not before first item) */}
              {!isFirst && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}

              {/* Breadcrumb item */}
              {isLast ? (
                // Current page (not clickable)
                <span
                  className="flex items-center gap-1.5 text-foreground font-medium"
                  aria-current="page"
                >
                  {isFirst && showHome && <Home className="h-4 w-4" />}
                  <span className="max-w-[200px] truncate">{item.label}</span>
                  {item.params && Object.keys(item.params).length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({Object.keys(item.params).length} filters)
                    </span>
                  )}
                </span>
              ) : (
                // Previous pages (clickable)
                <Link
                  href={item.href}
                  onClick={() => handleClick(item, index)}
                  className={cn(
                    'flex items-center gap-1.5',
                    'text-muted-foreground hover:text-foreground',
                    'transition-colors'
                  )}
                >
                  {isFirst && showHome && <Home className="h-4 w-4" />}
                  <span className="max-w-[150px] truncate">{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {/* Clear button */}
      {showClear && navigation && path.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={handleClear}
          aria-label="Clear navigation path"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </nav>
  );
}

// ============================================================================
// SIMPLIFIED BREADCRUMB (for inline use)
// ============================================================================

export interface SimpleBreadcrumbProps {
  items: Array<{ label: string; href?: string }>;
  className?: string;
}

export function SimpleBreadcrumb({ items, className }: SimpleBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm', className)}>
      <ol className="flex items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              {isLast || !item.href ? (
                <span
                  className={cn(
                    isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default BreadcrumbBar;
