const mongoose = require('mongoose');

const painPointSchema = new mongoose.Schema({
  id: String,
  regionId: Number,
  regionName: String,
  side: String,
  coords: { x: Number, y: Number },
  intensityCurrent: { type: Number, required: true },
  intensityAverage24h: Number,
  intensityWorst24h: Number,
  qualities: [String],
  radiatesTo: String,
  createdAt: String,
  updatedAt: String,
}, { _id: false });

const timingSchema = new mongoose.Schema({
  onset: String,
  durationValue: Number,
  durationUnit: String,
  pattern: String,
  course: String,
  timeOfDay: [String],
  baselineWithFlares: Boolean,
  flareLengthValue: Number,
  flareLengthUnit: String,
}, { _id: false });

const functionalImpactSchema = new mongoose.Schema({
  limits: [String],
  sitMinutes: Number,
  standMinutes: Number,
  walkMinutes: Number,
  missedDays7: Number,
  missedDays30: Number,
}, { _id: false });

const treatmentTriedSchema = new mongoose.Schema({
  name: String,
  helpful: Boolean,
  sideEffects: String,
}, { _id: false });

const currentMedicationSchema = new mongoose.Schema({
  name: String,
  dose: String,
  frequency: String,
  helpful: Boolean,
  sideEffects: String,
}, { _id: false });

const historyContextSchema = new mongoose.Schema({
  recentInjury: Boolean,
  injuryDate: String,
  mechanism: String,
  repetitiveStrain: Boolean,
  newActivity: Boolean,
  pregnancyPostpartum: Boolean,
  recurrent: Boolean,
  priorDiagnosis: String,
  triedTreatments: [treatmentTriedSchema],
  currentMeds: [currentMedicationSchema],
  comorbidities: [String],
  sleepQuality: String,
  phq2: Number,
  gad2: Number,
  stressHigh: Boolean,
}, { _id: false });

const associatedSymptomsSchema = new mongoose.Schema({
  weakness: Boolean,
  numbness: Boolean,
  tingling: Boolean,
  balanceIssues: Boolean,
  morningStiffness30m: Boolean,
  feverChills: Boolean,
  nightSweats: Boolean,
  fatigue: Boolean,
  swelling: Boolean,
  rednessWarmth: Boolean,
  bruising: Boolean,
  lockingCatching: Boolean,
  instability: Boolean,
  headache: Boolean,
  lightSoundSensitive: Boolean,
  visionChanges: Boolean,
  jawPain: Boolean,
  chestPain: Boolean,
  shortnessBreath: Boolean,
  nauseaVomiting: Boolean,
  abdominalPain: Boolean,
  bowelChange: Boolean,
  bladderChange: Boolean,
  menstrualLink: Boolean,
  saddleNumbness: Boolean,
  incontinence: Boolean,
}, { _id: false });

const aggravatorsSchema = new mongoose.Schema({
  sitting: Boolean,
  standing: Boolean,
  walking: Boolean,
  bending: Boolean,
  lifting: Boolean,
  twisting: Boolean,
  coughing: Boolean,
  morningWorse: Boolean,
  eveningWorse: Boolean,
  weather: Boolean,
  stress: Boolean,
  other: String,
}, { _id: false });

const relieversSchema = new mongoose.Schema({
  rest: Boolean,
  ice: Boolean,
  heat: Boolean,
  stretching: Boolean,
  movement: Boolean,
  medication: Boolean,
  position: String,
  other: String,
}, { _id: false });

const redFlagResultSchema = new mongoose.Schema({
  any: Boolean,
  reasons: [String],
  evaluatedAt: String,
}, { _id: false });

const goalsSchema = new mongoose.Schema({
  goal2to4Weeks: String,
  preferredTreatments: [String],
  exerciseReady: Boolean,
  notes: String,
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  draftId: String,
  user: {
    email: { type: String, trim: true, lowercase: true },
    name: { type: String, trim: true },
    phone: String,
    dateOfBirth: String,
  },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
  
  points: [painPointSchema],
  timing: timingSchema,
  aggravators: aggravatorsSchema,
  relievers: relieversSchema,
  associated: associatedSymptomsSchema,
  functional: functionalImpactSchema,
  history: historyContextSchema,
  goals: goalsSchema,
  redFlags: redFlagResultSchema,
  
  completionPercent: Number,
  resumeToken: String,
  locale: String,

  // Legacy fields for compatibility
  sessionId: String,
  fullName: String,
  painAreas: mongoose.Schema.Types.Mixed,
  treatmentGoals: String,
  painMapImageFront: String,
  painMapImageBack: String,
  aiSummary: String,
  systemRecommendation: String,
});

assessmentSchema.pre('save', function(next) {
  this.updatedAt = new Date().toISOString();
  // Simple data mapping for backward compatibility
  if (this.user?.name && !this.fullName) {
    this.fullName = this.user.name;
  }
  if (this.user?.email && !this.email) {
    this.email = this.user.email;
  }
  next();
});

const Assessment = mongoose.model('Assessment', assessmentSchema);

module.exports = Assessment;
