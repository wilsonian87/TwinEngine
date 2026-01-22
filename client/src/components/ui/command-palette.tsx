/**
 * CommandPalette Component
 *
 * Power-user navigation modal with search, navigation,
 * and quick actions. Triggered via ⌘K / Ctrl+K.
 *
 * Built on cmdk for accessible command menu functionality.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9C.1
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Activity,
  Users,
  FlaskConical,
  Zap,
  Stethoscope,
  Bot,
  Shield,
  Beaker,
  Settings,
  Plus,
  Download,
  GitCompare,
  Clock,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_CONFIG, getModuleDescription } from '@/lib/brand-config';
import { useCommandPalette, type RecentItem } from '@/hooks/use-command-palette';
import { modalVariants, overlayVariants, MOTION_DURATION } from '@/lib/motion-config';

// ============================================================================
// TYPES
// ============================================================================

interface NavigationItem {
  id: string;
  label: string;
  description?: string;
  path: string;
  icon: React.ReactNode;
  keywords?: string[];
  category: 'explore' | 'analyze' | 'activate' | 'system' | 'settings';
}

interface ActionItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

// ============================================================================
// NAVIGATION ITEMS
// ============================================================================

const navigationItems: NavigationItem[] = [
  // EXPLORE - Finding and organizing HCPs
  {
    id: 'hcp-explorer',
    label: 'HCP Explorer',
    description: 'Search and browse HCP profiles',
    path: '/hcp-explorer',
    icon: <Users className="w-4 h-4" />,
    keywords: ['hcp', 'explorer', 'profiles', 'search', 'healthcare', 'physician'],
    category: 'explore',
  },
  {
    id: 'audience-builder',
    label: 'Audience Builder',
    description: 'Create and manage HCP audiences',
    path: '/audience-builder',
    icon: <Users className="w-4 h-4" />,
    keywords: ['audience', 'builder', 'cohort', 'segment', 'query', 'ai'],
    category: 'explore',
  },

  // ANALYZE - Understanding what's happening
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview metrics and insights',
    path: '/dashboard',
    icon: <Activity className="w-4 h-4" />,
    keywords: ['dashboard', 'analytics', 'metrics', 'overview', 'home'],
    category: 'analyze',
  },
  {
    id: 'audience-comparison',
    label: 'Audience Comparison',
    description: 'Side-by-side audience analysis',
    path: '/cohort-compare',
    icon: <GitCompare className="w-4 h-4" />,
    keywords: ['compare', 'analysis', 'side', 'diff', 'audience'],
    category: 'analyze',
  },
  {
    id: 'channel-health',
    label: 'Channel Health',
    description: 'Channel performance diagnostics',
    path: '/feature-store',
    icon: <Activity className="w-4 h-4" />,
    keywords: ['health', 'diagnostic', 'channel', 'feature', 'performance'],
    category: 'analyze',
  },

  // ACTIVATE - Taking action on insights
  {
    id: 'simulation-studio',
    label: 'Simulation Studio',
    description: 'Campaign simulation and forecasting',
    path: '/simulations',
    icon: <FlaskConical className="w-4 h-4" />,
    keywords: ['simulation', 'campaign', 'scenario', 'predict', 'forecast'],
    category: 'activate',
  },
  {
    id: 'action-queue',
    label: 'Action Queue',
    description: 'Review and approve recommendations',
    path: '/action-queue',
    icon: <Zap className="w-4 h-4" />,
    keywords: ['action', 'queue', 'nba', 'recommendation', 'next'],
    category: 'activate',
  },
  {
    id: 'portfolio-optimizer',
    label: 'Portfolio Optimizer',
    description: 'Resource allocation optimization',
    path: '/allocation-lab',
    icon: <Beaker className="w-4 h-4" />,
    keywords: ['allocation', 'optimization', 'portfolio', 'budget'],
    category: 'activate',
  },

  // SYSTEM - Configuration and advanced features
  {
    id: 'agent-manager',
    label: 'Agent Manager',
    description: 'Autonomous agents and alerts',
    path: '/agents',
    icon: <Bot className="w-4 h-4" />,
    keywords: ['agent', 'bot', 'automation', 'alert', 'manager'],
    category: 'system',
  },
  {
    id: 'constraints',
    label: 'Constraints',
    description: 'Capacity, budget, and compliance',
    path: '/constraints',
    icon: <Shield className="w-4 h-4" />,
    keywords: ['constraint', 'budget', 'capacity', 'compliance', 'limit'],
    category: 'system',
  },
  {
    id: 'model-evaluation',
    label: 'Model Evaluation',
    description: 'Prediction accuracy tracking',
    path: '/model-evaluation',
    icon: <Activity className="w-4 h-4" />,
    keywords: ['model', 'evaluation', 'accuracy', 'prediction'],
    category: 'system',
  },

  // Settings
  {
    id: 'settings',
    label: 'Settings',
    description: 'Application configuration',
    path: '/settings',
    icon: <Settings className="w-4 h-4" />,
    keywords: ['settings', 'config', 'preferences', 'options'],
    category: 'settings',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function CommandPalette() {
  const { isOpen, setOpen, navigateTo, recentItems, addRecentItem, searchQuery, setSearchQuery } =
    useCommandPalette();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Actions that can be performed from command palette
  const actionItems: ActionItem[] = useMemo(
    () => [
      {
        id: 'new-audience',
        label: 'Create New Audience',
        description: 'Start building a new cohort',
        icon: <Plus className="w-4 h-4" />,
        action: () => {
          navigateTo('/audience-builder');
        },
        keywords: ['new', 'create', 'audience', 'cohort'],
      },
      {
        id: 'new-simulation',
        label: 'Run Simulation',
        description: 'Create a new scenario simulation',
        icon: <FlaskConical className="w-4 h-4" />,
        action: () => {
          navigateTo('/simulations');
        },
        keywords: ['new', 'run', 'simulation', 'scenario'],
      },
      {
        id: 'export-data',
        label: 'Export Data',
        description: 'Download reports and data',
        icon: <Download className="w-4 h-4" />,
        action: () => {
          // TODO: Implement export modal
          setOpen(false);
        },
        keywords: ['export', 'download', 'report', 'data'],
      },
    ],
    [navigateTo, setOpen]
  );

  // Handle navigation item selection
  const handleNavigate = (item: NavigationItem) => {
    addRecentItem({
      id: item.id,
      type: 'page',
      label: item.label,
      path: item.path,
      icon: item.id,
      timestamp: Date.now(),
    });
    navigateTo(item.path);
  };

  // Handle recent item selection
  const handleRecentSelect = (item: RecentItem) => {
    navigateTo(item.path);
  };

  // Get icon for recent item
  const getRecentIcon = (item: RecentItem): React.ReactNode => {
    if (item.type === 'hcp') return <Users className="w-4 h-4" />;
    if (item.type === 'audience') return <Users className="w-4 h-4" />;
    const navItem = navigationItems.find((n) => n.id === item.icon);
    return navItem?.icon || <FileText className="w-4 h-4" />;
  };

  // Category labels (Phase 13: Explore/Analyze/Activate/System)
  const categoryLabels: Record<string, string> = {
    explore: 'Explore',
    analyze: 'Analyze',
    activate: 'Activate',
    system: 'System',
    settings: 'Settings',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            variants={overlayVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            onClick={() => setOpen(false)}
          />

          {/* Command Dialog */}
          <motion.div
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-[640px] -translate-x-1/2"
            variants={modalVariants}
            initial="initial"
            animate="enter"
            exit="exit"
          >
            <Command
              className="command-palette rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(10, 10, 11, 0.95)',
                border: `1px solid ${BRAND_CONFIG.colors.borderGray}`,
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
              }}
              loop
            >
              {/* Search Input */}
              <div className="flex items-center border-b border-border-gray px-4">
                <Search className="w-5 h-5 text-muted-gray shrink-0" />
                <Command.Input
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent border-none outline-none text-signal-white text-base py-4 px-3 placeholder:text-muted-gray"
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border-gray bg-muted-gray/20 px-1.5 font-mono text-[10px] font-medium text-muted-gray">
                  ESC
                </kbd>
              </div>

              {/* Command List */}
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-muted-gray text-sm">
                  No results found.
                </Command.Empty>

                {/* Recent Items */}
                {recentItems.length > 0 && !searchQuery && (
                  <Command.Group heading="Recent">
                    {recentItems.map((item) => (
                      <Command.Item
                        key={`recent-${item.id}`}
                        value={`recent-${item.label}`}
                        onSelect={() => handleRecentSelect(item)}
                        className="command-item"
                      >
                        <div className="flex items-center gap-3 text-muted-gray">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-signal-white">{item.label}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-gray opacity-0 group-aria-selected:opacity-100" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Actions */}
                <Command.Group heading="Actions">
                  {actionItems.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={[item.label, ...(item.keywords || [])].join(' ')}
                      onSelect={item.action}
                      className="command-item"
                    >
                      <div className="flex items-center gap-3 text-catalyst-gold">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-signal-white">{item.label}</span>
                        {item.description && (
                          <span className="text-muted-gray text-xs ml-2">{item.description}</span>
                        )}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Navigation by Category (Phase 13: Explore/Analyze/Activate/System) */}
                {['explore', 'analyze', 'activate', 'system', 'settings'].map((category) => {
                  const items = navigationItems.filter((i) => i.category === category);
                  if (items.length === 0) return null;

                  return (
                    <Command.Group key={category} heading={categoryLabels[category]}>
                      {items.map((item) => (
                        <Command.Item
                          key={item.id}
                          value={[item.label, item.description, ...(item.keywords || [])].join(' ')}
                          onSelect={() => handleNavigate(item)}
                          className="command-item"
                        >
                          <div className="flex items-center gap-3 text-process-violet">
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-signal-white">{item.label}</span>
                            {item.description && (
                              <span className="text-muted-gray text-xs ml-2 hidden sm:inline">
                                {item.description}
                              </span>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-gray opacity-0 group-aria-selected:opacity-100" />
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </Command.List>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border-gray px-4 py-2 text-xs text-muted-gray">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted-gray/20 rounded text-[10px]">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted-gray/20 rounded text-[10px]">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted-gray/20 rounded text-[10px]">esc</kbd>
                    Close
                  </span>
                </div>
                <span className="text-process-violet font-medium">OmniVor</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// TRIGGER BUTTON
// ============================================================================

interface CommandPaletteTriggerProps {
  className?: string;
}

/**
 * Optional trigger button for command palette.
 * Can be placed in header or sidebar.
 */
export function CommandPaletteTrigger({ className }: CommandPaletteTriggerProps) {
  const { open } = useCommandPalette();

  return (
    <button
      onClick={open}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg',
        'bg-border-gray/50 hover:bg-border-gray',
        'text-muted-gray hover:text-signal-white',
        'text-sm transition-colors',
        className
      )}
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border-gray bg-void-black px-1.5 font-mono text-[10px] font-medium">
        ⌘K
      </kbd>
    </button>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CommandPalette;
