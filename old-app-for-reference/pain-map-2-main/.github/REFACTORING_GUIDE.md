# Pain Assessment Tool - Refactoring Implementation Guide

**Date:** October 15, 2025  
**Objective:** Simplify multi-step assessment form to single-page pain mapping + red flags application

## Refactoring Checklist

### Phase 1: Data Model Updates ✓ Start Here

#### 1.1 Update Backend Schema
**File:** `server/models/Assessment.js`

**Remove these fields:**
- `demographics` (age, gender, occupation, insurance, etc.)
- `clinicalHistory` (diagnoses, currentSymptoms, onsetDate, etc.)
- `surgeries` array
- `treatments` array
- `imaging` array and all imaging-related fields
- `referringDoctor` object

**Keep these fields:**
- `sessionId` (string, required, unique)
- `email` (string, required)
- `fullName` (string, required)
- `painAreas` (array of objects)
- `redFlags` (object with boolean flags + notes)
- `treatmentGoals` (string, optional)
- `painMapImageFront` (string, file path)
- `painMapImageBack` (string, file path)
- `aiSummary` (string, generated)
- `systemRecommendation` (string enum: LOW/MODERATE/HIGH urgency)
- `createdAt`, `updatedAt` (timestamps)

#### 1.2 Update Frontend Data Types
**File:** `client/src/data/formData.ts`

**New Interface Structure:**
```typescript
export interface PainArea {
  region: string;
  intensity: number; // 1-10
  coordinates: { x: number; y: number };
  notes?: string;
}

export interface RedFlagsData {
  bowelBladderDysfunction: boolean;
  progressiveWeakness: boolean;
  saddleAnesthesia: boolean;
  unexplainedWeightLoss: boolean;
  feverChills: boolean;
  nightPain: boolean;
  cancerHistory: boolean;
  recentTrauma: boolean;
  notes?: string;
}

export interface FormData {
  // Identity
  email: string;
  fullName: string;
  
  // Core assessment
  painAreas: PainArea[];
  redFlags: RedFlagsData;
  treatmentGoals?: string;
  
  // System fields
  formSessionId: string;
  painMapImageFront?: string;
  painMapImageBack?: string;
  aiSummary?: string;
  systemRecommendation?: string;
}
```

**Remove these interfaces:**
- `Demographics`
- `ClinicalHistory`
- `Surgery`
- `Treatment`
- `ImagingStudy`
- `ReferringDoctor`

---

### Phase 2: Component Restructuring

#### 2.1 Create Main Single-Page Form
**New File:** `client/src/components/PainAssessmentForm.tsx`

**Component Structure:**
```tsx
export default function PainAssessmentForm() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <header className="mb-8">
        <h1>Pain Assessment</h1>
        <p>Mark your pain areas and answer critical health questions</p>
      </header>

      {/* Section 1: Basic Info */}
      <section id="basic-info" className="mb-8">
        <h2>Your Information</h2>
        <input name="email" type="email" required />
        <input name="fullName" type="text" required />
      </section>

      {/* Section 2: Pain Mapping */}
      <section id="pain-mapping" className="mb-8">
        <h2>Pain Mapping</h2>
        {/* Reuse existing PainMappingStep logic */}
        <BodyDiagram view="front" />
        <BodyDiagram view="back" />
        <PainAreasList />
      </section>

      {/* Section 3: Red Flags */}
      <section id="red-flags" className="mb-8">
        <h2>Critical Symptoms (Red Flags)</h2>
        <RedFlagsChecklist />
      </section>

      {/* Section 4: Treatment Goals */}
      <section id="treatment-goals" className="mb-8">
        <h2>Treatment Goals (Optional)</h2>
        <textarea name="treatmentGoals" />
      </section>

      {/* Submit */}
      <section id="submit">
        <button disabled={!isFormValid()}>Submit Assessment</button>
      </section>

      {/* Results (shown after submission) */}
      {aiSummary && (
        <section id="results" className="mt-8">
          <h2>Assessment Summary</h2>
          <div dangerouslySetInnerHTML={{ __html: aiSummary }} />
        </section>
      )}
    </div>
  );
}
```

#### 2.2 Extract Reusable Components

**From `PainMappingStep.tsx`, extract:**
- `BodyDiagram` component (interactive SVG)
- `PainAreasList` component (list of marked areas with intensity sliders)
- Pain map canvas rendering logic

