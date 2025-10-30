/**
 * WizardContext - Central state management for the assessment wizard
 * Handles navigation, validation, autosave, and progress tracking
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { WizardStep, AssessmentPayload } from './types/assessment';
import { debounce, getLocalStorage, setLocalStorage, removeLocalStorage, toISOString, isBrowser } from './lib/utils';

const DRAFT_KEY = 'assessment:draft:v1';
const AUTOSAVE_DELAY = 750; // ms

type StoredDraftPayload = {
  assessmentData: Partial<AssessmentPayload>;
  currentStep?: WizardStep;
  completedSteps?: WizardStep[];
  savedAt?: string | null;
};

type NormalizedDraft = {
  assessmentData: Partial<AssessmentPayload>;
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  savedAt: string | null;
};

interface WizardContextValue {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  canProceed: boolean;
  goToStep: (step: WizardStep) => void;
  goNext: () => void;
  goBack: () => void;
  assessmentData: Partial<AssessmentPayload>;
  updateData: <K extends keyof AssessmentPayload>(
    key: K,
    value: AssessmentPayload[K]
  ) => void;
  completionPercent: number;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  saveDraft: () => Promise<void>;
  loadDraft: () => void;
  clearDraft: () => void;
  errors: Record<string, string[]>;
  validateCurrentStep: () => boolean;
  submitAssessment: () => Promise<void>;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

const STEP_ORDER: WizardStep[] = [
  'welcome',
  'pain-mapping',
  'timing',
  'triggers',
  'symptoms',
  'red-flags',
  'goals',
  'review',
];

const isValidWizardStep = (value: unknown): value is WizardStep =>
  typeof value === 'string' && STEP_ORDER.includes(value as WizardStep);

const createEmptyAssessment = (): Partial<AssessmentPayload> => ({
  createdAt: toISOString(),
  updatedAt: toISOString(),
  user: {},
  points: [],
  aggravators: {},
  relievers: {},
  associated: {},
  functional: { limits: [] },
  history: {},
  goals: {},
  redFlags: { any: false, reasons: [], evaluatedAt: toISOString() },
});

const normalizeStoredDraft = (
  raw: StoredDraftPayload | Partial<AssessmentPayload> | null
): NormalizedDraft | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  if ('assessmentData' in (raw as Record<string, unknown>)) {
    const stored = raw as StoredDraftPayload;
    const assessmentData = {
      ...createEmptyAssessment(),
      ...stored.assessmentData,
    };

    const currentStep = isValidWizardStep(stored.currentStep)
      ? (stored.currentStep as WizardStep)
      : 'welcome';

    const completedSteps = Array.isArray(stored.completedSteps)
      ? stored.completedSteps.filter(isValidWizardStep)
      : [];

    const savedAt =
      typeof stored.savedAt === 'string' ? stored.savedAt : null;

    return {
      assessmentData,
      currentStep,
      completedSteps,
      savedAt,
    };
  }

  const legacyData = raw as Partial<AssessmentPayload>;
  const savedAt =
    typeof (legacyData as { updatedAt?: unknown }).updatedAt === 'string'
      ? ((legacyData as { updatedAt: string }).updatedAt as string)
      : null;

  return {
    assessmentData: {
      ...createEmptyAssessment(),
      ...legacyData,
    },
    currentStep: 'welcome',
    completedSteps: [],
    savedAt,
  };
};

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const initialDraftRef = useRef<NormalizedDraft | null>(null);
  const initialDraftLoadedRef = useRef(false);
  const savingIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getInitialDraft = () => {
    if (!initialDraftLoadedRef.current) {
      if (!isBrowser()) {
        return null;
      }
      const raw = getLocalStorage<StoredDraftPayload | Partial<AssessmentPayload> | null>(
        DRAFT_KEY,
        null
      );
      initialDraftRef.current = normalizeStoredDraft(raw);
      initialDraftLoadedRef.current = true;
    }
    return initialDraftRef.current;
  };

  const [assessmentData, setAssessmentData] = useState<Partial<AssessmentPayload>>(() => {
    const draft = getInitialDraft();
    return draft?.assessmentData ?? createEmptyAssessment();
  });
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [completedSteps, setCompletedSteps] = useState<WizardStep[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => {
    const draft = getInitialDraft();
    return draft?.savedAt ?? null;
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const completionPercent = Math.round(
    (completedSteps.length / (STEP_ORDER.length - 1)) * 100
  );

  const updateData = useCallback(
    <K extends keyof AssessmentPayload>(key: K, value: AssessmentPayload[K]) => {
      setAssessmentData((prev) => ({
        ...prev,
        [key]: value,
        updatedAt: toISOString(),
      }));
      setIsDirty(true);
    },
    []
  );

  const saveDraftLocal = useCallback(async () => {
    // Clear any existing timeout first
    if (savingIndicatorTimeoutRef.current) {
      clearTimeout(savingIndicatorTimeoutRef.current);
      savingIndicatorTimeoutRef.current = null;
    }
    
    setIsSaving(true);
    
    try {
      if (!isBrowser()) {
        setIsSaving(false);
        return;
      }
      const savedAt = toISOString();
      const payload: StoredDraftPayload = {
        assessmentData,
        currentStep,
        completedSteps,
        savedAt,
      };
      setLocalStorage(DRAFT_KEY, payload);
      setLastSavedAt(savedAt);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
    
    // Always clear the saving indicator after a short delay
    savingIndicatorTimeoutRef.current = setTimeout(() => {
      setIsSaving(false);
      savingIndicatorTimeoutRef.current = null;
    }, 300);
  }, [assessmentData, currentStep, completedSteps]);

  const debouncedSave = useCallback(
    debounce(saveDraftLocal, AUTOSAVE_DELAY),
    [saveDraftLocal]
  );

  useEffect(() => {
    if (isDirty) {
      debouncedSave();
    }
  }, [isDirty, debouncedSave]);

  useEffect(() => {
    return () => {
      if (savingIndicatorTimeoutRef.current) {
        clearTimeout(savingIndicatorTimeoutRef.current);
        savingIndicatorTimeoutRef.current = null;
      }
    };
  }, []);

  const saveDraft = useCallback(async () => {
    await saveDraftLocal();
  }, [saveDraftLocal]);

  const loadDraft = useCallback(() => {
    const raw = getLocalStorage<StoredDraftPayload | Partial<AssessmentPayload> | null>(
      DRAFT_KEY,
      null
    );
    const draft = normalizeStoredDraft(raw);
    if (draft) {
      setAssessmentData(draft.assessmentData);
      setCurrentStep(draft.currentStep ?? 'welcome');
      setCompletedSteps(draft.completedSteps ?? []);
      setLastSavedAt(draft.savedAt);
      setErrors({});
      setIsDirty(false);
    }
  }, []);

  const clearDraft = useCallback(() => {
    removeLocalStorage(DRAFT_KEY);
    setAssessmentData(createEmptyAssessment());
    setCompletedSteps([]);
    setCurrentStep('welcome');
    setErrors({});
    setLastSavedAt(null);
    setIsDirty(false);
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    const newErrors: Record<string, string[]> = {};

    switch (currentStep) {
      case 'welcome':
        if (!assessmentData.user?.email) {
          newErrors.email = ['Email is required'];
        }
        if (!assessmentData.user?.name) {
          newErrors.name = ['Name is required'];
        }
        break;
      
      case 'pain-mapping':
        if (!assessmentData.points || assessmentData.points.length === 0) {
          newErrors.points = ['Add at least one pain point'];
        }
        break;
      
      case 'timing':
        if (!assessmentData.timing) {
          newErrors.timing = ['Timing information is required'];
        }
        break;
      
      case 'red-flags':
        // Red flags are evaluated, but validation always passes
        // The actual evaluation happens when entering the step
        break;
      
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, assessmentData]);

  const canProceed = Object.keys(errors).length === 0;

  useEffect(() => {
    validateCurrentStep();
  }, [assessmentData, currentStep, validateCurrentStep]);

  const goToStep = useCallback(
    (step: WizardStep) => {
      if (step === currentStep) {
        return;
      }
      setCurrentStep(step);
      setIsDirty(true);
    },
    [currentStep]
  );

  const submitAssessment = useCallback(async () => {
    // Re-validate one last time before submitting
    if (!validateCurrentStep()) {
      console.error("Final validation failed. Cannot submit.");
      // TODO: Set an error state to show a message to the user
      return;
    }

    console.log('Submitting assessment...');
    setIsSaving(true); // Use isSaving to show a global "Submitting..." indicator

    try {
      const response = await fetch('/api/assessment/submit', { // Corrected endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assessmentData),
      });

      // Check if the response is successful
      if (!response.ok) {
        // Try to get more details from the server's response body
        const errorData = await response.json().catch(() => ({
          message: 'Server returned an error with no details.',
        }));
        console.error('Server responded with an error:', response.status, errorData);
        // TODO: Set a state to show the error message to the user
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Assessment submitted successfully:', result);
      
      // On successful submission, clear the draft and reset
      clearDraft();
      goToStep('welcome'); // Or a dedicated "Thank You" step

    } catch (error) {
      console.error('An error occurred during submission:', error);
      // TODO: Set a state to show a generic error message to the user
    } finally {
      // CRITICAL: Always ensure the saving/submitting indicator is turned off
      setIsSaving(false);
    }
  }, [assessmentData, validateCurrentStep, clearDraft, goToStep]);

  const goNext = useCallback(() => {
    if (!validateCurrentStep()) {
      return;
    }

    const wasAlreadyCompleted = completedSteps.includes(currentStep);
    if (!wasAlreadyCompleted) {
      setCompletedSteps((prev) => {
        if (prev.includes(currentStep)) {
          return prev;
        }
        return [...prev, currentStep];
      });
    }

    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
      setIsDirty(true);
    } else if (!wasAlreadyCompleted) {
      // Ensure we persist completion state if we can't advance further
      setIsDirty(true);
    }
  }, [currentStep, completedSteps, validateCurrentStep]);

  const goBack = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
      setIsDirty(true);
    }
  }, [currentStep]);

  const value: WizardContextValue = {
    currentStep,
    completedSteps,
    canProceed,
    goToStep,
    goNext,
    goBack,
    assessmentData,
    updateData,
    completionPercent,
    isDirty,
    isSaving,
    lastSavedAt,
    saveDraft,
    loadDraft,
    clearDraft,
    errors,
    validateCurrentStep,
    submitAssessment,
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}
