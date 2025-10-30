const mongoose = require('mongoose');
require('dotenv').config();

// Simple test to check database connectivity and data
async function quickTest() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, { 
      serverSelectionTimeoutMS: 5000 
    });
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('assessments');
    
    // Get count
    const count = await collection.countDocuments();
    console.log(`📊 Total assessments: ${count}`);
    
    if (count > 0) {
      // Get the most recent assessment
      const recent = await collection.findOne({}, { 
        sort: { createdAt: -1 },
        projection: { 
          'demographics.email': 1, 
          'imaging': 1, 
          'createdAt': 1 
        }
      });
      
      console.log('\n📋 Most recent assessment:');
      console.log('Email:', recent.demographics?.email || 'N/A');
      console.log('Created:', recent.createdAt);
      console.log('Imaging data:');
      
      if (recent.imaging && recent.imaging.length > 0) {
        recent.imaging.forEach((img, idx) => {
          console.log(`\n  ${idx + 1}. ${img.type}:`);
          console.log(`     hadStudy: ${img.hadStudy}`);
          console.log(`     spinalRegions: ${JSON.stringify(img.spinalRegions)}`);
          console.log(`     type: ${typeof img.spinalRegions}`);
          console.log(`     isArray: ${Array.isArray(img.spinalRegions)}`);
          
          // Test our dashboard logic
          let displayValue = 'None selected';
          if (img.spinalRegions && Array.isArray(img.spinalRegions) && img.spinalRegions.length > 0) {
            const validRegions = img.spinalRegions.filter(region => 
              region && typeof region === 'string' && region.trim().length > 0
            );
            if (validRegions.length > 0) {
              displayValue = validRegions.join(', ');
            }
          }
          console.log(`     Dashboard would show: "${displayValue}"`);
        });
      } else {
        console.log('No imaging data found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

quickTest();
