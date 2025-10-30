import React, { useEffect, useState } from 'react';
import { useWizard } from '../../WizardState';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { AlertCircle, FileText } from 'lucide-react';

export const WelcomeStep: React.FC = () => {
  const { assessmentData, updateData, errors, loadDraft, clearDraft } = useWizard();
  const [hasDraft, setHasDraft] = useState(false);

  // Check for existing draft on mount
  useEffect(() => {
    const draftKey = 'assessment:draft:v1';
    const existingDraft = localStorage.getItem(draftKey);
    setHasDraft(!!existingDraft);
  }, []);

  const handleLoadDraft = () => {
    loadDraft();
    setHasDraft(false);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-text">
            Welcome to the Pain Assessment Tool
          </h3>
          <p className="mt-2 text-text-secondary">
            This comprehensive assessment will help us understand your pain experience
            and create an effective treatment plan. The assessment takes approximately
            10-15 minutes to complete.
          </p>
          <div className="mt-4 space-y-2 text-sm text-text-muted">
            <p>• Your responses are automatically saved as you progress</p>
            <p>• All information is confidential and HIPAA-compliant</p>
            <p>• You can pause and resume at any time</p>
          </div>
        </CardContent>
      </Card>

      {/* Draft Resume Option */}
      {hasDraft && (
        <Card variant="outlined">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
              <div className="flex-1">
                <h4 className="font-medium text-text">Resume Previous Assessment</h4>
                <p className="mt-1 text-sm text-text-muted">
                  We found a saved assessment from a previous session. Would you like
                  to continue where you left off?
                </p>
                <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button variant="primary" onClick={handleLoadDraft} className="w-full sm:w-auto">
                    Resume Assessment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      clearDraft();
                      setHasDraft(false);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Start Fresh
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information Form */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-lg font-semibold text-text">
            Let's Start with Your Information
          </h3>

          <div className="space-y-4">
            {/* Name */}
            <Input
              label="Full Name"
              type="text"
              value={assessmentData.user?.name || ''}
              onChange={(e) =>
                updateData('user', {
                  ...assessmentData.user,
                  name: e.target.value,
                })
              }
              placeholder="Enter your full name"
              required
              error={errors.name?.[0]}
              helperText="Your full legal name as it appears on your ID"
            />

            {/* Email */}
            <Input
              label="Email Address"
              type="email"
              value={assessmentData.user?.email || ''}
              onChange={(e) =>
                updateData('user', {
                  ...assessmentData.user,
                  email: e.target.value,
                })
              }
              placeholder="your.email@example.com"
              required
              error={errors.email?.[0]}
              helperText="We'll send your assessment summary to this email"
            />

            {/* Phone (optional) */}
            <Input
              label="Phone Number (Optional)"
              type="tel"
              value={assessmentData.user?.phone || ''}
              onChange={(e) =>
                updateData('user', {
                  ...assessmentData.user,
                  phone: e.target.value,
                })
              }
              placeholder="(555) 123-4567"
              helperText="For appointment scheduling and follow-up"
            />

            {/* Date of Birth (optional) */}
            <Input
              label="Date of Birth (Optional)"
              type="date"
              value={assessmentData.user?.dateOfBirth || ''}
              onChange={(e) =>
                updateData('user', {
                  ...assessmentData.user,
                  dateOfBirth: e.target.value,
                })
              }
              helperText="Helps us provide age-appropriate care recommendations"
            />
          </div>

          {/* Privacy Notice */}
          <div className="mt-6 rounded-lg bg-surface-secondary p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-info" />
              <div className="text-sm text-text-secondary">
                <p className="font-medium text-text">Your Privacy is Protected</p>
                <p className="mt-1">
                  Your assessment data is encrypted and stored securely. We comply
                  with HIPAA regulations and will never share your information
                  without your explicit consent.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
