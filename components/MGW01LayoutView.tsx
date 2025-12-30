import React, { useState, useMemo } from 'react';
import Button from './Button';
import ArrowRightIcon from './icons/ArrowRightIcon';
import BuildingOfficeIcon from './icons/BuildingOfficeIcon';
import { FinishedGoodItem } from '../types';
import { formatDate } from '../src/utils';
import InformationCircleIcon from './icons/InformationCircleIcon';
import { useUIContext } from './contexts/UIContext';

// Aisle configuration type
type AisleMode = 'stacked' | 'single';
interface AisleConfig {
  id: string;
  mode: AisleMode;
}

interface MGW01LayoutViewProps {
  pallets: FinishedGoodItem[];
}

interface SpotProps {
  number: number;
  pallet?: FinishedGoodItem;
  onClick: (pallet: FinishedGoodItem) => void;
}

const Spot: React.FC<SpotProps> = ({ number, pallet, onClick }) => {
  const isOccupied = !!pallet;

  if (!isOccupied) {
    return (
      <div className="w-full border border-gray-400 dark:border-secondary-500 rounded-sm flex items-center justify-center bg-gray-200 dark:bg-secondary-600 min-h-[5rem] text-center">
        <span className="text-lg font-bold text-gray-400 dark:text-gray-500">{number}</span>
      </div>
    );
  }

  const displayId = pallet.displayId || '';
  const idPrefixMatch = displayId.match(/^(WGAGR|WGPSD|WGSPL)/);
  const prefix = idPrefixMatch ? idPrefixMatch[0] : '';
  const numberPart = prefix ? displayId.substring(prefix.length) : displayId;

  // Occupied spot
  return (
    <button
      onClick={() => onClick(pallet)}
      className="w-full text-left border border-blue-600 dark:border-blue-400 rounded-sm bg-blue-100 dark:bg-blue-900/50 p-1 flex flex-col justify-between min-h-[5rem] text-[10px] leading-tight hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`Szczegóły palety ${pallet.displayId}`}
    >
      <div>
        <p className="font-bold text-blue-800 dark:text-blue-200 truncate" title={pallet.productName}>
          {pallet.productName}
        </p>
        <div className="font-mono text-blue-700 dark:text-blue-300" title={displayId}>
          <div className="font-semibold">{prefix}</div>
          <div className="break-all -mt-1">{numberPart}</div>
        </div>
      </div>
      <div className="flex justify-between items-end mt-1">
        <span className="text-xl font-bold text-blue-800 dark:text-blue-300">{number}</span>
        <span className="font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">
          {formatDate(pallet.expiryDate)}
        </span>
      </div>
    </button>
  );
};

interface AisleProps {
  config: AisleConfig;
  pallets: FinishedGoodItem[];
  onModeChange: (id: string, newMode: AisleMode) => void;
  onPalletClick: (pallet: FinishedGoodItem) => void;
}

const Aisle: React.FC<AisleProps> = ({ config, pallets, onModeChange, onPalletClick }) => {
    const isStacked = config.mode === 'stacked';
    const [infoVisible, setInfoVisible] = useState(false);

    const renderSpots = (count: number, startNum: number, step: number) => {
        const spots = [];
        for (let i = 0; i < count; i++) {
            const spotNumber = startNum + i * step;
            const palletIndex = spotNumber - 1;
            const pallet = pallets[palletIndex];
            spots.push(<Spot key={i} number={spotNumber} pallet={pallet} onClick={onPalletClick} />);
        }
        return spots;
    };
    
    return (
        <div className="flex flex-col gap-1 p-2 bg-slate-100 dark:bg-secondary-800 rounded-lg">
            <div className="flex items-center justify-start gap-4">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{config.id}</h4>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onModeChange(config.id, 'single')}
                        className={`px-1.5 py-0.5 text-xs rounded ${config.mode === 'single' ? 'bg-primary-600 text-white' : 'bg-gray-300 dark:bg-secondary-700'}`}
                        title="Tryb pojedynczy (7 miejsc)"
                    >
                        1
                    </button>
                    <button
                        onClick={() => onModeChange(config.id, 'stacked')}
                        className={`px-1.5 py-0.5 text-xs rounded ${config.mode === 'stacked' ? 'bg-primary-600 text-white' : 'bg-gray-300 dark:bg-secondary-700'}`}
                        title="Tryb piętrowany (14 miejsc)"
                    >
                        2
                    </button>
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setInfoVisible(!infoVisible)} 
                        className="text-gray-400 hover:text-blue-500"
                        aria-label="Informacje o trybach składowania"
                    >
                        <InformationCircleIcon className="h-5 w-5" />
                    </button>
                    {infoVisible && (
                        <>
                            <div 
                                className="fixed inset-0 bg-black bg-opacity-50 z-20"
                                onClick={() => setInfoVisible(false)}
                            ></div>
                            <div 
                                className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-700 border dark:border-gray-600 text-black dark:text-white text-sm rounded-lg shadow-xl z-30 w-56"
                            >
                                <p className="font-bold mb-1">Tryb składowania:</p>
                                <p><strong>1 (Pojedynczy):</strong> Miejsca są ułożone w jednym rzędzie, od 1 do 7.</p>
                                <p className="mt-2"><strong>2 (Piętrowany):</strong> Miejsca są ułożone w dwóch rzędach. Dolny rząd (1, 3, 5...) i górny rząd (2, 4, 6...). Daje to 14 miejsc.</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <div className="flex flex-col gap-1 mt-1">
                {isStacked && (
                    <div className="grid grid-cols-7 gap-1">
                        {renderSpots(7, 2, 2)}
                    </div>
                )}
                <div className="grid grid-cols-7 gap-1">
                    {isStacked ? renderSpots(7, 1, 2) : renderSpots(7, 1, 1)}
                </div>
            </div>
        </div>
    );
};


