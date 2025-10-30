import React, { useState } from 'react';
import { useWizard } from '../../WizardState';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { CheckCircle, AlertCircle, Loader2, Send } from 'lucide-react';
import { useToast } from '../ui/Toast';

import type { AssessmentPayload, PainPoint } from '../../types/assessment';

// Transform wizard data structure to backend format
const transformDataForBackend = (data: Partial<AssessmentPayload>) => {
  return {
    email: data.user?.email || '',
    fullName: data.user?.name || '',
    phone: data.user?.phone || '',
    dateOfBirth: data.user?.dateOfBirth || '',
    
    // Transform pain points to painAreas
    painAreas: (data.points || []).map((point: PainPoint) => ({
      region: point.regionName || 'Unknown Region',
      intensity: point.intensityCurrent,
      coordinates: point.coords || null,
      notes: point.radiatesTo || '',
      qualities: point.qualities || [],
    })),
    
    // Transform red flags to expected format
    redFlags: {
      bowelBladderDysfunction: data.associated?.bladderChange || data.associated?.incontinence || false,
      progressiveWeakness: data.associated?.weakness || false,
      saddleAnesthesia: data.associated?.saddleNumbness || false,
      unexplainedWeightLoss: false, // Not captured in wizard
      feverChills: data.associated?.feverChills || false,
      nightPain: data.timing?.timeOfDay?.includes('wakes_from_sleep') || false,
      cancerHistory: data.history?.comorbidities?.includes('cancer') || false,
      recentTrauma: data.history?.recentInjury || false,
      notes: '',
    },
    
    // Treatment goals
    treatmentGoals: data.goals?.goal2to4Weeks || data.goals?.notes || '',
    
    // Session ID for file tracking
    sessionId: `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  };
};

export const ReviewStep: React.FC = () => {
  const { assessmentData } = useWizard();
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [systemRecommendation, setSystemRecommendation] = useState<string | null>(null);
  const [streamingStatus, setStreamingStatus] = useState<string>('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitSuccess(true); // Show success page immediately
    setStreamingStatus('Connecting to AI...');
    setAiSummary(''); // Clear any previous summary

    try {
      // Transform wizard data to backend format
      const transformedData = transformDataForBackend(assessmentData);
      
      console.log('Submitting assessment with streaming:', transformedData);

      // Use EventSource for SSE streaming
      const response = await fetch('/api/assessment/submit-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transformedData),
      });

      if (!response.ok) {
        throw new Error('Failed to start streaming');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              console.log('Stream event:', data);

              if (data.event === 'status') {
                setStreamingStatus(data.message || '');
              } else if (data.event === 'delta') {
                setAiSummary((prev) => prev + (data.text || ''));
                setStreamingStatus('');
              } else if (data.event === 'complete') {
                setAiSummary(data.aiSummary || '');
                setSystemRecommendation(data.systemRecommendation || null);
                setStreamingStatus('');
                
                addToast({
                  title: 'Assessment Complete!',
                  description: 'Your assessment has been submitted successfully.',
                  variant: 'success',
                });

                // Clear draft after successful submission
                localStorage.removeItem('assessment:draft:v1');
              } else if (data.event === 'error') {
                throw new Error(data.message || 'Streaming error');
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitSuccess(false); // Go back to review page on error
      addToast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'There was an error submitting your assessment. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="space-y-6">
        {/* Success Message */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-success/10 p-4">
                <CheckCircle className="h-12 w-12 text-success" />
              </div>
              <h3 className="mt-4 text-2xl font-bold text-text">
                Assessment Submitted Successfully!
              </h3>
              <p className="mt-2 text-text-secondary">
                Thank you for completing your pain assessment. We've sent a detailed
                summary to <strong>{assessmentData.user?.email}</strong>.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Streaming Status */}
        {streamingStatus && (
          <Card variant="outlined">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-text-muted">{streamingStatus}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Urgency Badge */}
        {systemRecommendation && (
          <div className="flex justify-center">
            <Badge 
              variant={
                systemRecommendation === 'HIGH_URGENCY' ? 'danger' : 
                systemRecommendation === 'MODERATE_URGENCY' ? 'warning' : 
                'success'
              }
              className="text-base px-4 py-2"
            >
              {systemRecommendation === 'HIGH_URGENCY' && 'High Urgency - Seek Care Soon'}
              {systemRecommendation === 'MODERATE_URGENCY' && 'Moderate Urgency - Follow Up Recommended'}
              {systemRecommendation === 'LOW_URGENCY' && 'Low Urgency - Routine Care'}
            </Badge>
          </div>
        )}

        {/* AI Summary */}
        {aiSummary && (
          <Card>
            <CardHeader>
              <CardTitle>Clinical Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownRenderer content={aiSummary} />
              {isSubmitting && !systemRecommendation && (
                <div className="mt-3 flex items-center gap-2 text-sm text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating summary...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Show placeholder while waiting for AI */}
        {!aiSummary && isSubmitting && (
          <Card>
            <CardHeader>
              <CardTitle>Clinical Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-text-muted">
                  Analyzing your assessment with AI...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card variant="outlined">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-text">What Happens Next?</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-success" />
                <span>
                  Check your email for a complete assessment summary and recommendations
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-success" />
                <span>
                  A healthcare provider will review your assessment within 24-48 hours
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-success" />
                <span>
                  You'll receive a call or email to schedule your consultation
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Start New Assessment
          </Button>
        </div>
      </div>
    );
  }

  // Calculate completeness
  const hasUser = !!(assessmentData.user?.email && assessmentData.user?.name);
  const hasPainPoints = (assessmentData.points?.length || 0) > 0;
  const hasTiming = !!assessmentData.timing;
  const hasRedFlags = !!assessmentData.redFlags;
  const hasGoals = !!assessmentData.goals;

  const isComplete = hasUser && hasPainPoints && hasTiming;

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-text">Review Your Assessment</h3>
          <p className="mt-2 text-text-secondary">
            Please review your responses below. Make sure all information is accurate
            before submitting. You can go back to any step to make changes.
          </p>
        </CardContent>
      </Card>

      {/* Completeness Check */}
      {!isComplete && (
        <Card variant="outlined">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-warning" />
              <div>
                <p className="font-medium text-text">Incomplete Assessment</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Please complete the required sections before submitting.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-text-muted">Name</dt>
              <dd className="text-sm text-text">
                {assessmentData.user?.name || <em className="text-text-muted">Not provided</em>}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-text-muted">Email</dt>
              <dd className="text-sm text-text">
                {assessmentData.user?.email || <em className="text-text-muted">Not provided</em>}
              </dd>
            </div>
            {assessmentData.user?.phone && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-text-muted">Phone</dt>
                <dd className="text-sm text-text">{assessmentData.user.phone}</dd>
              </div>
            )}
            {assessmentData.user?.dateOfBirth && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-text-muted">Date of Birth</dt>
                <dd className="text-sm text-text">{assessmentData.user.dateOfBirth}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Pain Points */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pain Areas</CardTitle>
            <Badge variant={hasPainPoints ? 'success' : 'default'}>
              {assessmentData.points?.length || 0} point(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {hasPainPoints ? (
            <div className="space-y-4">
              {assessmentData.points?.map((point, index) => (
                <div key={point.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-text">
                        {point.regionName || `Pain Point ${index + 1}`}
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        Intensity: {point.intensityCurrent}/10
                      </p>
                      {point.qualities && point.qualities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {point.qualities.map((quality) => (
                            <Badge key={quality} variant="outline" size="sm">
                              {quality.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-text-muted">No pain points added</p>
          )}
        </CardContent>
      </Card>

      {/* Timing */}
      {hasTiming && assessmentData.timing && (
        <Card>
          <CardHeader>
            <CardTitle>Pain Timing</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-text-muted">Onset</dt>
                <dd className="text-sm text-text capitalize">
                  {assessmentData.timing.onset?.replace(/_/g, ' ')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-text-muted">Duration</dt>
                <dd className="text-sm text-text">
                  {assessmentData.timing.durationValue} {assessmentData.timing.durationUnit}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-text-muted">Pattern</dt>
                <dd className="text-sm text-text capitalize">
                  {assessmentData.timing.pattern}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Red Flags */}
      {hasRedFlags && assessmentData.redFlags && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Safety Screening</CardTitle>
              <Badge
                variant={assessmentData.redFlags.any ? 'danger' : 'success'}
              >
                {assessmentData.redFlags.any ? 'Flags Detected' : 'No Urgent Flags'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {assessmentData.redFlags.any ? (
              <div>
                <p className="text-sm text-text-secondary">
                  Your assessment identified {assessmentData.redFlags.reasons.length}{' '}
                  potential concern(s) that warrant medical attention.
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                No urgent warning signs detected in your responses.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Goals */}
      {hasGoals && (
        <Card>
          <CardHeader>
            <CardTitle>Treatment Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">
              {/* Display goals - adapt based on actual data structure */}
              {JSON.stringify(assessmentData.goals, null, 2)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-text">Ready to submit?</p>
              <p className="mt-1 text-sm text-text-muted">
                Your assessment will be reviewed by our healthcare team.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!isComplete || isSubmitting}
              isLoading={isSubmitting}
              rightIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              size="lg"
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card variant="outlined">
        <CardContent className="pt-6">
          <p className="text-xs text-text-muted">
            By submitting this assessment, you acknowledge that the information provided
            is accurate to the best of your knowledge. This assessment is for
            informational purposes and does not replace professional medical advice,
            diagnosis, or treatment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
