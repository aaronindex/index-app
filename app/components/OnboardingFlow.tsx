// app/components/OnboardingFlow.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Card from './ui/Card';
import Button from './ui/Button';

interface OnboardingFlowProps {
  onComplete?: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to INDEX',
      description: 'Your personal business intelligence for your AI life. INDEX helps you capture, organize, and make sense of your AI conversations.',
      action: {
        label: 'Get Started',
        href: '/import',
        primary: true,
      },
    },
    {
      title: 'Import Your Conversations',
      description: 'Start by importing your ChatGPT export. INDEX will automatically extract insights, create highlights, and help you organize everything into projects.',
      action: {
        label: 'Import Conversations',
        href: '/import',
        primary: true,
      },
    },
    {
      title: 'Organize with Projects',
      description: 'Create projects to group related conversations. Projects help you focus on specific work areas and keep your INDEX organized.',
      action: {
        label: 'Create Project',
        href: '/projects',
        primary: false,
      },
    },
    {
      title: 'Ask Your INDEX',
      description: 'Use Ask Index to search across all your conversations. Get AI-powered answers with citations and follow-up questions.',
      action: {
        label: 'Try Ask Index',
        href: '/ask',
        primary: false,
      },
    },
    {
      title: 'Weekly Digests',
      description: 'Get a weekly summary of what changed, open loops, and recommended next steps. Your personal intelligence briefing.',
      action: {
        label: 'View Tools',
        href: '/tools',
        primary: false,
      },
    },
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (onComplete) {
      onComplete();
    }
  };

  const handleSkip = () => {
    if (onComplete) {
      onComplete();
    }
  };

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
            className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
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
          <Link href={currentStepData.action.href}>
            <Button variant={currentStepData.action.primary ? 'primary' : 'secondary'}>
              {currentStepData.action.label}
            </Button>
          </Link>
          {currentStep < steps.length - 1 && (
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
            >
              Next →
            </button>
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