**Create new:**
- `RedFlagsChecklist.tsx` - 8 checkboxes + notes field
- `TreatmentGoalsInput.tsx` - Simple textarea with character count

#### 2.3 Update App.tsx
**File:** `client/src/App.tsx`

**Replace:**
```tsx
// OLD
<FormStepper /> // Multi-step wizard
```

**With:**
```tsx
// NEW
<PainAssessmentForm /> // Single page
```

---

### Phase 3: Context Simplification

#### 3.1 Update FormContext
**File:** `client/src/context/FormContext.tsx`

**Remove:**
- `currentStep` state
- `totalSteps` constant
- `goToNextStep()` function
- `goToPrevStep()` function
- `goToStep()` function
- `isStepValid()` function

**Keep:**
- `formData` state
- `updateFormData()` function
- `formSessionId` state/initialization
- `submitActionRef` for final submission
- `aiSummary` state
- `isSubmitting` state

**Add:**
- `isFormValid()` function - checks email, name, painAreas.length > 0, redFlags interaction
- `submitAssessment()` function - handles form submission

---

### Phase 4: Backend API Updates

#### 4.1 Update Submission Endpoint
**File:** `server/app.js` (or `server/routes/api.js`)

**Endpoint:** `POST /api/assessment/submit`

**Updated Validation:**
```javascript
// Remove validation for deleted fields
// Keep only:
if (!email || !fullName) {
  return res.status(400).json({ error: 'Email and name required' });
}

if (!painAreas || painAreas.length === 0) {
  return res.status(400).json({ error: 'At least one pain area required' });
}

if (!redFlags) {
  return res.status(400).json({ error: 'Red flags section required' });
}
```

#### 4.2 Update AI Prompt Builder
**File:** `server/prompt-builder.js`

**Simplify prompt to focus on:**
1. Pain distribution and intensity patterns
2. Red flag significance and urgency
3. Treatment goal alignment
4. Clinical recommendations based on pain + red flags

**Remove sections for:**
- Medical history
- Surgery history
- Imaging studies
- Demographics beyond basic identification

**New Prompt Structure:**
```javascript
function generateComprehensivePrompt(formData) {
  return `
You are a clinical AI assistant analyzing a pain assessment.

PATIENT INFORMATION:
- Name: ${formData.fullName}
- Email: ${formData.email}

PAIN MAPPING DATA:
${formatPainAreas(formData.painAreas)}

RED FLAG SYMPTOMS:
${formatRedFlags(formData.redFlags)}

TREATMENT GOALS:
${formData.treatmentGoals || 'Not specified'}

TASK:
1. Analyze pain distribution and patterns
2. Assess clinical significance of red flags
3. Determine urgency level (LOW/MODERATE/HIGH)
4. Provide clinical summary and recommendations
5. Consider patient's treatment goals

FORMAT:
- Clinical narrative (2-3 paragraphs)
- Urgency classification
- Recommended next steps
`;
}
```

#### 4.3 Update Email Template
**File:** `server/app.js` - `generateAssessmentEmailHTML()` function

**Remove sections:**
- Demographics table
- Clinical history
- Surgery history
- Treatment history
- Imaging studies
- Referring doctor info

**Keep sections:**
- Patient name/email
- Pain areas table (region, intensity, notes)
- Red flags list (highlight positive findings)
- Treatment goals
- Embedded pain map images
- AI summary and recommendations

---

### Phase 5: File Upload Cleanup

#### 5.1 Update Upload Routes
**File:** `server/routes/upload.js`

**Keep:**
- Pain map image upload endpoint
- Session-based file organization

**Remove (or mark unused):**
- Imaging document upload endpoint (`/upload/imaging-file`)
- Temporary file handling (if only used for imaging)

#### 5.2 Pain Map Upload Flow
**Endpoint:** `POST /api/upload/pain-map`

**Query params:** `?formSessionId={id}&view={front|back}`

**Process:**
1. Receive base64 PNG from frontend
2. Save to `/uploads/assessment_files/{sessionId}/pain_map_{view}.png`
3. Return file path for database storage

---

### Phase 6: Doctor Dashboard Updates

#### 6.1 Update Assessment List View
**File:** `client/src/components/DoctorDashboard.tsx`

**Remove columns/filters:**
- Age, gender, occupation
- Diagnoses
- Surgery count
- Imaging count

**Add/Update:**
- Urgency badge (color-coded: red/yellow/green)
- Pain area count
- Red flag count (number of positive findings)
- Treatment goals preview (truncated)

