'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, CheckCircle, Clock } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  requiresSignature: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'welcome',
      title: 'Welcome to Hartzell',
      description: 'Review company policies and employee handbook',
      status: 'completed',
      requiresSignature: false
    },
    {
      id: 'employee-info',
      title: 'Employee Information',
      description: 'Complete your personal and emergency contact information',
      status: 'completed',
      requiresSignature: false
    },
    {
      id: 'tax-forms',
      title: 'Tax Forms (W-4)',
      description: 'Complete federal and state tax withholding forms',
      status: 'in_progress',
      requiresSignature: true
    },
    {
      id: 'direct-deposit',
      title: 'Direct Deposit',
      description: 'Set up direct deposit for payroll',
      status: 'pending',
      requiresSignature: true
    },
    {
      id: 'benefits',
      title: 'Benefits Enrollment',
      description: 'Select your health insurance and benefit options',
      status: 'pending',
      requiresSignature: true
    },
    {
      id: 'handbook',
      title: 'Employee Handbook',
      description: 'Review and acknowledge the employee handbook',
      status: 'pending',
      requiresSignature: true
    },
    {
      id: 'drug-test',
      title: 'Drug Test Consent',
      description: 'Review and sign drug testing policy',
      status: 'pending',
      requiresSignature: true
    }
  ]);

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const handleStepClick = (stepId: string) => {
    if (stepId === 'drug-test') {
      router.push('/drug-test');
    } else {
      // For other steps, navigate to their specific pages (to be created)
      router.push(`/onboarding/${stepId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hartzell-navy via-hartzell-navy/90 to-hartzell-blue py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="https://hartzellpainting.com/wp-content/uploads/2025/05/Heartzell-Logo.png"
              alt="Hartzell Logo"
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to Your Onboarding
          </h1>
          <p className="text-white/80">
            Complete the following steps to finish your new hire process
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-hartzell-blue">{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-hartzell-blue h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {completedSteps} of {totalSteps} steps completed
          </p>
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              className="w-full bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 text-left"
            >
              <div className="flex items-start gap-4">
                {/* Step Number/Status Icon */}
                <div className="flex-shrink-0">
                  {step.status === 'completed' ? (
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  ) : step.status === 'in_progress' ? (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-hartzell-blue animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold">
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {step.title}
                    </h3>
                    {step.requiresSignature && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                        <FileText className="w-3 h-3" />
                        Signature Required
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">
                    {step.description}
                  </p>

                  {/* Status Badge */}
                  <div className="mt-2">
                    {step.status === 'completed' && (
                      <span className="inline-flex items-center text-xs font-medium text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </span>
                    )}
                    {step.status === 'in_progress' && (
                      <span className="inline-flex items-center text-xs font-medium text-blue-700">
                        <Clock className="w-3 h-3 mr-1" />
                        In Progress
                      </span>
                    )}
                    {step.status === 'pending' && (
                      <span className="inline-flex items-center text-xs font-medium text-gray-500">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
          <h3 className="font-semibold mb-2">Need Help?</h3>
          <p className="text-sm text-white/80 mb-4">
            If you have questions or need assistance, please contact HR:
          </p>
          <div className="flex flex-col sm:flex-row gap-4 text-sm">
            <a
              href="mailto:hr@hartzell.work"
              className="text-white hover:underline"
            >
              📧 hr@hartzell.work
            </a>
            <a href="tel:+15551234567" className="text-white hover:underline">
              📞 (555) 123-4567
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
