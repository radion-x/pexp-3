/**
 * Pain Assessment v2 - Type Definitions
 * Comprehensive data contracts for the wizard-based assessment system
 */

// ============================================================================
// ENUMS & UNIONS
// ============================================================================

export type DurationUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

export type PainQuality =
  // Musculoskeletal
  | 'dull_aching'
  | 'sharp'
  | 'stabbing'
  | 'throbbing'
  | 'pressure'
  | 'tightness'
  | 'cramping'
  | 'sore'
  | 'stiff'
  // Neuropathic
  | 'burning'
  | 'shooting'
  | 'electric'
  | 'tingling'
  | 'numb'
  | 'hypersensitive'
  // Visceral/Vascular
  | 'colicky'
  | 'gnawing'
  | 'squeezing'
  | 'deep_internal'
  | 'bloating'
  | 'pulsing'
  // Other
  | 'tearing'
  | 'itching'
  | 'cold'
  | 'hot'
  | 'other'
  | 'undescribed';

export type RedFlagKey =
  // Neurological
  | 'new_weakness'
  | 'trouble_walking'
  | 'foot_drop'
  // Cauda Equina
  | 'bowel_bladder_change'
  | 'saddle_anesthesia'
  // Cardiovascular/Respiratory
  | 'chest_pain'
  | 'shortness_breath'
  // Infection
  | 'fever_with_severe_pain'
  | 'hot_swollen_joint'
  | 'rapid_spreading_redness'
  // Malignancy
  | 'unexplained_weight_loss'
  | 'cancer_history'
  | 'night_pain_persists'
  // Trauma/Fracture
  | 'major_trauma'
  | 'anticoagulant_bleed'
  // Central Nervous System
  | 'worst_headache'
  | 'neuro_deficit'
  | 'headache_fever_neck_stiffness';

export type OnsetType = 'sudden' | 'gradual' | 'after_injury' | 'post_procedure';
export type PatternType = 'constant' | 'intermittent' | 'waves' | 'with_movement';
export type CourseType = 'better' | 'worse' | 'unchanged';
export type TimeOfDay = 'morning' | 'evening' | 'night' | 'wakes_from_sleep';

export type FunctionalLimit =
  | 'work'
  | 'exercise'
  | 'house'
  | 'sleep'
  | 'mood'
  | 'concentration'
  | 'sexual';

export type TreatmentPreference = 'meds' | 'non_meds' | 'avoid_meds';
export type SleepQuality = 'good' | 'fair' | 'poor';

// ============================================================================
// PAIN MAPPING
// ============================================================================

export interface BodyZone {
  id: number;
  view: 'front' | 'back';
  name: string;
  key: string;
  ariaLabel: string;
}

export interface PainPoint {
  id: string; // UUID for tracking
  regionId: number; // from bodyZones.json
  regionName?: string; // denormalized for display
  side?: 'left' | 'right' | 'midline' | null;
  view?: 'front' | 'back' | null;
  coords?: { x: number; y: number } | null; // for free-form pin (0-100 normalized)
  intensityCurrent: number; // 0–10 (required)
  intensityAverage24h?: number | null; // 0–10
  intensityWorst24h?: number | null; // 0–10
  qualities: PainQuality[]; // min 1 required
  radiatesTo?: string | null; // free text
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// ============================================================================
// TIMING & PATTERN
// ============================================================================

export interface Timing {
  onset: OnsetType;
  durationValue: number; // positive integer
  durationUnit: DurationUnit;
  pattern: PatternType;
  course: CourseType;
  timeOfDay?: TimeOfDay[];
  baselineWithFlares?: boolean;
  flareLengthValue?: number | null;
  flareLengthUnit?: DurationUnit | null;
}

// ============================================================================
// FUNCTIONAL IMPACT
// ============================================================================

export interface FunctionalImpact {
  limits: FunctionalLimit[];
  sitMinutes?: number | null; // 0-1440
  standMinutes?: number | null;
  walkMinutes?: number | null;
  missedDays7?: number | null; // 0-7
  missedDays30?: number | null; // 0-30
}

// ============================================================================
// HISTORY & CONTEXT
// ============================================================================

export interface TreatmentTried {
  name: string;
  helpful?: boolean | null;
  sideEffects?: string | null;
}

export interface CurrentMedication {
  name: string;
  dose?: string | null;
  frequency?: string | null;
  helpful?: boolean | null;
  sideEffects?: string | null;
}

export interface HistoryContext {
  recentInjury?: boolean;
  injuryDate?: string | null; // ISO date
  mechanism?: string | null; // free text
  repetitiveStrain?: boolean;
  newActivity?: boolean;
  pregnancyPostpartum?: boolean;
  recurrent?: boolean;
  priorDiagnosis?: string | null;
  triedTreatments?: TreatmentTried[];
  currentMeds?: CurrentMedication[];
  comorbidities?: string[]; // free tags
  sleepQuality?: SleepQuality | null;
  phq2?: number | null; // 0-6 depression screen
  gad2?: number | null; // 0-6 anxiety screen
  stressHigh?: boolean;
}

// ============================================================================
// ASSOCIATED SYMPTOMS
// ============================================================================

export interface AssociatedSymptoms {
  // Neurological
  weakness?: boolean;
  numbness?: boolean;
  tingling?: boolean;
  balanceIssues?: boolean;
  
