import React from 'react';
import { useUIContext } from '../contexts/UIContext';
import { View } from '../../types';
import Button from '../Button';
import { formatDate } from '../../src/utils';
import BeakerIcon from '../icons/BeakerIcon';
import TruckIcon from '../icons/TruckIcon';
import LockClosedIcon from '../icons/LockClosedIcon';
import PlusIcon from '../icons/PlusIcon';
import { useWarehouseContext } from '../contexts/WarehouseContext';
import { useRecipeAdjustmentContext } from '../contexts/RecipeAdjustmentContext';
import { StatCard } from '../StatCard';

interface LabDashboardProps {
    isWidgetVisible: (id: string) => boolean;
}

const LabDashboard: React.FC<LabDashboardProps> = ({ isWidgetVisible }) => {
    const { rawMaterialsLogList, deliveries } = useWarehouseContext();
    const { adjustmentOrders } = useRecipeAdjustmentContext();
    const { handleSetView } = useUIContext();

    const stats = {
        pendingDeliveries: (deliveries || []).filter((d: any) => d.status === 'PENDING_LAB').length,
        blockedPallets: (rawMaterialsLogList || []).filter((p: any) => p && p.palletData && p.palletData.isBlocked).length,
        pendingAdjustments: (adjustmentOrders || []).filter((a: any) => a.status === 'planned').length,
    };

    const deliveriesToApprove = (deliveries || [])
        .filter((d: any) => d.status === 'PENDING_LAB')
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(0, 5);
        
    return (
        <div className="space-y-8">
            <header className="border-b dark:border-secondary-600 pb-4">
                <div className="flex items-center">
                    <BeakerIcon className="h-10 w-10 text-primary-600 dark:text-primary-400 mr-3" />
                    <div>
                        <h2 className="text-3xl font-semibold text-primary-700 dark:text-primary-300">Pulpit Laboratorium</h2>
                        <p className="text-md text-gray-500 dark:text-gray-400">Zadania i statusy laboratoryjne.</p>
                    </div>
                </div>
            </header>

            {isWidgetVisible('stats_row') && (
                <section>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard 
                            label="Dostawy do Zatwierdzenia" 
                            value={stats.pendingDeliveries} 
                            icon={<TruckIcon className="h-8 w-8 text-blue-500"/>} 
                        />
                        <StatCard 
                            label="Zablokowane Palety" 
                            value={stats.blockedPallets} 
                            icon={<LockClosedIcon className="h-8 w-8 text-red-500"/>} 
                        />
                        <StatCard 
                            label="Zlecenia Dosypek" 
                            value={stats.pendingAdjustments} 
                            icon={<PlusIcon className="h-8 w-8 text-green-500"/>} 
                        />
                    </div>
                </section>
            )}
            
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {isWidgetVisible('quick_actions') && (
                     <div>
                        <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Szybkie Akcje</h3>
                        <div className="space-y-3">
                            <Button onClick={() => handleSetView(View.LabPalletRelease)} className="w-full justify-center text-base py-3">Zwalnianie Palet</Button>
                            <Button onClick={() => handleSetView(View.DeliveryList)} variant="secondary" className="w-full justify-center text-base py-3">Przeglądaj Dostawy</Button>
                            <Button onClick={() => handleSetView(View.RecipeAdjustments)} variant="secondary" className="w-full justify-center text-base py-3">Korekty Receptur</Button>
                        </div>
                     </div>
                 )}

                 {isWidgetVisible('pending_deliveries') && (
                     <div>
                        <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Dostawy Oczekujące na Zatwierdzenie</h3>
                         <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md max-h-64 overflow-y-auto">
                            {deliveriesToApprove.length > 0 ? (
                                 <ul className="space-y-2">
                                    {deliveriesToApprove.map((delivery: any) => (
                                        <li key={delivery.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-secondary-700 rounded">
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-gray-200">{delivery.orderRef || delivery.id}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(delivery.deliveryDate)}</p>
                                            </div>
                                            <Button onClick={() => handleSetView(View.GoodsDeliveryReception, { deliveryId: delivery.id })} variant="secondary" className="text-xs">Przejdź</Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-4">Brak dostaw oczekujących na zatwierdzenie.</p>
                            )}
                         </div>
                     </div>
                 )}
            </section>
        </div>
    );
};

export default LabDashboard;