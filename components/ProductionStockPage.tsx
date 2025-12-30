
import React, { useMemo } from 'react';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useProductionContext } from './contexts/ProductionContext';
import { useUIContext } from './contexts/UIContext';
import ClipboardListIcon from './icons/ClipboardListIcon';
import ChargingStationGraphic from './ChargingStationGraphic';
import WeighingScaleGraphic from './WeighingScaleGraphic';
import { getBlockInfo, getExpiryStatus } from '../src/utils';

const ProductionStockPage: React.FC = () => {
    const { rawMaterialsLogList, expiryWarningDays, expiryCriticalDays } = useWarehouseContext();
    const { stationRawMaterialMapping, productionRunsList } = useProductionContext();
    const { modalHandlers } = useUIContext();

    // Aktywne zlecenie i szarża do obliczeń wagi procesowej
    const activeRun = useMemo(() => productionRunsList.find(r => r.status === 'ongoing'), [productionRunsList]);
    const activeBatch = useMemo(() => activeRun?.batches?.find(b => b.status === 'ongoing'), [activeRun]);

    const getStationData = (id: string) => {
        const pallet = (rawMaterialsLogList || []).find(p => p.currentLocation === id);
        const expectedMaterial = stationRawMaterialMapping[id];
        
        if (!pallet) {
            return { id, material: expectedMaterial || 'Nieprzypisany', weight: 0, status: 'default', isBlocked: false, isEmpty: true, pallet: null };
        }

        const { isBlocked } = getBlockInfo(pallet);
        const expiryStatus = getExpiryStatus(pallet.palletData, expiryWarningDays, expiryCriticalDays);
        
        return {
            id,
            material: pallet.palletData.nazwa,
            weight: pallet.palletData.currentWeight,
            status: expiryStatus,
            isBlocked,
            isEmpty: pallet.palletData.currentWeight <= 0,
            pallet: pallet
        };
    };

    const handleStationClick = (station: any) => {
        if (station.pallet) {
            modalHandlers.openPalletDetailModal(station.pallet);
        } else {
            modalHandlers.openAssignToStationModal(station.id);
        }
    };

    const scale1Stations = ['BB01', 'BB02', 'BB03', 'BB04', 'BB05', 'BB06'];
    const scale2Stations = ['MZ01', 'MZ02', 'BB07', 'BB08', 'BB09', 'BB10', 'MZ03', 'MZ04'];
    const scale3Stations = ['BB11', 'BB12', 'BB13', 'BB14', 'MZ05', 'BB15', 'BB16', 'BB17', 'BB18', 'MZ06'];

    const renderScaleGroup = (title: string, stationIds: string[], scaleId: string, scaleLabel: string) => {
        const data = stationIds.map(id => getStationData(id));
        
        // Suma zapasu w silosach (np. 19200 kg)
        const totalStockWeight = data.reduce((sum, s) => sum + s.weight, 0);

        // Suma naważona do aktualnej szarży (np. 800 kg)
        // Szukamy w zużyciach produktów, które są przypisane do stacji w tej grupie wagowej
        const batchWeight = useMemo(() => {
            if (!activeRun || !activeBatch) return 0;
            return (activeRun.actualIngredientsUsed || [])
                .filter(c => c.batchId === activeBatch.id && !c.isAnnulled)
                .filter(c => {
                    const stationForMaterial = Object.entries(stationRawMaterialMapping).find(([sId, mat]) => mat === c.productName)?.[0];
                    return stationForMaterial && stationIds.includes(stationForMaterial);
                })
                .reduce((sum, c) => sum + c.actualConsumedQuantityKg, 0);
        }, [activeRun, activeBatch, stationRawMaterialMapping, stationIds]);

        return (
            <div className="flex-none flex flex-col border-b border-slate-200 dark:border-secondary-700 last:border-0 py-6">
                <div className="flex items-center gap-2 px-4 py-1 bg-slate-50/50 dark:bg-secondary-800/50">
                    <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-tighter whitespace-nowrap bg-primary-100/50 dark:bg-primary-900/30 px-2 py-0.5 rounded">
                        {title}
                    </span>
                    <div className="h-[1px] flex-grow bg-slate-200 dark:bg-secondary-700 opacity-20"></div>
                </div>

                <div className="flex flex-col items-center justify-center pt-4">
                    <div className="w-full overflow-x-auto scrollbar-hide px-4">
                        <div className="flex flex-col items-center mx-auto w-fit">
                            <div className="flex flex-nowrap justify-center items-end gap-x-[5px]">
                                {data.map(station => (
                                    <div key={station.id} className="flex flex-col items-center">
                                        <div onClick={() => handleStationClick(station)} className="cursor-pointer transition-transform hover:scale-105 active:scale-95 z-10">
                                            <ChargingStationGraphic 
                                                stationId={station.id}
                                                productName={station.material}
                                                weight={station.weight}
                                                status={station.status}
                                                isBlocked={station.isBlocked}
                                                isEmpty={station.isEmpty}
                                            />
                                        </div>
                                        <div className="w-1.5 h-3 bg-slate-400 dark:bg-secondary-600 rounded-b-sm -mt-0.5"></div>
                                    </div>
                                ))}
                            </div>

                            <div className="w-full mt-[-1px]">
                                <div className="relative h-2 bg-gradient-to-b from-slate-400 to-slate-600 rounded-full border border-slate-500/30 w-full shadow-sm">
                                    {batchWeight > 0 && <div className="absolute inset-0 bg-primary-400/30 animate-pulse"></div>}
                                </div>
                            </div>

                            <div className="w-2 h-6 bg-slate-500 border-x border-slate-600 relative">
                                 {batchWeight > 0 && <div className="absolute inset-0 bg-primary-400/30 animate-pulse"></div>}
                            </div>

                            <div className="w-full scale-y-75 sm:scale-y-100 origin-top">
                                <WeighingScaleGraphic 
                                    id={scaleId} 
                                    label={scaleLabel} 
                                    currentWeight={batchWeight} 
                                    totalStockWeight={totalStockWeight}
                                    isActive={batchWeight > 0}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full bg-white dark:bg-secondary-800 flex flex-col overflow-hidden">
            <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b dark:border-secondary-600 bg-white dark:bg-secondary-800 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-1 bg-primary-800 rounded-md">
                        <ClipboardListIcon className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">SCADA: Monitoring Węzłów</h2>
                </div>
                <div className="flex items-center gap-3">
                     {activeRun && (
                         <div className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-[10px] font-bold text-blue-700 dark:text-blue-300 animate-pulse">
                             ZLECENIE W TOKU: {activeRun.recipeName}
                         </div>
                     )}
                     <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Status: Live</span>
                    </div>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto scrollbar-hide bg-slate-50/20">
                {renderScaleGroup("Węzeł N1 - Surowce Główne", scale1Stations, "SCALE-01", "Waga N1")}
                {renderScaleGroup("Węzeł N2 - Surowce Średnie", scale2Stations, "SCALE-02", "Waga N2")}
                {renderScaleGroup("Węzeł N3 - Mikro i Dodatki", scale3Stations, "SCALE-03", "Waga N3")}
            </div>

            <footer className="flex-shrink-0 px-4 py-1 bg-white dark:bg-secondary-800 border-t dark:border-secondary-700 flex justify-between items-center text-[7px] font-black text-gray-400 uppercase tracking-widest opacity-60">
                <span>SYSTEM NODE: G1-PROD-01</span>
                <span>{new Date().toLocaleTimeString()}</span>
            </footer>
        </div>
    );
};

export default ProductionStockPage;
