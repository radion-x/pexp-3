const mongoose = require('mongoose');
require('dotenv').config();

const Assessment = require('./models/Assessment');

async function createTestAssessment() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Create a test assessment with spinal regions
    const testAssessment = new Assessment({
      consent: true,
      diagnoses: {
        herniatedDisc: true,
        mainSymptoms: "Test symptoms",
        symptomDuration: "6 months"
      },
      imaging: [
        {
          type: 'MRI',
          hadStudy: true,
          clinic: 'Test Clinic',
          date: '2024-01-15',
          spinalRegions: ['Cervical', 'Lumbar'] // This should fix the issue
        },
        {
          type: 'X-Ray',
          hadStudy: true,
          clinic: 'Another Clinic',
          date: '2024-01-10',
          spinalRegions: ['Thoracic', 'Sacral']
        },
        {
          type: 'CT Scan',
          hadStudy: false,
          spinalRegions: [] // This should be empty since hadStudy is false
        }
      ],
      demographics: {
        fullName: 'Test User for Spinal Regions',
        email: 'test.spinal.regions@example.com',
        phoneNumber: '555-0123'
      },
      aiSummary: 'Test AI summary'
    });
    
    const saved = await testAssessment.save();
    console.log('✅ Test assessment created with ID:', saved._id);
    
    // Verify the data was saved correctly
    const retrieved = await Assessment.findById(saved._id);
    console.log('\n📋 Verification - Imaging data saved:');
    
    retrieved.imaging.forEach((img, idx) => {
      console.log(`\n  ${idx + 1}. ${img.type}:`);
      console.log(`     hadStudy: ${img.hadStudy}`);
      console.log(`     spinalRegions: ${JSON.stringify(img.spinalRegions)}`);
      console.log(`     type: ${typeof img.spinalRegions}`);
      console.log(`     isArray: ${Array.isArray(img.spinalRegions)}`);
    });
    
    console.log('\n🎯 Now check the doctor dashboard for user: test.spinal.regions@example.com');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createTestAssessment();
