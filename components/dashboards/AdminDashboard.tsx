
import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useUIContext } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { View, Permission } from '../../types';
import { useProductionContext } from '../contexts/ProductionContext';
import { useWarehouseContext } from '../contexts/WarehouseContext';
import { StatCard } from '../StatCard';
import { logger, LogEntry } from '../../utils/logger';
import Button from '../Button';

// Icons
import UserGroupIcon from '../icons/UserGroupIcon';
import ShieldCheckIcon from '../icons/ShieldCheckIcon';
import PaperAirplaneIcon from '../icons/PaperAirplaneIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import ArchiveBoxIcon from '../icons/ArchiveBoxIcon';
import TruckIcon from '../icons/TruckIcon';
import CalendarDaysIcon from '../icons/CalendarDaysIcon';
import CogIcon from '../icons/CogIcon';
import BeakerIcon from '../icons/BeakerIcon';
import ArrowRightIcon from '../icons/ArrowRightIcon';
import ClockIcon from '../icons/ClockIcon';

const timeAgo = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    if (seconds < 30) return `teraz`;
    if (seconds < 60) return `${seconds} sek. temu`;
    if (minutes < 60) return `${minutes} min. temu`;
    if (hours < 24) return `${hours} godz. temu`;
    return `${days} dni temu`;
};

const getContextIcon = (context?: string) => {
    const ctx = context?.toLowerCase() || '';
    if (ctx.includes('logistics') || ctx.includes('magazyn') || ctx.includes('sieć') || ctx.includes('nawigacja')) 
        return <TruckIcon className="h-5 w-5 text-blue-500" />;
    if (ctx.includes('production') || ctx.includes('agro') || ctx.includes('psd')) 
        return <CogIcon className="h-5 w-5 text-orange-500" />;
    if (ctx.includes('planner') || ctx.includes('planowanie')) 
        return <CalendarDaysIcon className="h-5 w-5 text-purple-500" />;
    if (ctx.includes('lab') || ctx.includes('jakość')) 
        return <BeakerIcon className="h-5 w-5 text-yellow-500" />;
    return <ShieldCheckIcon className="h-5 w-5 text-gray-400" />;
};

