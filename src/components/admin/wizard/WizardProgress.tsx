'use client';

interface Step {
  id: number;
  title: string;
  optional?: boolean;
}

interface WizardProgressProps {
  steps: Step[];
  currentStep: number;
}

export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Progress Bar */}
        <div className="relative">
          <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200">
            <div
              style={{ width: `${progressPercentage}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(progressPercentage)}% Complete</span>
          </div>
        </div>

        {/* Step Indicators (on larger screens) */}
        <div className="hidden lg:flex justify-between mt-6">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isFuture = index > currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all
                    ${isActive ? 'bg-purple-600 border-purple-600 text-white scale-110' : ''}
                    ${isCompleted ? 'bg-green-500 border-green-500 text-white' : ''}
                    ${isFuture ? 'bg-gray-100 border-gray-300 text-gray-400' : ''}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={`text-xs font-medium ${
                      isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </div>
                  {step.optional && (
                    <div className="text-xs text-gray-400 italic">Optional</div>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`absolute h-0.5 top-5 left-1/2 w-full -ml-1/2 -z-10 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    style={{
                      width: `calc(100% / ${steps.length - 1})`,
                      left: `calc(${(index * 100) / (steps.length - 1)}% + ${50 / (steps.length - 1)}%)`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
