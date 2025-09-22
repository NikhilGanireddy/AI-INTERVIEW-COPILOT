"use client";

import React, {
  Children,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";

import "./stepper.css";

type StepperRenderIndicatorArgs = {
  step: number;
  currentStep: number;
  onStepClick: (step: number) => void;
};

type StepperProps = {
  children: ReactNode;
  initialStep?: number;
  onStepChange?: (nextStep: number) => void;
  onFinalStepCompleted?: () => void | boolean | Promise<void | boolean>;
  stepCircleContainerClassName?: string;
  stepContainerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  backButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  nextButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  backButtonText?: string;
  nextButtonText?: string;
  completeButtonText?: string;
  disableStepIndicators?: boolean;
  renderStepIndicator?: (args: StepperRenderIndicatorArgs) => ReactNode;
  renderNextLabel?: (args: { isLastStep: boolean }) => ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

type StepProps = {
  children: ReactNode;
  className?: string;
};

type SlideTransitionProps = {
  children: ReactNode;
  direction: number;
  onHeightReady: (height: number) => void;
};

type StepContentWrapperProps = {
  isCompleted: boolean;
  currentStep: number;
  direction: number;
  children: ReactNode;
  className?: string;
};

type StepIndicatorProps = {
  step: number;
  currentStep: number;
  onClickStep: (step: number) => void;
  disableStepIndicators?: boolean;
};

type StepConnectorProps = {
  isComplete: boolean;
};

type CheckIconProps = React.SVGProps<SVGSVGElement>;

const stepVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? "-100%" : "100%",
    opacity: 0,
  }),
  center: {
    x: "0%",
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? "50%" : "-50%",
    opacity: 0,
  }),
};

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => undefined,
  onFinalStepCompleted = () => undefined,
  stepCircleContainerClassName = "",
  stepContainerClassName = "",
  contentClassName = "",
  footerClassName = "",
  backButtonProps,
  nextButtonProps,
  backButtonText = "Back",
  nextButtonText = "Continue",
  completeButtonText = "Complete",
  disableStepIndicators = false,
  renderStepIndicator,
  renderNextLabel,
  ...rest
}: StepperProps) {
  const stepsArray = useMemo(() => Children.toArray(children), [children]);
  const totalSteps = stepsArray.length;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);

  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const updateStep = (newStep: number) => {
    setCurrentStep(newStep);
    if (newStep > totalSteps) {
      void onFinalStepCompleted();
    } else {
      onStepChange(newStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      updateStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (!isLastStep) {
      setDirection(1);
      updateStep(currentStep + 1);
    }
  };

  const handleComplete = async () => {
    setDirection(1);
    const result = await onFinalStepCompleted();
    if (result !== false) {
      updateStep(totalSteps + 1);
    }
  };

  const mergedBackProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
    type: "button",
    ...backButtonProps,
  };

  const mergedNextProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
    type: "button",
    ...nextButtonProps,
  };

  const nextLabel = renderNextLabel
    ? renderNextLabel({ isLastStep })
    : isLastStep
      ? completeButtonText
      : nextButtonText;

  return (
    <div className="outer-container" {...rest}>
      <div className={clsx("step-circle-container", stepCircleContainerClassName)}>
        <div className={clsx("step-indicator-row", stepContainerClassName)}>
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;
            return (
              <React.Fragment key={stepNumber}>
                {renderStepIndicator ? (
                  renderStepIndicator({
                    step: stepNumber,
                    currentStep,
                    onStepClick: (clicked) => {
                      if (clicked < 1 || clicked > totalSteps) return;
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    },
                  })
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    disableStepIndicators={disableStepIndicators}
                    currentStep={currentStep}
                    onClickStep={(clicked) => {
                      if (clicked < 1 || clicked > totalSteps) return;
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    }}
                  />
                )}
                {isNotLastStep ? (
                  <StepConnector isComplete={currentStep > stepNumber} />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>

        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={currentStep}
          direction={direction}
          className={clsx("step-content-default", contentClassName)}
        >
          {stepsArray[currentStep - 1] as ReactElement}
        </StepContentWrapper>

        {!isCompleted ? (
          <div className={clsx("footer-container", footerClassName)}>
            <div className={clsx("footer-nav", currentStep !== 1 ? "spread" : "end")}> 
              {currentStep !== 1 ? (
                <button {...mergedBackProps} onClick={handleBack} className={clsx("back-button", mergedBackProps?.className)}>
                  {backButtonText}
                </button>
              ) : null}
              <button
                {...mergedNextProps}
                onClick={isLastStep ? handleComplete : handleNext}
                className={clsx("next-button", mergedNextProps?.className)}
              >
                {nextLabel}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepContentWrapper({ isCompleted, currentStep, direction, children, className }: StepContentWrapperProps) {
  const [parentHeight, setParentHeight] = useState(0);

  return (
    <motion.div
      className={className}
      style={{ position: "relative", overflow: "hidden" }}
      animate={{ height: isCompleted ? 0 : parentHeight }}
      transition={{ type: "spring", duration: 0.4 }}
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted ? (
          <SlideTransition key={currentStep} direction={direction} onHeightReady={(height) => setParentHeight(height)}>
            {children}
          </SlideTransition>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function SlideTransition({ children, direction, onHeightReady }: SlideTransitionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (containerRef.current) {
      onHeightReady(containerRef.current.offsetHeight);
    }
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4 }}
      style={{ position: "absolute", left: 0, right: 0, top: 0 }}
    >
      {children}
    </motion.div>
  );
}

function StepIndicator({ step, currentStep, onClickStep, disableStepIndicators }: StepIndicatorProps) {
  const status = currentStep === step ? "active" : currentStep < step ? "inactive" : "complete";

  const handleClick = () => {
    if (disableStepIndicators || step === currentStep) return;
    onClickStep(step);
  };

  return (
    <motion.div onClick={handleClick} className="step-indicator" animate={status} initial={false}>
      <motion.div
        variants={{
          inactive: { scale: 1, backgroundColor: "#1e293b", color: "#cbd5f5" },
          active: { scale: 1, backgroundColor: "#6366f1", color: "#6450ff" },
          complete: { scale: 1, backgroundColor: "#6366f1", color: "#cbd5f5" },
        }}
        transition={{ duration: 0.3 }}
        className="step-indicator-inner"
      >
        {status === "complete" ? (
          <CheckIcon className="check-icon" />
        ) : status === "active" ? (
          <div className="active-dot" />
        ) : (
          <span className="step-number">{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

function StepConnector({ isComplete }: StepConnectorProps) {
  return (
    <div className="step-connector">
      <motion.div
        className="step-connector-inner"
        variants={{
          incomplete: { width: 0, backgroundColor: "transparent" },
          complete: { width: "100%", backgroundColor: "#6366f1" },
        }}
        initial={false}
        animate={isComplete ? "complete" : "incomplete"}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props: CheckIconProps) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: "tween", ease: "easeOut", duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

export function Step({ children, className }: StepProps) {
  return <div className={clsx("step-default", className)}>{children}</div>;
}
