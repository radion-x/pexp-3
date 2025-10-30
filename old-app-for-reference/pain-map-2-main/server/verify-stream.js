const http = require('http');

const postData = JSON.stringify({
  fullName: 'Test User',
  email: 'test@test.com',
  treatmentGoals: 'Test goals',
  painAreas: [
    { region: 'Thoracic Spine (T10-T12 - Left Paraspinal)', intensity: 5, notes: 'Test notes' }
  ],
  redFlags: {
    bowelBladderDysfunction: true,
    progressiveWeakness: false,
    saddleAnesthesia: false,
    unexplainedWeightLoss: false,
    feverChills: false,
    nightPain: false,
    cancerHistory: false,
    recentTrauma: false,
    notes: 'Test red flag notes'
  }
});

const options = {
  hostname: 'localhost',
  port: 3811,
  path: '/api/assessment/submit-stream',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();
