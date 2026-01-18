// app/components/OnboardingFlow.tsx
'use client';

import { useState, useEffect } from 'react';
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
    try {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      // Force a synchronous write on mobile Safari
      if (typeof Storage !== 'undefined' && localStorage.setItem) {
        // Trigger a dummy read to ensure write is persisted
        localStorage.getItem(ONBOARDING_COMPLETED_KEY);
      }
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
    }
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

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background overlay with dimming */}
      <div className="absolute inset-0 bg-[rgb(var(--bg))] opacity-95 backdrop-blur-sm" />
      
      {/* Onboarding content */}
      <div className="relative w-full max-w-3xl mx-auto">
        <Card className="py-16 px-12 bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))]">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'bg-[rgb(var(--text))] w-8'
                      : index < currentStep
                      ? 'bg-[rgb(var(--text))] opacity-60'
                      : 'bg-[rgb(var(--surface2))]'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleSkip}
              className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Step Counter */}
          <div className="mb-6 text-center text-sm font-medium text-[rgb(var(--muted))]">
            Step {currentStep + 1} of {steps.length}
          </div>

          {/* Step Content with transition */}
          <div 
            key={currentStep}
            className="text-center mb-12 onboarding-step-fade-in"
          >
            <h2 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-4 max-w-2xl mx-auto">
              {currentStepData.title}
            </h2>
            <p className="text-[rgb(var(--text))] text-lg leading-relaxed max-w-xl mx-auto mb-8">
              {currentStepData.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            {/* Previous Button - Left */}
            <div className="flex-1">
              {currentStep > 0 ? (
                <button
                  onClick={handlePrevious}
                  className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))] rounded-lg transition-colors border border-[rgb(var(--ring)/0.12)]"
                >
                  ← Previous
                </button>
              ) : (
                <div></div>
              )}
            </div>
            
            {/* Next/Continue Button - Right */}
            <div className="flex-1 flex justify-end">
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))] rounded-lg transition-colors border border-[rgb(var(--ring)/0.12)]"
                >
                  Next →
                </button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleAction}
                  className="w-full sm:w-auto"
                >
                  Continue
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
