import React, { useMemo } from 'react';
import { useUIContext } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { View } from '../../types';
import Button from '../Button';
import { getBlockInfo } from '../../src/utils';
import { MGW01_RECEIVING_AREA_ID, BUFFER_MS01_ID, BUFFER_MP01_ID, ALL_MANAGEABLE_WAREHOUSES } from '../../constants';
import WarehouseIcon from '../icons/WarehouseIcon';
import InboxArrowDownIcon from '../icons/InboxArrowDownIcon';
import ArchiveBoxIcon from '../icons/ArchiveBoxIcon';
import ExclamationTriangleIcon from '../icons/ExclamationTriangleIcon';
import { useWarehouseContext } from '../contexts/WarehouseContext';
import { StatCard } from '../StatCard';

interface MagazynierDashboardProps {
    isWidgetVisible: (id: string) => boolean;
}

const MagazynierDashboard: React.FC<MagazynierDashboardProps> = ({ isWidgetVisible }) => {
    const { rawMaterialsLogList, finishedGoodsList, expiringPalletsDetails } = useWarehouseContext();
    const { handleSetView, modalHandlers } = useUIContext();
    const { currentUser } = useAuth();
    
    const userSubRole = currentUser?.subRole || 'AGRO';
    const isRestricted = userSubRole !== 'AGRO';
    
    const currentWarehouseInfo = useMemo(() => 
        ALL_MANAGEABLE_WAREHOUSES.find(w => w.id === userSubRole),
    [userSubRole]);

    const stats = useMemo(() => {
        if (isRestricted) {
            return {
                currentStock: (rawMaterialsLogList || []).filter((p: any) => p.currentLocation === userSubRole).length,
                pendingReceiving: (finishedGoodsList || []).filter((p: any) => p.currentLocation === userSubRole).length,
                inBufferMS01: 0,
                inBufferMP01: 0,
                criticalExpiry: (expiringPalletsDetails || []).filter((p: any) => 
                    p.pallet.currentLocation === userSubRole && p.daysLeft < 7
                ).length,
            };
        }

        return {
            currentStock: (rawMaterialsLogList || []).length,
            pendingReceiving: (finishedGoodsList || []).filter((p: any) => p.currentLocation === MGW01_RECEIVING_AREA_ID).length,
            inBufferMS01: (rawMaterialsLogList || []).filter((p: any) => p.currentLocation === BUFFER_MS01_ID).length,
            inBufferMP01: (rawMaterialsLogList || []).filter((p: any) => p.currentLocation === BUFFER_MP01_ID).length,
            criticalExpiry: (expiringPalletsDetails || []).filter((p: any) => p.daysLeft < 7).length,
        };
    }, [rawMaterialsLogList, finishedGoodsList, expiringPalletsDetails, isRestricted, userSubRole]);

    const urgentPallets = useMemo(() => 
        (expiringPalletsDetails || [])
            .filter(({ pallet }: any) => {
                const { isBlocked } = getBlockInfo(pallet);
                if (isRestricted && pallet.currentLocation !== userSubRole) return false;
                return !isBlocked;
            })
            .slice(0, 5),
    [expiringPalletsDetails, isRestricted, userSubRole]);
        
    return (
        <div className="space-y-8">
             <header className="border-b dark:border-secondary-600 pb-4">
                <div className="flex items-center">
                    <WarehouseIcon className="h-10 w-10 text-primary-600 dark:text-primary-400 mr-3" />
                    <div>
                        <h2 className="text-3xl font-semibold text-primary-700 dark:text-primary-300">
                            Pulpit Magazyniera - {currentWarehouseInfo?.label || userSubRole}
                        </h2>
                        <p className="text-md text-gray-500 dark:text-gray-400">
                            {isRestricted ? `Zarządzanie stanami dla lokalizacji ${userSubRole}` : 'Zarządzanie operacyjne Centrali'}
                        </p>
                    </div>
                </div>
            </header>
            
            {isWidgetVisible('stats_row') && (
                <section>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            label={isRestricted ? "Twój Stan Magazynu" : "Strefa Przyjęć"} 
                            value={isRestricted ? stats.currentStock : stats.pendingReceiving} 
                            icon={isRestricted ? <WarehouseIcon className="h-8 w-8 text-purple-500"/> : <InboxArrowDownIcon className="h-8 w-8 text-blue-500"/>} 
                            onClick={() => {
                                if (isRestricted && currentWarehouseInfo) {
                                    handleSetView(currentWarehouseInfo.view, { locationId: userSubRole, locationName: currentWarehouseInfo.label });
                                } else {
                                    handleSetView(View.MGW01_Receiving);
                                }
                            }}
                        />
                        <StatCard 
                            label="Bufor MS01" 
                            value={stats.inBufferMS01} 
                            icon={<ArchiveBoxIcon className="h-8 w-8 text-indigo-500"/>} 
                            onClick={() => handleSetView(View.BufferMS01View)}
                            className={isRestricted ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                        />
                        <StatCard 
                            label="Bufor MP01" 
                            value={stats.inBufferMP01} 
                            icon={<ArchiveBoxIcon className="h-8 w-8 text-blue-500"/>} 
                            onClick={() => handleSetView(View.BufferMP01View)}
                            className={isRestricted ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                        />
                        <StatCard 
                            label="Krytyczne Terminy" 
                            value={stats.criticalExpiry} 
                            icon={<ExclamationTriangleIcon className="h-8 w-8 text-orange-500"/>} 
                            onClick={() => handleSetView(View.AllRawMaterialsView, { preFilter: 'criticalExpiry' })}
                        />
                    </div>
                </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {isWidgetVisible('quick_actions') && (
                     <div>
                        <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Szybkie Akcje</h3>
                        <div className="space-y-3">
                            <Button onClick={() => handleSetView(View.Scan)} className="w-full justify-center text-base py-3">Skanuj Paletę / Ruch</Button>
                            <Button 
                                onClick={() => {
                                    if (isRestricted && currentWarehouseInfo) {
                                        handleSetView(currentWarehouseInfo.view, { locationId: userSubRole });
                                    } else {
                                        handleSetView(View.WarehouseDashboard);
                                    }
                                }} 
                                variant="secondary" 
                                className="w-full justify-center text-base py-3"
                            >
                                {isRestricted ? `Otwórz Widok Magazynu (${userSubRole})` : 'Przegląd Magazynów'}
                            </Button>
                            {!isRestricted && (
                                <Button onClick={() => handleSetView(View.DeliveryList)} variant="secondary" className="w-full justify-center text-base py-3">Dostawy</Button>
                            )}
                        </div>
                     </div>
                 )}

                 <div className="space-y-6">
                    {isWidgetVisible('urgent_pallets') && (
                        <div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Palety do Kontroli ({userSubRole})</h3>
                            <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md max-h-64 overflow-y-auto">
                                {urgentPallets.length > 0 ? (
                                    <ul className="space-y-2">
                                        {urgentPallets.map(({ pallet, daysLeft, isRaw }: any) => {
                                            const productName = isRaw ? pallet.palletData.nazwa : pallet.productName;
                                            const palletId = isRaw ? pallet.palletData.nrPalety : (pallet.finishedGoodPalletId || pallet.id);
                                            const location = pallet.currentLocation;

                                            const handleClick = () => {
                                                if (isRaw) {
                                                    modalHandlers.openPalletDetailModal(pallet);
                                                } else {
                                                    modalHandlers.openFinishedGoodDetailModal(pallet);
                                                }
                                            };

                                            return (
                                                <li key={pallet.id}>
                                                    <button onClick={handleClick} className="w-full text-left flex justify-between items-center p-2 bg-slate-50 dark:bg-secondary-700 rounded hover:bg-slate-100 dark:hover:bg-secondary-600">
                                                        <div>
                                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{productName}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{palletId} ({location})</p>
                                                        </div>
                                                        <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${daysLeft < 0 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>{daysLeft < 0 ? 'Po terminie' : `${daysLeft} dni`}</span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">Brak pilnych alertów w Twojej sekcji.</p>
                                )}
                            </div>
                        </div>
                    )}
                 </div>
            </section>
        </div>
    );
};

export default MagazynierDashboard;