const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

// Connect to the database
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("CRITICAL: MONGODB_URI environment variable not set.");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define the test assessment
const sampleAssessment = {
  consent: true,
  demographics: {
    fullName: 'Test User',
    email: 'test@example.com',
    phoneNumber: '1234567890',
    dateOfBirth: '1990-01-01',
    residentialAddress: {
      addressLine1: '123 Test St',
      suburb: 'Testville',
      state: 'TS',
      postcode: '1234'
    },
    isPostalSameAsResidential: true,
    funding: { source: 'Private Health Insurance' },
    nextOfKin: {
      fullName: 'Next of Kin',
      relationship: 'Family',
      phoneNumber: '0987654321'
    },
    referringDoctor: { hasReferringDoctor: false }
  },
  imaging: [
    { 
      type: 'X-Ray', 
      hadStudy: true, 
      clinic: 'Test Clinic', 
      date: '2025-07-01',
      spinalRegions: ['Cervical', 'Lumbar'] // Explicitly set spinal regions as an array
    },
    { 
      type: 'MRI', 
      hadStudy: false,
      spinalRegions: [] // Empty array
    },
    { 
      type: 'CT Scan', 
      hadStudy: false,
      spinalRegions: [] // Empty array
    },
    { 
      type: 'CT Myelogram', 
      hadStudy: false,
      spinalRegions: [] // Empty array
    },
    { 
      type: 'EMG/Nerve Conduction', 
      hadStudy: false,
      spinalRegions: [] // Empty array
    }
  ],
  painAreas: [],
  formSessionId: `test-session-${Date.now()}`
};

// Create a temporary model
const Assessment = mongoose.model('Assessment', new mongoose.Schema({}, { strict: false }), 'assessments');

// Save the test assessment
async function saveTestAssessment() {
  try {
    const newAssessment = new Assessment(sampleAssessment);
    const result = await newAssessment.save();
    console.log('Test assessment saved with ID:', result._id);
    
    // Verify it was saved correctly
    const saved = await Assessment.findById(result._id).lean();
    console.log('\nVerifying saved assessment:');
    console.log('Imaging entries:', saved.imaging.length);
    
    saved.imaging.forEach((img, i) => {
      console.log(`\nImaging #${i + 1}:`);
      console.log(`Type: ${img.type}`);
      console.log(`Had Study: ${img.hadStudy}`);
      console.log(`Spinal Regions: ${JSON.stringify(img.spinalRegions || undefined)}`);
      console.log(`Spinal Regions type: ${typeof img.spinalRegions}`);
      
      if (img.spinalRegions) {
        console.log(`Is array: ${Array.isArray(img.spinalRegions)}`);
        if (Array.isArray(img.spinalRegions)) {
          console.log(`Length: ${img.spinalRegions.length}`);
          if (img.spinalRegions.length > 0) {
            console.log(`Values: ${img.spinalRegions.join(', ')}`);
          }
        }
      }
    });
  } catch (error) {
    console.error('Error saving test assessment:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the test
saveTestAssessment();
