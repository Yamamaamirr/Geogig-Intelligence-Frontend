import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import './App.css';
import ThemeSelector from './ThemeSwitcher'; 

mapboxgl.accessToken = 'pk.eyJ1IjoidGFsaGF3YXFxYXMxNCIsImEiOiJjbHBreHhscWEwMWU4MnFyenU3ODdmeTdsIn0.8IlEgMNGcbx806t363hDJg';

const MapboxMap = ({ layers,zoomid,setZoom,Rasterzoomid,tiffLayers,setRasterzoomid}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

console.log(Rasterzoomid);
  const epsg3857toEpsg4326 = (pos) => {
    let [x, y] = pos;
    x = (x * 180) / 20037508.34;
    y = (y * 180) / 20037508.34;
    y = (Math.atan(Math.exp(y * (Math.PI / 180))) * 360) / Math.PI - 90;
    return [x, y];
  };

  const returnEPSG4326 = (coordinates) => {
    if (Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90) {
      return epsg3857toEpsg4326(coordinates);
    }
    return coordinates;
  };

  const transformCoords = (coords) => {
    if (typeof coords[0] === 'number') {
      return returnEPSG4326(coords);
    } else if (Array.isArray(coords[0])) {
      return coords.map(coord => returnEPSG4326(coord));
    }
  };

  const convertGeometry = (geometry) => {
    const geomType = geometry.type;
    if (geomType === 'Point') {
      geometry.coordinates = transformCoords(geometry.coordinates);
    } else if (geomType === 'LineString' || geomType === 'MultiPoint') {
      geometry.coordinates = transformCoords(geometry.coordinates);
    } else if (geomType === 'Polygon' || geomType === 'MultiLineString') {
      geometry.coordinates = geometry.coordinates.map(ring => transformCoords(ring));
    } else if (geomType === 'MultiPolygon') {
      geometry.coordinates = geometry.coordinates.map(polygon => polygon.map(ring => transformCoords(ring)));
    }
    return geometry;
  };

  const convertGeoJSON = (geojsonData) => {
    geojsonData.features.forEach(feature => {
      feature.geometry = convertGeometry(feature.geometry);
    });
    return geojsonData;
  };

  const initializeMap = useCallback(() => {
    if (mapRef.current) return; 

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11', 
      center: [0, 0],
      zoom: 1,
      attributionControl: false
    });

    mapRef.current = map;

    map.on('load', () => {
      setMapLoaded(true); // Map is now loaded
    });

    map.on('resize', () => map.resize()); // Handle map resizing on window resize

    return () => map.remove(); // Clean up the map instance on component unmount
  }, []);

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);
   
  useEffect(() => {
    if (!mapLoaded || !zoomid) return;
  
    const map = mapRef.current;
    if (!map) return;
  
    // Find the layer that corresponds to the zoomToLayerId
    const selectedLayer = layers.find(layer => layer.id === zoomid);
  
    if (selectedLayer) {
      const bounds = new mapboxgl.LngLatBounds();
  
      selectedLayer.data.features.forEach(feature => {
        const geometryType = feature.geometry.type;
  
        if (geometryType === 'Point') {
          bounds.extend(feature.geometry.coordinates);
        } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
          feature.geometry.coordinates.forEach(coord => bounds.extend(coord));
        } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
          const coordinates = geometryType === 'Polygon'
            ? feature.geometry.coordinates[0] // Outer boundary of the polygon
            : feature.geometry.coordinates.flat(2); // Flatten coordinates for MultiPolygon
          coordinates.forEach(coord => bounds.extend(coord));
        }

        setZoom(null);

      });
  
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 15,duration: 1 }); // Zoom to fit the layer
      }
    }
  
  
  }, [zoomid]);

  const boundsMapping = {

  };
  

 
  
  const updateMapLayers = useCallback(() => {
    if (!mapLoaded) return;
  
    const map = mapRef.current;
    if (!map) return;
  
    // Get the current map bounds (viewport)
    const mapBounds = map.getBounds(); // Returns a LngLatBounds object
  
    // Iterate through each tiffLayer and check if its bounding box intersects with the map viewport
    tiffLayers.forEach(tiff => {
      const { id, boundingBox, mapboxUrl } = tiff;
      const sourceId = `raster-layer-${id}`;
      const circleLayerId = `circle-layer-${id}`;
  
      // Parse the bounding box for the layer
      const layerBounds = [
        parseFloat(boundingBox.minx), // minx
        parseFloat(boundingBox.miny), // miny
        parseFloat(boundingBox.maxx), // maxx
        parseFloat(boundingBox.maxy)  // maxy
      ];
  
      // Check if the layer's bounding box intersects with the map's current bounds
      const isLayerInViewport = (
        layerBounds[2] > mapBounds.getWest() && // Layer's maxx > map's west
        layerBounds[0] < mapBounds.getEast() && // Layer's minx < map's east
        layerBounds[3] > mapBounds.getSouth() && // Layer's maxy > map's south
        layerBounds[1] < mapBounds.getNorth()    // Layer's miny < map's north
      );
  
      // Update the layer visibility based on whether it's in the viewport
      const updatedVisibility = isLayerInViewport ? 'visible' : 'none';
  
      // Add the raster source if it doesn't exist
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'raster',
          tiles: [mapboxUrl], // Assuming WMS returns tiles
          tileSize: 512,
        });
      }
  
      // Add or update the raster layer based on visibility
      if (!map.getLayer(sourceId)) {
        map.addLayer({
          id: sourceId,
          type: 'raster',
          source: sourceId,
          layout: { visibility: updatedVisibility },
        });
      } else {
        // Update visibility of the existing layer
        map.setLayoutProperty(sourceId, 'visibility', updatedVisibility);
      }
  
      // Handle the circle layer visibility (for zoom level visibility)
      if (!map.getLayer(circleLayerId)) {
        map.addLayer({
          id: circleLayerId,
          type: 'circle',
          source: {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [
                    (layerBounds[0] + layerBounds[2]) / 2, // midX
                    (layerBounds[1] + layerBounds[3]) / 2  // midY
                  ]
                }
              }]
            }
          },
          paint: {
            'circle-radius': 6,
            'circle-color': '#000000',
          },
          layout: { visibility: 'none' }
        });
      }
  
      // Adjust circle visibility based on zoom level (show when zoom < 8)
      map.on('zoom', () => {
        const zoom = map.getZoom();
        map.setLayoutProperty(circleLayerId, 'visibility', zoom < 8 ? 'visible' : 'none');
      });
    });

    
    const layersToUpdate = {
      points: [],
      lines: [],
      polygons: [],
    };
  
    // Helper function for source and layer management
    const getOrCreateSource = (sourceId, data) => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: data,
        });
      } else {
        map.getSource(sourceId).setData(data);
      }
    };
  
    const getOrCreateLayer = (layerId, layerType, sourceId, paintOptions, visibility) => {
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: layerType,
          source: sourceId,
          paint: paintOptions,
          layout: {
            visibility: visibility ? 'visible' : 'none',
          },
        });
      } else {
        map.setLayoutProperty(layerId, 'visibility', visibility ? 'visible' : 'none');
        Object.entries(paintOptions).forEach(([key, value]) => {
          map.setPaintProperty(layerId, key, value);
        });
      }
    };
  
    // Handle GeoJSON layers
    layers.forEach(layer => {
      const layerIdBase = `geojson-layer-${layer.id}`;
      const convertedGeoJSON = convertGeoJSON(layer.data);
  
      const pointFeatures = {
        type: 'FeatureCollection',
        features: convertedGeoJSON.features.filter(f => f.geometry.type === 'Point'),
      };
  
      const lineStringFeatures = {
        type: 'FeatureCollection',
        features: convertedGeoJSON.features.filter(f => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'),
      };
  
      const polygonFeatures = {
        type: 'FeatureCollection',
        features: convertedGeoJSON.features.filter(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'),
      };
  
      const visibility = layer.visible;
  
      // Handle Points
      if (pointFeatures.features.length > 0) {
        const pointLayerId = `${layerIdBase}-points`;
        getOrCreateSource(pointLayerId, pointFeatures);
        getOrCreateLayer(pointLayerId, 'circle', pointLayerId, {
          'circle-color': '#FF0000',
          'circle-radius': 5,
        }, visibility);
        layersToUpdate.points.push(pointLayerId);
      }
  
      // Handle LineStrings
      if (lineStringFeatures.features.length > 0) {
        const lineLayerId = `${layerIdBase}-lines`;
        getOrCreateSource(lineLayerId, lineStringFeatures);
        getOrCreateLayer(lineLayerId, 'line', lineLayerId, {
          'line-color': '#0000FF',
          'line-width': 2,
        }, visibility);
        layersToUpdate.lines.push(lineLayerId);
      }
  
      // Handle Polygons and Borders
      if (polygonFeatures.features.length > 0) {
        const polygonLayerId = `${layerIdBase}-polygons`;
        const borderLayerId = `${layerIdBase}-border`;
  
        getOrCreateSource(polygonLayerId, polygonFeatures);
        getOrCreateLayer(polygonLayerId, 'fill', polygonLayerId, {
          'fill-color': '#00FF00',
          'fill-opacity': 0.35,
        }, visibility);
        layersToUpdate.polygons.push(polygonLayerId);
  
        getOrCreateSource(borderLayerId, polygonFeatures);
        getOrCreateLayer(borderLayerId, 'line', borderLayerId, {
          'line-color': '#009900',
          'line-width': 2,
        }, visibility);
        layersToUpdate.polygons.push(borderLayerId);
      }
    });
  
    // Popup handling
    const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: [0, -10] });
    const handlePopup = (e) => {
      const feature = e.features[0];
      const coordinates = e.lngLat;
      const area = parseFloat(feature.properties.area);
      const displayArea = isNaN(area) ? "Area's information not available" : `${area.toFixed(2)} m²`;
  
      const popupHTML = `
        <div style="text-align: center;">
          <p><strong>Area:</strong> ${displayArea}</p>
        </div>
      `;
  
      popup.setLngLat(coordinates).setHTML(popupHTML).addTo(map);
    };
  
    layersToUpdate.polygons.forEach(polygonLayerId => {
      map.on('click', polygonLayerId, handlePopup);
    });
  
  }, [layers, tiffLayers, mapLoaded]);
  
