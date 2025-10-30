# Pain Map Hotspot System Documentation

## Overview
The pain assessment application uses a comprehensive anatomical hotspot system with **523 precisely mapped body regions** across front and back views of the human body.

## Hotspot Statistics
- **Front View**: 134 hotspots
- **Back View**: 389 hotspots
- **Total**: 523 hotspots
- **Validation Status**: ✅ 100% valid coordinates

## Coordinate System
- **Format**: Normalized coordinates (0.0 to 1.0 scale)
- **Origin**: Top-left corner of body diagram image
- **x**: Horizontal position (0.0 = left edge, 1.0 = right edge)
- **y**: Vertical position (0.0 = top edge, 1.0 = bottom edge)
- **width/height**: Size of clickable region as percentage of image dimensions

## Hotspot Structure
```typescript
interface Hotspot {
  id: number;           // Region group ID (1-45)
  name: string;         // Anatomical region name
  x: number;            // Normalized X coordinate (0-1)
  y: number;            // Normalized Y coordinate (0-1)
  width: number;        // Normalized width (0-1)
  height: number;       // Normalized height (0-1)
  isDetail?: boolean;   // True for granular anatomical details
}
```

## Anatomical Coverage

### Head & Neck (Front)
- Forehead (6 subdivisions: central, left, right - superior & inferior)
- Temples (4 regions: left & right - superior & inferior)
- Eyebrows (left, right, glabella)
- Eyelids (4 regions: upper & lower for each eye)
- Nose (5 regions: bridge, dorsum, alae, tip)
- Cheeks (4 regions: zygomatic arch, buccal mid)
- Lips (philtrum, upper, lower)
- Chin & mandible
- Anterior neck (7 regions: submental, hyoid, thyroid, carotid triangles, suprasternal notch)

### Head & Neck (Back)
- Vertex (top of head)
- Occiput (6 regions: superior nuchal line, inion, suboccipital)
- Cervical spine (C2-C7 spinous processes)
- Posterior neck (lateral regions)

### Upper Extremities (Both Views)
**Each arm has 100+ hotspots including:**
- Shoulder (anterior, posterior, acromion)
- Upper arm (biceps, triceps, deltoid heads)
- Elbow (anterior, posterior, olecranon)
- Forearm (volar, dorsal - proximal & distal, medial & lateral)
- Wrist (anterior, posterior, palmar crease)
- Hand (palm, dorsum, metacarpals)
- Individual fingers (thumb, index, middle, ring, pinky)

### Trunk (Front)
- Clavicles (left & right, including joints)
- Sternum (manubrium, body upper & lower)
- Pectoral muscles (8 subdivisions per side: superior/inferior, medial/lateral)
- Ribs (upper, middle, lower for each side)
- Abdomen (epigastrium, quadrants, umbilicus, flanks)
- Pelvis (pubic area, inguinal ligament regions)

### Trunk (Back)
- Scapulae (multiple regions: acromion, spine, infraspinatus, supraspinatus, teres)
- Trapezius (upper, mid, lower subdivisions)
- Rhomboids
- Thoracic spine (T1-T12 with paraspinal regions)
- Latissimus dorsi
- Lumbar spine (L1-L5 with extensive paraspinal coverage - 100+ hotspots)
- Erector spinae muscles
- Quadratus lumborum
- Sacrum (multiple subdivisions including sacral alae, SI joints, PSIS)
- Coccyx

### Lower Extremities (Both Views)
**Each leg has 100+ hotspots including:**
- Hip (anterior, posterior, greater trochanter, hip flexors)
- Gluteal region (20+ subdivisions)
- Thigh (anterior: quadriceps; posterior: hamstrings with proximal, mid, distal sections)
- Inner & outer thigh (multiple subdivisions)
- Knee (patella, suprapatellar, infrapatellar, popliteal)
- Lower leg (shin/tibialis, calf/gastrocnemius/soleus, lateral regions)
- Ankle (medial malleolus, lateral malleolus, anterior, posterior)
- Foot (dorsum, plantar, heel, arch, forefoot)
- Toes (hallux, toes 2-5)
- Sciatic nerve path

## Click Detection Algorithm

