
import React from 'react';
// FIX: Removed incorrect 'MGW01LayoutModalProps' import from '../types'.
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
// FIX: Corrected import path for constants.ts to be relative
import { MGW02_LAYOUT_ROWS_PER_SIDE, MGW02_LAYOUT_SPOTS_PER_ROW } from '../constants';

interface MGW02LayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  occupiedEurUnits: number;
  totalEurCapacity: number;
}


const MGW02LayoutModal: React.FC<MGW02LayoutModalProps> = ({
  isOpen,
  onClose,
  occupiedEurUnits,
  totalEurCapacity,
}) => {
  if (!isOpen) return null;

  const spotsToFill = Math.round(occupiedEurUnits);
  const totalVisualSpots = MGW02_LAYOUT_ROWS_PER_SIDE * MGW02_LAYOUT_SPOTS_PER_ROW * 2;

  const renderSpots = (startSpot: number, numSpots: number) => {
    const spots = [];
    for (let i = 0; i < numSpots; i++) {
      const currentSpotNumber = startSpot + i;
      const isOccupied = currentSpotNumber <= spotsToFill;
      spots.push(
        <div
          key={`spot-${currentSpotNumber}`}
          className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 border border-gray-400 dark:border-secondary-500 rounded-sm
                      ${isOccupied ? 'bg-blue-500' : 'bg-gray-200 dark:bg-secondary-600'}`}
          title={`Miejsce ${currentSpotNumber}`}
        />
      );
    }
    return spots;
  };
  
  const totalSpotsPerSide = MGW02_LAYOUT_ROWS_PER_SIDE * MGW02_LAYOUT_SPOTS_PER_ROW;

  return (
    <div
      className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-[150] transition-opacity duration-300 ease-in-out no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mgw02-layout-modal-title"
    >
      <div
        className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all duration-300 ease-in-out scale-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
          <h2 id="mgw02-layout-modal-title" className="text-lg sm:text-xl font-semibold text-primary-700 dark:text-primary-300">
            Wizualizacja Układu Magazynu MGW02
          </h2>
          <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5" title="Zamknij okno">
            <XCircleIcon className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex-grow overflow-auto p-1">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] md:items-start gap-4 justify-items-center">
            {/* Left Side */}
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Strefa Lewa</p>
              <div className={`grid grid-cols-${MGW02_LAYOUT_SPOTS_PER_ROW} gap-1 sm:gap-1.5`}>
                {renderSpots(1, totalSpotsPerSide)}
              </div>
            </div>

            {/* Aisle Path */}
            <div className="w-full md:w-8 h-4 md:h-full bg-gray-200 dark:bg-secondary-700 rounded-sm flex items-center justify-center self-stretch">
            </div>

            {/* Right Side */}
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Strefa Prawa</p>
              <div className={`grid grid-cols-${MGW02_LAYOUT_SPOTS_PER_ROW} gap-1 sm:gap-1.5`}>
                {renderSpots(totalSpotsPerSide + 1, totalSpotsPerSide)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-3 pt-3 border-t dark:border-secondary-600">
            <p>Zajęte miejsca (niebieskie): {spotsToFill} / {totalVisualSpots} (EUR-ekwiwalentów)</p>
            <p>Wolne miejsca (szare): {totalVisualSpots - spotsToFill}</p>
            <p className="italic mt-1">Wizualizacja przedstawia {totalVisualSpots} standardowych miejsc paletowych. Każde miejsce odpowiada jednej palecie EUR.</p>
        </div>

        <div className="pt-4 border-t dark:border-secondary-700 mt-auto flex justify-end">
          <Button onClick={onClose} variant="primary">
            Zamknij
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MGW02LayoutModal;