// Add the event listeners for pan and zoom
useEffect(() => {
  const map = mapRef.current;
  if (map) {
    map.on('moveend', updateMapLayers); // Trigger layer visibility update after map move
    map.on('zoomend', updateMapLayers);  // Trigger layer visibility update after zoom
  }

  return () => {
    if (map) {
      map.off('moveend', updateMapLayers);
      map.off('zoomend', updateMapLayers);
    }
  };
}, [updateMapLayers]);

  useEffect(() => {
    if (!Rasterzoomid || !mapLoaded) return;
  
    const map = mapRef.current;
    const selectedTiffLayer = tiffLayers.find(tiff => tiff.id === Rasterzoomid);
    if (selectedTiffLayer && selectedTiffLayer.boundingBox) {
      const { boundingBox } = selectedTiffLayer;
      const bounds = [
        [parseFloat(boundingBox.minx), parseFloat(boundingBox.miny)],
        [parseFloat(boundingBox.maxx), parseFloat(boundingBox.maxy)],
      ];
  
      // Trigger the map fitBounds with padding and other options
      map.fitBounds(bounds, {
        padding: { top: 10, bottom: 10, left: 10, right: 10 },
        maxZoom: 15,
        duration: 1000, // Duration for zoom animation
      });
  
      // Reset `Rasterzoomid` to allow re-zooming
      setRasterzoomid(null);
    }
  }, [Rasterzoomid, tiffLayers, mapLoaded]);

  const handleThemeChange = (newTheme) => {
    if (!mapRef.current) return;
  
    const map = mapRef.current;
  
    // Set the new theme
    map.setStyle(`mapbox://styles/mapbox/${newTheme}`);
  
    // Once the new style is loaded, re-add the layers and sources
    map.once('styledata', () => {
      updateMapLayers(); // Correctly placed inside the callback
    }); // Moved this closing parenthesis to the correct position
  };
  

   const handleRasterZoom = useCallback(
    (rasterId) => {
      const map = mapRef.current;
      const selectedTiff = tiffLayers.find(tiff => tiff.id === rasterId);

      if (selectedTiff && selectedTiff.boundingBox) {
        const { minx, miny, maxx, maxy } = selectedTiff.boundingBox;

        map.fitBounds(
          [
            [parseFloat(minx), parseFloat(miny)],
            [parseFloat(maxx), parseFloat(maxy)],
          ],
          {
            padding: { top: 10, bottom: 10, left: 10, right: 10 },
            maxZoom: 15,
            duration: 0, // Smooth animation
          }
        );
      }
    },
    [tiffLayers]
  );

  // Update the map when layers change
  useEffect(() => {
    updateMapLayers();
  }, [updateMapLayers]);

  // Zoom to selected raster when `Rasterzoomid` changes
  useEffect(() => {
    if (Rasterzoomid) {
      handleRasterZoom(Rasterzoomid);
    }
  }, [Rasterzoomid, handleRasterZoom]);
  return (
    <div className="relative">
      <div ref={mapContainerRef} className="map-container" />
      <ThemeSelector onThemeChange={handleThemeChange} /> {/* Add the ThemeSelector */}
    </div>
  );
}

export default MapboxMap;  
