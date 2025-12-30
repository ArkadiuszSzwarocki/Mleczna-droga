

import React, { useState, useMemo } from 'react';
import { useProductionContext } from '../contexts/ProductionContext';
// FIX: Removed non-existent OeeMetrics from import.
import type { ProductionRun } from '../../types';
import { formatDate, formatProductionTime } from '../../src/utils';
import { PRODUCTION_RATE_KG_PER_MINUTE } from '../../constants';
import Input from '../Input';
import Button from '../Button';
import GaugeChart from '../charts/GaugeChart';
import Alert from '../Alert';
import InformationCircleIcon from '../icons/InformationCircleIcon';

// FIX: Changed type annotations to `any` to match project's type structure.
// FIX: Removed OeeMetrics type annotation as it does not exist.
const calculateOeeForRun = (run: any): any | null => {
    if (!run.startTime || !run.endTime) return null;

    const startTime = new Date(run.startTime);
    const endTime = new Date(run.endTime);
    const totalTimeMinutes = (endTime.getTime() - startTime.getTime()) / 60000;

    const totalDowntimeMinutes = (run.downtimes || []).reduce((sum, dt) => sum + (dt.durationMinutes || 0), 0);
    const runningTimeMinutes = totalTimeMinutes - totalDowntimeMinutes;

    if (totalTimeMinutes <= 0 || runningTimeMinutes < 0) return null;
    
    // 1. Availability
    const availability = (runningTimeMinutes / totalTimeMinutes);

    // 2. Performance
    const actualProductionKg = run.actualProducedQuantityKg || 0;
    const idealProductionKg = runningTimeMinutes * PRODUCTION_RATE_KG_PER_MINUTE;
    const performance = idealProductionKg > 0 ? (actualProductionKg / idealProductionKg) : 0;
    
    // 3. Quality (assumed to be 100% as per spec)
    const quality = 1.0;

    // 4. OEE
    const oee = availability * performance * quality;

    return {
        availability: availability * 100,
        performance: performance * 100,
        quality: quality * 100,
        oee: oee * 100,
    };
};


const OeeReportPage: React.FC = () => {
    const { productionRunsList } = useProductionContext();
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const completedRunsWithOee = useMemo(() => {
        return (productionRunsList || [])
            .filter(run => {
                if (run.status !== 'completed' && run.status !== 'archived') return false;
                if (!run.endTime) return false;
                const runDate = new Date(run.endTime);
                return runDate >= new Date(startDate) && runDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999));
            })
            .map(run => ({ run, oee: calculateOeeForRun(run) }))
            // FIX: Changed type annotation to `any` to match project's type structure.
            .filter(item => item.oee !== null) as { run: any, oee: any }[];
    }, [productionRunsList, startDate, endDate]);

    const overallOee = useMemo(() => {
        if (completedRunsWithOee.length === 0) {
            return { availability: 0, performance: 0, quality: 0, oee: 0 };
        }
        const totals = completedRunsWithOee.reduce((acc, { oee }) => {
            acc.availability += oee.availability;
            acc.performance += oee.performance;
            acc.quality += oee.quality;
            acc.oee += oee.oee;
            return acc;
        }, { availability: 0, performance: 0, quality: 0, oee: 0 });

        return {
            availability: totals.availability / completedRunsWithOee.length,
            performance: totals.performance / completedRunsWithOee.length,
            quality: totals.quality / completedRunsWithOee.length,
            oee: totals.oee / completedRunsWithOee.length,
        };
    }, [completedRunsWithOee]);

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Raport OEE</h2>
                    <InformationCircleIcon className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 -mt-5">
                    Raport OEE (Całkowita Efektywność Sprzętu) mierzy produktywność zakończonych zleceń. Analizuje trzy wskaźniki: Dostępność (czas pracy vs przestoje), Wydajność (rzeczywista vs idealna prędkość produkcji) oraz Jakość (domyślnie 100%). Ogólny wskaźnik OEE jest iloczynem tych trzech wartości.
                </p>

                <div className="p-4 bg-gray-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700">
                    <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 mb-2">Filtruj Zakres Dat</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Data od" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <Input label="Data do" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
                    </div>
                </div>

                {completedRunsWithOee.length === 0 ? (
                    <Alert type="info" message="Brak zakończonych zleceń produkcyjnych w wybranym okresie do wygenerowania raportu OEE." />
                ) : (
                    <>
                        <section className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                            <h3 className="text-xl font-bold text-center text-blue-800 dark:text-blue-200 mb-4">Ogólna Efektywność Sprzętu (OEE)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                                <div className="lg:col-span-2 flex justify-center">
                                    <div className="w-full max-w-sm">
                                        <GaugeChart value={overallOee.oee} label="Całkowite OEE" color="#2563eb" />
                                    </div>
                                </div>
                                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
                                    <GaugeChart value={overallOee.availability} label="Dostępność" color="#10b981" />
                                    <GaugeChart value={overallOee.performance} label="Wydajność" color="#f59e0b" />
                                    <GaugeChart value={overallOee.quality} label="Jakość" color="#6366f1" />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Szczegółowe Dane Zleceň</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                                    <thead className="bg-gray-100 dark:bg-secondary-700">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Receptura / ID</th>
                                            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Data Zakończenia</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">OEE (%)</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Dostępność (%)</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Wydajność (%)</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Jakość (%)</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Przestoje (min)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                        {completedRunsWithOee.map(({ run, oee }) => {
                                            const totalDowntime = (run.downtimes || []).reduce((sum, dt) => sum + (dt.durationMinutes || 0), 0);
                                            return (
                                                <tr key={run.id}>
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <p className="font-medium text-gray-900 dark:text-gray-200">{run.recipeName}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{run.id}</p>
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-200">{formatDate(run.endTime, true)}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-lg text-primary-700 dark:text-primary-300">{oee.oee.toFixed(1)}%</td>
                                                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">{oee.availability.toFixed(1)}%</td>
                                                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">{oee.performance.toFixed(1)}%</td>
                                                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">{oee.quality.toFixed(1)}%</td>
                                                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">{totalDowntime}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default OeeReportPage;