const getContextBadgeColor = (context?: string) => {
    const ctx = context?.toLowerCase() || '';
    if (ctx.includes('nawigacja')) return 'bg-gray-100 text-gray-600 border-gray-200';
    if (ctx.includes('logistics')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (ctx.includes('production')) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (ctx.includes('planner')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (ctx.includes('lab')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
};

const getContextColor = (context?: string) => {
    const ctx = context?.toLowerCase() || '';
    if (ctx.includes('logistics')) return 'border-blue-500 bg-blue-50/30';
    if (ctx.includes('production')) return 'border-orange-500 bg-orange-50/30';
    if (ctx.includes('planner')) return 'border-purple-500 bg-purple-50/30';
    if (ctx.includes('lab')) return 'border-yellow-500 bg-yellow-50/30';
    return 'border-gray-200 bg-gray-50/30';
};

interface AdminDashboardProps { isWidgetVisible: (id: string) => boolean; }

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isWidgetVisible }) => {
    const { users } = useAuth();
    const { rawMaterialsLogList, finishedGoodsList } = useWarehouseContext();
    const { handleSetView } = useUIContext();
    const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);

    // Pobieranie logów i auto-odświeżanie
    useEffect(() => {
        const updateLogs = () => {
            const allLogs = logger.getLogs();
            const filtered = allLogs.filter(log => 
                ['info', 'warn', 'critical'].includes(log.level) && 
                log.context !== 'System'
            ).slice(0, 15);
            setLiveLogs(filtered);
        };

        updateLogs();
        const interval = setInterval(updateLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    const occupancyStats = useMemo(() => {
        const occupiedSpots = (rawMaterialsLogList?.length || 0) + (finishedGoodsList?.length || 0);
        return { 
            percent: (occupiedSpots / 800) * 100,
            count: occupiedSpots
        };
    }, [rawMaterialsLogList, finishedGoodsList]);

    const handleLogClick = (log: LogEntry) => {
        const ctx = log.context?.toLowerCase() || '';
        if (ctx.includes('logistics')) handleSetView(View.History);
        else if (ctx.includes('production')) handleSetView(View.ArchivedProductionRuns);
        else if (ctx.includes('planner')) handleSetView(View.ProductionPlanningAgro);
        else if (ctx.includes('lab')) handleSetView(View.LabPalletRelease);
        else handleSetView(View.AppLogs);
    };

    return (
        <div className="space-y-8">
            <header className="pb-4">
                <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-primary-700 dark:text-primary-300">Pulpit Administratora</h2>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Monitorowanie Systemu MES</p>
                    </div>
                </div>
            </header>

            {isWidgetVisible('stats_row') && (
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Aktywni Użytkownicy" value={users?.length || 0} icon={<UserGroupIcon className="h-8 w-8 text-blue-600" />} onClick={() => handleSetView(View.Users)} colorClass="bg-blue-100" layout="icon-right" />
                    <StatCard label="Zajętość Magazynu" value={`${occupancyStats.percent.toFixed(1)}%`} icon={<ArchiveBoxIcon className="h-8 w-8 text-purple-600" />} onClick={() => handleSetView(View.WarehouseDashboard)} colorClass="bg-purple-100" layout="icon-right" />
                    <StatCard label="Zgodność Dostaw" value="99.2%" icon={<CheckCircleIcon className="h-8 w-8 text-green-600" />} layout="icon-right" colorClass="bg-green-100" />
                    <StatCard label="Akcje w Kolejce" value="0" icon={<PaperAirplaneIcon className="h-8 w-8 text-indigo-600" />} onClick={() => handleSetView(View.QueueStatus)} colorClass="bg-indigo-100" layout="icon-right" />
                </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 border-t dark:border-secondary-700">
                {isWidgetVisible('recent_activity') && (
                    <section className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight flex items-center gap-2">
                                <ClockIcon className="h-5 w-5 text-primary-500" />
                                Monitor Interakcji
                            </h3>
                            <button onClick={() => handleSetView(View.AppLogs)} className="text-[10px] font-black text-primary-600 hover:underline uppercase">Pełny Rejestr &rarr;</button>
                        </div>

                        <div className="space-y-2">
                            {liveLogs.length === 0 ? (
                                <div className="p-8 text-center bg-white dark:bg-secondary-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-secondary-700 text-gray-400 italic">
                                    Brak zarejestrowanych akcji.
                                </div>
                            ) : (
                                liveLogs.map((log, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => handleLogClick(log)}
                                        className={`w-full text-left p-3 bg-white dark:bg-secondary-800 rounded-lg shadow-sm hover:shadow-md transition-all border-l-4 flex items-center gap-4 group animate-fadeIn ${getContextColor(log.context)}`}
                                    >
                                        <div className="flex-shrink-0 p-2 bg-white dark:bg-secondary-700 rounded-full shadow-inner">
                                            {getContextIcon(log.context)}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getContextBadgeColor(log.context)}`}>
                                                        {log.context || 'System'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-500 bg-slate-100 dark:bg-secondary-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                        Użytkownik: {log.user}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 tabular-nums">
                                                    {timeAgo(log.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate group-hover:text-primary-600 transition-colors">
                                                {log.message}
                                            </p>
                                        </div>
                                        <ArrowRightIcon className="h-4 w-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
                                    </button>
                                ))
                            )}
                        </div>
                    </section>
                )}

                <section className="space-y-6">
                    <div className="bg-primary-600 rounded-2xl p-6 text-white shadow-xl">
                        <h4 className="text-lg font-black uppercase tracking-tighter mb-2">Administracja</h4>
                        <p className="text-xs opacity-80 mb-6">Szybkie przejście do zarządzania systemem.</p>
                        <div className="space-y-2">
                            <Button onClick={() => handleSetView(View.Users)} className="w-full bg-white/10 hover:bg-white/20 border-white/20 justify-start text-xs font-bold" leftIcon={<UserGroupIcon className="h-4 w-4"/>}>Użytkownicy i Konta</Button>
                            <Button onClick={() => handleSetView(View.RolesManagement)} className="w-full bg-white/10 hover:bg-white/20 border-white/20 justify-start text-xs font-bold" leftIcon={<ShieldCheckIcon className="h-4 w-4"/>}>Role i Oddziały</Button>
                            <Button onClick={() => handleSetView(View.Settings)} className="w-full bg-white/10 hover:bg-white/20 border-white/20 justify-start text-xs font-bold" leftIcon={<CogIcon className="h-4 w-4"/>}>Ustawienia MES</Button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-secondary-800 p-5 rounded-2xl shadow-md border dark:border-secondary-700">
                         <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Zdrowie Systemu</h4>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Logi w pamięci:</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{logger.getLogs().length} / 500</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Kolejki Sync:</span>
                                <span className="font-bold text-green-600">Aktywna</span>
                            </div>
                         </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminDashboard;
