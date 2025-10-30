/**
 * Validation utility for pain map hotspots
 * Ensures all anatomical regions are properly defined and positioned
 */

interface Hotspot {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDetail?: boolean;
}

interface ValidationResult {
  totalHotspots: number;
  validHotspots: number;
  invalidHotspots: Hotspot[];
  overlappingHotspots: Array<{ a: Hotspot; b: Hotspot }>;
  outOfBoundsHotspots: Hotspot[];
  duplicateNames: Array<{ name: string; count: number }>;
  coverage: {
    totalArea: number;
    coveredArea: number;
    coveragePercentage: number;
  };
}

export class HotspotValidator {
  /**
   * Validate that a hotspot's coordinates are within bounds (0-1 range)
   */
  static isWithinBounds(hotspot: Hotspot): boolean {
    const { x, y, width, height } = hotspot;
    return (
      x >= 0 &&
      y >= 0 &&
      width > 0 &&
      height > 0 &&
      x + width <= 1.0 &&
      y + height <= 1.0
    );
  }

  /**
   * Check if two hotspots overlap
   */
  static doHotspotsOverlap(a: Hotspot, b: Hotspot): boolean {
    // If they have the same ID, they're intentionally overlapping detail points
    if (a.id === b.id) return false;

    const aRight = a.x + a.width;
    const aBottom = a.y + a.height;
    const bRight = b.x + b.width;
    const bBottom = b.y + b.height;

    return !(aRight < b.x || bRight < a.x || aBottom < b.y || bBottom < a.y);
  }

  /**
   * Find the hotspot closest to a click point
   */
  static findClosestHotspot(
    clickX: number,
    clickY: number,
    hotspots: Hotspot[]
  ): { hotspot: Hotspot; distance: number } | null {
    if (hotspots.length === 0) return null;

    let closestHotspot: Hotspot | null = null;
    let minDistance = Infinity;

    for (const hotspot of hotspots) {
      const centerX = hotspot.x + hotspot.width / 2;
      const centerY = hotspot.y + hotspot.height / 2;
      const distance = Math.sqrt(
        Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestHotspot = hotspot;
      }
    }

    return closestHotspot ? { hotspot: closestHotspot, distance: minDistance } : null;
  }

  /**
   * Check if a point is inside a hotspot's bounds
   */
  static isPointInHotspot(x: number, y: number, hotspot: Hotspot): boolean {
    return (
      x >= hotspot.x &&
      x <= hotspot.x + hotspot.width &&
      y >= hotspot.y &&
      y <= hotspot.y + hotspot.height
    );
  }

  /**
   * Validate all hotspots in an array
   */
  static validateHotspots(hotspots: Hotspot[]): ValidationResult {
    const invalidHotspots: Hotspot[] = [];
    const outOfBoundsHotspots: Hotspot[] = [];
    const overlappingPairs: Array<{ a: Hotspot; b: Hotspot }> = [];
    const nameCount = new Map<string, number>();

    // Check each hotspot
    for (const hotspot of hotspots) {
      // Validate bounds
      if (!this.isWithinBounds(hotspot)) {
        outOfBoundsHotspots.push(hotspot);
      }

      // Validate dimensions
      if (
        hotspot.width <= 0 ||
        hotspot.height <= 0 ||
        isNaN(hotspot.x) ||
        isNaN(hotspot.y)
      ) {
        invalidHotspots.push(hotspot);
      }

      // Count name occurrences
      const count = nameCount.get(hotspot.name) || 0;
      nameCount.set(hotspot.name, count + 1);
    }

    // Check for overlaps (only report significant overlaps, not detail points)
    for (let i = 0; i < hotspots.length; i++) {
      for (let j = i + 1; j < hotspots.length; j++) {
        const a = hotspots[i];
        const b = hotspots[j];

        // Skip if either is a detail point with same ID
        if (a.id === b.id && (a.isDetail || b.isDetail)) continue;

        if (this.doHotspotsOverlap(a, b)) {
          // Calculate overlap percentage
          const overlapArea = this.calculateOverlapArea(a, b);
          const minArea = Math.min(a.width * a.height, b.width * b.height);
          const overlapPercentage = (overlapArea / minArea) * 100;

          // Only report significant overlaps (>30% of smaller region)
          if (overlapPercentage > 30) {
            overlappingPairs.push({ a, b });
          }
        }
      }
    }

    // Find duplicate names
    const duplicateNames: Array<{ name: string; count: number }> = [];
    nameCount.forEach((count, name) => {
      if (count > 1) {
        duplicateNames.push({ name, count });
      }
    });

    // Calculate coverage
    const totalArea = 1.0; // Full image area
    const coveredArea = this.calculateTotalCoverage(hotspots);
    const coveragePercentage = (coveredArea / totalArea) * 100;

    return {
      totalHotspots: hotspots.length,
      validHotspots: hotspots.length - invalidHotspots.length - outOfBoundsHotspots.length,
      invalidHotspots,
      overlappingHotspots: overlappingPairs,
      outOfBoundsHotspots,
      duplicateNames,
      coverage: {
        totalArea,
        coveredArea,
        coveragePercentage,
      },
    };
  }

