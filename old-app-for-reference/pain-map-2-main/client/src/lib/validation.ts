/**
 * Zod Validation Schemas for Pain Assessment v2
 * Complete validation logic for all wizard steps
 */

import { z } from 'zod';
import type {
  DurationUnit,
  PainQuality,
  RedFlagKey,
  OnsetType,
  PatternType,
  CourseType,
  TimeOfDay,
  FunctionalLimit,
  TreatmentPreference,
  SleepQuality,
} from '../types/assessment';

// ============================================================================
// PAIN POINT VALIDATION
// ============================================================================

export const painPointSchema = z.object({
  id: z.string(),
  regionId: z.number().int().positive(),
  regionName: z.string().optional(),
  side: z.enum(['left', 'right', 'midline']).nullable().optional(),
  coords: z
    .object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    })
    .nullable()
    .optional(),
  intensityCurrent: z.number().int().min(0).max(10),
  intensityAverage24h: z.number().int().min(0).max(10).nullable().optional(),
  intensityWorst24h: z.number().int().min(0).max(10).nullable().optional(),
  qualities: z.array(z.string()).min(1, 'At least one quality is required'),
  radiatesTo: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================================================
// TIMING VALIDATION
// ============================================================================

export const timingSchema = z
  .object({
    onset: z.enum(['sudden', 'gradual', 'after_injury', 'post_procedure']),
    durationValue: z.number().int().positive(),
    durationUnit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months', 'years']),
    pattern: z.enum(['constant', 'intermittent', 'waves', 'with_movement']),
    course: z.enum(['better', 'worse', 'unchanged']),
    timeOfDay: z
      .array(z.enum(['morning', 'evening', 'night', 'wakes_from_sleep']))
      .optional(),
    baselineWithFlares: z.boolean().optional(),
    flareLengthValue: z.number().int().positive().nullable().optional(),
    flareLengthUnit: z
      .enum(['minutes', 'hours', 'days', 'weeks', 'months', 'years'])
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // If baselineWithFlares is true, require flare fields
      if (data.baselineWithFlares) {
        return data.flareLengthValue !== null && data.flareLengthUnit !== null;
      }
      return true;
    },
    {
      message: 'Flare duration is required when baseline with flares is selected',
      path: ['flareLengthValue'],
    }
  );

// ============================================================================
// FUNCTIONAL IMPACT VALIDATION
// ============================================================================

export const functionalImpactSchema = z.object({
  limits: z.array(
    z.enum(['work', 'exercise', 'house', 'sleep', 'mood', 'concentration', 'sexual'])
  ),
  sitMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  standMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  walkMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  missedDays7: z.number().int().min(0).max(7).nullable().optional(),
  missedDays30: z.number().int().min(0).max(30).nullable().optional(),
});

// ============================================================================
// HISTORY CONTEXT VALIDATION
// ============================================================================

const treatmentTriedSchema = z.object({
  name: z.string().min(1),
  helpful: z.boolean().nullable().optional(),
  sideEffects: z.string().nullable().optional(),
});

const currentMedicationSchema = z.object({
  name: z.string().min(1),
  dose: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  helpful: z.boolean().nullable().optional(),
  sideEffects: z.string().nullable().optional(),
});

export const historyContextSchema = z
  .object({
    recentInjury: z.boolean().optional(),
    injuryDate: z.string().nullable().optional(),
    mechanism: z.string().nullable().optional(),
    repetitiveStrain: z.boolean().optional(),
    newActivity: z.boolean().optional(),
    pregnancyPostpartum: z.boolean().optional(),
    recurrent: z.boolean().optional(),
    priorDiagnosis: z.string().nullable().optional(),
    triedTreatments: z.array(treatmentTriedSchema).optional(),
    currentMeds: z.array(currentMedicationSchema).optional(),
    comorbidities: z.array(z.string()).optional(),
    sleepQuality: z.enum(['good', 'fair', 'poor']).nullable().optional(),
    phq2: z.number().int().min(0).max(6).nullable().optional(),
    gad2: z.number().int().min(0).max(6).nullable().optional(),
    stressHigh: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // If onset is 'after_injury', require injury details
      if (data.recentInjury) {
        return data.injuryDate !== null && data.mechanism !== null;
      }
      return true;
    },
    {
      message: 'Injury date and mechanism are required for recent injuries',
      path: ['injuryDate'],
    }
  );

// ============================================================================
// ASSOCIATED SYMPTOMS VALIDATION
// ============================================================================

