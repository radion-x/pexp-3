/**
 * Red Flag Safety Logic
 * Evaluates patient responses for urgent/emergent conditions
 */

import type {
  AssociatedSymptoms,
  HistoryContext,
  RedFlagResult,
  RedFlagKey,
} from '../types/assessment';
import { toISOString } from './utils';

/**
 * Evaluate all red flags from patient data
 * Returns true if ANY red flags are present
 */
export function evaluateRedFlags(
  associated: Partial<AssociatedSymptoms>,
  history: Partial<HistoryContext>
): RedFlagResult {
  const reasons: RedFlagKey[] = [];

  // Neurological red flags
  if (associated.weakness) {
    reasons.push('new_weakness');
  }
  if (associated.balanceIssues) {
    reasons.push('trouble_walking');
  }

  // Cauda Equina red flags
  if (associated.bladderChange || associated.incontinence) {
    reasons.push('bowel_bladder_change');
  }
  if (associated.saddleNumbness) {
    reasons.push('saddle_anesthesia');
  }

  // Cardiovascular/Respiratory red flags
  if (associated.chestPain) {
    reasons.push('chest_pain');
  }
  if (associated.shortnessBreath) {
    reasons.push('shortness_breath');
  }

  // Infection red flags
  if (associated.feverChills && associated.swelling) {
    reasons.push('fever_with_severe_pain');
  }
  if (associated.rednessWarmth && associated.swelling) {
    reasons.push('hot_swollen_joint');
  }

  // Malignancy red flags
  if (history.comorbidities?.includes('cancer')) {
    reasons.push('cancer_history');
  }
  
  // Night pain (assuming we track this elsewhere)
  // We would need to check pain pattern data

  // Trauma red flags
  if (history.recentInjury) {
    reasons.push('major_trauma');
  }

  // Central nervous system red flags
  if (associated.headache && associated.lightSoundSensitive) {
    reasons.push('worst_headache');
  }
  if (associated.visionChanges || associated.weakness) {
    reasons.push('neuro_deficit');
  }
  if (associated.headache && associated.feverChills) {
    reasons.push('headache_fever_neck_stiffness');
  }

  return {
    any: reasons.length > 0,
    reasons,
    evaluatedAt: toISOString(),
  };
}

/**
 * Check if specific red flags indicate neuropathic pattern
 */
export function hasNeuropathicPattern(qualities: string[]): boolean {
  const neuropathicQualities = [
    'burning',
    'shooting',
    'electric',
    'tingling',
    'numb',
    'hypersensitive',
  ];
  
  return qualities.some((q) => neuropathicQualities.includes(q));
}

/**
 * Check if symptoms suggest inflammatory back pain
 */
export function hasInflammatoryBackPattern(
  regions: string[],
  associated: Partial<AssociatedSymptoms>
): boolean {
  const hasBackRegion = regions.some((r) =>
    r.toLowerCase().includes('back') || r.toLowerCase().includes('lumbar')
  );
  
  return hasBackRegion && !!associated.morningStiffness30m;
}

/**
 * Get urgency level based on red flags
 */
export function getUrgencyLevel(
  redFlags: RedFlagResult
): 'LOW_URGENCY' | 'MODERATE_URGENCY' | 'HIGH_URGENCY' {
  if (!redFlags.any) {
    return 'LOW_URGENCY';
  }

  // High urgency conditions
  const highUrgencyFlags: RedFlagKey[] = [
    'bowel_bladder_change',
    'saddle_anesthesia',
    'chest_pain',
    'shortness_breath',
    'worst_headache',
    'headache_fever_neck_stiffness',
  ];

  const hasHighUrgency = redFlags.reasons.some((reason) =>
    highUrgencyFlags.includes(reason)
  );

  if (hasHighUrgency) {
    return 'HIGH_URGENCY';
  }

  // Moderate urgency for other red flags
  return 'MODERATE_URGENCY';
}

/**
 * Get appropriate guidance message based on urgency
 */
export function getUrgencyGuidance(urgency: 'LOW_URGENCY' | 'MODERATE_URGENCY' | 'HIGH_URGENCY'): {
  title: string;
  message: string;
  action: string;
  actionUrl?: string;
} {
  switch (urgency) {
    case 'HIGH_URGENCY':
      return {
        title: 'Urgent Medical Attention Needed',
        message:
          'Your symptoms suggest a condition that requires immediate medical evaluation. Please seek emergency care now.',
        action: 'Find Emergency Care',
        actionUrl: 'tel:911',
      };
    case 'MODERATE_URGENCY':
      return {
        title: 'Medical Evaluation Recommended',
        message:
          'Your symptoms should be evaluated by a healthcare provider soon, ideally within 24-48 hours.',
        action: 'Find Urgent Care',
      };
    case 'LOW_URGENCY':
    default:
      return {
        title: 'Continue Assessment',
        message:
          'No immediate red flags detected. Continue with your assessment.',
        action: 'Continue',
      };
  }
}
