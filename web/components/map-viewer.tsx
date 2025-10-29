'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { KMLField } from '@/types';

interface MapViewerProps {
  fields: KMLField[];
  selectedFieldId?: string;
  onFieldClick?: (fieldId: string) => void;
}

export function MapViewer({ fields, selectedFieldId, onFieldClick }: MapViewerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<Map<string, L.Polygon>>(new Map());

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [-4.879, -42.617],
      zoom: 13,
      zoomControl: true,
    });

    // Add OpenStreetMap tiles
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add satellite imagery option
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles © Esri',
        maxZoom: 19,
      }
    );

    // Layer control
    const baseMaps = {
      'Street Map': streetLayer,
      'Satellite': satelliteLayer,
    };

    L.control.layers(baseMaps).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

      polygon.bindPopup(`
        <div class="p-2">
          <h3 class="font-bold text-lg">${field.name}</h3>
          <p class="text-sm text-gray-600">Field ID: ${field.id}</p>
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

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full rounded-lg overflow-hidden border border-border"
    />
  );
}
