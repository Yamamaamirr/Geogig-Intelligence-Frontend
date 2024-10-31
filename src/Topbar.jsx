import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faUser, faCheckCircle, faSyncAlt, faSpinner } from '@fortawesome/free-solid-svg-icons'; // Import spinner icon
import logo from './logo-1.png'; // Replace with your logo path

const TopBar = ({ isNotificationOpen, progress, converted, setIsNotificationOpen, showLoader }) => {
  const handleNotificationClick = () => {
    setIsNotificationOpen((prev) => !prev);
  };

  return (
    <div className="bg-white text-gray-900 py-2 px-4 flex items-center justify-between shadow-md w-full fixed top-0 left-0 z-40 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <a href="/" className="flex items-center hover:text-gray-600 transition duration-300">
          <img src={logo} alt="Logo" className="h-10 w-auto" />
        </a>

        <button
          className="relative p-2 text-gray-600 hover:text-gray-800 transition duration-300"
          onClick={handleNotificationClick}
        >
          <FontAwesomeIcon icon={faBell} />
          {isNotificationOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-white border border-gray-300 shadow-lg rounded-lg p-4 z-50 -ml-2">
              {showLoader ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">Uploading Raster</span>
                    {!converted ? (
                      <FontAwesomeIcon icon={faSpinner} className="text-blue-500 animate-spin" /> // Spinner for ongoing upload
                    ) : (
                      <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                    )}
                  </div>

                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-blue-400 to-indigo-600 transition-all duration-500"
                    ></div>
                  </div>

                  <div className="text-xs text-gray-600 text-center mt-2">
                    {converted ? 'Upload Complete!' : `Uploading... ${progress}%`}
                  </div>
                </>
              ) : (
                <span className="text-sm text-gray-600">No notifications</span>
              )}
            </div>
          )}
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-600 hover:text-gray-800 transition duration-300">
          <FontAwesomeIcon icon={faUser} />
        </button>
      </div>
    </div>
  );
};

export default TopBar;