const MGW01LayoutView: React.FC<MGW01LayoutViewProps> = ({ pallets }) => {
    const { modalHandlers } = useUIContext();
    
    const initialAisles = useMemo(() => Array.from({ length: 24 }, (_, i) => ({
        id: `A${(i + 1).toString().padStart(2, '0')}`,
        mode: 'stacked' as AisleMode,
    })), []);

    const [aisleConfigs, setAisleConfigs] = useState<AisleConfig[]>(initialAisles);

    const handleModeChange = (id: string, newMode: AisleMode) => {
        setAisleConfigs(configs => configs.map(c => c.id === id ? { ...c, mode: newMode } : c));
    };
    
    const handlePalletClick = (pallet: FinishedGoodItem) => {
        modalHandlers.openFinishedGoodDetailModal(pallet);
    };

    const totalCapacity = useMemo(() => 
        aisleConfigs.reduce((acc, aisle) => acc + (aisle.mode === 'stacked' ? 14 : 7), 0),
    [aisleConfigs]);
    
    const occupiedEurUnits = pallets.length;

    const allocatedPallets = useMemo(() => {
        let remainingPallets = [...pallets];
        const allocations: Record<string, FinishedGoodItem[]> = {};
        for (const aisle of aisleConfigs) {
            if (remainingPallets.length === 0) break;
            const aisleCapacity = aisle.mode === 'stacked' ? 14 : 7;
            const palletsForThisAisle = remainingPallets.splice(0, aisleCapacity);
            allocations[aisle.id] = palletsForThisAisle;
        }
        return allocations;
    }, [aisleConfigs, pallets]);

    return (
        <div className="p-4 h-full flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between px-4 mb-2">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <ArrowRightIcon className="h-6 w-6" />
                    <span className="font-semibold">Kierunek załadunku</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">Ściana</span>
                    <BuildingOfficeIcon className="h-6 w-6 transform -scale-x-100" />
                </div>
            </div>

            <div className="flex-grow overflow-auto p-2 bg-gray-100 dark:bg-secondary-900 rounded">
                <div className="grid grid-cols-1 gap-4">
                    {aisleConfigs.map(config => (
                        <Aisle 
                            key={config.id}
                            config={config}
                            pallets={allocatedPallets[config.id] || []}
                            onModeChange={handleModeChange}
                            onPalletClick={handlePalletClick}
                        />
                    ))}
                </div>
            </div>
            
            <div className="flex-shrink-0 text-sm text-gray-600 dark:text-gray-400 mt-3 pt-3 border-t dark:border-secondary-600">
                <p>Zajęte miejsca (niebieskie): {occupiedEurUnits} / {totalCapacity}</p>
                <p>Wolne miejsca: {totalCapacity - occupiedEurUnits}</p>
                <p className="italic mt-1">Kliknij przyciski '1' lub '2' na alejce, aby zmienić jej tryb (pojedyncza/piętrowana). Najedź na paletę, aby zobaczyć szczegóły.</p>
            </div>
        </div>
    );
};

export default MGW01LayoutView;