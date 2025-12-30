import React from 'react';
import { useAppContext } from './contexts/AppContext';
import { useUIContext } from './contexts/UIContext';
import { View } from '../types';
import WifiSlashIcon from './icons/WifiSlashIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';

const OfflineIndicator: React.FC = () => {
  const { connectionStatus, latency, queuedActionsCount } = useAppContext();
  const { handleSetView } = useUIContext();

  if (connectionStatus === 'good') {
    return null;
  }

  if (connectionStatus === 'slow') {
    return (
        <div
            className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 w-full flex items-center justify-center text-sm shadow-lg z-[500] no-print"
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                <span>Słabe połączenie ({latency}ms). Aplikacja może działać wolniej.</span>
            </div>
        </div>
    );
  }

  // Fallback to offline
  return (
    <button
      onClick={() => handleSetView(View.QueueStatus)}
      className="fixed bottom-0 left-0 right-0 bg-red-600 text-white px-4 py-2 w-full flex items-center justify-between text-sm shadow-lg z-[500] no-print cursor-pointer hover:bg-red-700 transition-colors"
      role="status"
      aria-live="assertive"
    >
      <div className="flex items-center">
        <WifiSlashIcon className="h-5 w-5 mr-2" />
        <span>Jesteś w trybie offline. Zmiany zostaną zsynchronizowane po powrocie do sieci.</span>
      </div>
      {queuedActionsCount > 0 && (
        <div className="bg-red-800 px-2 py-0.5 rounded-full text-xs font-semibold">
          {queuedActionsCount} w kolejce
        </div>
      )}
    </button>
  );
};

export default OfflineIndicator;
