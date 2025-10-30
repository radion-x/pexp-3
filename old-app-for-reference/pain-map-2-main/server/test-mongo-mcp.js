const { MongoClient } = require('mongodb');

async function testMongoDB() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully!');
    
    const db = client.db('spineiq_db');
    const collection = db.collection('assessments');
    
    // Get the assessment for 2speakfrank@gmail.com
    const assessment = await collection.findOne(
      { 'demographics.email': '2speakfrank@gmail.com' },
      { projection: { imaging: 1, _id: 1 } }
    );
    
    if (assessment) {
      console.log('\n=== ASSESSMENT FOUND ===');
      console.log('ID:', assessment._id);
      console.log('Imaging array:');
      assessment.imaging.forEach((img, idx) => {
        console.log(`  ${idx}. ${img.type}:`);
        console.log(`     hadStudy: ${img.hadStudy}`);
        console.log(`     clinic: ${img.clinic || 'N/A'}`);
        console.log(`     date: ${img.date || 'N/A'}`);
        console.log(`     spinalRegions: ${JSON.stringify(img.spinalRegions)}`);
        console.log(`     spinalRegions type: ${typeof img.spinalRegions}`);
        console.log(`     has spinalRegions field: ${img.hasOwnProperty('spinalRegions')}`);
        console.log('');
      });
    } else {
      console.log('Assessment not found');
    }
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
  } finally {
    await client.close();
  }
}

testMongoDB();