export const associatedSymptomsSchema = z.object({
  weakness: z.boolean().optional(),
  numbness: z.boolean().optional(),
  tingling: z.boolean().optional(),
  balanceIssues: z.boolean().optional(),
  morningStiffness30m: z.boolean().optional(),
  feverChills: z.boolean().optional(),
  nightSweats: z.boolean().optional(),
  fatigue: z.boolean().optional(),
  swelling: z.boolean().optional(),
  rednessWarmth: z.boolean().optional(),
  bruising: z.boolean().optional(),
  lockingCatching: z.boolean().optional(),
  instability: z.boolean().optional(),
  headache: z.boolean().optional(),
  lightSoundSensitive: z.boolean().optional(),
  visionChanges: z.boolean().optional(),
  jawPain: z.boolean().optional(),
  chestPain: z.boolean().optional(),
  shortnessBreath: z.boolean().optional(),
  nauseaVomiting: z.boolean().optional(),
  abdominalPain: z.boolean().optional(),
  bowelChange: z.boolean().optional(),
  bladderChange: z.boolean().optional(),
  menstrualLink: z.boolean().optional(),
  saddleNumbness: z.boolean().optional(),
  incontinence: z.boolean().optional(),
});

// ============================================================================
// AGGRAVATORS & RELIEVERS VALIDATION
// ============================================================================

export const aggravatorsSchema = z.object({
  sitting: z.boolean().optional(),
  standing: z.boolean().optional(),
  walking: z.boolean().optional(),
  bending: z.boolean().optional(),
  lifting: z.boolean().optional(),
  twisting: z.boolean().optional(),
  coughing: z.boolean().optional(),
  morningWorse: z.boolean().optional(),
  eveningWorse: z.boolean().optional(),
  weather: z.boolean().optional(),
  stress: z.boolean().optional(),
  other: z.string().nullable().optional(),
});

export const relieversSchema = z.object({
  rest: z.boolean().optional(),
  ice: z.boolean().optional(),
  heat: z.boolean().optional(),
  stretching: z.boolean().optional(),
  movement: z.boolean().optional(),
  medication: z.boolean().optional(),
  position: z.string().nullable().optional(),
  other: z.string().nullable().optional(),
});

// ============================================================================
// RED FLAGS VALIDATION
// ============================================================================

export const redFlagResultSchema = z.object({
  any: z.boolean(),
  reasons: z.array(z.string()),
  evaluatedAt: z.string(),
});

// ============================================================================
// GOALS VALIDATION
// ============================================================================

export const goalsSchema = z.object({
  goal2to4Weeks: z.string().nullable().optional(),
  preferredTreatments: z.array(z.enum(['meds', 'non_meds', 'avoid_meds'])).optional(),
  exerciseReady: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

// ============================================================================
// COMPLETE ASSESSMENT PAYLOAD VALIDATION
// ============================================================================

export const assessmentPayloadSchema = z.object({
  id: z.string().optional(),
  draftId: z.string().optional(),
  user: z.object({
    email: z.string().email().optional(),
    name: z.string().min(1).optional(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  points: z.array(painPointSchema).min(1, 'At least one pain point is required'),
  timing: timingSchema,
  aggravators: aggravatorsSchema,
  relievers: relieversSchema,
  associated: associatedSymptomsSchema,
  functional: functionalImpactSchema,
  history: historyContextSchema,
  goals: goalsSchema,
  redFlags: redFlagResultSchema,
  completionPercent: z.number().int().min(0).max(100).optional(),
  resumeToken: z.string().nullable().optional(),
  locale: z.string().optional(),
});

// ============================================================================
// STEP-SPECIFIC VALIDATION SCHEMAS
// ============================================================================

// Step 1: Welcome
export const welcomeStepSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required'),
});

// Step 2: Pain Mapping
export const painMappingStepSchema = z.object({
  points: z.array(painPointSchema).min(1, 'Add at least one pain point'),
});

// Step 3: Timing
export const timingStepSchema = z.object({
  timing: timingSchema,
});

// Step 4: Triggers (Aggravators & Relievers)
export const triggersStepSchema = z.object({
  aggravators: aggravatorsSchema,
  relievers: relieversSchema,
});

// Step 5: Associated Symptoms
export const symptomsStepSchema = z.object({
  associated: associatedSymptomsSchema,
  functional: functionalImpactSchema,
});

// Step 6: Red Flags
export const redFlagsStepSchema = z.object({
  redFlags: redFlagResultSchema,
});

// Step 7: Goals
export const goalsStepSchema = z.object({
  goals: goalsSchema,
  history: historyContextSchema,
});

// Step 8: Review - uses complete assessment schema

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PainPointInput = z.infer<typeof painPointSchema>;
export type TimingInput = z.infer<typeof timingSchema>;
export type FunctionalImpactInput = z.infer<typeof functionalImpactSchema>;
export type HistoryContextInput = z.infer<typeof historyContextSchema>;
export type AssociatedSymptomsInput = z.infer<typeof associatedSymptomsSchema>;
export type AggravatorsInput = z.infer<typeof aggravatorsSchema>;
export type RelieversInput = z.infer<typeof relieversSchema>;
export type RedFlagResultInput = z.infer<typeof redFlagResultSchema>;
export type GoalsInput = z.infer<typeof goalsSchema>;
export type AssessmentPayloadInput = z.infer<typeof assessmentPayloadSchema>;
