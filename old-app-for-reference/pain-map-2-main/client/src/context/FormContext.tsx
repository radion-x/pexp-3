import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { FormData, createInitialFormData } from '../data/formData';

interface FormContextType {
  formData: FormData;
  updateFormData: (stepData: Partial<FormData>) => void;
  isFormValid: () => boolean;
  submitActionRef?: React.MutableRefObject<(() => Promise<void>) | undefined>;
  registerSubmitAction?: (handler: (() => Promise<void>) | undefined) => void;
  formSessionId: string;
  
  // Submission states
  aiSummary: string | null;
  setAiSummary: React.Dispatch<React.SetStateAction<string | null>>;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  isSubmissionSuccessful: boolean;
  setIsSubmissionSuccessful: (isSuccess: boolean) => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

interface FormProviderProps {
  children: ReactNode;
}

export const FormProvider: React.FC<FormProviderProps> = ({ children }) => {
  const [formData, setFormData] = useState<FormData>(() => createInitialFormData());
  const submitActionHandlerRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState<boolean>(false);

  const updateFormData = (stepData: Partial<FormData>) => {
    setFormData(prevData => ({
      ...prevData,
      ...stepData
    }));
  };

  // Form validation - checks all required fields
  const isFormValid = (): boolean => {
    // Required: email and fullName
    if (!formData.email || !formData.fullName) {
      return false;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return false;
    }
    
    // Required: At least one pain area
    if (formData.painAreas.length === 0) {
      return false;
    }
    
    // Required: Red flags must be interacted with (at least the object must exist)
    if (!formData.redFlags) {
      return false;
    }
    
    return true;
  };

  return (
    <FormContext.Provider
      value={{
        formData,
        updateFormData,
        isFormValid,
        submitActionRef: submitActionHandlerRef,
        registerSubmitAction: (handler) => { submitActionHandlerRef.current = handler; },
        formSessionId: formData.formSessionId,
        aiSummary,
        setAiSummary,
        isSubmitting,
        setIsSubmitting,
        isSubmissionSuccessful,
        setIsSubmissionSuccessful
      }}
    >
      {children}
    </FormContext.Provider>
  );
};
