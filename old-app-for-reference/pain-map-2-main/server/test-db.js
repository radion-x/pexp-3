const mongoose = require('mongoose');
const Assessment = require('./models/Assessment');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("CRITICAL: MONGODB_URI environment variable not set.");
  process.exit(1);
}

async function main() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get most recent assessment
    const assessment = await Assessment.findOne().sort({ createdAt: -1 }).lean();
    
    if (!assessment) {
      console.log('No assessments found in the database.');
      return;
    }

    console.log('Most recent assessment:');
    console.log(`ID: ${assessment._id}`);
    console.log(`Created: ${assessment.createdAt}`);
    
    if (assessment.imaging && assessment.imaging.length > 0) {
      console.log('\nImaging data:');
      assessment.imaging.forEach((img, idx) => {
        console.log(`\nImaging item #${idx + 1}:`);
        console.log(`Type: ${img.type}`);
        console.log(`Had Study: ${img.hadStudy}`);
        console.log(`Clinic: ${img.clinic || 'N/A'}`);
        console.log(`Date: ${img.date || 'N/A'}`);
        console.log(`Spinal Regions: ${JSON.stringify(img.spinalRegions || [])}`);
        console.log(`Spinal Regions Type: ${typeof img.spinalRegions}`);
        if (img.spinalRegions) {
          console.log(`Is Array: ${Array.isArray(img.spinalRegions)}`);
          console.log(`Length: ${Array.isArray(img.spinalRegions) ? img.spinalRegions.length : 'N/A'}`);
          console.log(`Values: ${Array.isArray(img.spinalRegions) ? img.spinalRegions.join(', ') : 'N/A'}`);
        }
      });
    } else {
      console.log('No imaging data in this assessment.');
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

main();