  // Inflammatory
  morningStiffness30m?: boolean;
  feverChills?: boolean;
  nightSweats?: boolean;
  fatigue?: boolean;
  
  // Musculoskeletal
  swelling?: boolean;
  rednessWarmth?: boolean;
  bruising?: boolean;
  lockingCatching?: boolean;
  instability?: boolean;
  
  // Head/Neck
  headache?: boolean;
  lightSoundSensitive?: boolean;
  visionChanges?: boolean;
  jawPain?: boolean;
  
  // Cardiorespiratory
  chestPain?: boolean;
  shortnessBreath?: boolean;
  
  // Gastrointestinal/Genitourinary
  nauseaVomiting?: boolean;
  abdominalPain?: boolean;
  bowelChange?: boolean;
  bladderChange?: boolean;
  menstrualLink?: boolean;
  
  // Cauda Equina specific
  saddleNumbness?: boolean;
  incontinence?: boolean;
}

// ============================================================================
// AGGRAVATORS & RELIEVERS
// ============================================================================

export interface Aggravators {
  sitting?: boolean;
  standing?: boolean;
  walking?: boolean;
  bending?: boolean;
  lifting?: boolean;
  twisting?: boolean;
  coughing?: boolean;
  morningWorse?: boolean;
  eveningWorse?: boolean;
  weather?: boolean;
  stress?: boolean;
  other?: string | null;
}

export interface Relievers {
  rest?: boolean;
  ice?: boolean;
  heat?: boolean;
  stretching?: boolean;
  movement?: boolean;
  medication?: boolean;
  position?: string | null;
  other?: string | null;
}

// ============================================================================
// RED FLAGS
// ============================================================================

export interface RedFlagResult {
  any: boolean; // true if reasons.length > 0
  reasons: RedFlagKey[];
  evaluatedAt: string; // ISO timestamp
}

// ============================================================================
// GOALS & PREFERENCES
// ============================================================================

export interface Goals {
  goal2to4Weeks?: string | null; // free text
  preferredTreatments?: TreatmentPreference[];
  exerciseReady?: boolean;
  notes?: string | null;
}

// ============================================================================
// ASSESSMENT PAYLOAD
// ============================================================================

export interface AssessmentPayload {
  id?: string; // UUID (generated on submit)
  draftId?: string; // UUID (for autosave continuity)
  user: {
    email?: string;
    name?: string;
    phone?: string;
    dateOfBirth?: string;
  };
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  
  // Core sections (matching wizard steps)
  points: PainPoint[]; // min 1
  timing: Timing;
  aggravators: Aggravators;
  relievers: Relievers;
  associated: AssociatedSymptoms;
  functional: FunctionalImpact;
  history: HistoryContext;
  goals: Goals;
  redFlags: RedFlagResult;
  