#### 6.2 Update Assessment Detail View

**Show:**
1. Patient info (name, email, date)
2. Urgency level (prominent badge)
3. Pain map images (side-by-side)
4. Pain areas table
5. Red flags (checkmarks for positive, X for negative)
6. Treatment goals (full text)
7. AI summary
8. AI recommendations

**Remove:**
- All other sections

---

### Phase 7: Cleanup & Removal

#### 7.1 Delete Unused Components
```bash
# Delete these files:
rm client/src/components/steps/OnboardingStep.tsx
rm client/src/components/steps/ClinicalHistoryStep.tsx
rm client/src/components/steps/ImagingHistoryStep.tsx
rm client/src/components/steps/TreatmentHistoryStep.tsx
rm client/src/components/steps/AboutYouStep.tsx
rm client/src/components/StepNavigator.tsx

# Keep but refactor:
# - PainMappingStep.tsx (extract into PainAssessmentForm)
# - SummaryStep.tsx (simplify for inline results display)
```

#### 7.2 Update Imports

Search and remove imports for deleted components:
```bash
grep -r "OnboardingStep\|ClinicalHistoryStep\|ImagingHistoryStep" client/src/
```

#### 7.3 Clean Up Unused Dependencies

Check `package.json` for libraries only used by removed features.

---

### Phase 8: Testing Checklist

#### 8.1 Frontend Tests
- [ ] Form renders with all sections
- [ ] Email validation works
- [ ] Pain mapping: click to add point
- [ ] Pain mapping: intensity slider updates
- [ ] Pain mapping: remove pain point
- [ ] Pain mapping: toggle front/back view
- [ ] Pain mapping: generates canvas images
- [ ] Red flags: all checkboxes functional
- [ ] Treatment goals: textarea saves to state
- [ ] Submit button: disabled when invalid
- [ ] Submit button: enabled when valid
- [ ] Form submission: shows loading state
- [ ] AI summary: displays after submission
- [ ] Dark mode toggle works

#### 8.2 Backend Tests
- [ ] POST /api/assessment/submit accepts simplified data
- [ ] Validation rejects missing email
- [ ] Validation rejects missing name
- [ ] Validation rejects empty painAreas
- [ ] Pain map upload saves files correctly
- [ ] AI prompt generation works with new structure
- [ ] Claude API returns summary
- [ ] Database saves assessment correctly
- [ ] Email sends to patient
- [ ] Email BCCs to doctors/admin

#### 8.3 Integration Tests
- [ ] Complete form → submit → receives email
- [ ] Check MongoDB for correct document structure
- [ ] Dashboard shows new assessment
- [ ] Dashboard detail view displays correctly
- [ ] Pain map images load in dashboard
- [ ] AI summary readable in dashboard

#### 8.4 Edge Cases
- [ ] Submit with minimal data (1 pain point, all red flags "no")
- [ ] Submit with maximum data (many pain points, all red flags "yes")
- [ ] Very long treatment goals text
- [ ] Special characters in name/email
- [ ] Pain point with no notes
- [ ] Red flags with no notes

---

## Implementation Order

1. ✅ **Create git branch:** `git checkout -b refactor-single-page`
2. **Backend first:** Update Assessment model, validation, prompt builder
3. **Frontend data layer:** Update formData.ts and FormContext
4. **Build new component:** PainAssessmentForm.tsx
5. **Update App.tsx:** Swap in new component
6. **Test submission flow:** End-to-end test
7. **Update email template:** Remove old sections
8. **Update dashboard:** Simplify views
9. **Delete old components:** Remove unused files
10. **Final testing:** All checklists above
11. **Merge to main:** After thorough testing

---

## Rollback Plan

If issues arise:
```bash
git checkout main
git branch -D refactor-single-page
```

Keep old code in separate branch for reference:
```bash
git checkout -b archive-multi-step-version
git checkout main
```

---

## Notes

- **Treatment Goals Impact:** This field directly influences AI recommendations, so emphasize to users
- **Red Flags Urgency:** AI uses red flag patterns to set systemRecommendation (LOW/MODERATE/HIGH)
- **Minimum Pain Points:** Require at least 1, but don't cap the maximum
- **Email Deliverability:** Test Mailgun sends after refactor (template changes might affect spam filters)
- **Session Cleanup:** Old assessment directories with imaging files can remain (won't break anything)
