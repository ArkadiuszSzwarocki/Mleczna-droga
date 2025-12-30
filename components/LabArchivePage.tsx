import React, { useState, useMemo } from 'react';
import { ProductionRun, PsdTask, LabSample } from '../types';
import { useProductionContext } from './contexts/ProductionContext';
import { usePsdContext } from './contexts/PsdContext';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import QrCodeIcon from './icons/QrCodeIcon';
import { formatDate } from '../src/utils';

const LabArchivePage: React.FC = () => {
    const { productionRunsList, handleAddLabSample: handleAddAgroSample } = useProductionContext();
    const { psdTasks, handleAddLabSample: handleAddPsdSample } = usePsdContext();
    const { modalHandlers, showToast } = useUIContext();
    const { currentUser } = useAuth();
    
    const [scannedBagNumber, setScannedBagNumber] = useState('');
    const [archiveLocation, setArchiveLocation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState<{ task: ProductionRun | PsdTask; type: 'agro' | 'psd' } | null>(null);

    const activeAgroRun = useMemo(() => (productionRunsList || []).find(run => run.status === 'ongoing'), [productionRunsList]);
    const activePsdTask = useMemo(() => (psdTasks || []).find(task => task.status === 'ongoing'), [psdTasks]);
    
    const effectiveTaskData = useMemo(() => {
        if (selectedTask) return selectedTask;
        if (activeAgroRun && !activePsdTask) return { task: activeAgroRun, type: 'agro' as const };
        if (activePsdTask && !activeAgroRun) return { task: activePsdTask, type: 'psd' as const };
        return null;
    }, [selectedTask, activeAgroRun, activePsdTask]);

    const activeTask = effectiveTaskData?.task;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!effectiveTaskData || !scannedBagNumber.trim() || !currentUser || !archiveLocation.trim()) return;

        if (!/^ALA(0[1-9]|[1-4][0-9]|50)$/.test(archiveLocation.trim().toUpperCase())) {
            showToast('Nieprawidłowy numer pojemnika archiwum. Wprowadź wartość od ALA01 do ALA50.', 'error');
            return;
        }
        
        setIsLoading(true);

        const { task, type } = effectiveTaskData;
        const result = type === 'agro' 
            ? handleAddAgroSample(task.id, scannedBagNumber.trim(), archiveLocation.trim().toUpperCase())
            : handleAddPsdSample(task.id, scannedBagNumber.trim(), archiveLocation.trim().toUpperCase());

        if (result.success && result.newSample) {
            showToast(result.message, 'success');
            
            // Check if this is the first sample of the month
            const allAgroSamples = (productionRunsList || []).flatMap(r => r.samples || []);
            const allPsdSamples = (psdTasks || []).flatMap(t => t.samples || []);
            const allSamples = [...allAgroSamples, ...allPsdSamples];
            
            const newSampleDate = new Date(result.newSample.collectedAt);
            const currentMonth = newSampleDate.getMonth();
            const currentYear = newSampleDate.getFullYear();

            const otherSamplesInMonth = allSamples.filter(s => {
                if (s.id === result.newSample?.id) return false;
                const sampleDate = new Date(s.collectedAt);
                return sampleDate.getMonth() === currentMonth && sampleDate.getFullYear() === currentYear;
            });

            const isFirstOfMonth = otherSamplesInMonth.length === 0;

            const labelData = {
                taskName: (task as any).recipeName || ((task as any).name),
                taskId: task.id,
                ...result.newSample
            };

            const printPayload: any = {
                type: 'lab_sample',
                data: labelData,
            };

            if (isFirstOfMonth) {
                const monthName = newSampleDate.toLocaleString('pl-PL', { month: 'long' });
                const monthLabelData = { 
                    monthYear: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${currentYear} r.`,
                    _print_type: 'month_label'
                };
                printPayload.type = 'lab_sample_batch';
                printPayload.data = [monthLabelData, {...labelData, _print_type: 'lab_sample'}];
            }
            
            modalHandlers.openNetworkPrintModal(printPayload);

            setScannedBagNumber('');
            setArchiveLocation('');
        } else {
            showToast(result.message, 'error');
        }
        
        setIsLoading(false);
    };
    
    const TaskChoiceCard: React.FC<{ task: ProductionRun | PsdTask, type: 'AGRO' | 'PSD', onSelect: () => void }> = ({ task, type, onSelect }) => (
        <div className="p-4 bg-slate-100 dark:bg-secondary-900 rounded-lg border-2 border-slate-200 dark:border-secondary-700">
            <h3 className="font-bold text-lg text-primary-600 dark:text-primary-400">{type}</h3>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{(task as any).recipeName || (task as any).name}</p>
            <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{task.id}</p>
            <Button onClick={onSelect} className="w-full mt-4">Wybierz</Button>
        </div>
    );

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex-shrink-0 flex items-center mb-6 border-b dark:border-secondary-600 pb-3">
                <ArchiveBoxIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Archiwizacja Próbek Laboratoryjnych</h2>
            </header>

            {activeAgroRun && activePsdTask && !effectiveTaskData ? (
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-center">Wybierz zlecenie produkcyjne</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <TaskChoiceCard task={activeAgroRun} type="AGRO" onSelect={() => setSelectedTask({ task: activeAgroRun, type: 'agro' })} />
                        <TaskChoiceCard task={activePsdTask} type="PSD" onSelect={() => setSelectedTask({ task: activePsdTask, type: 'psd' })} />
                    </div>
                </div>
            ) : !activeTask ? (
                <Alert type="info" message="Brak aktywnego zlecenia produkcyjnego (AGRO/PSD)." details="Archiwizacja próbek jest możliwa tylko podczas trwania zlecenia." />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-4 bg-slate-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Aktywne Zlecenie</h3>
                                <p className="font-bold text-primary-600 dark:text-primary-400">{(activeTask as any).recipeName || (activeTask as any).name}</p>
                                <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{activeTask.id}</p>
                            </div>
                            {activeAgroRun && activePsdTask && (
                                <Button onClick={() => setSelectedTask(null)} variant="secondary" className="text-xs">Zmień zlecenie</Button>
                            )}
                        </div>
                        <hr className="my-4 dark:border-secondary-600"/>
                        <form onSubmit={handleSubmit} className="space-y-4">
                             <Input
                                label="Zeskanuj nr woreczka próbkowego"
                                id="sample-bag-number"
                                value={scannedBagNumber}
                                onChange={e => setScannedBagNumber(e.target.value)}
                                icon={<QrCodeIcon className="h-5 w-5 text-gray-400" />}
                                autoFocus
                                disabled={isLoading}
                            />
                            <Input
                                label="Zeskanuj pojemnik archiwum (ALA01-ALA50)"
                                id="archive-container-number"
                                value={archiveLocation}
                                onChange={e => setArchiveLocation(e.target.value)}
                                icon={<QrCodeIcon className="h-5 w-5 text-gray-400" />}
                                disabled={isLoading}
                                uppercase
                            />
                            <Button type="submit" className="w-full" disabled={isLoading || !scannedBagNumber.trim() || !archiveLocation.trim()}>
                                {isLoading ? 'Rejestrowanie i archiwizowanie...' : 'Zarejestruj Próbkę i Drukuj Etykietę'}
                            </Button>
                        </form>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Zarejestrowane Próbki ({activeTask.samples?.length || 0})</h3>
                        <div className="mt-2 max-h-80 overflow-y-auto pr-2">
                            {(activeTask.samples || []).length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">Brak próbek dla tego zlecenia.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {[...(activeTask.samples || [])].reverse().map((sample: LabSample) => (
                                        <li key={sample.id} className="p-2 bg-white dark:bg-secondary-800 rounded-md shadow-sm">
                                            <p className="font-semibold">Nr worka: <span className="font-mono">{sample.sampleBagNumber}</span></p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Szarża #{sample.batchNumber} | Pobrane przez: {sample.collectedBy} | {formatDate(sample.collectedAt, true)}
                                            </p>
                                            {sample.archiveLocation && (
                                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                                                    Archiwum: <span className="font-mono bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">{sample.archiveLocation}</span>
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LabArchivePage;