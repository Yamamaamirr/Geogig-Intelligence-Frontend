import { useState, useEffect } from 'react';
import MapboxMap from './Mapbox';
import Sidebar from './Sidebar';
import { db } from './firebase';
import { doc, collection, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import './App.css';
import Topbar from './Topbar';

const MapboxApp = () => {
  const [layers, setLayers] = useState([]);
  const [tiffLayers, setTiffLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [zoomToLayerId, setZoomToLayerId] = useState(null);
  const [Rasterzoomid, setRasterzoomid] = useState(null);
  const [statusMessage, setStatusMessage] = useState(''); // Add status message state
  const [activeSection, setActiveSection] = useState('geojson'); // Define activeSection state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false); // New state for upload status
  const [converted, setConverted] = useState(false); // New state to track upload completion

  
 // Function to fetch layers from the PostGIS database
 const fetchPostGislayers = async () => {
  try {
      const response = await fetch("https://nodeback.duckdns.org:3009/api/layers");
      if (!response.ok) {
          throw new Error('Network response was not ok');
      }
      const layersData = await response.json();
      setLayers(layersData); // Set the fetched layers to state
  } catch (error) {
      console.error('Error fetching layers:', error);
  }
};

const fetchTiffLayers = async () => {
  try {
      const response = await fetch("https://nodeback.duckdns.org:3009/api/tiff-layers");
      if (!response.ok) {
          throw new Error('Network response was not ok');
      }
      const tiffLayersData = await response.json();
      setTiffLayers(tiffLayersData); // Set the fetched tiff layers to state
  } catch (error) {
      console.error('Error fetching TIFF layers:', error);
  }
};

useEffect(() => {
  fetchPostGislayers(); // Fetch GeoJSON layers
  fetchTiffLayers(); // Fetch TIFF layers
}, []);


console.log(tiffLayers)


  function handleRasterZoom(id){
setRasterzoomid(id);
  }
  const handleToggleLayer = (id) => {
    setLayers(layers.map(layer =>
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
  };

  const handleGeoJsonUpload = async (geojson, name) => {
    // Check if the layer already exists by name to prevent duplicates
    const existingLayer = layers.find(layer => layer.name === name);
    if (existingLayer) {
        console.error('Layer with this name already exists');
        return;
    }

    const layerId = `layer-${Date.now()}`;
    const newLayer = {
        id: layerId,
        data: geojson,
        name: name,
        visible: true
    };

    // Update state to add this layer in the UI
    setLayers(prevLayers => [...prevLayers, newLayer]);

    try {
        // Prepare and send the data to the backend
        const requestData = {
            name: name,           // This is used as the PostGIS table name
            geojson: geojson       // The actual GeoJSON data
        };

        const response = await fetch("https://nodeback.duckdns.org:3009/api/layers", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error("Network response was not ok: " + errorMessage);
        }

        const data = await response.json();
        console.log("Layer saved successfully!", data);
    } catch (error) {
        console.error("Error saving layer:", error);
    }
};

  const handleClickZoom = (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      setZoomToLayerId(layerId);
    }
  };

  const handleDeleteLayer = async (id) => {
    try {
        const layer = layers.find(layer => layer.id === id);

        if (layer) {
            // Step 2: Delete layer from PostGIS database
            const response = await fetch(`https://nodeback.duckdns.org:3009/api/layers/${layer.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                console.log("Layer deleted successfully from PostGIS database!");
                // Step 3: Update the state to remove the deleted layer
                setLayers(layers.filter(layer => layer.id !== id));
            } else {
                const errorData = await response.json();
                console.error("Error deleting layer from PostGIS database:", errorData.error);
            }
        } else {
            console.error("Layer not found.");
        }
    } catch (error) {
        console.error("Error deleting layer:", error);
    }
};

 
const handleFileChange = async (event) => {
  const file = event.target.files[0];
  if (file) {
      const reader = new FileReader();
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop().toLowerCase();

      if (fileExtension === 'geojson') {
          reader.onload = () => {
              try {
                  const geojson = JSON.parse(reader.result);
                  const baseName = fileName.split('.').slice(0, -1).join('.');
                  handleGeoJsonUpload(geojson, baseName); // Directly upload GeoJSON
              } catch (error) {
                  console.error('Error parsing GeoJSON:', error);
              }
          };
          reader.readAsText(file);
      } else if (fileExtension === 'tiff' || fileExtension === 'tif') {
      setProgress(0);           // Reset progress to 0
      setConverted(false);       // Reset conversion status
      setIsUploading(false);     // Ensure uploading state is false initially
      setIsNotificationOpen(true);
        const CHUNK_SIZE = 1024 * 1024 * 10; // 10 MB per chunk
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let uploadedChunks = 0;
        
        setStatusMessage(`Uploading ${fileName} in ${totalChunks} chunks...`);
        setIsUploading(true);  // Set isUploading to true
  
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
  
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('chunkIndex', chunkIndex);
          formData.append('totalChunks', totalChunks);
          formData.append('fileName', fileName);
  
          try {
             const response = await fetch('https://nodeback.duckdns.org:3009/upload', {
              method: 'POST',
              body: formData,
            });
  
            const result = await response.json();
            if (result.success) {
              uploadedChunks++;
              setProgress(Math.round((uploadedChunks / totalChunks) * 100));  // Update progress
  
              if (chunkIndex + 1 === totalChunks) {
                setConverted(true);  // Set upload completion status
                setStatusMessage('File uploaded and registered successfully with GeoServer!');
                setIsUploading(false);  // Set isUploading to false
                
                // Add to tiffLayers
                const mapboxUrl = result.mapboxUrl;
                const boundingBox = result.boundingBox;
                const outputFile = result.outputFile;
                const workspace = "hagan_new";
                const newId = Date.now();
                const tiffLayer = {
                  id: newId,
                  name: outputFile,
                  file,
                  visible: true,
                  workspace,
                  outputFile,
                  boundingBox,
                  mapboxUrl,
                };
                setTiffLayers((prevTiffLayers) => [...prevTiffLayers, tiffLayer]);
              }
            } else {
              setStatusMessage(`Failed to upload chunk ${chunkIndex + 1}`);
              setIsUploading(false);  // Reset isUploading on failure
              return;
            }
          } catch (error) {
            console.error('Error processing file:', error);
            setIsUploading(false);  // Reset isUploading on error
          }
        }
  
        event.target.value = ''; // Clear file input after upload
      }
    }
  };

  const handleDeleteTiffLayer = async (id, workspace, layerName) => {
    console.log(`${workspace} and ${layerName}`);

    workspace="hagan_new";

    try {
        const response = await fetch('https://nodeback.duckdns.org:3009/delete-layer', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ workspace, layerName })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                console.log('Layer deleted successfully');

                // Update the tiffLayers state to remove the deleted layer
                setTiffLayers(prevTiffLayers => prevTiffLayers.filter(layer => layer.id !== id));
                
                // Additional logic after successful deletion, if needed
            } else {
                console.error('Error deleting layer:', result.message);
            }
        } else {
            console.error('Failed to delete layer:', response.statusText);
        }
    } catch (error) {
        console.error('Error deleting TIFF layer:', error);
    }
};

console.log(layers)

  return (
    <>
     <Topbar
  isNotificationOpen={isNotificationOpen}
  progress={isUploading ? progress : 0} // Show progress only if uploading
  converted={converted} // Show completion status
  setIsNotificationOpen={setIsNotificationOpen}
  showLoader={isUploading} // Pass the upload status to Topbar
/>
      <div className="flex">
        <Sidebar 
          onGeoJsonUpload={handleGeoJsonUpload} 
          layers={layers}
          onToggleLayer={handleToggleLayer}
        
          onDeleteLayer={handleDeleteLayer}
          setSelectedLayerId={setSelectedLayerId}
          handleClickZoom={handleClickZoom}
          tiffLayers={tiffLayers}
        
          onFileChange={handleFileChange} // Pass the file change handler
          setTiffLayers={setTiffLayers} // Add this line
          setActiveSection={setActiveSection}
          activeSection={activeSection}
          handleRasterZoom={handleRasterZoom}
          handleDeleteTiffLayer={handleDeleteTiffLayer}  // Pass the handler as a prop

        />
        <MapboxMap layers={layers} zoomid={zoomToLayerId} setZoom={setZoomToLayerId} Rasterzoomid={Rasterzoomid} tiffLayers={tiffLayers} />
      </div>
    </>
  );
};

export default MapboxApp;
