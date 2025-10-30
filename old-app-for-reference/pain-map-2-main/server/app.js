const express = require('express');
const cors = require('cors');
const { Anthropic } = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const http = require('http');
const https = require('https');
const { generateComprehensivePrompt } = require('./prompt-builder.js');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const app = express();

// --- DIRECTORY SETUP ---
const baseUploadsDir = path.join(__dirname, 'public/uploads');
const baseAssessmentFilesDir = path.join(baseUploadsDir, 'assessment_files');
const tempUploadDir = path.join(baseUploadsDir, 'temp'); // Temporary directory for initial uploads

const defaultClientOrigin = process.env.CLIENT_BASE_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:5173';

const deriveSystemRecommendation = (summaryText) => {
  if (!summaryText || typeof summaryText !== 'string') {
    return 'LOW_URGENCY';
  }
  if (summaryText.includes('HIGH_URGENCY')) {
    return 'HIGH_URGENCY';
  }
  if (summaryText.includes('MODERATE_URGENCY')) {
    return 'MODERATE_URGENCY';
  }
  return 'LOW_URGENCY';
};

const normalizeAssessmentInput = (formData = {}) => {
  if (!formData.email || !formData.fullName) {
    throw new Error('Email and full name are required.');
  }

  if (!Array.isArray(formData.painAreas) || formData.painAreas.length === 0) {
    throw new Error('At least one pain area is required.');
  }

  if (!formData.redFlags) {
    throw new Error('Red flags section is required.');
  }

  const generatedSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const sessionId = formData.sessionId || formData.formSessionId || generatedSessionId;
  const formSessionId = formData.formSessionId || sessionId;

  const normalizedRedFlags = {
    bowelBladderDysfunction: !!formData.redFlags?.bowelBladderDysfunction,
    progressiveWeakness: !!formData.redFlags?.progressiveWeakness,
    saddleAnesthesia: !!formData.redFlags?.saddleAnesthesia,
    unexplainedWeightLoss: !!formData.redFlags?.unexplainedWeightLoss,
    feverChills: !!formData.redFlags?.feverChills,
    nightPain: !!formData.redFlags?.nightPain,
    cancerHistory: !!formData.redFlags?.cancerHistory,
    recentTrauma: !!formData.redFlags?.recentTrauma,
    notes: typeof formData.redFlags?.notes === 'string' ? formData.redFlags.notes : '',
  };

  const enrichedFormData = {
    ...formData,
    sessionId,
    formSessionId,
    redFlags: normalizedRedFlags,
    redFlagsDetailed: formData.redFlagsDetailed,
  };

  return { enrichedFormData, sessionId };
};

const persistAssessment = async (enrichedFormData, aiSummaryText, systemRecommendation) => {
  const {
    redFlagsDetailed: _omitRedFlagsDetailed,
    formSessionId: _omitFormSessionId,
    aiSummary: _omitAiSummary,
    systemRecommendation: _omitSystemRecommendation,
    ...assessmentPayload
  } = enrichedFormData;

  const newAssessment = new Assessment({
    ...assessmentPayload,
    aiSummary: aiSummaryText,
    systemRecommendation,
  });

  await newAssessment.save();

  if (transporter) {
    (async () => {
      try {
        const serverBaseUrl = process.env.SERVER_BASE_URL;
        const primaryRecipient = process.env.EMAIL_RECIPIENT_ADDRESS;
        const subjectDate = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const attachments = [];
        if (enrichedFormData.painMapImageFront) {
          const frontImagePath = path.join(baseAssessmentFilesDir, enrichedFormData.painMapImageFront);
          if (fs.existsSync(frontImagePath)) {
            attachments.push({
              filename: 'painMapFront.png',
              path: frontImagePath,
              cid: 'painMapFront',
            });
          }
        }
        if (enrichedFormData.painMapImageBack) {
          const backImagePath = path.join(baseAssessmentFilesDir, enrichedFormData.painMapImageBack);
          if (fs.existsSync(backImagePath)) {
            attachments.push({
              filename: 'painMapBack.png',
              path: backImagePath,
              cid: 'painMapBack',
            });
          }
        }

        if (primaryRecipient) {
          const adminHtmlContent = generateSimplifiedAssessmentEmailHTML(
            { formData: enrichedFormData, aiSummary: aiSummaryText, systemRecommendation },
            serverBaseUrl,
            'admin'
          );
          await transporter.sendMail({
            from: `"Pain Assessment" <${process.env.EMAIL_SENDER_ADDRESS}>`,
            to: primaryRecipient,
            bcc: process.env.BCC_EMAIL_RECIPIENT_ADDRESS,
            subject: `Pain Assessment - ${enrichedFormData.fullName} - ${subjectDate}`,
            html: adminHtmlContent,
            attachments,
          });
        }

        if (enrichedFormData.email && (!primaryRecipient || enrichedFormData.email !== primaryRecipient)) {
          const patientHtmlContent = generateSimplifiedAssessmentEmailHTML(
            { formData: enrichedFormData, aiSummary: aiSummaryText, systemRecommendation },
            serverBaseUrl,
            'patient'
          );
          await transporter.sendMail({
            from: `"Pain Assessment" <${process.env.EMAIL_SENDER_ADDRESS}>`,
            to: enrichedFormData.email,
            subject: `Your Pain Assessment Summary - ${subjectDate}`,
            html: patientHtmlContent,
          });
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    })();
  }

  return { assessmentId: newAssessment._id };
};

// Ensure all necessary directories exist
[baseUploadsDir, baseAssessmentFilesDir, tempUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const port = process.env.SERVER_PORT || 3001;

// --- DATABASE & MIDDLEWARE ---
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("CRITICAL: MONGODB_URI environment variable not set.");
} else {
  mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key_please_change',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// --- STATIC FILE SERVING ---
// Serve files from the session-specific directories
app.use('/uploads/assessment_files', express.static(baseAssessmentFilesDir));


// --- API CLIENTS ---
const claudeApiKey = process.env.CLAUDE_API_KEY;
let anthropic;
if (claudeApiKey) {
  anthropic = new Anthropic({ apiKey: claudeApiKey });
  console.log('✅ Anthropic SDK initialized');
} else {
  console.error("CRITICAL: CLAUDE_API_KEY environment variable not set.");
}
const claudeDefaultModel = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620';
const claudeSummaryModel = process.env.CLAUDE_SUMMARY_MODEL || claudeDefaultModel;

// Log which model we're using
console.log(`🤖 AI Model: ${claudeDefaultModel}`);

// --- MONGOOSE SCHEMAS & MODELS ---
// Import the Assessment model from the models directory (includes spinalRegions field)
const Assessment = require('./models/Assessment');

// --- AUTHENTICATION ---
const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) return next();
  res.status(401).json({ error: 'Unauthorized. Please log in.' });
};
app.post('/api/doctor/login', (req, res) => {
  if (req.body.password === process.env.DASHBOARD_PASSWORD) {
    req.session.isAuthenticated = true;
    res.status(200).json({ message: 'Login successful.' });
  } else {
    res.status(401).json({ error: 'Invalid password.' });
  }
});
app.get('/api/doctor/check-auth', (req, res) => {
  res.status(200).json({ isAuthenticated: !!(req.session && req.session.isAuthenticated) });
});
app.post('/api/doctor/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) return res.status(500).json({ error: 'Could not log out.' });
      res.clearCookie('connect.sid').status(200).json({ message: 'Logout successful.' });
    });
  } else {
    res.status(200).json({ message: 'No active session.' });
  }
});

