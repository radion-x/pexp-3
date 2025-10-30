/**
 * PainMappingStep - Interactive body diagram for pain location mapping
 * Step 2 of 8 in the assessment wizard
 */

import { useWizard } from '../../WizardState';
import { Card } from '../ui/Card';
import { BodyMap } from '../ui/BodyMap';

export function PainMappingStep() {
  const { assessmentData, updateData } = useWizard();

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
        <h2 className="text-2xl font-bold text-text-primary mb-3">
          Where Does It Hurt?
        </h2>
        <p className="text-text-secondary">
          Click on the body diagram below to mark where you experience pain. You can add multiple points
          and adjust the intensity of each area. Use the front/back toggle to access both views.
        </p>
      </Card>

      {/* Validation Message */}
      {assessmentData.points && assessmentData.points.length === 0 && (
        <Card className="bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
          <p className="text-warning-700 dark:text-warning-300 text-sm">
            ⚠️ Please mark at least one pain point on the body diagram to continue.
          </p>
        </Card>
      )}

      {/* Body Map Component */}
      <BodyMap
        points={assessmentData.points || []}
        onPointsChange={(points) => updateData('points', points)}
      />

      {/* Instructions Card */}
      <Card>
        <h3 className="text-lg font-semibold text-text-primary mb-3">How to Use the Pain Map</h3>
        <ul className="space-y-2 text-text-secondary text-sm">
          <li className="flex items-start">
            <span className="text-primary-500 font-bold mr-2">1.</span>
            <span>Toggle between <strong>Front</strong> and <strong>Back</strong> views using the buttons above the body diagram</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-500 font-bold mr-2">2.</span>
            <span>Click directly on the body diagram where you feel pain to add a point</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-500 font-bold mr-2">3.</span>
            <span>Use the intensity slider (0-10) to rate how severe the pain is in that area</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-500 font-bold mr-2">4.</span>
            <span>Select pain qualities (sharp, dull, burning, etc.) that describe the sensation</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-500 font-bold mr-2">5.</span>
            <span>Add notes about radiation (where the pain travels) if applicable</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-500 font-bold mr-2">6.</span>
            <span>Delete a point by clicking the <strong>Delete</strong> button in the editing panel</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
