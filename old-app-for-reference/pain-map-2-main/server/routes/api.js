const express = require('express');
const router = express.Router();
const { Anthropic } = require('@anthropic-ai/sdk');
const Assessment = require('../models/Assessment');
const transporter = require('../config/nodemailer');
const { generateComprehensivePrompt } = require('../prompt-builder.js');
const path = require('path');
const fs = require('fs');

const claudeApiKey = process.env.CLAUDE_API_KEY;
const model = 'claude-3-5-sonnet-20240620';
let anthropic;
if (claudeApiKey) {
  anthropic = new Anthropic({ apiKey: claudeApiKey });
  console.log('✅ Anthropic SDK initialized');
}

router.post('/assessment/submit-stream', async (req, res) => {
  if (!anthropic) {
    return res.status(500).json({ error: 'AI client not initialized' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`);
  };

  try {
    const formData = req.body;
    const comprehensivePrompt = generateComprehensivePrompt(formData);
    
    let aiSummary = '';
    let systemRecommendation = 'LOW_URGENCY';

    console.log(`🔄 Starting AI streaming with model: ${model}`);
    const stream = await anthropic.messages.create({
      model: model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: comprehensivePrompt }],
      stream: true,
    });

    console.log('🔗 Stream created, starting iteration...');
    let eventCount = 0;
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const chunk = event.delta.text;
        aiSummary += chunk;
        sendEvent('delta', { text: chunk });
        eventCount++;
      }
    }
    console.log(`🏁 Stream iteration complete. Total events: ${eventCount}`);

    if (aiSummary.includes('HIGH_URGENCY')) {
      systemRecommendation = 'HIGH_URGENCY';
    } else if (aiSummary.includes('MODERATE_URGENCY')) {
      systemRecommendation = 'MODERATE_URGENCY';
    }

    const newAssessment = new Assessment({ ...formData, aiSummary, systemRecommendation });
    await newAssessment.save();
    
    console.log(`✅ AI streaming completed. Summary length: ${aiSummary.length} chars`);
    sendEvent('complete', {
      assessmentId: newAssessment._id,
      sessionId: formData.sessionId,
      aiSummary,
      systemRecommendation,
    });

  } catch (error) {
    console.error('Streaming submission error:', error);
    sendEvent('error', { message: 'Failed to process assessment.' });
  } finally {
    res.end();
  }
});

const baseAssessmentFilesDir = path.join(__dirname, '../public/uploads/assessment_files');

router.post('/generate-summary', async (req, res) => {
  if (!anthropic) {
    return res.status(500).json({ error: 'Claude API client not initialized on server. API key may be missing or invalid.' });
  }

  try {
    const formData = req.body;
    if (!formData) {
      return res.status(400).json({ error: 'No form data received.' });
    }

    const comprehensivePrompt = generateComprehensivePrompt(formData);
    const claudeResponse = await anthropic.messages.create({
      model: model,
      max_tokens: 1024,
      messages: [{ role: "user", content: comprehensivePrompt }],
    });
    
    let summary = "No summary content found from AI.";
    if (claudeResponse.content && claudeResponse.content.length > 0 && claudeResponse.content[0].type === 'text') {
        summary = claudeResponse.content[0].text;
    } else {
        console.warn("Unexpected Claude API response structure:", claudeResponse);
    }
    
    res.status(200).json({ summary: summary });
  } catch (error) {
    console.error('Error in /api/generate-summary endpoint:', error);
    let errorMessage = 'Failed to generate AI summary via backend.';
    if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
        errorMessage = error.response.data.error.message;
    } else if (error.message) {
        errorMessage = error.message;
    }
    res.status(500).json({ error: errorMessage });
  }
});

router.post('/assessment/submit', async (req, res) => {
  try {
    const formData = req.body;
    
    // Validation
    if (!formData.email || !formData.fullName) {
      return res.status(400).json({ error: 'Email and full name are required.' });
    }
    
    if (!formData.painAreas || formData.painAreas.length === 0) {
      return res.status(400).json({ error: 'At least one pain area is required.' });
    }
    
    if (!formData.redFlags) {
      return res.status(400).json({ error: 'Red flags section is required.' });
    }

    // Generate AI summary
    let aiSummary = '';
    let systemRecommendation = 'LOW_URGENCY';
    
    if (anthropic) {
      try {
        const comprehensivePrompt = generateComprehensivePrompt(formData);
        const claudeResponse = await anthropic.messages.create({
          model: model,
          max_tokens: 2000,
          messages: [{ role: "user", content: comprehensivePrompt }],
        });
        
        if (claudeResponse.content && claudeResponse.content.length > 0 && claudeResponse.content[0].type === 'text') {
          aiSummary = claudeResponse.content[0].text;
          
          // Extract urgency level from summary
          if (aiSummary.includes('HIGH_URGENCY')) {
            systemRecommendation = 'HIGH_URGENCY';
          } else if (aiSummary.includes('MODERATE_URGENCY')) {
            systemRecommendation = 'MODERATE_URGENCY';
          }
        }
      } catch (aiError) {
        console.error('AI summary generation error:', aiError);
        aiSummary = 'AI summary could not be generated at this time.';
      }
    }

    // Save to database
    const newAssessment = new Assessment({
      ...formData,
      aiSummary,
      systemRecommendation
    });
    await newAssessment.save();

    // Send emails
    if (transporter) {
      try {
        const serverBaseUrl = process.env.SERVER_BASE_URL;
        const primaryRecipient = process.env.EMAIL_RECIPIENT_ADDRESS;
        const subjectDate = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // Prepare attachments
        const attachments = [];
        if (formData.painMapImageFront) {
          const frontImagePath = path.join(baseAssessmentFilesDir, formData.painMapImageFront);
          if (fs.existsSync(frontImagePath)) {
            attachments.push({
              filename: 'painMapFront.png',
              path: frontImagePath,
              cid: 'painMapFront'
            });
          }
        }
        if (formData.painMapImageBack) {
          const backImagePath = path.join(baseAssessmentFilesDir, formData.painMapImageBack);
          if (fs.existsSync(backImagePath)) {
            attachments.push({
              filename: 'painMapBack.png',
              path: backImagePath,
              cid: 'painMapBack'
            });
          }
        }

        // Send to admin/doctor
        const adminHtmlContent = generateAssessmentEmailHTML({ formData, aiSummary, systemRecommendation }, serverBaseUrl, 'admin');
        await transporter.sendMail({
          from: `"Pain Assessment" <${process.env.EMAIL_SENDER_ADDRESS}>`,
          to: primaryRecipient,
          bcc: process.env.BCC_EMAIL_RECIPIENT_ADDRESS,
          subject: `Pain Assessment - ${formData.fullName} - ${subjectDate}`,
          html: adminHtmlContent,
          attachments: attachments
        });

        // Send to patient
        if (formData.email && formData.email !== primaryRecipient) {
          const patientHtmlContent = generateAssessmentEmailHTML({ formData, aiSummary, systemRecommendation }, serverBaseUrl, 'patient');
          await transporter.sendMail({
            from: `"Pain Assessment" <${process.env.EMAIL_SENDER_ADDRESS}>`,
            to: formData.email,
            subject: `Your Pain Assessment Summary - ${subjectDate}`,
            html: patientHtmlContent,
          });
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(201).json({ 
      message: 'Assessment submitted successfully',
      assessmentId: newAssessment._id,
      aiSummary,
      systemRecommendation
    });
  } catch (error) {
    console.error('Assessment submission error:', error);
    res.status(500).json({ error: 'Failed to submit assessment.' });
  }
});

router.post('/assessment', async (req, res) => {
  try {
    const newAssessment = new Assessment(req.body);
    await newAssessment.save();
    res.status(201).json({ message: 'Assessment saved successfully', assessmentId: newAssessment._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save assessment data.' });
  }
});

router.post('/email/send-assessment', async (req, res) => {
  if (!transporter) {
    return res.status(503).json({ error: 'Email service is not configured or unavailable.' });
  }

  try {
    const { formData, aiSummary } = req.body;
    if (!formData || !aiSummary) {
      return res.status(400).json({ error: 'Missing required data for email (formData or aiSummary).' });
    }
    
    const serverBaseUrl = process.env.SERVER_BASE_URL;
    const primaryRecipient = process.env.EMAIL_RECIPIENT_ADDRESS;
    if (!primaryRecipient) {
        console.error('CRITICAL: EMAIL_RECIPIENT_ADDRESS is not set in .env for the primary recipient.');
        return res.status(500).json({ error: 'Primary email recipient not configured on server.' });
    }

    const patientEmail = formData.demographics?.email;
    const subjectDate = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const attachments = [];
    if (formData.painMapImageFront) {
      const frontImagePath = path.join(baseAssessmentFilesDir, formData.painMapImageFront);
      if (fs.existsSync(frontImagePath)) {
        attachments.push({
          filename: 'painMapFront.png',
          path: frontImagePath,
          cid: 'painMapFront'
        });
      }
    }
    if (formData.painMapImageBack) {
      const backImagePath = path.join(baseAssessmentFilesDir, formData.painMapImageBack);
      if (fs.existsSync(backImagePath)) {
        attachments.push({
          filename: 'painMapBack.png',
          path: backImagePath,
          cid: 'painMapBack'
        });
      }
    }

    const adminHtmlContent = generateAssessmentEmailHTML({ ...req.body }, serverBaseUrl, 'admin');
    const adminMailOptions = {
      from: `"Spine IQ Assessment" <${process.env.EMAIL_SENDER_ADDRESS}>`,
      to: primaryRecipient,
      bcc: process.env.BCC_EMAIL_RECIPIENT_ADDRESS,
      subject: `Spine Assessment Summary - ${formData.demographics?.fullName || 'N/A'} - ${subjectDate}`,
      html: adminHtmlContent,
      attachments: attachments
    };
    await transporter.sendMail(adminMailOptions);

    if (patientEmail && typeof patientEmail === 'string' && patientEmail.trim() !== '' && patientEmail !== primaryRecipient) {
      const patientHtmlContent = generateAssessmentEmailHTML({ ...req.body }, serverBaseUrl, 'patient');
      const patientMailOptions = {
        from: `"Spine IQ Assessment" <${process.env.EMAIL_SENDER_ADDRESS}>`,
        to: patientEmail,
        subject: `Your Spine Assessment Summary - ${subjectDate}`,
        html: patientHtmlContent,
      };
      await transporter.sendMail(patientMailOptions);
    }

    res.status(200).json({ message: 'Assessment email(s) sent successfully.' });
  } catch (error) {
    console.error('Error sending assessment email:', error);
    res.status(500).json({ error: 'Failed to send assessment email.' });
  }
});

function generateAssessmentEmailHTML(data, serverBaseUrl, recipientType) {
  const { formData, aiSummary, systemRecommendation } = data;

  // Urgency badge color
  let urgencyColor = '#28a745'; // green for LOW
  if (systemRecommendation === 'HIGH_URGENCY') urgencyColor = '#dc3545'; // red
  else if (systemRecommendation === 'MODERATE_URGENCY') urgencyColor = '#ffc107'; // yellow

  let html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
          h2 { color: #34495e; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 25px; }
          .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; }
          .urgency-badge { display: inline-block; padding: 8px 16px; border-radius: 5px; color: white; font-weight: bold; background-color: ${urgencyColor}; }
          .field-label { font-weight: bold; color: #555; }
          .field-value { margin-left: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px;}
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left;}
          th { background-color: #f0f0f0; }
          .red-flag-yes { color: #dc3545; font-weight: bold; }
          .red-flag-no { color: #6c757d; }
        </style>
      </head>
      <body>
        <h1>Pain Assessment Report</h1>
        <p><strong>Patient:</strong> ${formData.fullName}<br>
        <strong>Email:</strong> ${formData.email}<br>
        <strong>Date:</strong> ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        
        ${systemRecommendation ? `<p><strong>Urgency Level:</strong> <span class="urgency-badge">${systemRecommendation.replace('_', ' ')}</span></p>` : ''}
  `;

  // Show AI summary first for patient emails
  if (recipientType === 'patient' && aiSummary) {
    html += `
      <div class="section">
        <h2>Assessment Summary</h2>
        <p>${aiSummary.replace(/\n/g, '<br>')}</p>
      </div>
    `;
  }

  // Pain Areas
  if (formData.painAreas && formData.painAreas.length > 0) {
    html += `
      <div class="section">
        <h2>Pain Areas</h2>
        <table>
          <thead><tr><th>Region</th><th>Intensity (1-10)</th><th>Notes</th></tr></thead>
          <tbody>
            ${formData.painAreas.map(area => `
              <tr>
                <td>${area.region || 'N/A'}</td>
                <td><strong>${area.intensity || 'N/A'}</strong></td>
                <td>${area.notes || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Red Flags
  if (formData.redFlags) {
    const redFlagLabels = {
      bowelBladderDysfunction: 'Bowel/Bladder Dysfunction',
      progressiveWeakness: 'Progressive Weakness',
      saddleAnesthesia: 'Saddle Anesthesia',
      unexplainedWeightLoss: 'Unexplained Weight Loss',
      feverChills: 'Fever/Chills',
      nightPain: 'Severe Night Pain',
      cancerHistory: 'History of Cancer',
      recentTrauma: 'Recent Trauma/Injury'
    };

    html += `
      <div class="section">
        <h2>Red Flag Symptoms</h2>
        <table>
          <thead><tr><th>Symptom</th><th>Present</th></tr></thead>
          <tbody>
    `;

    Object.entries(redFlagLabels).forEach(([key, label]) => {
      const isPresent = formData.redFlags[key];
      html += `
        <tr>
          <td>${label}</td>
          <td class="${isPresent ? 'red-flag-yes' : 'red-flag-no'}">${isPresent ? 'YES' : 'No'}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
    `;

    if (formData.redFlags.notes) {
      html += `<p><strong>Additional Notes:</strong> ${formData.redFlags.notes.replace(/\n/g, '<br>')}</p>`;
    }

    html += `</div>`;
  }

  // Treatment Goals
  if (formData.treatmentGoals) {
    html += `
      <div class="section">
        <h2>Treatment Goals</h2>
        <p>${formData.treatmentGoals.replace(/\n/g, '<br>')}</p>
      </div>
    `;
  }

  // Pain Map Images (admin only)
  if (recipientType === 'admin' && (formData.painMapImageFront || formData.painMapImageBack)) {
    html += `<div class="section"><h2>Pain Map Images</h2>`;
    if (formData.painMapImageFront) {
      html += `<h3>Front View</h3><img src="cid:painMapFront" alt="Pain Map Front" style="max-width: 100%; height: auto; border: 1px solid #ddd;" />`;
    }
    if (formData.painMapImageBack) {
      html += `<h3>Back View</h3><img src="cid:painMapBack" alt="Pain Map Back" style="max-width: 100%; height: auto; border: 1px solid #ddd;" />`;
    }
    html += `</div>`;
  }

  // AI Summary for admin (at the bottom)
  if (recipientType === 'admin' && aiSummary) {
    html += `
      <div class="section">
        <h2>AI-Generated Clinical Summary</h2>
        <p>${aiSummary.replace(/\n/g, '<br>')}</p>
      </div>
    `;
  }

  html += `
      </body>
    </html>
  `;
  return html;
}

module.exports = router;
