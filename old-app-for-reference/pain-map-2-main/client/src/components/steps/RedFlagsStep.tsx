import React, { useEffect } from 'react';
import { useWizard } from '../../WizardState';
import { Card, CardContent } from '../ui/Card';
import { evaluateRedFlags, getUrgencyLevel, getUrgencyGuidance } from '../../lib/red-flags';
import { UrgencyBadge } from '../ui/Badge';
import { Shield, AlertTriangle } from 'lucide-react';

export const RedFlagsStep: React.FC = () => {
  const { assessmentData, updateData } = useWizard();

  // Automatically evaluate red flags when component mounts or data changes
  useEffect(() => {
    if (assessmentData.associated && assessmentData.history) {
      const redFlags = evaluateRedFlags(
        assessmentData.associated,
        assessmentData.history
      );
      updateData('redFlags', redFlags);
    }
  }, [assessmentData.associated, assessmentData.history, updateData]);

  const redFlags = assessmentData.redFlags || { any: false, reasons: [], evaluatedAt: new Date().toISOString() };
  const urgencyLevel = getUrgencyLevel(redFlags);
  const urgencyGuidance = getUrgencyGuidance(urgencyLevel);
  
  // Map urgency level to badge format
  const urgencyBadgeLevel = urgencyLevel === 'LOW_URGENCY' ? 'low' :
    urgencyLevel === 'MODERATE_URGENCY' ? 'moderate' :
    urgencyLevel === 'HIGH_URGENCY' ? 'high' : 'immediate';

  // Get specific red flag details
  const hasNeurologicalFlags = redFlags.reasons.some((r) =>
    ['new_weakness', 'trouble_walking', 'foot_drop', 'neuro_deficit'].includes(r)
  );
  const hasCaudaEquinaFlags = redFlags.reasons.some((r) =>
    ['bowel_bladder_change', 'saddle_anesthesia', 'incontinence'].includes(r)
  );
  const hasCardioFlags = redFlags.reasons.some((r) =>
    ['chest_pain', 'shortness_breath'].includes(r)
  );
  const hasInfectionFlags = redFlags.reasons.some((r) =>
    ['fever_with_severe_pain', 'hot_swollen_joint', 'rapid_spreading_redness'].includes(r)
  );
  const hasMalignancyFlags = redFlags.reasons.some((r) =>
    ['unexplained_weight_loss', 'cancer_history', 'night_pain_persists'].includes(r)
  );

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Shield className="h-6 w-6 flex-shrink-0 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-text">Safety Screening</h3>
              <p className="mt-1 text-text-secondary">
                Based on your responses, we've evaluated your symptoms for any signs
                that might require urgent medical attention. This helps ensure you
                receive the appropriate level and timing of care.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urgency Assessment */}
      <Card variant={redFlags.any ? 'outlined' : 'default'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-text">Urgency Assessment</h4>
            <UrgencyBadge urgency={urgencyBadgeLevel} />
          </div>

          <div className="mt-4">
            <p className="font-medium text-text">{urgencyGuidance.title}</p>
            <p className="mt-2 text-sm text-text-secondary">{urgencyGuidance.message}</p>
            <p className="mt-2 text-sm font-medium text-primary">{urgencyGuidance.action}</p>
          </div>

          {redFlags.any && (
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-warning/10 p-4">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text">
                    Important Findings Detected
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Your responses indicate symptoms that warrant medical evaluation.
                    Please review the details below and follow the recommended
                    guidance.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Specific Red Flag Categories */}
      {hasNeurologicalFlags && (
        <Card variant="outlined">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-danger/10 p-2">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-text">Neurological Concerns</h5>
                <p className="mt-1 text-sm text-text-secondary">
                  You've reported neurological symptoms such as weakness, difficulty
                  walking, or nerve-related issues. These symptoms should be evaluated
                  by a healthcare provider to rule out serious conditions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasCaudaEquinaFlags && (
        <Card variant="outlined">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-danger/10 p-2">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-danger">
                  Urgent: Cauda Equina Syndrome Warning
                </h5>
                <p className="mt-1 text-sm text-text-secondary">
                  You've reported symptoms consistent with Cauda Equina Syndrome, a
                  serious condition affecting the nerves at the base of the spine.
                  <strong className="block mt-2">
                    Seek immediate emergency medical attention (call 911 or go to the
                    nearest emergency room).
                  </strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasCardioFlags && (
        <Card variant="outlined">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-danger/10 p-2">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-danger">
                  Urgent: Cardiac/Respiratory Warning
                </h5>
                <p className="mt-1 text-sm text-text-secondary">
                  You've reported chest pain or breathing difficulties. These symptoms
                  can indicate serious cardiac or respiratory conditions.
                  <strong className="block mt-2">
                    If symptoms are severe or worsening, call 911 immediately.
                  </strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasInfectionFlags && (
        <Card variant="outlined">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-warning/10 p-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-text">Infection Warning Signs</h5>
                <p className="mt-1 text-sm text-text-secondary">
                  You've reported symptoms that may indicate an infection (fever,
                  warmth, spreading redness). Infections require prompt medical
                  treatment to prevent complications.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasMalignancyFlags && (
        <Card variant="outlined">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-warning/10 p-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-text">Cancer Screening Recommended</h5>
                <p className="mt-1 text-sm text-text-secondary">
                  Based on your history or symptoms (unexplained weight loss, cancer
                  history, persistent night pain), further evaluation is recommended to
                  rule out serious underlying conditions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Red Flags */}
      {!redFlags.any && (
        <Card variant="outlined">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-success/10 p-2">
                <Shield className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-success">No Urgent Warning Signs</h5>
                <p className="mt-1 text-sm text-text-secondary">
                  Your symptoms don't currently indicate an emergency condition.
                  However, it's still important to address your pain with appropriate
                  treatment. Continue to the next step to complete your assessment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Card variant="outlined">
        <CardContent className="pt-6">
          <p className="text-xs text-text-muted">
            <strong>Important Disclaimer:</strong> This screening is not a substitute
            for professional medical judgment. If you're experiencing severe symptoms
            or your condition worsens, seek immediate medical attention regardless of
            this assessment. When in doubt, always consult with a healthcare provider.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