  /**
   * Calculate the area of overlap between two hotspots
   */
  private static calculateOverlapArea(a: Hotspot, b: Hotspot): number {
    const xOverlap = Math.max(
      0,
      Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
    );
    const yOverlap = Math.max(
      0,
      Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
    );
    return xOverlap * yOverlap;
  }

  /**
   * Calculate total coverage area (accounting for overlaps)
   */
  private static calculateTotalCoverage(hotspots: Hotspot[]): number {
    // Simple approximation: sum all areas (overlaps will inflate this slightly)
    return hotspots.reduce((sum, h) => sum + h.width * h.height, 0);
  }

  /**
   * Generate a detailed validation report
   */
  static generateReport(hotspots: Hotspot[], view: string): string {
    const result = this.validateHotspots(hotspots);

    let report = `\n=== Pain Map Hotspot Validation Report (${view.toUpperCase()} VIEW) ===\n\n`;
    report += `Total Hotspots: ${result.totalHotspots}\n`;
    report += `Valid Hotspots: ${result.validHotspots} (${((result.validHotspots / result.totalHotspots) * 100).toFixed(1)}%)\n`;
    report += `Coverage: ${result.coverage.coveragePercentage.toFixed(1)}% of body image\n\n`;

    if (result.invalidHotspots.length > 0) {
      report += `❌ INVALID HOTSPOTS (${result.invalidHotspots.length}):\n`;
      result.invalidHotspots.forEach((h) => {
        report += `  - ID ${h.id}: "${h.name}" - Invalid dimensions or coordinates\n`;
      });
      report += `\n`;
    }

    if (result.outOfBoundsHotspots.length > 0) {
      report += `⚠️  OUT OF BOUNDS HOTSPOTS (${result.outOfBoundsHotspots.length}):\n`;
      result.outOfBoundsHotspots.forEach((h) => {
        report += `  - ID ${h.id}: "${h.name}" - x:${h.x.toFixed(3)}, y:${h.y.toFixed(3)}, w:${h.width.toFixed(3)}, h:${h.height.toFixed(3)}\n`;
      });
      report += `\n`;
    }

    if (result.overlappingHotspots.length > 0) {
      report += `🔄 SIGNIFICANT OVERLAPS (${result.overlappingHotspots.length}):\n`;
      result.overlappingHotspots.slice(0, 10).forEach(({ a, b }) => {
        report += `  - ID ${a.id} "${a.name}" ↔ ID ${b.id} "${b.name}"\n`;
      });
      if (result.overlappingHotspots.length > 10) {
        report += `  ... and ${result.overlappingHotspots.length - 10} more\n`;
      }
      report += `\n`;
    }

    if (result.duplicateNames.length > 0) {
      report += `📝 DUPLICATE NAMES (${result.duplicateNames.length}):\n`;
      result.duplicateNames.slice(0, 10).forEach(({ name, count }) => {
        report += `  - "${name}" appears ${count} times\n`;
      });
      if (result.duplicateNames.length > 10) {
        report += `  ... and ${result.duplicateNames.length - 10} more\n`;
      }
      report += `\n`;
    }

    if (
      result.invalidHotspots.length === 0 &&
      result.outOfBoundsHotspots.length === 0
    ) {
      report += `✅ All hotspots are valid and within bounds!\n\n`;
    }

    report += `=== END REPORT ===\n`;

    return report;
  }

  /**
   * Test click detection accuracy
   */
  static testClickAccuracy(
    hotspots: Hotspot[],
    testPoints: Array<{ x: number; y: number; expectedName?: string }>
  ): void {
    console.log(`\n=== Testing Click Detection Accuracy ===\n`);

    testPoints.forEach(({ x, y, expectedName }, index) => {
      const result = this.findClosestHotspot(x, y, hotspots);

      if (result) {
        const { hotspot, distance } = result;
        const isInside = this.isPointInHotspot(x, y, hotspot);
        const status = isInside ? '✓ INSIDE' : '⚠ OUTSIDE (closest)';

        console.log(
          `Test ${index + 1}: (${x.toFixed(3)}, ${y.toFixed(3)}) → ${status}`
        );
        console.log(`  Found: ID ${hotspot.id} "${hotspot.name}"`);
        console.log(`  Distance: ${distance.toFixed(4)}`);

        if (expectedName && hotspot.name !== expectedName) {
          console.log(`  ❌ Expected: "${expectedName}"`);
        }
      } else {
        console.log(`Test ${index + 1}: (${x.toFixed(3)}, ${y.toFixed(3)}) → ❌ NO HOTSPOT FOUND`);
      }
      console.log(``);
    });
  }
}
