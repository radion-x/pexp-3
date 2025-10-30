# Implementation Plan - Single Page Pain Assessment

## Quick Start

```bash
# Create feature branch
git checkout -b refactor-single-page

# Make sure dependencies are installed
cd server && npm install
cd ../client && npm install
```

## Step-by-Step Implementation (Execute in Order)

### Step 1: Backend Data Model (30 min)
**Goal:** Update MongoDB schema to only store essential pain assessment data

1. Update `server/models/Assessment.js`:
   - Remove old fields (demographics, surgeries, imaging, etc.)
   - Keep only: sessionId, email, fullName, painAreas, redFlags, treatmentGoals, pain map images, AI fields
   - See REFACTORING_GUIDE.md section 1.1 for complete schema

2. Test the model:
   ```bash
   cd server
   node -e "require('./models/Assessment'); console.log('Model loaded successfully')"
   ```

### Step 2: Frontend Data Types (15 min)
**Goal:** Simplify FormData interface

1. Update `client/src/data/formData.ts`:
   - Remove old interfaces (Demographics, ClinicalHistory, Surgery, etc.)
   - Create new simplified FormData interface
   - See REFACTORING_GUIDE.md section 1.2 for complete TypeScript interfaces

2. Verify TypeScript compilation:
   ```bash
   cd client
   npm run build
   ```

### Step 3: Update FormContext (30 min)
**Goal:** Remove multi-step navigation logic

1. Update `client/src/context/FormContext.tsx`:
   - Remove: currentStep, goToNextStep, goToPrevStep, isStepValid
   - Keep: formData, updateFormData, submitActionRef, aiSummary
   - Add: isFormValid() for simple validation

2. Update default formData initialization to match new structure

### Step 4: Build Single Page Component (2 hours)
**Goal:** Create new main form component

1. Create `client/src/components/PainAssessmentForm.tsx`:
   - Copy pain mapping logic from `PainMappingStep.tsx`
   - Extract red flags section
   - Add basic info fields (email, fullName)
   - Add treatment goals textarea
   - Add submit button with validation

2. Component sections (in order):
   - Header with title/description
   - Email & Name inputs
   - Pain mapping (body diagrams + pain list)
   - Red flags checkboxes
   - Treatment goals
   - Submit button
   - Results display (after submission)

### Step 5: Update App.tsx (10 min)
**Goal:** Replace multi-step form with single page

1. Update `client/src/App.tsx`:
   - Remove `<FormStepper />` import and usage
   - Add `<PainAssessmentForm />` instead
   - Keep theme toggle and dashboard routes

### Step 6: Update Backend API (1 hour)
**Goal:** Simplify validation and AI processing

1. Update `server/app.js` or `server/routes/api.js`:
   - Simplify validation in `/api/assessment/submit`
   - Only check: email, fullName, painAreas (min 1), redFlags

2. Update `server/prompt-builder.js`:
   - Remove sections for removed fields
   - Focus on: pain patterns, red flags, treatment goals
   - See REFACTORING_GUIDE.md section 4.2 for new prompt structure

3. Update email template function:
   - Remove: demographics, surgeries, imaging sections
   - Keep: patient info, pain table, red flags, goals, images, AI summary

### Step 7: Test Complete Flow (30 min)
**Goal:** Verify end-to-end functionality

1. Start both servers:
   ```bash
   # Terminal 1
   cd server && npm start

   # Terminal 2
   cd client && npm run dev
   ```

2. Open http://localhost:5173

3. Test complete flow:
   - Fill email & name
   - Mark 2-3 pain points
   - Set intensities
   - Check some red flags
   - Add treatment goal
   - Submit
   - Verify AI summary appears
   - Check email received

4. Verify in MongoDB:
   ```bash
   mongosh spineiq_db
   db.assessments.findOne({}, {}, {sort: {createdAt: -1}})
   ```

### Step 8: Update Doctor Dashboard (1 hour)
**Goal:** Display simplified assessment data

1. Update `client/src/components/DoctorDashboard.tsx`:
   - Remove columns for deleted fields
   - Add urgency badge display
   - Add red flag count column
   - Simplify detail view

2. Test dashboard:
   - Navigate to `/doctor`
   - Login with dashboard password
   - Verify assessment list shows correctly
   - Click into assessment detail
   - Verify all data displays properly

### Step 9: Cleanup (30 min)
**Goal:** Remove unused files and code

1. Delete unused components:
   ```bash
   cd client/src/components/steps
   rm OnboardingStep.tsx
   rm ClinicalHistoryStep.tsx
   rm ImagingHistoryStep.tsx
   rm TreatmentHistoryStep.tsx
   rm AboutYouStep.tsx
   ```

2. Search for and remove imports:
   ```bash
   cd client/src
   grep -r "OnboardingStep\|ClinicalHistoryStep" .
   # Remove any found imports
   ```

3. Clean up `FormStepper.tsx` (or delete if fully replaced)

### Step 10: Final Testing (30 min)

Run through complete test checklist in REFACTORING_GUIDE.md section 8.

Critical tests:
- [ ] Form submission works
- [ ] Email sends successfully
- [ ] Pain maps save and display
- [ ] AI summary generates
- [ ] Dashboard shows assessment
- [ ] Dark mode works
- [ ] Mobile responsive

## Estimated Total Time: 6-7 hours

## Troubleshooting

### Issue: API calls failing
**Check:**
- SERVER_PORT in .env matches vite.config.ts proxy
- Backend server is running
- CORS settings in app.js

### Issue: Pain map images not saving
**Check:**
- Session directory permissions
- Canvas to blob conversion
- Upload endpoint response

### Issue: Email not sending
**Check:**
- Mailgun credentials in .env
- EMAIL_SENDER_ADDRESS typo (has extra 'm' currently)
- BCC addresses valid

### Issue: AI summary not generating
**Check:**
- CLAUDE_API_KEY is valid
- Prompt length (should be much shorter now)
- API rate limits

## Success Criteria

✅ User can complete assessment in single page
✅ No multi-step navigation
✅ Only pain mapping + red flags + treatment goals + basic info
✅ AI summary generates based on simplified data
✅ Email sends with correct sections
✅ Dashboard displays simplified assessments
✅ All old components removed
✅ TypeScript compiles without errors
✅ No console errors in browser

## Next Steps After Completion

1. Update README.md with new architecture
2. Add user documentation/help text
3. Consider adding "Save Draft" functionality
4. Add analytics tracking for completion rate
5. Optimize AI prompt for better recommendations
6. Add automated tests (Jest/Cypress)
