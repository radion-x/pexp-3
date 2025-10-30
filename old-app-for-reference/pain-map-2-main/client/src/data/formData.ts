// Rich FormData definition for the comprehensive pain assessment experience

export interface PainArea {
  id: string;
  region: string;
  intensity: number; // 1-10 scale
  notes?: string;
  coordinates?: { x: number; y: number };
}

export interface SymptomAreaDetail {
  selected: boolean;
  severity?: number;
}

export interface SymptomWithAreas {
  present: boolean;
  areas: Record<string, SymptomAreaDetail>;
}

export interface WeightLossSymptom {
  present: boolean;
  amountKg?: number;
  period?: string;
}

export interface IncontinenceSymptom {
  present: boolean;
  details?: string;
  isNewOnset?: boolean;
}

export interface SaddleAnaesthesiaSymptom {
  present: boolean;
  details?: string;
}

export interface BalanceProblemsSymptom {
  present: boolean;
  type?: string;
}

export interface RedFlagsData {
  muscleWeakness: SymptomWithAreas;
  numbnessOrTingling: SymptomWithAreas;
  unexplainedWeightLoss: WeightLossSymptom;
  bladderOrBowelIncontinence: IncontinenceSymptom;
  saddleAnaesthesia: SaddleAnaesthesiaSymptom;
  balanceProblems: BalanceProblemsSymptom;
  otherRedFlagPresent?: boolean;
  otherRedFlag?: string;
}

export interface FormData {
  // Basic Patient Information (Required)
  email: string;
  fullName: string;

  // Core Pain Assessment
  painAreas: PainArea[];
  redFlags: RedFlagsData;
  treatmentGoals?: string;

  // System Fields
  sessionId: string;
  formSessionId: string;
  painMapImageFront?: string;
  painMapImageBack?: string;
  aiSummary?: string;
  systemRecommendation?: string; // LOW_URGENCY | MODERATE_URGENCY | HIGH_URGENCY
}

const createAreaMap = (keys: string[]): Record<string, SymptomAreaDetail> =>
  keys.reduce<Record<string, SymptomAreaDetail>>((acc, key) => {
    acc[key] = { selected: false };
    return acc;
  }, {});

// Function to create initial form data with a unique session ID
export const createInitialFormData = (): FormData => {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return {
    email: '',
    fullName: '',

    painAreas: [],

    redFlags: {
      muscleWeakness: {
        present: false,
        areas: createAreaMap(['Arms', 'Legs', 'Hands', 'Feet', 'Trunk/Core', 'OtherMuscleArea']),
      },
      numbnessOrTingling: {
        present: false,
        areas: createAreaMap(['Arms', 'Legs', 'Hands', 'Feet', 'Face', 'Trunk/Body', 'OtherNumbnessArea']),
      },
      unexplainedWeightLoss: {
        present: false,
        amountKg: undefined,
        period: '',
      },
      bladderOrBowelIncontinence: {
        present: false,
        details: '',
        isNewOnset: false,
      },
      saddleAnaesthesia: {
        present: false,
        details: '',
      },
      balanceProblems: {
        present: false,
        type: '',
      },
      otherRedFlagPresent: false,
      otherRedFlag: '',
    },

    treatmentGoals: '',

    sessionId,
    formSessionId: sessionId,
    painMapImageFront: '',
    painMapImageBack: '',
    aiSummary: '',
    systemRecommendation: '',
  };
};

// Export a default initial form data for backwards compatibility
export const initialFormData: FormData = createInitialFormData();
