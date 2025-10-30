import React, { useState, useRef } from 'react';
import { cn } from '../../lib/utils';
import bodyFront from '../../assets/body-front.png';
import bodyBack from '../../assets/body-back.png';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Slider } from './Slider';
import { Chip } from './Chip';
import { Textarea } from './Textarea';
import { Button } from './Button';
import type { PainPoint, PainQuality } from '../../types/assessment';
import { PAIN_QUALITY_GROUPS } from '../../types/assessment';

export interface BodyMapProps {
  points: PainPoint[];
  onPointsChange: (points: PainPoint[]) => void;
  className?: string;
}

interface TempPin {
  x: number;
  y: number;
  view: 'front' | 'back';
}

interface Hotspot {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDetail?: boolean;
}

// Import hotspot definitions from PainMappingStep
import { frontHotspots, backHotspots } from '../steps/PainMappingStep';

export const BodyMap: React.FC<BodyMapProps> = ({
  points,
  onPointsChange,
  className,
}) => {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [tempPin, setTempPin] = useState<TempPin | null>(null);
  const [editingPoint, setEditingPoint] = useState<PainPoint | null>(null);
  const [expandedQualityGroups, setExpandedQualityGroups] = useState<Set<string>>(new Set());
  const [showRadiationField, setShowRadiationField] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  const getDefaultRegionName = (targetView: 'front' | 'back') =>
    `${targetView === 'front' ? 'Front' : 'Back'} - Custom Location`;

  /**
   * Find the closest hotspot to a click position
   */
  const findClosestHotspot = (
    clickX: number,
    clickY: number,
    targetView: 'front' | 'back',
    imageWidth: number,
    imageHeight: number
  ): Hotspot | null => {
    const hotspotsToSearch = targetView === 'front' ? frontHotspots : backHotspots;
    
    if (hotspotsToSearch.length === 0) return null;

    let closestHotspot: Hotspot | null = null;
    let minDistance = Infinity;

    for (const hotspot of hotspotsToSearch) {
      const hsCenterX = hotspot.x * imageWidth + (hotspot.width * imageWidth) / 2;
      const hsCenterY = hotspot.y * imageHeight + (hotspot.height * imageHeight) / 2;
      const distance = Math.sqrt(
        Math.pow(clickX - hsCenterX, 2) + Math.pow(clickY - hsCenterY, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestHotspot = hotspot;
      }
    }

    return closestHotspot;
  };

  /**
   * Correct anatomical labels for front view (swap left/right)
   */
  const correctAnatomicalLabel = (name: string, targetView: 'front' | 'back'): string => {
    if (targetView !== 'front') return name;
    
    // For front view, swap "Left" and "Right" in the region name
    if (name.includes('Left')) {
      return name.replace('Left', 'Right');
    } else if (name.includes('Right')) {
      return name.replace('Right', 'Left');
    }
    return name;
  };

  const resolvePointView = (point: PainPoint): 'front' | 'back' => {
    if (point.view === 'front' || point.view === 'back') {
      return point.view;
    }
    if (point.regionName && point.regionName.toLowerCase().includes('back')) {
      return 'back';
    }
    return 'front';
  };

  const changeView = (nextView: 'front' | 'back') => {
    setView(nextView);
    setTempPin(null);
    if (editingPoint && resolvePointView(editingPoint) !== nextView) {
      setEditingPoint(null);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const imageWidth = rect.width;
    const imageHeight = rect.height;
    
    // Convert to percentage for storage
    const x = (clickX / imageWidth) * 100;
    const y = (clickY / imageHeight) * 100;

    // Find the closest anatomical hotspot
    const hotspot = findClosestHotspot(clickX, clickY, view, imageWidth, imageHeight);
    
    let regionName = getDefaultRegionName(view);
    let regionId = 0;
    
    if (hotspot) {
      // Apply anatomical correction for front view (swap left/right)
      regionName = correctAnatomicalLabel(hotspot.name, view);
      regionId = hotspot.id;
      console.log('Detected region:', regionName, 'from hotspot:', hotspot.name);
    } else {
      console.log('No hotspot found, using default name');
    }

    // Create new temporary pin
    const newPin: TempPin = { x, y, view };
    setTempPin(newPin);

    // Create new pain point with detected region name
    const newPoint: PainPoint = {
      id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      regionId,
      regionName,
      view,
      coords: { x, y },
      intensityCurrent: 5,
      qualities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEditingPoint(newPoint);
  };

  const handleSavePoint = () => {
    if (!editingPoint) return;

    const updatedPoints = [...points];
    const existingIndex = updatedPoints.findIndex((p) => p.id === editingPoint.id);

    const pointView = resolvePointView(editingPoint);
    const normalizedPoint: PainPoint = {
      ...editingPoint,
      view: pointView,
      regionName: editingPoint.regionName || getDefaultRegionName(pointView),
    };

    if (existingIndex >= 0) {
      updatedPoints[existingIndex] = normalizedPoint;
    } else {
      updatedPoints.push(normalizedPoint);
    }

    onPointsChange(updatedPoints);
    setEditingPoint(null);
    setTempPin(null);
    setExpandedQualityGroups(new Set()); // Reset expanded groups
    setShowRadiationField(false); // Reset radiation field
  };

  const handleCancelEdit = () => {
    setEditingPoint(null);
    setTempPin(null);
    setExpandedQualityGroups(new Set());
    setShowRadiationField(false);
  };

  const handleDeletePoint = (pointId: string) => {
    onPointsChange(points.filter((p) => p.id !== pointId));
    if (editingPoint?.id === pointId) {
      setEditingPoint(null);
      setTempPin(null);
    }
  };

  const handleEditExistingPoint = (point: PainPoint) => {
    const pointView = resolvePointView(point);
    setView(pointView);
    setEditingPoint({
      ...point,
      view: pointView,
      regionName: point.regionName || getDefaultRegionName(pointView),
    });
    setTempPin(null);
  };

  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (editingPoint && !isNaN(value)) {
      setEditingPoint({
        ...editingPoint,
        intensityCurrent: value,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleQualityToggle = (quality: PainQuality) => {
    if (!editingPoint) return;

    const qualities = editingPoint.qualities || [];
    const updated = qualities.includes(quality)
      ? qualities.filter((q) => q !== quality)
      : [...qualities, quality];

    setEditingPoint({
      ...editingPoint,
      qualities: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleQualityGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedQualityGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedQualityGroups(newExpanded);
  };

  // Get points for current view
  const viewPoints = points.filter((p) => resolvePointView(p) === view);

  return (
    <div className={cn('space-y-6', className)}>
      {/* View Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant={view === 'front' ? 'primary' : 'outline'}
          onClick={() => changeView('front')}
        >
          Front View
        </Button>
        <Button
          variant={view === 'back' ? 'primary' : 'outline'}
          onClick={() => changeView('back')}
        >
          Back View
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Body Image with Pins */}
        <div className="relative">
          <div
            ref={imageRef}
            onClick={handleImageClick}
            className="relative mx-auto max-w-md cursor-crosshair overflow-hidden rounded-xl border border-border bg-surface shadow-elevation-1 touch-manipulation"
          >
            <img
              src={view === 'front' ? bodyFront : bodyBack}
              alt={`Body ${view} view`}
              className="h-auto w-full select-none"
              draggable={false}
            />

            {/* Render existing pins */}
            {viewPoints.map((point) => {
              if (!point.coords) return null;
              const pointView = resolvePointView(point);
              const isActive = editingPoint?.id === point.id;
              const baseColorClass = pointView === 'back' ? 'bg-info' : 'bg-danger';
              const ringClasses = isActive
                ? pointView === 'back'
                  ? 'ring-2 ring-info ring-offset-2'
                  : 'ring-2 ring-danger ring-offset-2'
                : '';

              return (
                <button
                  key={point.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditExistingPoint(point);
                  }}
                  className={cn(
                    'absolute -translate-x-1/2 -translate-y-1/2 transform',
                    'rounded-full border-2 border-white shadow-lg transition-transform',
                    'touch-manipulation hover:scale-125 active:scale-125',
                    'h-8 w-8 sm:h-6 sm:w-6', // Larger tap targets on mobile
                    baseColorClass,
                    isActive && 'scale-110',
                    ringClasses
                  )}
                  style={{
                    left: `${point.coords.x}%`,
                    top: `${point.coords.y}%`,
                  }}
                  title={`Pain intensity: ${point.intensityCurrent}/10`}
                />
              );
            })}

            {/* Temp pin while editing */}
            {tempPin && tempPin.view === view && (
              <div
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2 transform animate-pulse rounded-full border-2 border-white shadow-lg',
                  'h-8 w-8 sm:h-6 sm:w-6',
                  tempPin.view === 'back' ? 'bg-info' : 'bg-danger'
                )}
                style={{
                  left: `${tempPin.x}%`,
                  top: `${tempPin.y}%`,
                }}
              />
            )}

            {/* Instructions overlay */}
            {!editingPoint && points.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
                <div className="rounded-lg bg-surface p-4 sm:p-6 text-center max-w-xs">
                  <p className="text-base sm:text-lg font-semibold text-text">Click to Add Pain Point</p>
                  <p className="mt-2 text-xs sm:text-sm text-text-muted">
                    Tap anywhere on the body to mark a pain location
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-xs sm:text-sm text-text-muted px-4">
            {editingPoint 
              ? 'Editing pain point - complete the form below or tap another point'
              : 'Tap on the body image to add pain points'}
          </p>
        </div>

        {/* Pain Point Editor - Mobile: Bottom Sheet | Tablet: Overlay | Desktop: Sidebar */}
        {editingPoint ? (
          <>
            {/* Mobile & Tablet: Overlay backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={handleCancelEdit}
              aria-hidden="true"
            />
            
            {/* Editor Panel */}
            <div className={cn(
              // Mobile: Bottom sheet - more compact
              "fixed bottom-0 left-0 right-0 z-50",
              "max-h-[80vh] overflow-y-auto",
              "rounded-t-2xl border-t border-border bg-surface shadow-2xl",
              // Tablet: Centered modal
              "sm:fixed sm:inset-x-4 sm:bottom-4 sm:top-auto",
              "sm:max-w-2xl sm:mx-auto sm:rounded-2xl sm:border",
              "sm:max-h-[85vh]",
              // Desktop: Sidebar (relative positioning in grid)
              "lg:static lg:z-auto lg:max-h-none",
              "lg:rounded-xl lg:shadow-elevation-1",
              "p-3 sm:p-6"
            )}>
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex-1 pr-2">
                  <h3 className="text-base sm:text-lg font-semibold text-text">Edit Pain Point</h3>
                  <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-primary font-medium break-words">
                    {editingPoint.regionName || 'Custom Location'}
                  </p>
                </div>
                <button
                  onClick={handleCancelEdit}
                  className="rounded-lg p-2 hover:bg-surface-secondary flex-shrink-0 touch-manipulation"
                  aria-label="Close editor"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-6">{/* Intensity Slider */}
                {/* Intensity Slider */}
                <div>
                  <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-medium text-text">
                    Pain Intensity (0-10) *
                  </label>
                  <Slider
                    min={0}
                    max={10}
                    value={editingPoint.intensityCurrent}
                    onChange={handleIntensityChange}
                  />
                  <p className="mt-1 sm:mt-2 text-center text-lg sm:text-2xl font-bold text-primary">
                    {editingPoint.intensityCurrent}/10
                  </p>
                </div>

                {/* Pain Qualities - Collapsible on Mobile */}
                <div>
                  <label className="mb-2 block text-xs sm:text-sm font-medium text-text">
                    Pain Quality (Optional - Tap to expand)
                  </label>
                  <div className="space-y-2">
                    {Object.entries(PAIN_QUALITY_GROUPS).map(([groupKey, group]) => {
                      const isExpanded = expandedQualityGroups.has(groupKey);
                      const hasSelectedInGroup = (editingPoint.qualities || []).some(q => 
                        group.qualities.includes(q)
                      );
                      const selectedCount = (editingPoint.qualities || []).filter(q => 
                        group.qualities.includes(q)
                      ).length;

                      return (
                        <div key={groupKey} className="border border-border rounded-lg">
                          {/* Group Header - Clickable on mobile */}
                          <button
                            type="button"
                            onClick={() => toggleQualityGroup(groupKey)}
                            className={cn(
                              "w-full flex items-center justify-between p-3 sm:p-2",
                              "text-left transition-colors rounded-lg",
                              "lg:cursor-default lg:pointer-events-none",
                              !isExpanded && "hover:bg-surface-secondary lg:hover:bg-transparent"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-semibold text-text">
                                {group.label}
                              </p>
                              {hasSelectedInGroup && (
                                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                                  {selectedCount}
                                </span>
                              )}
                            </div>
                            {/* Show chevron only on mobile */}
                            <span className="lg:hidden">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-text-muted" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-text-muted" />
                              )}
                            </span>
                          </button>
                          
                          {/* Group Content - Always visible on desktop, collapsible on mobile */}
                          <div className={cn(
                            "px-3 pb-3 sm:px-2 sm:pb-2",
                            !isExpanded && "hidden lg:block"
                          )}>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {group.qualities.map((quality) => (
                                <Chip
                                  key={quality}
                                  selected={(editingPoint.qualities || []).includes(quality)}
                                  onClick={() => handleQualityToggle(quality)}
                                  size="sm"
                                >
                                  {quality.replace(/_/g, ' ')}
                                </Chip>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {(editingPoint.qualities || []).length > 0 && (
                    <p className="mt-2 text-xs text-text-muted">
                      {editingPoint.qualities.length} quality/qualities selected
                    </p>
                  )}
                </div>

                {/* Radiation - Collapsible on Mobile */}
                {!showRadiationField && !editingPoint.radiatesTo ? (
                  <button
                    type="button"
                    onClick={() => setShowRadiationField(true)}
                    className="w-full lg:hidden text-left text-sm text-primary hover:text-primary-dark underline"
                  >
                    + Add radiation notes (optional)
                  </button>
                ) : null}
                
                {(showRadiationField || editingPoint.radiatesTo || window.innerWidth >= 1024) && (
                  <Textarea
                    label="Does the pain radiate? (Optional)"
                    value={editingPoint.radiatesTo || ''}
                    onChange={(e) =>
                      setEditingPoint({
                        ...editingPoint,
                        radiatesTo: e.target.value,
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    placeholder="e.g., Down the left leg to the foot"
                    rows={2}
                    maxLength={200}
                  />
                )}

                {/* Action Buttons - Sticky on mobile */}
                <div className="flex gap-2 sm:gap-3 sticky bottom-0 bg-surface pt-2 pb-1 sm:pb-2 -mx-3 px-3 sm:-mx-0 sm:px-0 lg:static border-t lg:border-t-0 border-border lg:border-0 mt-2">
                  <Button variant="primary" onClick={handleSavePoint} className="flex-1 touch-manipulation text-sm sm:text-base py-2 sm:py-3">
                    Save Point
                  </Button>
                  {points.some((p) => p.id === editingPoint.id) && (
                    <Button
                      variant="danger"
                      onClick={() => handleDeletePoint(editingPoint.id)}
                      className="touch-manipulation text-sm sm:text-base py-2 sm:py-3"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Pain Points List - Hidden on Mobile when no points, Always visible on Desktop */
          <div className={cn(
            "rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-elevation-1",
            points.length === 0 && "hidden lg:block"
          )}>
            <h3 className="mb-4 text-base sm:text-lg font-semibold text-text">
              Pain Points ({points.length})
            </h3>

            {points.length === 0 ? (
              <p className="text-sm italic text-text-muted">
                No pain points added yet. Tap on the body image to add.
              </p>
            ) : (
              <div className="space-y-3">
                {points.map((point) => {
                  const pointView = resolvePointView(point);
                  const viewBadgeColor =
                    pointView === 'back' ? 'bg-info' : 'bg-danger';
                  const viewLabel = pointView === 'back' ? 'Back view' : 'Front view';

                  return (
                    <button
                      key={point.id}
                      onClick={() => handleEditExistingPoint(point)}
                      className="w-full rounded-lg border border-border p-3 sm:p-4 text-left transition-colors hover:bg-surface-secondary active:bg-surface-secondary touch-manipulation"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text text-sm sm:text-base truncate">
                            {point.regionName || 'Pain Point'}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs uppercase text-text-muted">
                            <span
                              className={cn(
                                'inline-block h-2 w-2 rounded-full flex-shrink-0',
                                viewBadgeColor
                              )}
                              aria-hidden="true"
                            />
                            <span>{viewLabel}</span>
                          </div>
                          <p className="mt-1 text-xs sm:text-sm text-text-muted">
                            Intensity: {point.intensityCurrent}/10
                          </p>
                          {point.qualities && point.qualities.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {point.qualities.slice(0, 3).map((quality) => (
                                <span
                                  key={quality}
                                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                                >
                                  {quality.replace(/_/g, ' ')}
                                </span>
                              ))}
                              {point.qualities.length > 3 && (
                                <span className="text-xs text-text-muted">
                                  +{point.qualities.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePoint(point.id);
                          }}
                          className="ml-2 rounded p-1 hover:bg-danger/10 flex-shrink-0 touch-manipulation"
                          aria-label="Delete pain point"
                        >
                          <X className="h-4 w-4 text-danger" />
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile: Floating summary badge when points exist and not editing */}
      {!editingPoint && points.length > 0 && (
        <div className="lg:hidden fixed bottom-20 right-4 z-30">
          <div className="rounded-full bg-primary px-4 py-2 shadow-lg">
            <p className="text-sm font-semibold text-white">
              {points.length} pain point{points.length !== 1 ? 's' : ''} added
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
