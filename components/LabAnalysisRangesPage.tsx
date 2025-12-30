import React, { useState, useEffect } from 'react';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { AnalysisRange, AnalysisRangeHistoryEntry } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import BeakerIcon from './icons/BeakerIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import ClockRewindIcon from './icons/ClockRewindIcon';
import { formatDate } from '../src/utils';

const LabAnalysisRangesPage: React.FC = () => {
    const { analysisRanges, setAnalysisRanges, analysisRangesHistory, logAnalysisRangeChange } = useWarehouseContext() as any;
    const [draftRanges, setDraftRanges] = useState<AnalysisRange[]>([]);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [rowErrors, setRowErrors] = useState<Record<string, { name?: string, min?: string, max?: string }>>({});
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);

    useEffect(() => {
        // Deep copy to avoid direct mutation of context state
        setDraftRanges(JSON.parse(JSON.stringify(analysisRanges || [])));
    }, [analysisRanges]);

    useEffect(() => {
        const newErrors: Record<string, { name?: string, min?: string, max?: string }> = {};
        draftRanges.forEach(range => {
            const errorsForRange: { name?: string, min?: string, max?: string } = {};
            if (!range.name.trim()) {
                errorsForRange.name = "Nazwa jest wymagana.";
            }
            if (range.min > range.max) {
                errorsForRange.min = "Min > Max";
                errorsForRange.max = "Max < Min";
            }
            if (Object.keys(errorsForRange).length > 0) {
                newErrors[range.id] = errorsForRange;
            }
        });
        setRowErrors(newErrors);
    }, [draftRanges]);

    const handleDraftChange = (id: string, field: keyof Omit<AnalysisRange, 'id'>, value: string) => {
        setDraftRanges(draftRanges.map(range => {
            if (range.id === id) {
                const updatedValue = (field === 'min' || field === 'max') ? (value === '' ? '' : parseFloat(value)) : value;
                return { ...range, [field]: updatedValue };
            }
            return range;
        }));
    };

    const handleAddRow = () => {
        setDraftRanges([...draftRanges, { id: `new-${Date.now()}`, name: '', min: 0, max: 0, unit: '' }]);
    };

    const handleRemoveRow = (id: string) => {
        setDraftRanges(draftRanges.filter(range => range.id !== id));
    };

    const handleSaveChanges = () => {
        setFeedback(null);
        if (Object.keys(rowErrors).length > 0) {
            setFeedback({ type: 'error', message: 'Popraw błędy w formularzu przed zapisem.' });
            return;
        }

        const originalRanges = analysisRanges || [];

        // Log deletions
        originalRanges.forEach((original: AnalysisRange) => {
            if (!draftRanges.some(draft => draft.id === original.id)) {
                logAnalysisRangeChange({
                    action: 'Usunięto',
                    rangeId: original.id,
                    rangeName: original.name,
                    changeDetails: `Usunięto zakres: ${original.name} (Min: ${original.min}, Max: ${original.max}, Jedn.: '${original.unit}')`
                });
            }
        });

        // Log creations and updates
        draftRanges.forEach(draft => {
            if (draft.id.startsWith('new-')) {
                logAnalysisRangeChange({
                    action: 'Utworzono',
                    rangeId: draft.id, // The temporary ID is fine for the log
                    rangeName: draft.name,
                    changeDetails: `Utworzono nowy zakres: ${draft.name} (Min: ${draft.min}, Max: ${draft.max}, Jedn.: '${draft.unit}')`
                });
            } else {
                const original = originalRanges.find((o: AnalysisRange) => o.id === draft.id);
                if (original) {
                    const changes: string[] = [];
                    if (original.name !== draft.name) changes.push(`nazwę z '${original.name}' na '${draft.name}'`);
                    if (original.min !== draft.min) changes.push(`min z ${original.min} na ${draft.min}`);
                    if (original.max !== draft.max) changes.push(`max z ${original.max} na ${draft.max}`);
                    if (original.unit !== draft.unit) changes.push(`jednostkę z '${original.unit}' na '${draft.unit}'`);

                    if (changes.length > 0) {
                        logAnalysisRangeChange({
                            action: 'Zaktualizowano',
                            rangeId: original.id,
                            rangeName: original.name,
                            changeDetails: `Zmieniono ${changes.join(', ')}.`
                        });
                    }
                }
            }
        });

        const newRangesWithPermanentIds = draftRanges.map(d => ({
            ...d,
            id: d.id.startsWith('new-') ? `range-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : d.id,
        }));

        setAnalysisRanges(newRangesWithPermanentIds);
        setFeedback({ type: 'success', message: 'Zakresy analiz zostały pomyślnie zaktualizowane.' });
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b dark:border-secondary-600 pb-4 gap-3">
                <div className="flex items-center">
                    <BeakerIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Zarządzanie Zakresami Analiz</h2>
                </div>
                <Button onClick={() => setIsHistoryVisible(p => !p)} variant="secondary" leftIcon={<ClockRewindIcon className="h-5 w-5" />}>
                    {isHistoryVisible ? 'Ukryj Historię' : 'Pokaż Historię'}
                </Button>
            </header>
            
            <Alert type="info" message="Konfiguracja zakresów" details="Zdefiniuj akceptowalne widełki dla wyników badań laboratoryjnych. System będzie używał tych zakresów do automatycznego oznaczania wyników poza normą."/>
            
            {feedback && <div className="my-4"><Alert type={feedback.type} message={feedback.message} /></div>}

            <div className="mt-6 space-y-4">
                {draftRanges.map((range) => (
                    <div key={range.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-end p-3 bg-slate-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700">
                        <Input label="Nazwa Analizy" id={`name-${range.id}`} value={range.name} onChange={(e) => handleDraftChange(range.id, 'name', e.target.value)} error={rowErrors[range.id]?.name} />
                        <Input label="Wartość Min." id={`min-${range.id}`} type="number" step="0.01" value={String(range.min)} onChange={(e) => handleDraftChange(range.id, 'min', e.target.value)} error={rowErrors[range.id]?.min} />
                        <Input label="Wartość Max." id={`max-${range.id}`} type="number" step="0.01" value={String(range.max)} onChange={(e) => handleDraftChange(range.id, 'max', e.target.value)} error={rowErrors[range.id]?.max} />
                        <Input label="Jednostka" id={`unit-${range.id}`} value={range.unit} onChange={(e) => handleDraftChange(range.id, 'unit', e.target.value)} />
                        <Button onClick={() => handleRemoveRow(range.id)} variant="danger" className="p-2 mb-1"><TrashIcon className="h-5 w-5"/></Button>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t dark:border-secondary-700 flex flex-col sm:flex-row gap-4 justify-between">
                <Button onClick={handleAddRow} variant="secondary" leftIcon={<PlusIcon className="h-5 w-5"/>}>Dodaj Nowy Zakres</Button>
                <Button onClick={handleSaveChanges}>Zapisz Zmiany</Button>
            </div>
            
            {isHistoryVisible && (
                <section className="mt-8 pt-4 border-t dark:border-secondary-600 animate-fadeIn">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Historia Zmian</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {(analysisRangesHistory || []).length === 0 ? (
                            <p className="text-sm text-gray-500 italic">Brak historii zmian.</p>
                        ) : (
                            analysisRangesHistory.map((entry: AnalysisRangeHistoryEntry) => (
                                <div key={entry.id} className="p-3 bg-slate-100 dark:bg-secondary-700/50 rounded-md text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{entry.action}: {entry.rangeName}</span>
                                        <span className="text-gray-500 dark:text-gray-400">{formatDate(entry.timestamp, true)} przez {entry.user}</span>
                                    </div>
                                    <p className="mt-1 text-gray-600 dark:text-gray-300">{entry.changeDetails}</p>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            )}
        </div>
    );
};

export default LabAnalysisRangesPage;