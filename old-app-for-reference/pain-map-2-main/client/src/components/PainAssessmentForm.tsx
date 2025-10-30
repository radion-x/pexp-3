import React, { useState } from 'react';
import { useFormContext } from '../context/FormContext';
import PainMappingStep from './steps/PainMappingStep';
import { useTheme } from '../context/ThemeContext';

const PainAssessmentForm: React.FC = () => {
  const {
    formData,
    updateFormData,
    isFormValid,
    isSubmitting,
    setIsSubmitting,
    aiSummary,
    setAiSummary,
    isSubmissionSuccessful,
    setIsSubmissionSuccessful,
  } = useFormContext();
  const { theme } = useTheme();
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const serverBaseUrl = (import.meta.env.VITE_SERVER_BASE_URL || '').replace(/\/$/, '');
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ email: e.target.value });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ fullName: e.target.value });
  };

  type SimplifiedRedFlagsPayload = {
    bowelBladderDysfunction: boolean;
    progressiveWeakness: boolean;
    saddleAnesthesia: boolean;
    unexplainedWeightLoss: boolean;
    feverChills: boolean;
    nightPain: boolean;
    cancerHistory: boolean;
    recentTrauma: boolean;
    notes: string;
  };

  const formatSelectedAreas = (areas?: Record<string, { selected: boolean }>, labelMap?: Record<string, string>) => {
    if (!areas) return '';
    const labels = Object.entries(areas)
      .filter(([, detail]) => detail?.selected)
      .map(([key]) => (labelMap && labelMap[key]) || key);
    return labels.join(', ');
  };

  const compileRedFlagNotes = (): { notes: string; summaryFlags: SimplifiedRedFlagsPayload } => {
    const labelMap = {
      Arms: 'Arms',
      Legs: 'Legs',
      Hands: 'Hands',
      Feet: 'Feet',
      'Trunk/Core': 'Trunk/Core',
      OtherMuscleArea: 'Other area',
      Face: 'Face',
      'Trunk/Body': 'Trunk/Body',
      OtherNumbnessArea: 'Other area',
    } as Record<string, string>;

    const notes: string[] = [];
    const simplified: SimplifiedRedFlagsPayload = {
      bowelBladderDysfunction: !!formData.redFlags.bladderOrBowelIncontinence?.present,
      progressiveWeakness: !!formData.redFlags.muscleWeakness?.present,
      saddleAnesthesia: !!formData.redFlags.saddleAnaesthesia?.present,
      unexplainedWeightLoss: !!formData.redFlags.unexplainedWeightLoss?.present,
      feverChills: false,
      nightPain: false,
      cancerHistory: false,
      recentTrauma: false,
      notes: '',
    };

    if (formData.redFlags.muscleWeakness?.present) {
      const areas = formatSelectedAreas(formData.redFlags.muscleWeakness.areas, labelMap);
      notes.push(`Muscle weakness reported${areas ? ` in ${areas}` : ''}`);
    }

    if (formData.redFlags.numbnessOrTingling?.present) {
      const areas = formatSelectedAreas(formData.redFlags.numbnessOrTingling.areas, labelMap);
      notes.push(`Numbness/tingling reported${areas ? ` in ${areas}` : ''}`);
    }

    if (formData.redFlags.unexplainedWeightLoss?.present) {
      const details: string[] = [];
      if (formData.redFlags.unexplainedWeightLoss.amountKg !== undefined) {
        details.push(`${formData.redFlags.unexplainedWeightLoss.amountKg}kg loss`);
      }
      if (formData.redFlags.unexplainedWeightLoss.period) {
        details.push(`over ${formData.redFlags.unexplainedWeightLoss.period}`);
      }
      notes.push(`Unexplained weight loss${details.length ? ` (${details.join(', ')})` : ''}`);
    }

    if (formData.redFlags.bladderOrBowelIncontinence?.present) {
      const details: string[] = [];
      if (formData.redFlags.bladderOrBowelIncontinence.details) {
        details.push(formData.redFlags.bladderOrBowelIncontinence.details);
      }
      if (formData.redFlags.bladderOrBowelIncontinence.isNewOnset) {
        details.push('new onset');
      }
      notes.push(`Bowel/bladder incontinence${details.length ? ` (${details.join(', ')})` : ''}`);
    }

    if (formData.redFlags.saddleAnaesthesia?.present) {
      notes.push(
        `Saddle anesthesia${formData.redFlags.saddleAnaesthesia.details ? ` (${formData.redFlags.saddleAnaesthesia.details})` : ''}`
      );
    }

    if (formData.redFlags.balanceProblems?.present) {
      notes.push(
        `Balance problems${formData.redFlags.balanceProblems.type ? ` (${formData.redFlags.balanceProblems.type})` : ''}`
      );
    }

    if (formData.redFlags.otherRedFlagPresent && formData.redFlags.otherRedFlag?.trim()) {
      notes.push(`Other concerns: ${formData.redFlags.otherRedFlag.trim()}`);
    }

    simplified.notes = notes.join(' | ');
    return { notes: simplified.notes, summaryFlags: simplified };
  };

  const buildSubmissionPayload = () => {
    const { notes, summaryFlags } = compileRedFlagNotes();
    if (!summaryFlags.notes && notes) {
      summaryFlags.notes = notes;
    }

    const sessionId = formData.sessionId || formData.formSessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return {
      sessionId,
      formSessionId: formData.formSessionId || sessionId,
      email: formData.email,
      fullName: formData.fullName,
      painAreas: formData.painAreas,
      redFlags: summaryFlags,
      treatmentGoals: formData.treatmentGoals,
      painMapImageFront: formData.painMapImageFront,
      painMapImageBack: formData.painMapImageBack,
      redFlagsDetailed: formData.redFlags,
    };
  };

  const submitViaStreaming = async (payload: ReturnType<typeof buildSubmissionPayload>) => {
    const streamUrl = `${serverBaseUrl || ''}/api/assessment/submit-stream`;

    try {
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        mode: serverBaseUrl ? 'cors' : 'same-origin',
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        console.warn('Streaming request failed', response.status, response.statusText);
        return false;
      }

      setShowResults(true);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completedPayload: { aiSummary?: string; systemRecommendation?: string; assessmentId?: string; sessionId?: string } | null = null;

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const segments = buffer.split('\n\n');
          buffer = segments.pop() ?? '';

          for (const segment of segments) {
            const trimmed = segment.trim();
            if (!trimmed.startsWith('data:')) {
              continue;
            }

            const payloadText = trimmed.slice(5).trim();
            if (!payloadText) {
              continue;
            }

            let eventPayload: { event: string; text?: string; message?: string; aiSummary?: string; systemRecommendation?: string; assessmentId?: string; sessionId?: string };
            try {
              eventPayload = JSON.parse(payloadText);
            } catch (parseError) {
              console.warn('Failed to parse SSE payload', parseError, payloadText);
              continue;
            }

            switch (eventPayload.event) {
              case 'delta': {
                const chunk: string = eventPayload.text ?? '';
                if (chunk) {
                  setAiSummary(prev => (prev ?? '') + chunk);
                }
                break;
              }
              case 'status':
                break;
              case 'complete': {
                completedPayload = eventPayload;
                break;
              }
              case 'error': {
                throw new Error(eventPayload.message || 'Assessment submission failed.');
              }
              default:
                break;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (!completedPayload) {
        return false;
      }

      const finalSummary = completedPayload.aiSummary || '';
      setAiSummary(finalSummary);
      updateFormData({
        sessionId: completedPayload.sessionId || payload.sessionId,
        formSessionId: completedPayload.sessionId || payload.formSessionId || payload.sessionId,
        systemRecommendation: completedPayload.systemRecommendation || formData.systemRecommendation,
        aiSummary: finalSummary,
      });
      setIsSubmissionSuccessful(true);
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return true;
    } catch (error) {
      console.error('Streaming submission error:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    if (!isFormValid()) {
      setErrorMessage('Please fill in all required fields: email, name, and mark at least one pain area.');
      return;
    }

    setIsSubmissionSuccessful(false);
    setShowResults(true);
    setAiSummary('');
    setIsSubmitting(true);

    try {
      console.log('Submitting assessment...');
      const submissionPayload = buildSubmissionPayload();
      const streamingSucceeded = await submitViaStreaming(submissionPayload);

      if (!streamingSucceeded) {
        throw new Error('Streaming submission failed and no fallback is available.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      const message = error instanceof Error ? error.message : 'Failed to submit assessment. Please try again.';
      setErrorMessage(message);
      setShowResults(false);
      setIsSubmissionSuccessful(false);
      setAiSummary(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-4xl mx-auto p-6 py-12">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Pain Assessment
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Help us understand your pain by marking affected areas and answering important health questions
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Section 1: Basic Information */}
          <section id="basic-info" className={`p-6 rounded-lg shadow-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-2xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Your Information
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className={`block mb-2 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  required
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label htmlFor="fullName" className={`block mb-2 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={formData.fullName}
                  onChange={handleNameChange}
                  required
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="John Smith"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Pain Mapping (Reuse existing component) */}
          <section id="pain-mapping" className={`p-6 rounded-lg shadow-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-2xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Pain Mapping, Red Flags & Goals <span className="text-red-500">*</span>
            </h2>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Click on the body diagrams below to mark where you experience pain, then complete the red flag questions and treatment goals within the panel.
            </p>
            <PainMappingStep />
          </section>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
              {errorMessage}
            </div>
          )}

          {/* Submit Section */}
          <section id="submit" className="flex justify-center">
            <button
              type="submit"
              disabled={!isFormValid() || isSubmitting}
              className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all ${
                !isFormValid() || isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed text-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </section>

          {/* Results Section (streaming display) */}
          {showResults && (
            <section
              id="results"
              className={`p-8 rounded-lg shadow-lg ${
                isDark ? 'bg-gray-800 border-2 border-blue-500/60' : 'bg-blue-50 border-2 border-blue-200'
              }`}
            >
              <div className="text-center mb-6">
                {isSubmissionSuccessful ? (
                  <>
                    <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className={`text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                      Assessment Submitted Successfully
                    </h2>
                    <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      A confirmation email has been sent to <strong>{formData.email}</strong>
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center mb-4">
                      <svg className="w-12 h-12 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                    </div>
                    <h2 className={`text-2xl font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      Generating AI Summary...
                    </h2>
                    <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      You can watch the summary appear below as the AI processes your assessment.
                    </p>
                  </>
                )}
              </div>

              <div className={`mt-6 p-6 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                <h3 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  AI-Generated Summary
                </h3>
                <p className={`whitespace-pre-wrap leading-relaxed ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                  {aiSummary || 'Waiting for response...'}
                </p>
              </div>
            </section>
          )}
        </form>
      </div>
    </div>
  );
};

export default PainAssessmentForm;
