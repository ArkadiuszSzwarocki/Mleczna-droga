
import React, { useState } from 'react';
// FIX: Corrected import path for WarehouseContext to be relative.
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
// FIX: Correct import path for types.ts to be relative
import { InventorySession, View } from '../types';
import { formatDate } from '../src/utils';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';
import ClipboardDocumentCheckIcon from './icons/ClipboardDocumentCheckIcon';
import StartInventoryModal from './StartInventoryModal';
import ConfirmationModal from './ConfirmationModal';

const getStatusInfo = (status: InventorySession['status']) => {
    switch (status) {
        case 'ongoing': return { label: 'W Trakcie', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' };
        case 'pending_review': return { label: 'Oczekuje na Weryfikację', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' };
        case 'completed': return { label: 'Zakończona', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' };
        case 'cancelled': return { label: 'Anulowana', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' };
        default: return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
};

const InventoryDashboardPage: React.FC = () => {
    const { inventorySessions, handleCancelInventorySession } = useWarehouseContext();
    const { handleSetView } = useUIContext();
    const { currentUser } = useAuth();
    
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [sessionToCancel, setSessionToCancel] = useState<InventorySession | null>(null);

    const sortedSessions = (inventorySessions || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Roles allowed to verify inventory (Managers, Admins, etc.) - Magazynier excluded
    const canVerify = ['admin', 'boss', 'planista', 'lider', 'kierownik magazynu'].includes(currentUser?.role || '');

    const handleActionClick = (session: InventorySession) => {
        if (session.status === 'ongoing') {
            handleSetView(View.InventorySession, { sessionId: session.id });
        } else if (session.status === 'pending_review') {
            handleSetView(View.InventoryReview, { sessionId: session.id });
        }
    };

    const confirmCancel = () => {
        if (sessionToCancel) {
            handleCancelInventorySession(sessionToCancel.id);
            setSessionToCancel(null);
        }
    };
    
    return (
        <>
            <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
                <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b dark:border-secondary-600 pb-3 gap-3">
                    <div className="flex items-center">
                        <ClipboardDocumentCheckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Panel Inwentaryzacji</h2>
                    </div>
                    {['admin', 'planista', 'kierownik magazynu'].includes(currentUser?.role || '') && (
                        <Button onClick={() => setIsStartModalOpen(true)} leftIcon={<PlusIcon className="h-5 w-5"/>}>
                            Rozpocznij Nową Inwentaryzację
                        </Button>
                    )}
                </header>

                <div className="flex-grow overflow-auto">
                    {sortedSessions.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500 dark:text-gray-400">Brak aktywnych lub zakończonych sesji inwentaryzacyjnych.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                                <thead className="bg-gray-50 dark:bg-secondary-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Nazwa / ID</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Status</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Data Utworzenia</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Zakres</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-300">Akcje</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                    {sortedSessions.map((session: InventorySession) => {
                                        const statusInfo = getStatusInfo(session.status);
                                        const canCancel = session.status === 'ongoing' && ['admin', 'planista', 'kierownik magazynu'].includes(currentUser?.role || '');
                                        return (
                                            <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{session.name}</p>
                                                    <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{session.id}</p>
                                                </td>
                                                <td className="px-4 py-3"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}>{statusInfo.label}</span></td>
                                                <td className="px-4 py-3">{formatDate(session.createdAt, true)}</td>
                                                <td className="px-4 py-3">{session.locations.length} lok.</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {canCancel && <Button onClick={() => setSessionToCancel(session)} variant="danger" className="text-xs">Anuluj</Button>}
                                                        
                                                        {session.status === 'ongoing' && (
                                                            <Button onClick={() => handleActionClick(session)} variant="secondary" className="text-xs">Rozpocznij Inwentaryzację</Button>
                                                        )}
                                                        
                                                        {session.status === 'pending_review' && canVerify && (
                                                            <Button onClick={() => handleActionClick(session)} variant="primary" className="text-xs">Weryfikuj</Button>
                                                        )}
                                                        {session.status === 'pending_review' && !canVerify && (
                                                            <span className="text-xs text-gray-500 italic">Oczekuje na weryfikację</span>
                                                        )}

                                                        {session.status === 'completed' && (
                                                            <Button onClick={() => handleSetView(View.InventoryReports)} variant="secondary" className="text-xs">Zobacz Raport</Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <StartInventoryModal isOpen={isStartModalOpen} onClose={() => setIsStartModalOpen(false)} />
            {sessionToCancel && (
                <ConfirmationModal 
                    isOpen={!!sessionToCancel}
                    onClose={() => setSessionToCancel(null)}
                    onConfirm={confirmCancel}
                    title="Anulować Inwentaryzację?"
                    message={`Czy na pewno chcesz anulować sesję "${sessionToCancel.name}"? Wszystkie zeskanowane dane zostaną utracone, a palety odblokowane.`}
                    confirmButtonText="Tak, anuluj"
                />
            )}
        </>
    );
};

export default InventoryDashboardPage;
