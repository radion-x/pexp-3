const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("CRITICAL: MONGODB_URI environment variable not set.");
  process.exit(1);
}

// Define a simplified Assessment schema just for debugging purposes
const assessmentSchema = new mongoose.Schema({
  createdAt: Date,
  imaging: [{
    type: { type: String },
    hadStudy: Boolean,
    clinic: String,
    date: String,
    documentName: String,
    spinalRegions: mongoose.Schema.Types.Mixed // Use Mixed type to see exactly what's stored
  }],
  demographics: {
    fullName: String,
    email: String
  }
});

// Create a temporary model without registering it in the mongoose models collection
const Assessment = mongoose.model('Assessment', assessmentSchema, 'assessments');

async function main() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Find all assessments and show their imaging data
    const assessments = await Assessment.find().sort({ createdAt: -1 }).lean();
    
    console.log(`Found ${assessments.length} assessments`);
    
    assessments.forEach((assessment, index) => {
      console.log(`\n=== Assessment #${index + 1} ===`);
      console.log(`ID: ${assessment._id}`);
      console.log(`Name: ${assessment.demographics?.fullName || 'N/A'}`);
      console.log(`Created: ${assessment.createdAt || 'N/A'}`);
      
      if (assessment.imaging && assessment.imaging.length > 0) {
        console.log(`\nImaging entries: ${assessment.imaging.length}`);
        
        assessment.imaging.forEach((img, imgIndex) => {
          if (img.hadStudy) {
            console.log(`\nImaging #${imgIndex + 1}:`);
            console.log(`Type: ${img.type || 'N/A'}`);
            console.log(`Had Study: ${img.hadStudy}`);
            console.log(`Spinal Regions (raw): ${JSON.stringify(img.spinalRegions)}`);
            console.log(`Spinal Regions type: ${typeof img.spinalRegions}`);
            
            // Deep inspection of the spinalRegions value
            if (img.spinalRegions !== undefined && img.spinalRegions !== null) {
              console.log(`Is array: ${Array.isArray(img.spinalRegions)}`);
              
              if (Array.isArray(img.spinalRegions)) {
                console.log(`Array length: ${img.spinalRegions.length}`);
                console.log(`Array contents: ${img.spinalRegions.join(', ')}`);
              } else if (typeof img.spinalRegions === 'string') {
                console.log(`String value: "${img.spinalRegions}"`);
              } else {
                console.log(`Other type value: ${String(img.spinalRegions)}`);
              }
            }
          }
        });
      } else {
        console.log('No imaging data');
      }
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

main();
