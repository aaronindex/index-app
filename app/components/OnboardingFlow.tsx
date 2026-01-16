// app/components/OnboardingFlow.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from './ui/Card';
import Button from './ui/Button';

const ONBOARDING_COMPLETED_KEY = 'index_onboarding_completed';

interface OnboardingFlowProps {
  onComplete?: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Check if onboarding was already completed
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    if (completed === 'true') {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    } else {
      setIsVisible(true);
    }
  }, [onComplete]);

  const steps = [
    {
      title: 'Welcome to INDEX',
      description: 'INDEX helps you reduce your AI conversations into what actually matters — decisions, tasks, and direction you can carry forward.',
      action: {
        label: 'Start with a real conversation',
        href: '/import',
        primary: true,
      },
    },
    {
      title: 'Start with what you already thought through',
      description: 'Import an AI conversation. INDEX extracts what matters, surfaces decisions, and reduces the rest.',
      action: {
        label: 'Import Conversation',
        href: '/import',
        primary: true,
      },
    },
    {
      title: 'Focus your thinking',
      description: 'Projects group related conversations so INDEX can surface what still deserves attention — without clutter.',
      action: {
        label: 'Create Project',
        href: '/projects',
        primary: true,
      },
    },
    {
      title: 'Ask when you need clarity',
      description: 'Ask INDEX questions across your past conversations to recall decisions, context, and unresolved threads — with citations.',
      action: {
        label: 'Try Ask INDEX',
        href: '/ask',
        primary: true,
      },
    },
    {
      title: 'Carry forward what matters',
      description: "INDEX surfaces what still deserves attention so you don't have to remember everything yourself.",
      action: {
        label: 'Continue',
        href: '#',
        primary: false,
      },
    },
  ];

  const currentStepData = steps[currentStep];

  const markCompleted = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    setIsVisible(false);
    if (onComplete) {
      onComplete();
    }
  };

  const handleAction = () => {
    // If it's the last step, mark as completed
    if (currentStep === steps.length - 1) {
      markCompleted();
    } else {
      // For other steps, navigate to the action and advance
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    markCompleted();
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8 bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))]">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index <= currentStep
                    ? 'bg-[rgb(var(--text))]'
                    : 'bg-[rgb(var(--surface2))]'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors opacity-70"
          >
            Skip
          </button>
        </div>

        {/* Step Content */}
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-3">
            {currentStepData.title}
          </h2>
          <p className="text-[rgb(var(--text))] text-lg leading-relaxed">
            {currentStepData.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 text-sm font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
            >
              ← Previous
            </button>
          )}
          {currentStepData.action.href === '#' ? (
            <Button
              variant={currentStepData.action.primary ? 'primary' : 'secondary'}
              onClick={handleAction}
            >
              {currentStepData.action.label}
            </Button>
          ) : (
            <Link href={currentStepData.action.href} onClick={handleAction}>
              <Button variant={currentStepData.action.primary ? 'primary' : 'secondary'}>
                {currentStepData.action.label}
              </Button>
            </Link>
          )}
        </div>

        {/* Step Counter */}
        <div className="mt-6 text-center text-sm text-[rgb(var(--muted))]">
          Step {currentStep + 1} of {steps.length}
        </div>
      </Card>
    </div>
  );
}