// --- CORE API ENDPOINTS ---
app.get('/api/doctor/patients', ensureAuthenticated, async (req, res) => {
  try {
    const assessments = await Assessment.find({}, 'demographics.fullName demographics.email').lean();
    const patientsMap = new Map();
    assessments.forEach(a => {
      if (a.demographics && a.demographics.email && !patientsMap.has(a.demographics.email)) {
        patientsMap.set(a.demographics.email, { id: a.demographics.email, name: a.demographics.fullName });
      }
    });
    res.status(200).json(Array.from(patientsMap.values()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve patient list.' });
  }
});
app.get('/api/doctor/patient/:email/assessments', ensureAuthenticated, async (req, res) => {
  try {
    const assessments = await Assessment.find({ 'demographics.email': req.params.email }).sort({ createdAt: -1 });
    res.status(200).json(assessments || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve assessments.' });
  }
});
app.post('/api/assessment', async (req, res) => {
  try {
    // DEBUGGING: Log what we receive from frontend
    console.log("==========================================");
    console.log("===== BACKEND ASSESSMENT SUBMISSION =====");
    console.log("==========================================");
    console.log("Received imaging data:");
    if (req.body.imaging) {
      req.body.imaging.forEach((img, idx) => {
        console.log(`Backend ${idx}. ${img.type}:`);
        console.log(`  hadStudy: ${img.hadStudy}`);
        console.log(`  spinalRegions: ${JSON.stringify(img.spinalRegions)}`);
        console.log(`  spinalRegions type: ${typeof img.spinalRegions}`);
        console.log(`  hasOwnProperty spinalRegions: ${img.hasOwnProperty('spinalRegions')}`);
      });
    }
    
    const newAssessment = new Assessment(req.body);
    
    // DEBUGGING: Log what Mongoose created
    console.log("After creating Assessment instance:");
    if (newAssessment.imaging) {
      newAssessment.imaging.forEach((img, idx) => {
        console.log(`Mongoose ${idx}. ${img.type}:`);
        console.log(`  hadStudy: ${img.hadStudy}`);
        console.log(`  spinalRegions: ${JSON.stringify(img.spinalRegions)}`);
        console.log(`  spinalRegions type: ${typeof img.spinalRegions}`);
      });
    }
    
    await newAssessment.save();
    
    // DEBUGGING: Log what was actually saved
    const savedAssessment = await Assessment.findById(newAssessment._id);
    console.log("After saving to database:");
    if (savedAssessment.imaging) {
      savedAssessment.imaging.forEach((img, idx) => {
        console.log(`Saved ${idx}. ${img.type}:`);
        console.log(`  hadStudy: ${img.hadStudy}`);
        console.log(`  spinalRegions: ${JSON.stringify(img.spinalRegions)}`);
        console.log(`  spinalRegions type: ${typeof img.spinalRegions}`);
      });
    }
    console.log("==========================================");
    
    res.status(201).json({ message: 'Assessment saved successfully', assessmentId: newAssessment._id });
  } catch (error) {
    console.error('Assessment save error:', error);
    res.status(500).json({ error: 'Failed to save assessment data.' });
  }
});

app.delete('/api/doctor/assessment/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Assessment.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }
    res.status(200).json({ message: 'Assessment deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete assessment.' });
  }
});

app.delete('/api/doctor/user/:email', ensureAuthenticated, async (req, res) => {
  try {
    const { email } = req.params;
    const result = await Assessment.deleteMany({ 'demographics.email': email });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'No assessments found for this user.' });
    }
    res.status(200).json({ message: `${result.deletedCount} assessments for user ${email} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user assessments.' });
  }
});

// --- FILE UPLOAD LOGIC (REVISED) ---
const tempStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadDir); // Always upload to the temporary directory first
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  }
});
const upload = multer({ storage: tempStorage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/upload/imaging-file', upload.single('imagingFile'), (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const formSessionId = req.query.formSessionId || 'default_session';
  const sanitizedSessionId = formSessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  
  const finalSessionDir = path.join(baseAssessmentFilesDir, sanitizedSessionId);
  if (!fs.existsSync(finalSessionDir)) {
    fs.mkdirSync(finalSessionDir, { recursive: true });
  }

  const tempPath = req.file.path;
  const finalPath = path.join(finalSessionDir, req.file.filename);
  
  // Move the file from temp to the final session directory
  fs.rename(tempPath, finalPath, (err) => {
    if (err) {
      console.error('Error moving file:', err);
      // Try to clean up the temp file
      try {
        fs.unlinkSync(tempPath);
      } catch (unlinkErr) {
        console.error('Error cleaning up temp file:', unlinkErr);
      }
      return res.status(500).json({ error: 'Failed to process file upload.' });
    }

    // The relative path for the URL should be based on the final location
    let relativeFilePath = path.join(sanitizedSessionId, req.file.filename);
    if (path.sep === '\\') {
      relativeFilePath = relativeFilePath.replace(/\\/g, '/');
    }

    res.status(200).json({
      message: 'File uploaded successfully',
      filePath: relativeFilePath
    });
  });
});

app.post('/api/upload/pain-map', async (req, res) => {
  const { imageData, view, formSessionId } = req.body;

  if (!imageData || !view || !formSessionId) {
    return res.status(400).json({ error: 'Missing required data for pain map upload.' });
  }

  try {
    const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
    const sanitizedSessionId = formSessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    const finalSessionDir = path.join(baseAssessmentFilesDir, sanitizedSessionId);

    if (!fs.existsSync(finalSessionDir)) {
      fs.mkdirSync(finalSessionDir, { recursive: true });
    }

    const filename = `pain-map-${view}-${Date.now()}.png`;
    const finalPath = path.join(finalSessionDir, filename);
    
    fs.writeFileSync(finalPath, base64Data, 'base64');

    let relativeFilePath = path.join(sanitizedSessionId, filename);
    if (path.sep === '\\') {
      relativeFilePath = relativeFilePath.replace(/\\/g, '/');
    }

    res.status(200).json({
      message: 'Pain map uploaded successfully',
      filePath: relativeFilePath
    });
  } catch (error) {
    console.error('Error saving pain map image:', error);
    res.status(500).json({ error: 'Failed to save pain map image.' });
  }
});

// Referral document upload endpoint
app.post('/api/upload/referral', upload.single('referralFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const formSessionId = req.query.formSessionId || 'default_session';
    const sanitizedSessionId = formSessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    
    const finalSessionDir = path.join(baseAssessmentFilesDir, sanitizedSessionId);
    if (!fs.existsSync(finalSessionDir)) {
      fs.mkdirSync(finalSessionDir, { recursive: true });
    }

    const tempPath = req.file.path;
    const finalPath = path.join(finalSessionDir, req.file.filename);
    
    fs.rename(tempPath, finalPath, (err) => {
      if (err) {
        console.error('Error moving referral file:', err);
        try {
          fs.unlinkSync(tempPath);
        } catch (unlinkErr) {
          console.error('Error cleaning up temp referral file:', unlinkErr);
        }
        return res.status(500).json({ error: 'Failed to process referral file upload.' });
      }

      let relativeFilePath = path.join(sanitizedSessionId, req.file.filename);
      if (path.sep === '\\') {
        relativeFilePath = relativeFilePath.replace(/\\/g, '/');
      }

      const referralDocument = {
        id: req.file.filename.split('.')[0],
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `${process.env.SERVER_BASE_URL}/uploads/assessment_files/${relativeFilePath}`,
        uploadDate: new Date()
      };

      res.status(200).json({
        message: 'Referral document uploaded successfully',
        referralDocument: referralDocument
      });
    });
  } catch (error) {
    console.error('Error in referral upload:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

app.options('/api/assessment/submit-stream', (req, res) => {
  const requestOrigin = req.headers.origin || defaultClientOrigin;
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Vary', 'Origin');
  res.status(204).end();
});

app.post('/api/assessment/submit-stream', async (req, res) => {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  const requestOrigin = req.headers.origin || defaultClientOrigin;
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Vary', 'Origin');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
  
  // Send an initial message to establish the connection
  res.write(': connected\n\n');

  const sendEvent = (event, payload) => {
    if (res.writableEnded) return;
    try {
      res.write(`data: ${JSON.stringify({ event, ...payload })}\n\n`);
      if (typeof res.flush === 'function') {
        res.flush();
      }
    } catch (writeError) {
      console.error('Stream write error:', writeError);
    }
  };

  const endWithError = (message) => {
    sendEvent('error', { message });
    if (!res.writableEnded) {
      res.end();
    }
  };

  let clientAborted = false;
  const handleClientDisconnect = (source) => {
    if (clientAborted || res.writableEnded) {
      return;
    }
    clientAborted = true;
    console.log(`🔌 Client disconnected (${source})`);
  };

  const onRequestAborted = () => handleClientDisconnect('request aborted');
  const onResponseClose = () => handleClientDisconnect('response closed before finish');

  req.on('aborted', onRequestAborted);
  res.on('close', onResponseClose);
  res.on('finish', () => {
    if (typeof req.off === 'function') {
      req.off('aborted', onRequestAborted);
    } else {
      req.removeListener('aborted', onRequestAborted);
    }
    if (typeof res.off === 'function') {
      res.off('close', onResponseClose);
    } else {
      res.removeListener('close', onResponseClose);
    }
  });

  try {
    const { enrichedFormData, sessionId } = normalizeAssessmentInput(req.body || {});
    sendEvent('status', { message: 'Generating AI summary...' });

    let aiSummaryText = '';

    if (!anthropic) {
      console.error('⚠️  Anthropic client not initialized - check CLAUDE_API_KEY');
      aiSummaryText = 'AI service unavailable. Please contact support.';
      sendEvent('delta', { text: aiSummaryText });
    } else {
      const prompt = generateComprehensivePrompt(enrichedFormData);
      console.log(`🔄 Starting AI streaming with model: ${claudeDefaultModel}`);
      console.log(`📋 Prompt length: ${prompt.length} characters`);
      console.log(`📋 Prompt preview (first 300 chars): ${prompt.substring(0, 300)}...`);
      console.log(`📋 Prompt preview (last 200 chars): ...${prompt.substring(prompt.length - 200)}`);
      
      // Warn if prompt is very long
      if (prompt.length > 15000) {
        console.warn(`⚠️  Warning: Prompt is ${prompt.length} characters - this may be too long`);
      }
      
      try {
        // Set a timeout for the streaming operation
        const streamTimeout = setTimeout(() => {
          console.error('⏱️  Stream timeout after 90 seconds');
          if (!clientAborted && !aiSummaryText) {
            sendEvent('error', { message: 'AI response timeout. Please try again.' });
          }
        }, 90000); // 90 second timeout

        console.log('📡 Creating stream...');
        // Debug: Log ALL stream events to see what's happening
        const stream = anthropic.messages
          .stream({
            model: claudeDefaultModel,
            max_tokens: 3000, // Increased token limit
            messages: [{ role: 'user', content: prompt }],
          })
          .on('connect', () => {
            console.log('🔗 Stream connected');
            sendEvent('status', { message: 'Connected to AI...' });
          })
          .on('streamEvent', (event) => {
            console.log(`📡 Stream event type: ${event.type}`);
          })
          .on('text', (text) => {
            console.log(`📝 TEXT EVENT - Received ${text.length} chars: "${text.substring(0, 50)}..."`);
            
            aiSummaryText += text;
            console.log(`📊 Current total accumulated: ${aiSummaryText.length} chars`);
            sendEvent('delta', { text });
          })
          .on('message', (message) => {
            console.log('💬 Message event received');
          })
          .on('contentBlock', (block) => {
            console.log('📦 Content block event received');
          })
          .on('error', (error) => {
            console.error('❌ Stream error event:', error);
            clearTimeout(streamTimeout);
          })
          .on('end', () => {
            console.log('🏁 Stream end event');
            clearTimeout(streamTimeout);
          });

        // Wait for the stream to complete
        const finalMessage = await stream.finalMessage();
        clearTimeout(streamTimeout);
        console.log(`✅ AI streaming finished. Total text: ${aiSummaryText.length} chars`);
      } catch (streamError) {
        console.error('❌ AI streaming error:', streamError);
        if (streamError.message) {
          console.error('Error message:', streamError.message);
        }
        if (streamError.error) {
          console.error('Error details:', streamError.error);
        }
      }

      if (!aiSummaryText && !clientAborted) {
        console.log('⚠️  Streaming produced no text, trying fallback request...');
        try {
          const fallbackResponse = await anthropic.messages.create({
            model: claudeDefaultModel,
            max_tokens: 3000, // Match streaming token limit
            messages: [{ role: 'user', content: prompt }],
          });
          console.log('🧾 Fallback response received');
          if (fallbackResponse.content && fallbackResponse.content.length > 0 && fallbackResponse.content[0].type === 'text') {
            aiSummaryText = fallbackResponse.content[0].text;
            console.log(`✅ Fallback succeeded. Summary length: ${aiSummaryText.length} chars`);
            // Send the text through delta events
            sendEvent('delta', { text: aiSummaryText });
          }
        } catch (fallbackError) {
          console.error('❌ AI summary fallback error:', fallbackError);
          console.error('Fallback error details:', {
            type: fallbackError.error?.type,
            message: fallbackError.error?.message || fallbackError.message,
            model: claudeDefaultModel
          });
        }
      }
    }

    if (!aiSummaryText) {
      aiSummaryText = 'AI summary could not be generated at this time.';
      sendEvent('delta', { text: aiSummaryText });
    }

    if (clientAborted) {
      console.log('⚠️  Client aborted, skipping complete event');
      return;
    }

    console.log('📤 Sending complete event...');
    const systemRecommendation = deriveSystemRecommendation(aiSummaryText);
    console.log(`📊 System recommendation: ${systemRecommendation}`);
    
    const { assessmentId } = await persistAssessment(enrichedFormData, aiSummaryText, systemRecommendation);
    console.log(`💾 Assessment saved with ID: ${assessmentId}`);

    sendEvent('complete', {
      aiSummary: aiSummaryText,
      systemRecommendation,
      assessmentId,
      sessionId,
    });
    
    console.log('✅ Complete event sent');

    if (!res.writableEnded) {
      res.end();
      console.log('🔚 Stream ended');
    }
  } catch (error) {
    console.error('Streaming assessment submission error:', error);
    endWithError(error.message || 'Failed to submit assessment.');
  }
});



app.post('/api/assessment/submit', async (req, res) => {
  try {
    const { enrichedFormData, sessionId } = normalizeAssessmentInput(req.body || {});

    let aiSummaryText = '';

    if (anthropic) {
      try {
        const prompt = generateComprehensivePrompt(enrichedFormData);
        const response = await anthropic.messages.create({
          model: claudeDefaultModel,
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        });

        if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
          aiSummaryText = response.content[0].text;
        }
      } catch (aiError) {
        console.error('AI summary generation error:', aiError);
        aiSummaryText = 'AI summary could not be generated at this time.';
      }
    } else {
      aiSummaryText = 'AI summary could not be generated (missing AI configuration).';
    }

    if (!aiSummaryText) {
      aiSummaryText = 'AI summary was empty.';
    }

    const systemRecommendation = deriveSystemRecommendation(aiSummaryText);
    const { assessmentId } = await persistAssessment(enrichedFormData, aiSummaryText, systemRecommendation);

    res.status(201).json({
      message: 'Assessment submitted successfully',
      assessmentId,
      sessionId,
      aiSummary: aiSummaryText,
      systemRecommendation,
    });
  } catch (error) {
    if (error instanceof Error && error.message && error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Assessment submission error:', error);
    res.status(500).json({ error: 'Failed to submit assessment.' });
  }
});

app.post('/api/generate-summary', async (req, res) => {
  if (!anthropic) {
    return res.status(500).json({ error: 'Claude API client not initialized on server. API key may be missing or invalid.' });
  }

  try {
    const formData = req.body;

    if (!formData) {
      return res.status(400).json({ error: 'No form data received.' });
    }

    const comprehensivePrompt = generateComprehensivePrompt(formData);

    console.log("Sending prompt to Claude API...");

    const claudeResponse = await anthropic.messages.create({
      model: claudeSummaryModel,
      max_tokens: 1024,
      messages: [{ role: "user", content: comprehensivePrompt }],
    });
    
    let summary = "No summary content found from AI.";
    if (claudeResponse.content && claudeResponse.content.length > 0 && claudeResponse.content[0].type === 'text') {
        summary = claudeResponse.content[0].text;
    } else {
        console.warn("Unexpected Claude API response structure:", claudeResponse);
    }
    
    console.log("Received summary from Claude API.");
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
app.post('/api/email/send-assessment', async (req, res) => {
  if (!transporter) {
    return res.status(503).json({ error: 'Email service is not configured or unavailable.' });
  }

  try {
    const { formData, aiSummary, recommendationText, nextStep, systemRecommendation, clientOrigin } = req.body;

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

    // Send email to admin/BCC
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

    // Send email to admin/BCC
    const adminHtmlContent = generateAssessmentEmailHTML({ formData, aiSummary, recommendationText: formData.systemRecommendation, nextStep: formData.nextStep }, serverBaseUrl, 'admin');
    const adminMailOptions = {
      from: `"Spine IQ Assessment" <${process.env.EMAIL_SENDER_ADDRESS}>`,
      to: primaryRecipient,
      bcc: process.env.BCC_EMAIL_RECIPIENT_ADDRESS,
      subject: `Spine Assessment Summary - ${formData.demographics?.fullName || 'N/A'} - ${subjectDate}`,
      html: adminHtmlContent,
      attachments: attachments
    };
    await transporter.sendMail(adminMailOptions);

    // Send email to patient
    if (patientEmail && typeof patientEmail === 'string' && patientEmail.trim() !== '' && patientEmail !== primaryRecipient) {
      const patientHtmlContent = generateAssessmentEmailHTML({ formData, aiSummary, recommendationText: formData.systemRecommendation, nextStep: formData.nextStep }, serverBaseUrl, 'patient');
      const patientMailOptions = {
        from: `"Spine IQ Assessment" <${process.env.EMAIL_SENDER_ADDRESS}>`,
        to: patientEmail,
        subject: `Your Spine Assessment Summary - ${subjectDate}`,
        html: patientHtmlContent,
        // No attachments for the patient email
      };
      await transporter.sendMail(patientMailOptions);
    }

    res.status(200).json({ message: 'Assessment email(s) sent successfully.' });

  } catch (error) {
    console.error('Error sending assessment email:', error);
    res.status(500).json({ error: 'Failed to send assessment email.' });
  }
});

// --- NODEMAILER & SERVER START ---
// Use the centralized nodemailer configuration
const transporter = require('./config/nodemailer');

// --- SERVE FRONTEND ---
// Check if built frontend exists (production or local build)
const distPath = path.join(__dirname, 'public/dist');
const indexPath = path.join(distPath, 'index.html');

if (fs.existsSync(indexPath)) {
  // Serve static files from the React build
  app.use(express.static(distPath));
  
  // All non-API, non-upload requests return the React app (must be last route)
  app.get('*', (req, res, next) => {
    // Don't intercept API or upload routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    
    // Serve the React app for all other routes
    res.sendFile(indexPath);
  });
  
  console.log('✅ Frontend static serving enabled');
} else {
  console.log('⚠️  Frontend build not found - running in API-only mode');
  console.log('   Run "cd client && npm run build" to build the frontend');
}

// --- SERVER START ---
const server = http.createServer(app);

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

function generateSimplifiedAssessmentEmailHTML(data, serverBaseUrl, recipientType) {
  const { formData, aiSummary, systemRecommendation } = data;

  let urgencyColor = '#28a745';
  if (systemRecommendation === 'HIGH_URGENCY') urgencyColor = '#dc3545';
  else if (systemRecommendation === 'MODERATE_URGENCY') urgencyColor = '#ffc107';

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

  if (recipientType === 'patient' && aiSummary) {
    html += `
      <div class="section">
        <h2>Assessment Summary</h2>
        <p>${aiSummary.replace(/\n/g, '<br>')}</p>
      </div>
    `;
  }

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

  if (formData.treatmentGoals) {
    html += `
      <div class="section">
        <h2>Treatment Goals</h2>
        <p>${formData.treatmentGoals.replace(/\n/g, '<br>')}</p>
      </div>
    `;
  }

  if (recipientType === 'admin' && (formData.painMapImageFront || formData.painMapImageBack)) {
    html += `<div class="section"><h2>Pain Map Images</h2>`;
    if (formData.painMapImageFront) {
      if (serverBaseUrl) {
        html += `<h3>Front View</h3><img src="cid:painMapFront" alt="Pain Map Front" style="max-width: 100%; height: auto; border: 1px solid #ddd;" />`;
      } else {
        html += `<h3>Front View</h3><p>Front pain map image attached.</p>`;
      }
    }
    if (formData.painMapImageBack) {
      if (serverBaseUrl) {
        html += `<h3>Back View</h3><img src="cid:painMapBack" alt="Pain Map Back" style="max-width: 100%; height: auto; border: 1px solid #ddd;" />`;
      } else {
        html += `<h3>Back View</h3><p>Back pain map image attached.</p>`;
      }
    }
    html += `</div>`;
  }

  if (recipientType === 'admin' && aiSummary) {
    html += `
      <div class="section">
        <h2>AI-Generated Clinical Summary</h2>
        <p>${aiSummary.replace(/\n/g, '<br>')}</p>
      </div>
    `;
  }

  if (recipientType === 'patient' && aiSummary) {
    html += `
      <div class="section">
        <h2>What Happens Next?</h2>
        <p>Our clinical team will review your assessment and contact you shortly with next steps.</p>
      </div>
    `;
  }

  html += `
      </body>
    </html>
  `;

  return html;
}

function generateAssessmentEmailHTML(data, serverBaseUrl, recipientType) {
  const { formData, aiSummary, recommendationText, nextStep } = data;

  let html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          h1 { color: #2c3e50; }
          h2 { color: #34495e; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; }
          .section-title { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
          .field-label { font-weight: bold; color: #555; }
          .field-value { margin-left: 10px; }
          ul { padding-left: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px;}
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left;}
          th { background-color: #f0f0f0; }
        </style>
      </head>
      <body>
        <h1>Spine Assessment Report</h1>
  `;

  if (recipientType === 'patient') {
    if (aiSummary) {
      html += `
        <div class="section">
          <div class="section-title">Initial Triage: Report and Summary</div>
          <p>${aiSummary.replace(/\n/g, '<br>')}</p>
        </div>
      `;
    }
    if (nextStep) {
        html += `
        <div class="section">
          <div class="section-title">Next Step Chosen by User</div>
          <p>${nextStep}</p>
        </div>
      `;
    }
    if (recommendationText) {
      html += `
        <div class="section">
          <div class="section-title">Adaptive Next-Step Evaluation</div>
          <p>${recommendationText}</p>
        </div>
      `;
    }
  }

  if (formData.demographics) {
    html += `
      <div class="section">
        <div class="section-title">Personal Information</div>
        <p><span class="field-label">Full Name:</span> <span class="field-value">${formData.demographics.fullName || 'N/A'}</span></p>
        <p><span class="field-label">Date of Birth:</span> <span class="field-value">${formData.demographics.dateOfBirth || 'N/A'}</span></p>
        <p><span class="field-label">Phone:</span> <span class="field-value">${formData.demographics.phoneNumber || 'N/A'}</span></p>
        <p><span class="field-label">Email:</span> <span class="field-value">${formData.demographics.email || 'N/A'}</span></p>
        <p><span class="field-label">Residential Address:</span> <span class="field-value">${formData.demographics.residentialAddress.addressLine1 || ''}, ${formData.demographics.residentialAddress.addressLine2 ? formData.demographics.residentialAddress.addressLine2 + ', ' : ''}${formData.demographics.residentialAddress.suburb || ''}, ${formData.demographics.residentialAddress.state || ''}, ${formData.demographics.residentialAddress.postcode || ''}</span></p>
        ${!formData.demographics.isPostalSameAsResidential && formData.demographics.postalAddress ? `<p><span class="field-label">Postal Address:</span> <span class="field-value">${formData.demographics.postalAddress.addressLine1 || ''}, ${formData.demographics.postalAddress.addressLine2 ? formData.demographics.postalAddress.addressLine2 + ', ' : ''}${formData.demographics.postalAddress.suburb || ''}, ${formData.demographics.postalAddress.state || ''}, ${formData.demographics.postalAddress.postcode || ''}</span></p>` : ''}
        ${formData.demographics.funding && formData.demographics.funding.source ? `
          <div class="section">
            <div class="section-title">Funding Information</div>
            <p><span class="field-label">Source:</span> <span class="field-value">${formData.demographics.funding.source}</span></p>
            ${formData.demographics.funding.source === 'Private Health Insurance' ? `
              <p><span class="field-label">Health Fund:</span> <span class="field-value">${formData.demographics.funding.healthFundName || 'N/A'}</span></p>
              <p><span class="field-label">Membership No.:</span> <span class="field-value">${formData.demographics.funding.membershipNumber || 'N/A'}</span></p>
            ` : ''}
            ${['Workers Compensation', 'DVA', 'TAC'].includes(formData.demographics.funding.source) && formData.demographics.funding.claimNumber ? `
              <p><span class="field-label">Claim/Reference No.:</span> <span class="field-value">${formData.demographics.funding.claimNumber}</span></p>
            ` : ''}
            ${formData.demographics.funding.source === 'Other' && formData.demographics.funding.otherSource ? `
              <p><span class="field-label">Other Source:</span> <span class="field-value">${formData.demographics.funding.otherSource}</span></p>
            ` : ''}
          </div>
        ` : ''}
        ${formData.demographics.nextOfKin ? `
          <div class="section">
            <div class="section-title">Emergency Contact</div>
            <p><span class="field-label">Name:</span> <span class="field-value">${formData.demographics.nextOfKin.fullName || 'N/A'}</span></p>
            <p><span class="field-label">Relationship:</span> <span class="field-value">${formData.demographics.nextOfKin.relationship || 'N/A'}</span></p>
            <p><span class="field-label">Phone:</span> <span class="field-value">${formData.demographics.nextOfKin.phoneNumber || 'N/A'}</span></p>
          </div>
        ` : ''}
        ${formData.demographics.referringDoctor ? `
          <div class="section">
            <div class="section-title">Referring Doctor</div>
            ${formData.demographics.referringDoctor.hasReferringDoctor ? `
              <p><span class="field-label">Name:</span> <span class="field-value">${formData.demographics.referringDoctor.doctorName || 'N/A'}</span></p>
              <p><span class="field-label">Clinic:</span> <span class="field-value">${formData.demographics.referringDoctor.clinic || 'N/A'}</span></p>
              <p><span class="field-label">Phone:</span> <span class="field-value">${formData.demographics.referringDoctor.phoneNumber || 'N/A'}</span></p>
              <p><span class="field-label">Email:</span> <span class="field-value">${formData.demographics.referringDoctor.email || 'N/A'}</span></p>
              <p><span class="field-label">Fax:</span> <span class="field-value">${formData.demographics.referringDoctor.fax || 'N/A'}</span></p>
              ${formData.demographics.referringDoctor.referralDocument ? `
                <p><span class="field-label">Referral Document:</span> <span class="field-value">
                  <a href="${formData.demographics.referringDoctor.referralDocument.url}" target="_blank" style="color: #007bff; text-decoration: none;">
                    📄 ${formData.demographics.referringDoctor.referralDocument.originalName}
                  </a>
                </span></p>
              ` : ''}
            ` : '<p>No referring doctor.</p>'}
          </div>
        ` : ''}
        ${formData.demographics.gender ? `<p><span class="field-label">Gender:</span> <span class="field-value">${formData.demographics.gender}</span></p>` : ''}
        ${formData.demographics.medicareNumber ? `<p><span class="field-label">Medicare Number:</span> <span class="field-value">${formData.demographics.medicareNumber}</span></p>` : ''}
        ${formData.demographics.medicareRefNum ? `<p><span class="field-label">Medicare Ref. No.:</span> <span class="field-value">${formData.demographics.medicareRefNum}</span></p>` : ''}
        ${formData.demographics.countryOfBirth ? `<p><span class="field-label">Country of Birth:</span> <span class="field-value">${formData.demographics.countryOfBirth}</span></p>` : ''}
      </div>
    `;
  }
  
  if (formData.diagnoses) {
    html += '<div class="section"><div class="section-title">Medical Conditions & Symptoms</div><ul>';
    const diagnosesOrder = [
      'herniatedDisc', 'spinalStenosis', 'spondylolisthesis', 
      'scoliosis', 'spinalFracture', 'degenerativeDiscDisease',
      'otherConditionSelected'
    ];
    diagnosesOrder.forEach(key => {
      if (formData.diagnoses[key] === true) {
        if (key === 'otherConditionSelected' && formData.diagnoses.other) {
          html += `<li>Other: ${formData.diagnoses.other}</li>`;
        } else if (key !== 'otherConditionSelected') {
          const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          html += `<li>${readableKey}</li>`;
        }
      }
    });
    if (formData.diagnoses.other && !formData.diagnoses.otherConditionSelected) {
        html += `<li>Other (not selected as primary): ${formData.diagnoses.other}</li>`;
    }
    if (formData.diagnoses.mainSymptoms) {
      html += `<li>Main Symptoms: ${formData.diagnoses.mainSymptoms.replace(/\n/g, '<br>')}</li>`;
    }
    if (formData.diagnoses.symptomDuration) {
      html += `<li>Symptom Duration: ${formData.diagnoses.symptomDuration}</li>`;
    }
    if (formData.diagnoses.symptomProgression) {
      html += `<li>Symptom Progression: ${formData.diagnoses.symptomProgression}</li>`;
    }
    html += '</ul></div>';
  }

    if (formData.redFlags) {
      let redFlagsHtml = '';
      const { 
        muscleWeakness, numbnessOrTingling, unexplainedWeightLoss, 
        bladderOrBowelIncontinence, saddleAnaesthesia, balanceProblems,
        otherRedFlagPresent, otherRedFlag 
      } = formData.redFlags;

      if (muscleWeakness?.present) {
        let areaDetails = "Present";
        if (muscleWeakness.areas) {
          const selectedAreas = Object.entries(muscleWeakness.areas)
            .filter(([, val]) => val.selected)
            .map(([areaName, val]) => `${areaName} (Severity: ${val.severity || 0})`).join(', ');
          if (selectedAreas) areaDetails += `, Areas: ${selectedAreas}`;
          else areaDetails += ` (no specific areas detailed with severity)`;
        }
        redFlagsHtml += `<li>Muscle Weakness: ${areaDetails}</li>`;
      }
      if (numbnessOrTingling?.present) {
        let areaDetails = "Present";
        if (numbnessOrTingling.areas) {
          const selectedAreas = Object.entries(numbnessOrTingling.areas)
            .filter(([, val]) => val.selected)
            .map(([areaName, val]) => `${areaName} (Severity: ${val.severity || 0})`).join(', ');
          if (selectedAreas) areaDetails += `, Areas: ${selectedAreas}`;
          else areaDetails += ` (no specific areas detailed with severity)`;
        }
        redFlagsHtml += `<li>Numbness Or Tingling: ${areaDetails}</li>`;
      }
      if (unexplainedWeightLoss?.present) {
        redFlagsHtml += `<li>Unexplained Weight Loss: Present`;
        if (unexplainedWeightLoss.amountKg !== undefined) redFlagsHtml += `, Amount: ${unexplainedWeightLoss.amountKg}kg`;
        if (unexplainedWeightLoss.period) redFlagsHtml += `, Period: ${unexplainedWeightLoss.period}`;
        redFlagsHtml += `</li>`;
      }
      if (bladderOrBowelIncontinence?.present) {
        redFlagsHtml += `<li>Bladder Or Bowel Incontinence: Present`;
        if (bladderOrBowelIncontinence.details) redFlagsHtml += `, Type: ${bladderOrBowelIncontinence.details}`;
        if (bladderOrBowelIncontinence.severity !== undefined) redFlagsHtml += `, Severity: ${bladderOrBowelIncontinence.severity}/10`;
        redFlagsHtml += `</li>`;
      }
      if (saddleAnaesthesia?.present) {
        redFlagsHtml += `<li>Saddle Anaesthesia: Present`;
        if (saddleAnaesthesia.details) redFlagsHtml += `, Area: ${saddleAnaesthesia.details}`;
        if (saddleAnaesthesia.severity !== undefined) redFlagsHtml += `, Severity: ${saddleAnaesthesia.severity}/10`;
        redFlagsHtml += `</li>`;
      }
      if (balanceProblems?.present && balanceProblems.type) {
        redFlagsHtml += `<li>Balance Problems: Present, Type: ${balanceProblems.type}</li>`;
      }
      if (otherRedFlagPresent && otherRedFlag) {
        redFlagsHtml += `<li>Other Red Flags: ${otherRedFlag}</li>`;
      }

      if (redFlagsHtml) {
        html += `
          <div class="section">
            <div class="section-title">Red Flag Symptoms</div>
            <ul>${redFlagsHtml}</ul>
          </div>
        `;
      }
    }
    
    if (formData.imagingRecordsPermission !== undefined) {
         html += `
            <div class="section">
                <div class="section-title">Imaging Records Permission</div>
                <p>${formData.imagingRecordsPermission ? 'Permission Granted' : 'Permission Not Granted'}</p>
            </div>
        `;
    }
  
    if (formData.treatmentGoals) {
    html += `
      <div class="section">
        <div class="section-title">Treatment Goals</div>
        <p>${formData.treatmentGoals.replace(/\n/g, '<br>')}</p>
      </div>
    `;
  }


  if (formData.painAreas && formData.painAreas.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Pain Assessment</div>
        <table>
          <thead><tr><th>Region</th><th>Intensity (0-10)</th><th>Notes</th></tr></thead>
          <tbody>
            ${formData.painAreas.map(area => `
              <tr>
                <td>${area.region || 'N/A'}</td>
                <td>${area.intensity || 'N/A'}</td>
                <td>${area.notes || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  if (formData.treatments) {
    html += '<div class="section"><div class="section-title">Non-Surgical Treatments</div><ul>';
    for (const [key, value] of Object.entries(formData.treatments)) {
      if (value === true && !key.includes('Name') && !key.includes('Details')) {
         const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
         let details = '';
         if (key === 'prescriptionAntiInflammatory' && formData.treatments.prescriptionAntiInflammatoryName) details = `: ${formData.treatments.prescriptionAntiInflammatoryName}`;
         else if (key === 'prescriptionPainMedication' && formData.treatments.prescriptionPainMedicationName) details = `: ${formData.treatments.prescriptionPainMedicationName}`;
         else if (key === 'spinalInjections' && formData.treatments.spinalInjectionsDetails) details = `: ${formData.treatments.spinalInjectionsDetails}`;
         html += `<li>${readableKey}${details}</li>`;
      }
    }
    html += '</ul></div>';
  }

  if (formData.surgeries && formData.surgeries.length > 0 && formData.hadSurgery) {
    html += `
      <div class="section">
        <div class="section-title">Surgical History</div>
        <table>
          <thead><tr><th>Date</th><th>Procedure</th><th>Surgeon</th><th>Hospital</th></tr></thead>
          <tbody>
            ${formData.surgeries.map(surgery => `
              <tr>
                <td>${surgery.date || 'N/A'}</td>
                <td>${surgery.procedure || 'N/A'}</td>
                <td>${surgery.surgeon || 'N/A'}</td>
                <td>${surgery.hospital || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (formData.hadSurgery === false) {
     html += '<div class="section"><div class="section-title">Surgical History</div><p>No surgical history reported.</p></div>';
  }
  
  if (formData.imaging && formData.imaging.some(img => img.hadStudy)) {
    html += `
      <div class="section">
        <div class="section-title">Imaging History</div>
        <table>
          <thead><tr><th>Type</th><th>Date</th><th>Clinic</th><th>Spinal Regions</th><th>Document</th></tr></thead>
          <tbody>
            ${formData.imaging.filter(img => img.hadStudy).map(img => {
              let docLink = 'N/A';
              if (img.documentName && serverBaseUrl) {
                docLink = `<a href="${serverBaseUrl}/uploads/assessment_files/${img.documentName}" target="_blank">View Document</a>`;
              } else if (img.documentName) {
                docLink = `Document: ${img.documentName} (Link unavailable)`;
              }
              const spinalRegions = img.spinalRegions && img.spinalRegions.length > 0 ? img.spinalRegions.join(', ') : 'N/A';
              return `
                <tr>
                  <td>${img.type || 'N/A'}</td>
                  <td>${img.date || 'N/A'}</td>
                  <td>${img.clinic || 'N/A'}</td>
                  <td>${spinalRegions}</td>
                  <td>${docLink}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    html += '<div class="section"><div class="section-title">Imaging History</div><p>No imaging studies reported.</p></div>';
  }

  if (recipientType === 'admin' && (formData.painMapImageFront || formData.painMapImageBack)) {
    html += `
      <div class="section">
        <div class="section-title">Pain Map Images</div>
    `;
    if (formData.painMapImageFront) {
      html += `
        <h3>Front View</h3>
        <img src="cid:painMapFront" alt="Pain Map Front View" style="max-width: 100%; height: auto;" />
      `;
    }
    if (formData.painMapImageBack) {
      html += `
        <h3>Back View</h3>
        <img src="cid:painMapBack" alt="Pain Map Back View" style="max-width: 100%; height: auto;" />
      `;
    }
    html += `</div>`;
  }

  if (recipientType === 'admin') {
    if (aiSummary) {
      html += `
        <div class="section">
          <div class="section-title">Initial Triage: Report and Summary</div>
          <p>${aiSummary.replace(/\n/g, '<br>')}</p>
        </div>
      `;
    }
    if (nextStep) {
        html += `
        <div class="section">
          <div class="section-title">Next Step Chosen by User</div>
          <p>${nextStep}</p>
        </div>
      `;
    }
    if (recommendationText) {
      html += `
        <div class="section">
          <div class="section-title">Adaptive Next-Step Evaluation</div>
          <p>${recommendationText}</p>
        </div>
      `;
    }
  }

  html += `
      </body>
    </html>
  `;
  return html;
}
