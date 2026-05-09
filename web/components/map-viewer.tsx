'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { KMLField, MapOverlayResult } from '@/types';
import { IndexType } from '@/lib/spectral-indices';
import { escapeHtml } from '@/lib/utils';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

interface MapViewerProps {
  fields: KMLField[];
  selectedFieldId?: string;
  onFieldClick?: (fieldId: string) => void;
  indexResult?: MapOverlayResult | null;
  indexType?: IndexType | 'CLASSIFICATION';
  onNewField?: (coordinates: { latitude: number; longitude: number }[]) => void;
}

export function MapViewer({ fields, selectedFieldId, onFieldClick, indexResult, indexType, onNewField }: MapViewerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<Map<string, L.Polygon>>(new Map());
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [-4.879, -42.617],
      zoom: 13,
      zoomControl: true,
      minZoom: 3,
      maxZoom: 17,
    });

    // Add OpenStreetMap tiles
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 17,
      minZoom: 3,
    });

    // Add satellite imagery option (default layer)
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles © Esri',
        maxZoom: 17,
        minZoom: 3,
      }
    ).addTo(map);

    // Layer control (Satellite is already added as default)
    const baseMaps = {
      'Satellite': satelliteLayer,
      'Street Map': streetLayer,
    };

    L.control.layers(baseMaps).addTo(map);

    // Add search control
    const provider = new OpenStreetMapProvider();
    // leaflet-geosearch's typings export the control as a value, not a constructor;
    // this assertion narrows it to the actual class signature.
    const SearchCtrl = GeoSearchControl as unknown as new (
      opts: Record<string, unknown>
    ) => L.Control;
    const searchControl = new SearchCtrl({
      provider,
      style: 'bar',
      showMarker: true,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: false,
      searchLabel: 'Search for location...',
    });

    map.addControl(searchControl);

    // Add drawn items layer to map
    map.addLayer(drawnItemsRef.current);

    // Initialize draw control
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: '#e74c3c',
            message: '<strong>Error:</strong> Shape edges cannot cross!',
          },
          shapeOptions: {
            color: '#3b82f6',
            fillOpacity: 0.3,
          },
        },
        polyline: false,
        rectangle: {
          shapeOptions: {
            color: '#3b82f6',
            fillOpacity: 0.3,
          },
        },
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItemsRef.current,
        remove: true,
      },
    });

    map.addControl(drawControl);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle draw events separately to avoid map recreation
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    const handleDrawCreated = (event: L.LeafletEvent) => {
      const drawEvent = event as L.DrawEvents.Created;
      const layer = drawEvent.layer;
      drawnItemsRef.current.addLayer(layer);

      if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        const latLngs = layer.getLatLngs()[0] as L.LatLng[];
        const coordinates = latLngs.map((latLng) => ({
          latitude: latLng.lat,
          longitude: latLng.lng,
        }));

        if (onNewField) {
          onNewField(coordinates);
        }
      }
    };

    map.on(L.Draw.Event.CREATED, handleDrawCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, handleDrawCreated);
    };
  }, [onNewField]);

  useEffect(() => {
    if (!mapRef.current || fields.length === 0) return;

    const map = mapRef.current;

    // Clear existing layers
    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current.clear();

    // Add field polygons
    const bounds: L.LatLngBoundsExpression[] = [];

    fields.forEach((field) => {
      const coordinates: [number, number][] = field.coordinates.map((coord) => [
        coord.latitude,
        coord.longitude,
      ]);

      const isSelected = field.id === selectedFieldId;

      const polygon = L.polygon(coordinates, {
        color: isSelected ? '#3b82f6' : '#22c55e',
        fillColor: isSelected ? '#3b82f6' : '#22c55e',
        fillOpacity: isSelected ? 0.4 : 0.2,
        weight: isSelected ? 3 : 2,
      }).addTo(map);

      // Basic popup - will be updated when index is available
      polygon.bindPopup(`
        <div class="p-3 min-w-[280px]">
          <h3 class="font-bold text-lg mb-2">${escapeHtml(field.name)}</h3>
          <p class="text-sm text-gray-600">Field ID: ${escapeHtml(field.id)}</p>
          <p class="text-xs text-gray-500 mt-1">Click to select field</p>
        </div>
      `);

      polygon.on('click', () => {
        if (onFieldClick) {
          onFieldClick(field.id);
        }
      });

      layersRef.current.set(field.id, polygon);
      bounds.push(coordinates as L.LatLngBoundsExpression);
    });

    // Fit map to show all fields
    if (bounds.length > 0) {
      const latLngs = fields.flatMap(f =>
        f.coordinates.map(c => [c.latitude, c.longitude] as [number, number])
      );
      map.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
    }
  }, [fields, selectedFieldId, onFieldClick]);

  // Add index visualization overlay
  useEffect(() => {
    if (!mapRef.current || !indexResult || !selectedFieldId) return;

    const map = mapRef.current;
    const selectedField = fields.find(f => f.id === selectedFieldId);

    if (!selectedField) return;

    // Remove existing overlay
    if (imageOverlayRef.current) {
      imageOverlayRef.current.remove();
      imageOverlayRef.current = null;
    }

    // Calculate bounds for the selected field
    const coordinates = selectedField.coordinates.map(coord => [
      coord.latitude,
      coord.longitude,
    ] as [number, number]);

    const latLngs = L.latLngBounds(coordinates);

    // Create image overlay with the index result
    const imageUrl = `data:image/png;base64,${indexResult.image_base64}`;

    // Create a custom pane for the overlay if it doesn't exist
    if (!map.getPane('indexOverlay')) {
      map.createPane('indexOverlay');
      const pane = map.getPane('indexOverlay');
      if (pane) {
        pane.style.zIndex = '400'; // Below markers (600) but above tiles (200)
      }
    }

    const overlay = L.imageOverlay(imageUrl, latLngs, {
      opacity: 0.7,
      interactive: false,
      pane: 'indexOverlay',
      className: 'index-overlay-image',
    }).addTo(map);

    imageOverlayRef.current = overlay;

    // Update the selected field polygon to have no fill but keep border visible
    const selectedPolygon = layersRef.current.get(selectedFieldId);
    if (selectedPolygon) {
      selectedPolygon.setStyle({
        fillOpacity: 0,
        color: '#3b82f6',
        weight: 3,
      });
      selectedPolygon.bringToFront();

      // Update popup with index information
      const field = selectedField;

      const calendarIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
      const folderIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
      const closeIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

      const identifiedDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      // Build popup tailored to the kind of overlay being shown.
      let popupHtml: string;

      if (indexResult.kind === 'classification') {
        // Classification overlay: show area breakdown, no spectral stress level.
        const cstats = indexResult.statistics;
        popupHtml = `
          <div class="p-4 min-w-[320px] font-sans">
            <div class="flex justify-between items-start mb-3">
              <h3 class="font-bold text-xl">Classification</h3>
              <span class="text-gray-300">${closeIcon}</span>
            </div>
            <div class="text-sm text-gray-500 mb-3">${escapeHtml(field.id)}</div>
            <div class="flex items-center gap-2 text-sm mb-4 text-gray-600">
              <span class="text-gray-500">Identified:</span>
              <span class="flex items-center gap-1">${calendarIcon} ${escapeHtml(identifiedDate)}</span>
            </div>
            <div class="bg-gray-50 rounded-lg p-3 mb-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Total area (ha)</span>
                <span class="text-sm font-medium">${cstats.total_area.toFixed(2)}</span>
              </div>
              <div class="flex items-center justify-between mt-2">
                <span class="text-sm text-gray-600">Classified (ha)</span>
                <span class="text-sm font-medium">${cstats.classified_area.toFixed(2)}</span>
              </div>
              <div class="flex items-center justify-between mt-2">
                <span class="text-sm text-gray-600">Unclassified (%)</span>
                <span class="text-sm font-medium">${cstats.unclassified_percentage.toFixed(1)}</span>
              </div>
            </div>
          </div>
        `;
      } else {
        // Spectral overlay: NDVI / EVI / SAVI / RGB / band visualization.
        const stats = indexResult.statistics;
        const avgNDVI = stats.mean;

        let stressLevel = 'Unknown';
        let stressColor = '#6b7280';
        let stressIconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';

        if (indexType === 'NDVI') {
          if (avgNDVI < 0.2) {
            stressLevel = 'Severe Stress';
            stressColor = '#dc2626';
            stressIconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#dc2626"><circle cx="12" cy="12" r="10"/></svg>';
          } else if (avgNDVI < 0.4) {
            stressLevel = 'Moderate Stress';
            stressColor = '#ea580c';
            stressIconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ea580c"><circle cx="12" cy="12" r="10"/></svg>';
          } else if (avgNDVI < 0.6) {
            stressLevel = 'Mild Stress';
            stressColor = '#ca8a04';
            stressIconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ca8a04"><circle cx="12" cy="12" r="10"/></svg>';
          } else {
            stressLevel = 'Healthy';
            stressColor = '#16a34a';
            stressIconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a"><circle cx="12" cy="12" r="10"/></svg>';
          }
        }

        popupHtml = `
          <div class="p-4 min-w-[320px] font-sans">
            <div class="flex justify-between items-start mb-3">
              <h3 class="font-bold text-xl">${escapeHtml(stressLevel)}</h3>
              <span class="text-gray-300">${closeIcon}</span>
            </div>
            <div class="text-sm text-gray-500 mb-3">${escapeHtml(field.id)}</div>
            <div class="flex items-center gap-2 text-sm mb-4 text-gray-600">
              <span class="text-gray-500">Identified:</span>
              <span class="flex items-center gap-1">${calendarIcon} ${escapeHtml(identifiedDate)}</span>
            </div>
            <div class="bg-gray-50 rounded-lg p-3 mb-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Area</span>
                <span class="text-sm font-medium">${field.coordinates.length} points</span>
              </div>
              <div class="flex items-center justify-between mt-2">
                <span class="text-sm text-gray-600">${escapeHtml(indexType ?? '')}:</span>
                <span class="text-lg font-bold flex items-center gap-2" style="color: ${stressColor}">${stressIconSvg} ${avgNDVI.toFixed(2)}</span>
              </div>
            </div>
            <details class="mb-3">
              <summary class="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2 py-2">
                ${folderIcon} <span>Details</span>
              </summary>
              <div class="pl-6 pt-2 text-sm text-gray-600">
                <p>Status: ${escapeHtml(stressLevel)}</p>
                <p>Range: ${stats.min.toFixed(2)} - ${stats.max.toFixed(2)}</p>
                <p>Std Dev: ${stats.std.toFixed(3)}</p>
              </div>
            </details>
          </div>
        `;
      }

      selectedPolygon.bindPopup(popupHtml);
    }

  }, [indexResult, selectedFieldId, fields, indexType]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full rounded-lg overflow-hidden border border-border"
    />
  );
}
