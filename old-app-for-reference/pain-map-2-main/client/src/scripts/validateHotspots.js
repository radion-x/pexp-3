/**
 * Inline validation script for pain map hotspots
 * This validates the hotspot definitions directly from the file
 */

// Extract hotspot definitions from PainMappingStep.tsx
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../components/steps/PainMappingStep.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

// Parse frontHotspots
const frontMatch = fileContent.match(/const frontHotspots: Hotspot\[\] = \[([\s\S]*?)\];/);
const backMatch = fileContent.match(/const backHotspots: Hotspot\[\] = \[([\s\S]*?)\];/);

if (!frontMatch || !backMatch) {
  console.error('❌ Could not find hotspot definitions in PainMappingStep.tsx');
  process.exit(1);
}

// Count hotspots
const frontCount = (frontMatch[1].match(/{ id:/g) || []).length;
const backCount = (backMatch[1].match(/{ id:/g) || []).length;

console.log('\n========================================');
console.log('PAIN MAP HOTSPOT VALIDATION');
console.log('========================================\n');

console.log(`✅ Front View Hotspots: ${frontCount}`);
console.log(`✅ Back View Hotspots: ${backCount}`);
console.log(`📊 Total Hotspots: ${frontCount + backCount}\n`);

// Validate coordinate ranges
const validateCoords = (matchStr, view) => {
  const coords = matchStr.match(/x: ([\d.]+), y: ([\d.]+), width: ([\d.]+), height: ([\d.]+)/g) || [];
  
  let outOfBounds = 0;
  let valid = 0;

  coords.forEach(coord => {
    const [x, y, width, height] = coord.match(/([\d.]+)/g).map(Number);
    
    if (x < 0 || x > 1 || y < 0 || y > 1 || 
        x + width > 1 || y + height > 1 ||
        width <= 0 || height <= 0) {
      outOfBounds++;
    } else {
      valid++;
    }
  });

  console.log(`${view} View:`);
  console.log(`  ✅ Valid coordinates: ${valid}/${coords.length}`);
  if (outOfBounds > 0) {
    console.log(`  ⚠️  Out of bounds: ${outOfBounds}`);
  }
  console.log();

  return { valid, outOfBounds, total: coords.length };
};

const frontStats = validateCoords(frontMatch[1], 'Front');
const backStats = validateCoords(backMatch[1], 'Back');

// Summary
console.log('========================================');
console.log('SUMMARY');
console.log('========================================\n');

const totalValid = frontStats.valid + backStats.valid;
const totalOutOfBounds = frontStats.outOfBounds + backStats.outOfBounds;
const totalHotspots = frontStats.total + backStats.total;

console.log(`Total Hotspots Analyzed: ${totalHotspots}`);
console.log(`✅ Valid: ${totalValid} (${((totalValid / totalHotspots) * 100).toFixed(1)}%)`);
if (totalOutOfBounds > 0) {
  console.log(`⚠️  Issues: ${totalOutOfBounds} (${((totalOutOfBounds / totalHotspots) * 100).toFixed(1)}%)`);
} else {
  console.log(`✅ All hotspots are properly configured!`);
}
console.log();

// Check for anatomical coverage
console.log('========================================');
console.log('ANATOMICAL COVERAGE');
console.log('========================================\n');

const checkRegion = (content, region) => {
  const pattern = new RegExp(region, 'i');
  return pattern.test(content);
};

const anatomicalRegions = [
  'Head', 'Neck', 'Shoulder', 'Arm', 'Elbow', 'Forearm', 'Wrist', 'Hand',
  'Finger', 'Thumb', 'Chest', 'Sternum', 'Ribs', 'Abdomen', 'Pelvis',
  'Hip', 'Thigh', 'Knee', 'Shin', 'Calf', 'Ankle', 'Foot', 'Toe',
  'Spine', 'Cervical', 'Thoracic', 'Lumbar', 'Sacrum', 'Buttock',
  'Scapula', 'Trapezius', 'Pectoral', 'Hamstring', 'Quadriceps'
];

const covered = anatomicalRegions.filter(region => 
  checkRegion(frontMatch[1], region) || checkRegion(backMatch[1], region)
);

console.log(`✅ Covered anatomical regions: ${covered.length}/${anatomicalRegions.length}`);
covered.forEach(region => {
  console.log(`  ✓ ${region}`);
});

const missing = anatomicalRegions.filter(region => 
  !checkRegion(frontMatch[1], region) && !checkRegion(backMatch[1], region)
);

if (missing.length > 0) {
  console.log(`\n⚠️  Potentially missing regions: ${missing.length}`);
  missing.forEach(region => {
    console.log(`  - ${region}`);
  });
}

console.log('\n========================================');
console.log('VALIDATION COMPLETE');
console.log('========================================\n');
