const mongoose = require('mongoose');
const Assessment = require('./models/Assessment');
require('./config/database');

mongoose.connection.once('open', async () => {
  console.log('Connected to MongoDB');
  
  // Find our test assessment
  const testAssessment = await Assessment.findOne({ 'aboutYou.email': 'test.spinal.regions@example.com' });
  
  if (testAssessment) {
    console.log('\n=== Test Assessment Found ===');
    console.log('ID:', testAssessment._id);
    console.log('Email:', testAssessment.aboutYou.email);
    console.log('Created:', testAssessment.createdAt);
    
    console.log('\n=== Imaging History ===');
    testAssessment.imagingHistory.forEach((study, index) => {
      console.log(`Study ${index + 1}:`);
      console.log('  Type:', study.type);
      console.log('  Had Study:', study.hadStudy);
      console.log('  Spinal Regions Type:', typeof study.spinalRegions);
      console.log('  Spinal Regions Value:', study.spinalRegions);
      console.log('  Spinal Regions Array:', Array.isArray(study.spinalRegions));
      console.log('');
    });
  } else {
    console.log('Test assessment not found');
  }
  
  process.exit(0);
});
