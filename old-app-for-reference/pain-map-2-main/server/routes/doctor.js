const express = require('express');
const router = express.Router();
const Assessment = require('../models/Assessment');
const { ensureAuthenticated } = require('./auth');

router.get('/doctor/patients', ensureAuthenticated, async (req, res) => {
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

router.get('/doctor/patient/:email/assessments', ensureAuthenticated, async (req, res) => {
  try {
    // Use lean() for better JSON serialization and performance
    const assessments = await Assessment.find({ 'demographics.email': req.params.email })
      .lean()
      .sort({ createdAt: -1 });
    
    // Process the imaging data to ensure consistent format
    const processedAssessments = assessments.map(assessment => {
      // Make a completely fresh copy of the assessment
      const processedAssessment = { ...assessment };
      
      // Check if assessment has imaging data
      if (processedAssessment.imaging && Array.isArray(processedAssessment.imaging)) {
        // Replace the entire imaging array with a fresh one
        processedAssessment.imaging = processedAssessment.imaging.map(img => {
          // Handle various possible states of spinalRegions
          let spinalRegions = [];
          
          if (img.spinalRegions !== undefined && img.spinalRegions !== null) {
            if (Array.isArray(img.spinalRegions)) {
              spinalRegions = [...img.spinalRegions]; // Clone the array
            } else if (typeof img.spinalRegions === 'string') {
              // Handle case where spinalRegions might be a comma-separated string
              spinalRegions = img.spinalRegions.length > 0 ? img.spinalRegions.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
            } else {
              // Convert any other type to string and wrap in array if it's not empty
              const stringValue = String(img.spinalRegions).trim();
              spinalRegions = stringValue.length > 0 ? [stringValue] : [];
            }
          }
          
          // Only log if there are spinal regions to process
          if (spinalRegions.length > 0) {
            console.log(`Doctor API: Processing ${img.type} with spinal regions:`, spinalRegions);
          }
          
          // Create a completely new imaging object with guaranteed structure
          return {
            type: img.type || 'Unknown',
            hadStudy: Boolean(img.hadStudy), // Use Boolean() instead of strict comparison
            clinic: img.clinic || 'N/A',
            date: img.date || '',
            documentName: img.documentName || '',
            spinalRegions: spinalRegions // Properly processed spinal regions
          };
        });
      }
      
      return processedAssessment;
    });
    
    // Debug logging
    console.log('=== DOCTOR ROUTE ===');
    console.log(`Email: ${req.params.email}`);
    console.log(`Found ${processedAssessments.length} assessments`);
    
    if (processedAssessments.length > 0) {
      const firstAssessment = processedAssessments[0];
      console.log('First assessment ID:', firstAssessment._id);
      
      if (firstAssessment.imaging && firstAssessment.imaging.length > 0) {
        console.log('First assessment has', firstAssessment.imaging.length, 'imaging entries');
        
        firstAssessment.imaging.forEach((img, idx) => {
          console.log(`Imaging ${idx}:`, {
            type: img.type,
            hadStudy: img.hadStudy,
            spinalRegions: JSON.stringify(img.spinalRegions)
          });
        });
      } else {
        console.log('First assessment has no imaging data');
      }
    }
    
    // Log the final data structure being sent to the client
    console.log('=== FINAL DATA SENT TO CLIENT ===');
    if (processedAssessments.length > 0 && processedAssessments[0].imaging) {
      processedAssessments[0].imaging.forEach((img, idx) => {
        console.log(`Final imaging ${idx} data:`, JSON.stringify({
          type: img.type,
          hadStudy: img.hadStudy,
          spinalRegions: img.spinalRegions
        }, null, 2));
      });
    }
    
    // Send the completely rebuilt assessments to the client
    res.status(200).json(processedAssessments || []);
  } catch (error) {
    console.error('Error retrieving assessments:', error);
    res.status(500).json({ error: 'Failed to retrieve assessments.' });
  }
});

router.delete('/doctor/assessment/:id', ensureAuthenticated, async (req, res) => {
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

router.delete('/doctor/user/:email', ensureAuthenticated, async (req, res) => {
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

// Debug endpoint to check assessment data
router.get('/doctor/debug/assessment/:id', ensureAuthenticated, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id).lean();
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    // Check if imaging data has spinalRegions
    const imagingData = assessment.imaging || [];
    const imagingWithSpinalRegions = imagingData.map(img => ({
      ...img,
      hasSpinalRegions: !!img.spinalRegions,
      spinalRegionsLength: img.spinalRegions ? img.spinalRegions.length : 0,
      spinalRegionsData: img.spinalRegions || []
    }));
    
    res.status(200).json({
      assessment: assessment,
      debugInfo: {
        imaging: imagingWithSpinalRegions
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Error retrieving assessment data' });
  }
});

module.exports = router;