  // Metadata
  completionPercent?: number; // 0-100
  resumeToken?: string | null;
  locale?: string; // e.g., 'en-US', 'es-ES'
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface DraftResponse {
  draftId: string;
  updatedAt: string;
  payload: Partial<AssessmentPayload>;
}

export interface SubmitResponse {
  assessmentId: string;
  aiSummary?: string;
  systemRecommendation?: 'LOW_URGENCY' | 'MODERATE_URGENCY' | 'HIGH_URGENCY';
  createdAt: string;
}

export interface StreamEvent {
  event: 'status' | 'delta' | 'complete' | 'error';
  message?: string;
  text?: string;
  aiSummary?: string;
  systemRecommendation?: string;
  assessmentId?: string;
  sessionId?: string;
}

// ============================================================================
// WIZARD STATE
// ============================================================================

export type WizardStep =
  | 'welcome'
  | 'pain-mapping'
  | 'timing'
  | 'triggers'
  | 'symptoms'
  | 'red-flags'
  | 'goals'
  | 'review';

export interface WizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  canProceed: boolean;
  isDirty: boolean;
  lastSaveAt?: string | null;
  errors: Record<string, string[]>;
}

// ============================================================================
// PAIN QUALITY GROUPS (for UI display)
// ============================================================================

export const PAIN_QUALITY_GROUPS = {
  musculoskeletal: {
    label: 'Musculoskeletal',
    qualities: [
      'dull_aching',
      'sharp',
      'stabbing',
      'throbbing',
      'pressure',
      'tightness',
      'cramping',
      'sore',
      'stiff',
    ] as PainQuality[],
  },
  neuropathic: {
    label: 'Neuropathic',
    qualities: [
      'burning',
      'shooting',
      'electric',
      'tingling',
      'numb',
      'hypersensitive',
    ] as PainQuality[],
  },
  visceralVascular: {
    label: 'Visceral/Vascular',
    qualities: [
      'colicky',
      'gnawing',
      'squeezing',
      'deep_internal',
      'bloating',
      'pulsing',
    ] as PainQuality[],
  },
  other: {
    label: 'Other',
    qualities: ['tearing', 'itching', 'cold', 'hot', 'other', 'undescribed'] as PainQuality[],
  },
} as const;

export const PAIN_QUALITY_LABELS: Record<PainQuality, string> = {
  dull_aching: 'Dull / Aching',
  sharp: 'Sharp',
  stabbing: 'Stabbing',
  throbbing: 'Throbbing',
  pressure: 'Pressure',
  tightness: 'Tightness',
  cramping: 'Cramping',
  sore: 'Sore',
  stiff: 'Stiff',
  burning: 'Burning',
  shooting: 'Shooting',
  electric: 'Electric',
  tingling: 'Tingling',
  numb: 'Numb',
  hypersensitive: 'Hypersensitive',
  colicky: 'Colicky',
  gnawing: 'Gnawing',
  squeezing: 'Squeezing',
  deep_internal: 'Deep Internal',
  bloating: 'Bloating',
  pulsing: 'Pulsing',
  tearing: 'Tearing',
  itching: 'Itching',
  cold: 'Cold',
  hot: 'Hot',
  other: 'Other',
  undescribed: 'Undescribed',
};

// ============================================================================
// RED FLAG DEFINITIONS (for UI display)
// ============================================================================

export const RED_FLAG_LABELS: Record<RedFlagKey, { question: string; guidance: string }> = {
  new_weakness: {
    question: 'New weakness in arms or legs?',
    guidance: 'Sudden weakness may indicate nerve compression',
  },
  trouble_walking: {
    question: 'Trouble walking or keeping balance?',
    guidance: 'Balance issues need urgent evaluation',
  },
  foot_drop: {
    question: 'Foot drop (can\'t lift foot)?',
    guidance: 'Foot drop indicates nerve damage',
  },
  bowel_bladder_change: {
    question: 'Loss of bowel or bladder control?',
    guidance: 'This requires immediate medical attention',
  },
  saddle_anesthesia: {
    question: 'Numbness in groin/buttocks area?',
    guidance: 'Saddle anesthesia is a medical emergency',
  },
  chest_pain: {
    question: 'Chest pain or pressure?',
    guidance: 'Chest pain requires immediate evaluation',
  },
  shortness_breath: {
    question: 'Shortness of breath?',
    guidance: 'Breathing difficulty needs urgent care',
  },
  fever_with_severe_pain: {
    question: 'Fever with severe pain?',
    guidance: 'May indicate infection requiring treatment',
  },
  hot_swollen_joint: {
    question: 'Hot, swollen, red joint?',
    guidance: 'Could indicate septic arthritis',
  },
  rapid_spreading_redness: {
    question: 'Rapidly spreading redness/warmth?',
    guidance: 'Possible cellulitis or infection',
  },
  unexplained_weight_loss: {
    question: 'Unexplained weight loss (>10 lbs)?',
    guidance: 'Significant weight loss needs investigation',
  },
  cancer_history: {
    question: 'History of cancer?',
    guidance: 'Prior cancer increases risk of metastases',
  },
  night_pain_persists: {
    question: 'Severe pain that wakes you at night?',
    guidance: 'Persistent night pain may indicate serious pathology',
  },
  major_trauma: {
    question: 'Recent major injury/fall?',
    guidance: 'Trauma may cause fracture or internal injury',
  },
  anticoagulant_bleed: {
    question: 'Taking blood thinners with new pain?',
    guidance: 'Risk of bleeding with anticoagulants',
  },
  worst_headache: {
    question: 'Worst headache of your life?',
    guidance: 'Sudden severe headache needs immediate evaluation',
  },
  neuro_deficit: {
    question: 'Vision changes, speech difficulty, or confusion?',
    guidance: 'Neurological symptoms require urgent care',
  },
  headache_fever_neck_stiffness: {
    question: 'Headache with fever and stiff neck?',
    guidance: 'May indicate meningitis - seek emergency care',
  },
};