### Process Flow
1. User clicks on body diagram
2. Click coordinates are captured relative to displayed image
3. Coordinates are normalized to 0-1 scale
4. Canvas pixel alpha is checked to ensure click is on body (not transparent background)
5. All hotspots for current view are searched
6. Closest hotspot center to click point is identified using Euclidean distance
7. Pain point is created with selected hotspot's anatomical name
8. Anatomical correction is applied for front view (see below)

### Anatomical Correction (Front View)
Due to the horizontal flip nature of medical diagrams:
- Hotspots labeled "Left" are corrected to "Right" when clicked
- Hotspots labeled "Right" are corrected to "Left" when clicked
- This ensures anatomical accuracy (patient's left = their actual left side)
- Back view does not require correction

### Click Accuracy
- **Pixel-Perfect Detection**: Canvas alpha channel check prevents clicks on transparent areas
- **Closest Hotspot Match**: Uses center-point distance calculation
- **Sub-Region Precision**: Detail hotspots (isDetail: true) allow fine-grained anatomical selection
- **No Coordinate Mirroring**: Pain points render at exact click location (hotspots pre-positioned correctly)

## Usage in Application

### Patient Interaction
1. Toggle between front/back views using button controls
2. Click on any body region to place a pain point
3. System automatically identifies the anatomical region using hotspot detection
4. Modal opens showing:
   - **"Edit Pain Point"** title
   - **Detected anatomical region name** (e.g., "Left Upper Trapezius") displayed below title in primary color
   - Pain intensity slider (0-10)
   - Pain quality selectors (musculoskeletal, neuropathic, visceral, other)
   - Radiation notes textarea
5. Pain point appears as a colored dot on body diagram
6. Click existing pain point to edit details
7. Multiple pain points can be added per region
8. Pain points list shows all added regions with intensities and qualities

### UI Components
- **BodyMap Component** (`client/src/components/ui/BodyMap.tsx`):
  - Integrates 523 hotspot definitions
  - Implements `findClosestHotspot()` for region detection
  - Implements `correctAnatomicalLabel()` for front view left/right swapping
  - Displays modal with region name when editing pain points
  - Shows pain points list with region names and details

### Data Storage
```typescript
interface PainArea {
  id: string;                    // Unique identifier
  region: string;                // Anatomical name (corrected for patient orientation)
  intensity: number;             // 1-10 scale
  coordinates: { x, y };         // Display coordinates
  notes: string;                 // Contains: view, regionID, original label
}
```

### AI Integration
Pain point data is sent to Claude AI with:
- Anatomical region names
- Intensity scores
- Distribution patterns
- Red flag symptom correlations

## Validation Results
✅ All 523 hotspots validated:
- Coordinates within bounds (0-1 range)
- No overlapping regions (except intentional detail points)
- Comprehensive anatomical coverage
- Consistent naming conventions

## Future Enhancements
- Add visual hover effects showing hotspot boundaries
- Implement clickable region highlighting
- Add anatomical diagrams showing nerve/dermatomal distributions
- Include muscle group overlays
- Add ability to export pain maps as annotated images

## Technical Notes

- Hotspots defined in `client/src/components/steps/PainMappingStep.tsx` (exported for use in BodyMap)
- Validation utility in `client/src/utils/validateHotspots.ts`
- Body diagram images in `client/src/assets/`
- Pain map capture uses html2canvas library
- Images uploaded to server at `/server/public/uploads/assessment_files/{sessionId}/`
- BodyMap component displays anatomical region names in pain point editor modal
- Console logging available for debugging: "Detected region: [name] from hotspot: [original name]"

## Recent Updates

### October 2025
- ✅ Integrated 523 anatomical hotspots into BodyMap component
- ✅ Added automatic region detection using Euclidean distance algorithm
- ✅ Implemented anatomical label correction for front view (left/right swap)
- ✅ Added region name display in pain point editor modal
- ✅ Validated all 523 hotspots (100% valid coordinates)
- ✅ Created comprehensive hotspot validation system
- ✅ Automated deployment workflow via Coolify Dockerfile (no manual dist builds)
- ✅ Improved timing slider UI layout for better clarity
