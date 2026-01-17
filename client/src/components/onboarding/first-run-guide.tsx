/**
 * First Run Guide Component
 *
 * Welcome modal for first-time users introducing
 * OmniVor's nomenclature and key features.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9H
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  FlaskConical,
  LayoutDashboard,
  Keyboard,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Search;
  iconColor: string;
  detail?: string;
  tip?: string;
}

interface FirstRunGuideProps {
  /** Force show the guide (ignores localStorage) */
  forceShow?: boolean;
  /** Callback when guide is completed */
  onComplete?: () => void;
  /** Callback when guide is skipped */
  onSkip?: () => void;
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'omnivor_first_run_completed';

function hasCompletedFirstRun(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function markFirstRunComplete(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, 'true');
}

/**
 * Reset first-run state (for testing)
 */
export function resetFirstRun(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================================
// GUIDE STEPS
// ============================================================================

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to OmniVor',
    description: 'Your strategic intelligence platform for HCP engagement.',
    icon: Sparkles,
    iconColor: 'text-consumption-purple',
    detail: 'OmniVor consumes data, processes signals, and produces actionable intelligence. Let us show you around.',
  },
  {
    id: 'signal-index',
    title: 'Signal Index',
    description: 'Browse and search your complete HCP ecosystem.',
    icon: Search,
    iconColor: 'text-consumption-purple',
    detail: 'Each HCP profile represents engagement signals across channels. Filter, search, and select profiles for your audiences.',
    tip: 'Formerly called "HCP Explorer"',
  },
  {
    id: 'cohort-lab',
    title: 'Cohort Lab',
    description: 'Build and manage HCP audiences.',
    icon: Users,
    iconColor: 'text-process-violet',
    detail: 'Use natural language queries or filters to create targeted audiences for your campaigns.',
    tip: 'Formerly called "Audience Builder"',
  },
  {
    id: 'scenario-lab',
    title: 'Scenario Lab',
    description: 'Project engagement outcomes.',
    icon: FlaskConical,
    iconColor: 'text-catalyst-gold',
    detail: 'Run simulations to predict how different channel strategies and timing will impact engagement.',
    tip: 'Formerly called "Simulations"',
  },
  {
    id: 'nerve-center',
    title: 'Nerve Center',
    description: 'Your mission control dashboard.',
    icon: LayoutDashboard,
    iconColor: 'text-emerald-400',
    detail: 'Monitor signals, track patterns, and stay on top of platform health from one central location.',
    tip: 'Formerly called "Dashboard"',
  },
  {
    id: 'shortcuts',
    title: 'Power User Tips',
    description: 'Navigate like a pro with keyboard shortcuts.',
    icon: Keyboard,
    iconColor: 'text-data-gray',
    detail: 'Press ⌘K to open the command palette, J/K to navigate lists, and ? to see all shortcuts.',
    tip: 'Keyboard navigation works throughout the app',
  },
];

// ============================================================================
// STEP INDICATOR
// ============================================================================

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            index === currentStep
              ? 'w-6 bg-consumption-purple'
              : index < currentStep
              ? 'w-1.5 bg-consumption-purple/50'
              : 'w-1.5 bg-border-gray'
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// GUIDE STEP CONTENT
// ============================================================================

interface StepContentProps {
  step: GuideStep;
  isFirst: boolean;
  isLast: boolean;
}

function StepContent({ step, isFirst, isLast }: StepContentProps) {
  const Icon = step.icon;

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="text-center"
    >
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div
          className={cn(
            'p-4 rounded-2xl',
            step.id === 'welcome'
              ? 'bg-gradient-to-br from-consumption-purple/20 to-process-violet/20'
              : 'bg-border-gray/30'
          )}
        >
          <Icon className={cn('w-10 h-10', step.iconColor)} />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-signal-white mb-2">
        {step.title}
      </h2>

      {/* Description */}
      <p className="text-lg text-data-gray mb-4">{step.description}</p>

      {/* Detail */}
      {step.detail && (
        <p className="text-sm text-muted-gray max-w-md mx-auto mb-4">
          {step.detail}
        </p>
      )}

      {/* Tip badge */}
      {step.tip && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-consumption-purple/10 border border-consumption-purple/20">
          <Sparkles className="w-3 h-3 text-consumption-purple" />
          <span className="text-xs text-consumption-purple">{step.tip}</span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// FIRST RUN GUIDE
// ============================================================================

export function FirstRunGuide({
  forceShow = false,
  onComplete,
  onSkip,
}: FirstRunGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Check if should show on mount
  useEffect(() => {
    if (forceShow || !hasCompletedFirstRun()) {
      // Small delay for smooth appearance after page load
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    markFirstRunComplete();
    setIsOpen(false);
    onComplete?.();
  };

  const handleSkip = () => {
    markFirstRunComplete();
    setIsOpen(false);
    onSkip?.();
  };

  const currentStepData = GUIDE_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === GUIDE_STEPS.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-void-black/90 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="w-[520px] max-w-[90vw] rounded-2xl bg-void-black border border-border-gray shadow-2xl overflow-hidden">
              {/* Close button */}
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 p-2 rounded-lg text-muted-gray hover:text-signal-white hover:bg-border-gray/50 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="p-8 pt-12">
                <AnimatePresence mode="wait">
                  <StepContent
                    key={currentStepData.id}
                    step={currentStepData}
                    isFirst={isFirstStep}
                    isLast={isLastStep}
                  />
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-border-gray bg-border-gray/10">
                <div className="flex items-center justify-between">
                  {/* Step indicator */}
                  <StepIndicator
                    currentStep={currentStep}
                    totalSteps={GUIDE_STEPS.length}
                  />

                  {/* Navigation buttons */}
                  <div className="flex items-center gap-3">
                    {!isFirstStep && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePrev}
                        className="text-muted-gray hover:text-signal-white"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back
                      </Button>
                    )}

                    {isFirstStep && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSkip}
                        className="text-muted-gray hover:text-signal-white"
                      >
                        Skip tour
                      </Button>
                    )}

                    <Button
                      size="sm"
                      onClick={handleNext}
                      className="bg-consumption-purple hover:bg-consumption-purple/90"
                    >
                      {isLastStep ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Get Started
                        </>
                      ) : (
                        <>
                          Next
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// HOOK FOR CONTROLLING GUIDE
// ============================================================================

/**
 * Hook to control the first-run guide programmatically.
 */
export function useFirstRunGuide() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    setShouldShow(!hasCompletedFirstRun());
  }, []);

  const show = () => setShouldShow(true);
  const hide = () => setShouldShow(false);
  const reset = () => {
    resetFirstRun();
    setShouldShow(true);
  };

  return {
    shouldShow,
    show,
    hide,
    reset,
    hasCompleted: hasCompletedFirstRun(),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default FirstRunGuide;
export { GUIDE_STEPS };
