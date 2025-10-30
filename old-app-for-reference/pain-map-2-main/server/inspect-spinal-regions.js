const mongoose = require('mongoose');
require('dotenv').config();

const Assessment = require('./models/Assessment');

async function inspectSpinalRegions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get the most recent assessments
    const assessments = await Assessment.find({}).sort({ createdAt: -1 }).limit(5);
    
    console.log(`\nFound ${assessments.length} recent assessments\n`);
    
    assessments.forEach((assessment, index) => {
      console.log(`=== Assessment ${index + 1} ===`);
      console.log(`ID: ${assessment._id}`);
      console.log(`Email: ${assessment.demographics?.email || 'N/A'}`);
      console.log(`Created: ${assessment.createdAt}`);
      
      if (assessment.imaging && assessment.imaging.length > 0) {
        console.log('\nImaging entries:');
        assessment.imaging.forEach((img, imgIndex) => {
          console.log(`\n  Imaging ${imgIndex + 1}:`);
          console.log(`    Type: ${img.type}`);
          console.log(`    Had Study: ${img.hadStudy}`);
          console.log(`    Clinic: ${img.clinic || 'N/A'}`);
          console.log(`    Date: ${img.date || 'N/A'}`);
          console.log(`    Spinal Regions (raw): ${JSON.stringify(img.spinalRegions)}`);
          console.log(`    Spinal Regions type: ${typeof img.spinalRegions}`);
          console.log(`    Is array: ${Array.isArray(img.spinalRegions)}`);
          console.log(`    Document: ${img.documentName || 'N/A'}`);
          
          // Test our processing logic
          let processedRegions = [];
          if (img.spinalRegions !== undefined && img.spinalRegions !== null) {
            if (Array.isArray(img.spinalRegions)) {
              processedRegions = img.spinalRegions;
            } else if (typeof img.spinalRegions === 'string') {
              processedRegions = img.spinalRegions.length > 0 ? 
                img.spinalRegions.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
            } else {
              const stringValue = String(img.spinalRegions).trim();
              processedRegions = stringValue.length > 0 ? [stringValue] : [];
            }
          }
          
          const displayValue = processedRegions.length > 0 ? 
            processedRegions.join(', ') : 'None selected';
            
          console.log(`    Processed regions: ${JSON.stringify(processedRegions)}`);
          console.log(`    Display value: "${displayValue}"`);
        });
      } else {
        console.log('No imaging data');
      }
      console.log('\n' + '='.repeat(50));
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

inspectSpinalRegions();
