/**
 * Evidence-based recovery trajectory benchmarks for common MSK conditions
 * Each benchmark defines a typical recovery curve over time
 */

const RECOVERY_BENCHMARKS = {
  'acute_low_back_pain': {
    name: 'Acute Non-Specific Low Back Pain',
    description: 'Typical improvement is front-loaded; ~80% recover within 6–12 weeks under guideline-concordant conservative care',
    // Recovery curve: weeks -> expected pain reduction percentage
    curve: [
      { week: 0, painReduction: 0 },     // Start
      { week: 2, painReduction: 30 },    // Early improvement
      { week: 4, painReduction: 50 },    // Continued improvement
      { week: 6, painReduction: 65 },    // Majority improved
      { week: 8, painReduction: 75 },
      { week: 12, painReduction: 80 },   // 80% recovered
      { week: 16, painReduction: 85 }    // Further gains
    ],
    minWeeks: 6,
    maxWeeks: 12,
    references: 'Primary care guidelines'
  },

  'lumbar_radicular_pain': {
    name: 'Lumbar Radicular Pain (Disc Herniation)',
    description: 'Majority improve within 4–6 weeks; natural history is favourable without intervention for many patients',
    curve: [
      { week: 0, painReduction: 0 },
      { week: 2, painReduction: 25 },
      { week: 4, painReduction: 50 },    // Majority improving
      { week: 6, painReduction: 70 },    // Most recovered
      { week: 8, painReduction: 80 },
      { week: 12, painReduction: 85 }
    ],
    minWeeks: 4,
    maxWeeks: 6,
    references: 'Conservative care evidence'
  },

  'knee_oa_exercise': {
    name: 'Knee Osteoarthritis - Exercise/Physical Therapy',
    description: 'Clinically meaningful pain reductions typically occur over 6–18 weeks of structured exercise therapy',
    curve: [
      { week: 0, painReduction: 0 },
      { week: 3, painReduction: 10 },    // Slow start
      { week: 6, painReduction: 25 },    // Starting to improve
      { week: 9, painReduction: 40 },
      { week: 12, painReduction: 55 },   // Meaningful improvement
      { week: 18, painReduction: 70 },   // Peak benefit
      { week: 24, painReduction: 65 },   // Slight decline
      { week: 52, painReduction: 50 }    // Benefits wane by ~18 months
    ],
    minWeeks: 6,
    maxWeeks: 18,
    references: 'Structured exercise therapy studies'
  },

  'knee_oa_injection': {
    name: 'Knee Osteoarthritis - Corticosteroid Injection',
    description: 'Predominantly short-term relief; high-quality reviews characterise benefit as up to ~4–6 weeks (short-term only)',
    curve: [
      { week: 0, painReduction: 0 },
      { week: 1, painReduction: 50 },    // Rapid relief
      { week: 2, painReduction: 60 },    // Peak benefit
      { week: 4, painReduction: 50 },    // Starting to wane
      { week: 6, painReduction: 30 },    // Benefit declining
      { week: 8, painReduction: 15 },
      { week: 12, painReduction: 5 }     // Minimal residual benefit
    ],
    minWeeks: 4,
    maxWeeks: 6,
    references: 'Short-term relief only'
  },

  'rotator_cuff_exercise': {
    name: 'Rotator Cuff-Related Shoulder Pain',
    description: 'Guideline windows for measurable improvement commonly use ~12 weeks as primary checkpoint, with further gains over 3–12 months',
    curve: [
      { week: 0, painReduction: 0 },
      { week: 4, painReduction: 15 },
      { week: 8, painReduction: 30 },
      { week: 12, painReduction: 50 },   // Primary checkpoint
      { week: 16, painReduction: 60 },
      { week: 24, painReduction: 70 },   // 6 months
      { week: 36, painReduction: 75 },   // 9 months
      { week: 52, painReduction: 80 }    // 12 months
    ],
    minWeeks: 12,
    maxWeeks: 52,
    references: '2025 AAOS CPG'
  }
};

/**
 * Maps patient pain areas and treatments to appropriate benchmark
 */
function getBenchmarkForPatient(selectedAreas, currentTreatments, symptoms) {
  // Ensure arrays (handle string, null, undefined cases)
  selectedAreas = Array.isArray(selectedAreas) ? selectedAreas : (selectedAreas ? [selectedAreas] : []);
  currentTreatments = Array.isArray(currentTreatments) ? currentTreatments : (currentTreatments ? [currentTreatments] : []);
  symptoms = Array.isArray(symptoms) ? symptoms : (symptoms ? [symptoms] : []);

  // Convert to lowercase for easier matching
  const areas = selectedAreas.map(a => String(a).toLowerCase());
  const treatments = currentTreatments.map(t => String(t).toLowerCase());
  const symptomsList = symptoms.map(s => String(s).toLowerCase());

  // Check for lumbar radicular pain (leg pain/numbness with back pain)
  const hasBackPain = areas.some(a => a.includes('back') || a.includes('spine') || a.includes('lumbar'));
  const hasLegSymptoms = symptomsList.some(s =>
    s.includes('numbness') ||
    s.includes('tingling') ||
    s.includes('radiating') ||
    s.includes('shooting down leg')
  );

  if (hasBackPain && hasLegSymptoms) {
    return RECOVERY_BENCHMARKS.lumbar_radicular_pain;
  }

  // Check for knee OA with injection
  const hasKneePain = areas.some(a => a.includes('knee'));
  const hasInjection = treatments.some(t => t.includes('injection') || t.includes('cortisone') || t.includes('steroid'));

  if (hasKneePain && hasInjection) {
    return RECOVERY_BENCHMARKS.knee_oa_injection;
  }

  // Check for knee OA with exercise/PT
  const hasExercise = treatments.some(t =>
    t.includes('physical therapy') ||
    t.includes('exercise') ||
    t.includes('pt')
  );

  if (hasKneePain && (hasExercise || treatments.length === 0)) {
    return RECOVERY_BENCHMARKS.knee_oa_exercise;
  }

  // Check for shoulder pain
  const hasShoulderPain = areas.some(a => a.includes('shoulder'));

  if (hasShoulderPain) {
    return RECOVERY_BENCHMARKS.rotator_cuff_exercise;
  }

  // Default to acute low back pain for back-related issues
  if (hasBackPain) {
    return RECOVERY_BENCHMARKS.acute_low_back_pain;
  }

  // Default fallback
  return RECOVERY_BENCHMARKS.acute_low_back_pain;
}

/**
 * Converts timeline selection to weeks
 */
function timelineToWeeks(timeline) {
  const mapping = {
    '1-2 weeks': 1.5,
    '3-4 weeks': 3.5,
    '1-2 months': 6,
    '3-4 months': 14,
    '4-6 months': 20,
    '6-12 months': 36,
    'More than 1 year': 52
  };
  return mapping[timeline] || 8; // Default to 8 weeks if unknown
}

/**
 * Calculates target pain level based on "recovery"
 * Recovery typically means functional improvement, not pain-free
 */
function calculateRecoveryTarget(currentPain, goals) {
  // If current pain is high (7-10), recovery target is typically 2-3
  // If current pain is moderate (4-6), recovery target is typically 1-2
  // If current pain is low (1-3), recovery target is typically 0-1

  if (currentPain >= 7) return 2;
  if (currentPain >= 4) return 1.5;
  return 0.5;
}

// Export for use in wizard.js
if (typeof window !== 'undefined') {
  window.RecoveryBenchmarks = {
    RECOVERY_BENCHMARKS,
    getBenchmarkForPatient,
    timelineToWeeks,
    calculateRecoveryTarget
  };
}
