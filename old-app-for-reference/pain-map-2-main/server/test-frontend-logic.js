// Test script to verify the exact data flow for spinal regions in the frontend
// This will help us debug what's happening when the dashboard renders

const testData = {
  "type": "MRI",
  "hadStudy": true,
  "clinic": "Test Clinic", 
  "date": "2024-01-15",
  "spinalRegions": ["Cervical", "Lumbar"]
};

console.log("=== TESTING SPINAL REGIONS LOGIC ===");
console.log("Input data:", testData);

// This is the exact logic from DoctorDashboard.tsx
let spinalRegionsDisplay = 'None selected';

try {
  if (testData.spinalRegions && Array.isArray(testData.spinalRegions) && testData.spinalRegions.length > 0) {
    // Filter out empty strings and process the array
    const validRegions = testData.spinalRegions.filter(region => 
      region && typeof region === 'string' && region.trim().length > 0
    );
    
    if (validRegions.length > 0) {
      spinalRegionsDisplay = validRegions.join(', ');
    }
  } else if (testData.spinalRegions && typeof testData.spinalRegions === 'string' && testData.spinalRegions.trim().length > 0) {
    // Handle string case (shouldn't happen but just in case)
    spinalRegionsDisplay = testData.spinalRegions.trim();
  }
  
  console.log("Result:", spinalRegionsDisplay);
} catch (error) {
  console.error('Error processing spinal regions:', error);
  spinalRegionsDisplay = 'Error loading regions';
}

console.log("Final display value:", spinalRegionsDisplay);
