
import React, { useState, useMemo } from 'react';
import { RawMaterialLogEntry, FinishedGoodItem } from '../types';
import { formatDate } from '../src/utils';
import { useUIContext } from './contexts/UIContext';
import ArrowRightIcon from './icons/ArrowRightIcon';
import BuildingOfficeIcon from './icons/BuildingOfficeIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

type AisleMode = 'stacked' | 'single';
interface AisleConfig {
  id: string;
  mode: AisleMode;
}

interface OsipLayoutViewProps {
  pallets: (RawMaterialLogEntry | FinishedGoodItem)[];
}

interface SpotProps {
  number: number;
  pallet?: RawMaterialLogEntry | FinishedGoodItem;
  onClick: (pallet: any) => void;
}

const Spot: React.FC<SpotProps> = ({ number, pallet, onClick }) => {
  const isOccupied = !!pallet;

  if (!isOccupied) {
    return (
      <div className="w-full border border-gray-400 dark:border-secondary-500 rounded-sm flex items-center justify-center bg-gray-200 dark:bg-secondary-600 min-h-[3.5rem] text-center">
        <span className="text-sm font-bold text-gray-400 dark:text-gray-500">{number}</span>
      </div>
    );
  }

  const isRaw = 'palletData' in pallet;
  const palletId = isRaw ? pallet.palletData.nrPalety : (pallet.displayId || pallet.id);
  const productName = isRaw ? pallet.palletData.nazwa : pallet.productName;
  const expiryDate = isRaw ? pallet.palletData.dataPrzydatnosci : pallet.expiryDate;

  const typeColorClass = isRaw 
    ? 'border-purple-600 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 hover:bg-purple-100 dark:hover:bg-purple-800'
    : 'border-green-600 dark:border-green-400 bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-100 hover:bg-green-100 dark:hover:bg-green-800';

  const accentColorClass = isRaw ? 'text-purple-700 dark:text-purple-300' : 'text-green-700 dark:text-green-300';

  return (
    <button
      onClick={() => onClick(pallet)}
      className={`w-full text-left border rounded-sm p-1 flex flex-col justify-between min-h-[3.5rem] text-[9px] leading-tight transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${typeColorClass}`}
      title={`${productName} (${palletId})`}
    >
      <div className="truncate font-bold uppercase">{productName}</div>
      <div className="flex justify-between items-end mt-0.5">
        <span className={`text-lg font-bold ${accentColorClass}`}>{number}</span>
        <span className="opacity-70 font-mono">{formatDate(expiryDate)}</span>
      </div>
    </button>
  );
};

interface AisleProps {
  config: AisleConfig;
  pallets: (RawMaterialLogEntry | FinishedGoodItem)[];
  onModeChange: (id: string, newMode: AisleMode) => void;
  onPalletClick: (pallet: any) => void;
}

const Aisle: React.FC<AisleProps> = ({ config, pallets, onModeChange, onPalletClick }) => {
    const isStacked = config.mode === 'stacked';
    const capacity = isStacked ? 16 : 8;
    
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
        <div className="flex flex-col gap-1 p-2 bg-slate-100 dark:bg-secondary-800 rounded-lg border dark:border-secondary-700 shadow-sm">
            <div className="flex items-center justify-start gap-4 mb-1">
                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">{config.id}</h4>
                <div className="flex items-center bg-gray-200 dark:bg-secondary-700 rounded p-0.5 gap-0.5">
                    <button
                        onClick={() => onModeChange(config.id, 'single')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${config.mode === 'single' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Tryb pojedynczy (8 miejsc)"
                    >
                        1
                    </button>
                    <button
                        onClick={() => onModeChange(config.id, 'stacked')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${config.mode === 'stacked' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Tryb piętrowany (16 miejsc)"
                    >
                        2
                    </button>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">{pallets.length} / {capacity}</span>
            </div>
            
            <div className="flex flex-col gap-1">
                {isStacked && (
                    <div className="grid grid-cols-8 gap-1">
                        {renderSpots(8, 9, 1)}
                    </div>
                )}
                <div className="grid grid-cols-8 gap-1">
                    {renderSpots(8, 1, 1)}
                </div>
            </div>
        </div>
    );
};

const OsipLayoutView: React.FC<OsipLayoutViewProps> = ({ pallets }) => {
  const { modalHandlers } = useUIContext();

  const initialAisles = useMemo(() => Array.from({ length: 77 }, (_, i) => ({
    id: `OS${(i + 1).toString().padStart(2, '0')}`,
    mode: 'stacked' as AisleMode,
  })), []);

  const [aisleConfigs, setAisleConfigs] = useState<AisleConfig[]>(initialAisles);

  const handleModeChange = (id: string, newMode: AisleMode) => {
      setAisleConfigs(configs => configs.map(c => c.id === id ? { ...c, mode: newMode } : c));
  };

  const totalCapacity = useMemo(() => 
      aisleConfigs.reduce((acc, aisle) => acc + (aisle.mode === 'stacked' ? 16 : 8), 0),
  [aisleConfigs]);

  const allocatedPallets = useMemo(() => {
    let remainingPallets = [...pallets];
    const allocations: Record<string, (RawMaterialLogEntry | FinishedGoodItem)[]> = {};
    for (const aisle of aisleConfigs) {
      if (remainingPallets.length === 0) break;
      const aisleCapacity = aisle.mode === 'stacked' ? 16 : 8;
      const palletsForThisAisle = remainingPallets.splice(0, aisleCapacity);
      allocations[aisle.id] = palletsForThisAisle;
    }
    return allocations;
  }, [aisleConfigs, pallets]);

  const handlePalletClick = (p: any) => {
    if ('palletData' in p) {
        modalHandlers.openPalletDetailModal(p);
    } else {
        modalHandlers.openFinishedGoodDetailModal(p);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <ArrowRightIcon className="h-6 w-6" />
          <span className="font-semibold text-sm uppercase tracking-wider">Kierunek załadunku OSiP</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <span className="font-semibold text-sm">Zakończenie hali</span>
          <BuildingOfficeIcon className="h-6 w-6 transform -scale-x-100" />
        </div>
      </div>

      <div className="flex-grow overflow-auto p-3 bg-gray-100 dark:bg-secondary-900/80 rounded-xl">
        <div className="flex flex-col gap-6">
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
      
      <div className="flex-shrink-0 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-4 pt-3 border-t dark:border-secondary-700 italic">
        <span>Łączna pojemność OSiP: {totalCapacity} miejsc (Aktualnie zajęte: {pallets.length})</span>
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded-sm"></div> <span>Surowce</span></div>
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> <span>Wyrób Gotowy</span></div>
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-300 rounded-sm"></div> <span>Wolne</span></div>
        </div>
      </div>
    </div>
  );
};

export default OsipLayoutView;
