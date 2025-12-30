import React, { useState } from 'react';
import { View } from '../types';
import OeeReportPage from './reports/OeeReportPage';
import DeliveryReportPage from './reports/DeliveryReportPage';
import BlockedPalletsReportPage from './reports/BlockedPalletsReportPage';
import SlowMovingPalletsReportPage from './reports/SlowMovingPalletsReportPage';
import YieldVarianceReportPage from './reports/YieldVarianceReportPage';
import { SupplierPerformanceReportPage } from './reports/SupplierPerformanceReportPage';
import ChartBarSquareIcon from './icons/ChartBarSquareIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import BeakerIcon from './icons/BeakerIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import TruckIcon from './icons/TruckIcon';
import ArchiveBoxXMarkIcon from './icons/ArchiveBoxXMarkIcon';
import ClockIcon from './icons/ClockIcon';
import ScaleIcon from './icons/ScaleIcon';
import UserGroupIcon from './icons/UserGroupIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import ListBulletIcon from './icons/ListBulletIcon'; // Icon for Inventory Reports
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';

interface ReportItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    view: number;
}

const reportItems: ReportItem[] = [
    { id: 'oee', label: 'Raport OEE', icon: <ChartBarSquareIcon className="h-6 w-6" />, view: View.OEE_REPORT },
    { id: 'yield_variance', label: 'Wydajność i Odchylenia', icon: <ScaleIcon className="h-6 w-6" />, view: View.YIELD_VARIANCE_REPORT },
    { id: 'supplier_performance', label: 'Efektywność Dostawców', icon: <UserGroupIcon className="h-6 w-6" />, view: View.SUPPLIER_PERFORMANCE_REPORT },
    { id: 'psd_production', label: 'Raport Produkcji PSD', icon: <BeakerIcon className="h-6 w-6" />, view: View.PSD_REPORTS },
    { id: 'deliveries', label: 'Raport Dostaw', icon: <TruckIcon className="h-6 w-6" />, view: View.DELIVERY_REPORT },
    { id: 'blocked', label: 'Zablokowane Palety', icon: <ArchiveBoxXMarkIcon className="h-6 w-6" />, view: View.BLOCKED_PALLETS_REPORT },
    { id: 'slow_moving', label: 'Palety Wolno Rotujące', icon: <ClockIcon className="h-6 w-6" />, view: View.SLOW_MOVING_PALLETS_REPORT },
    { id: 'inventory_reports', label: 'Raporty Inwentaryzacyjne', icon: <ListBulletIcon className="h-6 w-6" />, view: View.InventoryReports },
    { id: 'adjustment_report', label: 'Raport Odchyleń (Dosypek)', icon: <ExclamationTriangleIcon className="h-6 w-6" />, view: View.ADJUSTMENT_REPORT },
];

interface ReportsLandingPageProps {
  onSelectReport: (view: number) => void;
}

const ReportsLandingPage: React.FC<ReportsLandingPageProps> = ({ onSelectReport }) => {
    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
            <header className="flex items-center mb-6 border-b dark:border-secondary-600 pb-4">
                <ChartBarSquareIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Centrum Raportowania</h2>
            </header>

            <p className="text-md text-gray-600 dark:text-gray-300 mb-6">
                Wybierz raport, który chcesz wyświetlić. Każdy z nich dostarcza kluczowych informacji na temat różnych aspektów działalności operacyjnej.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onSelectReport(item.view)}
                        className="group flex items-center p-4 bg-slate-50 dark:bg-secondary-900/50 hover:bg-primary-50 dark:hover:bg-secondary-700 border border-slate-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        <div className="p-3 bg-white dark:bg-secondary-800 rounded-lg shadow-sm mr-4 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 text-primary-600 dark:text-primary-300">
                            {item.icon}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-left">{item.label}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ReportsLandingPage;