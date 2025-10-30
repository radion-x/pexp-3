/**
 * Test script to validate all pain map hotspots
 * Run with: ts-node validatePainMap.test.ts
 */

import { frontHotspots, backHotspots } from '../components/steps/PainMappingStep';
import { HotspotValidator } from '../utils/validateHotspots';

console.log('========================================');
console.log('PAIN MAP HOTSPOT VALIDATION TEST');
console.log('========================================\n');

// Validate front hotspots
console.log(HotspotValidator.generateReport(frontHotspots, 'front'));

// Validate back hotspots  
console.log(HotspotValidator.generateReport(backHotspots, 'back'));

// Test click detection with sample points
console.log('\n========================================');
console.log('CLICK DETECTION ACCURACY TESTS');
console.log('========================================\n');

// Front view test points (in normalized 0-1 coordinates)
const frontTestPoints = [
  { x: 0.475, y: 0.05, expectedName: 'Forehead (Central Superior)' },
  { x: 0.33, y: 0.03, expectedName: 'Left Temple (Superior)' },
  { x: 0.475, y: 0.21, expectedName: 'Manubrium' },
  { x: 0.34, y: 0.72, expectedName: 'Left Patella' },
  { x: 0.17, y: 0.56, expectedName: 'Left Palm (Center)' },
];

console.log('FRONT VIEW TESTS:');
HotspotValidator.testClickAccuracy(frontHotspots, frontTestPoints);

// Back view test points
const backTestPoints = [
  { x: 0.475, y: 0.05, expectedName: 'Occiput (Inion/External Occipital Protuberance)' },
  { x: 0.475, y: 0.16, expectedName: 'Thoracic Spine (T1-T2 - Left Paraspinal)' },
  { x: 0.475, y: 0.39, expectedName: 'Lumbar Spine (L1-L3 - Left Paraspinal)' },
  { x: 0.38, y: 0.53, expectedName: 'L Gluteal (Mid-Medial)' },
  { x: 0.35, y: 0.89, expectedName: 'Left Achilles Tendon' },
];

console.log('\nBACK VIEW TESTS:');
HotspotValidator.testClickAccuracy(backHotspots, backTestPoints);

console.log('\n========================================');
console.log('VALIDATION COMPLETE');
console.log('========================================\n');
