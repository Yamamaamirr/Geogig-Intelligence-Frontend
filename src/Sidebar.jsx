import { useState, useRef } from 'react';
import { EyeIcon, PlusIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const Sidebar = ({ 
  onGeoJsonUpload, 
  layers, 
  onToggleLayer, 
  onSaveLayer, 
  setSelectedLayerId, 
  onDeleteLayer, 
  handleClickZoom,
  tiffLayers,
  onFileChange,
  setTiffLayers,
  setActiveSection,
  activeSection,
  handleRasterZoom,
  handleDeleteTiffLayer
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);

  return (
    <>
      <div className={`fixed top-14 right-0 z-20 h-[calc(100vh-3.7rem)] bg-white shadow-md border-l border-gray-300 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} w-64 flex flex-col`}>
        
        {/* Header */}
        <div className="flex items-center border-b border-gray-300 p-2 bg-gray-100">
          <button className="bg-blue-500 hover:bg-blue-600 p-1 rounded-md mr-2" onClick={() => fileInputRef.current.click()}>
            <PlusIcon className="h-5 w-5 text-white font-bold" />
          </button>
          <h3 className="font-semibold text-gray-800 text-sm flex-1">Layers</h3>
          <button className="text-gray-500 hover:text-gray-700 p-2" onClick={() => setSidebarOpen(!isSidebarOpen)}>
            <ArrowLeftIcon className={`h-5 w-5 ${isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>
          <input type="file" accept=".tiff,.tif,.geojson" ref={fileInputRef} style={{ display: 'none' }} onChange={onFileChange} />
        </div>

        {/* Section Toggle */}
        <div className="flex space-x-2 p-2">
          <button onClick={() => setActiveSection('geojson')} className={`flex-1 p-2 text-sm ${activeSection === 'geojson' ? 'bg-blue-100' : ''}`}>
            GeoJSON
          </button>
          <button onClick={() => setActiveSection('tiff')} className={`flex-1 p-2 text-sm ${activeSection === 'tiff' ? 'bg-blue-100' : ''}`}>
            TIFF
          </button>
        </div>

        {/* Layer List */}
        <div className="flex flex-col p-2 space-y-2 overflow-y-auto flex-grow">
          {activeSection === 'geojson' ? (
            layers.length > 0 ? (
              layers.map(layer => (
                <div key={layer.id} className="flex items-center justify-between mb-1 border-b py-1" style={{ cursor: 'pointer' }} onClick={() => handleClickZoom(layer.id)}>
                  <div className="flex items-center space-x-2">
                    <button className="text-gray-500 hover:text-gray-700" onClick={(e) => { e.stopPropagation(); onToggleLayer(layer.id); }}>
                      <EyeIcon className={`h-5 w-5 ${layer.visible ? '' : 'opacity-50'}`} />
                    </button>
                    <span className="text-gray-800 text-sm">{layer.name}</span>
                  </div>
                  <button className="text-gray-500 hover:text-gray-700" onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}>
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center text-sm">No GeoJSON layers uploaded yet</div>
            )
          ) : (
            tiffLayers.length > 0 ? (
              tiffLayers.map((tiff, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between mb-1 border-b py-1"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleRasterZoom(tiff.id)}
                >
                  <div className="flex items-center space-x-2">
                    <button
                      className="text-gray-500 hover:text-gray-700"
                      onClick={(e) => { 
                        e.stopPropagation();
                        setTiffLayers(prev => 
                          prev.map(t => 
                            t.name === tiff.name ? { ...t, visible: !t.visible } : t
                          )
                        );
                      }}
                    >
                      <EyeIcon className={`h-5 w-5 ${tiff.visible ? '' : 'opacity-50'}`} />
                    </button>
                    <span className="text-gray-800 text-sm">{tiff.name}</span>
                  </div>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTiffLayer(tiff.id, tiff.workspace, tiff.outputFile);
                    }}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center text-sm">No TIFF layers uploaded yet</div>
            )
          )}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="text-center p-2 bg-yellow-100 text-yellow-800 text-sm">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Sidebar Toggle Button */}
      <button className={`fixed right-0 top-1/2 transform -translate-y-1/2 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'hidden' : 'block'} w-8 h-10 z-10`} onClick={() => setSidebarOpen(true)}>
        <div className="relative flex justify-center items-center h-full w-full">
          <div className="absolute h-14 w-24 bg-blue-500 rounded-bl-full rounded-br-full rotate-90 flex items-center justify-center">
            <div className="absolute text-white text-xl font-bold">≡</div>
            <div className="absolute top-1/2 right-0 w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-blue-500 border-l-6 border-l-transparent transform translate-x-1"></div>
          </div>
        </div>
      </button>
    </>
  );
};

export default Sidebar;
