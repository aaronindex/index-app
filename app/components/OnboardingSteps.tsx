'use client';

import { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

interface OnboardingStepsProps {
  onComplete?: () => void;
}

const STEPS = [
  {
    id: 'import',
    title: 'Import a conversation',
    description: 'Upload your ChatGPT export to get started',
  },
  {
    id: 'project',
    title: 'Create or assign to a project',
    description: 'Organize your conversations into projects',
  },
  {
    id: 'highlight',
    title: 'Select text to save a highlight',
    description: 'Capture important moments from your conversations',
  },
  {
    id: 'task_decision',
    title: 'Create a task or decision',
    description: 'Turn insights into actionable items',
  },
  {
    id: 'ask',
    title: 'Ask Index to resurface meaning',
    description: 'Search across all your conversations',
  },
  {
    id: 'digest',
    title: 'Generate your first Weekly Digest',
    description: 'Get a summary of what changed this week',
  },
];

const STORAGE_KEY = 'index_onboarding_completed';

export default function OnboardingSteps({ onComplete }: OnboardingStepsProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Load completed steps from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCompletedSteps(new Set(parsed));
      } catch {
        // Invalid storage, ignore
      }
    }

    // Show onboarding if not all steps completed
    const allCompleted = STEPS.every((step) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed.includes(step.id);
        } catch {
          return false;
        }
      }
      return false;
    });

    setIsVisible(!allCompleted);
  }, []);

  const markStepComplete = (stepId: string) => {
    const updated = new Set(completedSteps);
    updated.add(stepId);
    setCompletedSteps(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(updated)));

    // Check if all steps completed
    if (updated.size === STEPS.length && onComplete) {
      setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 500);
    }
  };

  // Listen for onboarding events
  useEffect(() => {
    const handleOnboardingEvent = (event: CustomEvent) => {
      const { stepId } = event.detail;
      if (STEPS.some((s) => s.id === stepId)) {
        markStepComplete(stepId);
      }
    };

    window.addEventListener('index-onboarding-step' as any, handleOnboardingEvent as EventListener);
    return () => {
      window.removeEventListener('index-onboarding-step' as any, handleOnboardingEvent as EventListener);
    };
  }, [completedSteps]);

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="mb-8">
      <div className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-2">
            Getting Started with INDEX
          </h2>
          <p className="text-sm text-[rgb(var(--muted))]">
            Complete these steps to get the most out of INDEX
          </p>
        </div>

        <div className="space-y-2">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  isCompleted
                    ? 'bg-[rgb(var(--surface2))] opacity-60'
                    : 'bg-[rgb(var(--surface))]'
                }`}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-[rgb(var(--ring)/0.2)] flex items-center justify-center mt-0.5">
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4 text-[rgb(var(--text))]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span className="text-xs text-[rgb(var(--muted))]">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3
                    className={`text-sm font-medium ${
                      isCompleted
                        ? 'text-[rgb(var(--muted))] line-through'
                        : 'text-[rgb(var(--text))]'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="text-xs text-[rgb(var(--muted))] mt-0.5">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {completedSteps.size === STEPS.length && (
          <div className="pt-4 border-t border-[rgb(var(--ring)/0.08)]">
            <p className="text-sm text-[rgb(var(--muted))] text-center">
              🎉 You've completed onboarding!
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

