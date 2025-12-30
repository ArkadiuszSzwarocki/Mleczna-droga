import React, { useMemo } from 'react';
import { useUIContext } from './contexts/UIContext';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useProductionContext } from './contexts/ProductionContext';
import { RawMaterialLogEntry, FinishedGoodItem } from '../types';
import Button from './Button';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import PalletTile from './PalletTile';
import WarehouseIcon from './icons/WarehouseIcon';

type CombinedItem = (RawMaterialLogEntry | FinishedGoodItem) & { isRaw: boolean };

const LocationDetailPage: React.FC = () => {
    const { viewParams, handleSetView } = useUIContext();
    const { rawMaterialsLogList } = useWarehouseContext();
    const { finishedGoodsList } = useProductionContext();
    const { modalHandlers } = useUIContext();

    const { locationId, locationName, returnView } = viewParams || {};

    const itemsInLocation: CombinedItem[] = useMemo(() => {
        if (!locationId) return [];
        const raw = (rawMaterialsLogList || [])
            .filter(item => item.currentLocation && item.currentLocation.startsWith(locationId))
            .map(item => ({ ...item, isRaw: true }));
        const fg = (finishedGoodsList || [])
            .filter(item => item.currentLocation && item.currentLocation.startsWith(locationId))
            .map(item => ({ ...item, isRaw: false }));
        return [...raw, ...fg].sort((a,b) => (a.currentLocation || '').localeCompare(b.currentLocation || ''));
    }, [locationId, rawMaterialsLogList, finishedGoodsList]);

    if (!locationId) {
        return <div>Błąd: Brak ID lokalizacji.</div>;
    }

    return (
        <div className="bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col p-4 md:p-6">
            <header className="flex-shrink-0 flex items-center gap-3 mb-4 pb-3 border-b dark:border-secondary-700">
                <Button onClick={() => handleSetView(returnView)} variant="secondary" className="p-2"><ArrowLeftIcon className="h-5 w-5"/></Button>
                <div>
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">{locationName || `Lokalizacja: ${locationId}`}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Znaleziono {itemsInLocation.length} palet.</p>
                </div>
            </header>
            <div className="flex-grow overflow-auto scrollbar-hide">
                {itemsInLocation.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <WarehouseIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Lokalizacja jest pusta</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {itemsInLocation.map(item => (
                            <PalletTile
                                key={item.id}
                                item={item}
                                onClick={() => item.isRaw ? modalHandlers.openPalletDetailModal(item) : modalHandlers.openFinishedGoodDetailModal(item)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LocationDetailPage;
