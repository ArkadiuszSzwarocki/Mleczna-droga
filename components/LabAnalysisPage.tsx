
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { RawMaterialLogEntry, FinishedGoodItem, View, AnalysisResult, Document, AnalysisRange } from '../types';
import { useAppContext } from './contexts/AppContext';
import { useAuth } from './contexts/AuthContext';
import Button from './Button';
import Input from './Input';
import Textarea from './Textarea';
import Alert from './Alert';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import BeakerIcon from './icons/BeakerIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import { formatDate, getBlockInfo, getActionLabel } from '../src/utils';
import DocumentPlusIcon from './icons/DocumentPlusIcon';
import EyeIcon from './icons/EyeIcon';
import DownloadIcon from './icons/DownloadIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import Select from './Select';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import LockOpenIcon from './icons/LockOpenIcon';
import LockClosedIcon from './icons/LockClosedIcon';


const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</p>
    </div>
);

const LabAnalysisPage: React.FC = () => {
    // FIX: Added showToast to the destructuring of useAppContext to resolve the reference error on line 195.
    const { 
        viewParams, handleSetView, 
        handleSaveLabNotes, handleAddDocument, handleDeleteDocument,
        handleSaveAnalysisResults, modalHandlers, showToast,
        rawMaterialsLogList, finishedGoodsList,
        analysisRanges, handleBlockPallet
    } = useAppContext();
    const { currentUser } = useAuth();

    const [item, setItem] = useState<RawMaterialLogEntry | FinishedGoodItem | null>(null);
    const [itemType, setItemType] = useState<'raw' | 'fg' | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Form states
    const [newNote, setNewNote] = useState('');
    const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refreshItem = useCallback(() => {
        if (viewParams?.palletId) {
            const raw = (rawMaterialsLogList || []).find((p: RawMaterialLogEntry) => p.id === viewParams.palletId);
            if (raw) {
                setItem(raw);
                setItemType('raw');
                const currentResults = raw.palletData.analysisResults || [];
                setAnalysisResults(currentResults.length > 0 ? currentResults : [{ name: '', value: '', unit: '' }]);
                return;
            }
    
            const fg = (finishedGoodsList || []).find((p: FinishedGoodItem) => p.id === viewParams.palletId);
            if (fg) {
                setItem(fg);
                setItemType('fg');
                const currentResults = fg.analysisResults || [];
                setAnalysisResults(currentResults.length > 0 ? currentResults : [{ name: '', value: '', unit: '' }]);
                return;
            }
    
            setItem(null);
            setItemType(null);
        }
    }, [viewParams?.palletId, rawMaterialsLogList, finishedGoodsList]);

    useEffect(() => {
        refreshItem();
    }, [refreshItem]);
    
    const handleDragEvents = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDragEnter = (e: React.DragEvent) => {
        handleDragEvents(e);
        setIsDragOver(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        handleDragEvents(e);
        setIsDragOver(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        handleDragEvents(e);
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            uploadFile(e.dataTransfer.files[0]);
        }
    };

    const labNotesHistory = useMemo(() => {
        if (!item || !item.locationHistory) return [];
        return [...item.locationHistory].reverse().filter(h => h.action.includes('lab_note_added'));
    }, [item]);

    const documents = useMemo((): Document[] => {
        if (!item) return [];
        if (itemType === 'raw') {
            return (item as RawMaterialLogEntry).palletData.documents || [];
        }
        return (item as FinishedGoodItem).documents || [];
    }, [item, itemType]);

    const uploadFile = (file: File) => {
        if (item && itemType) {
            const result = handleAddDocument(item.id, itemType, file);
            setFeedback(result);
        }
    };
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadFile(file);
        }
        if (e.target) e.target.value = '';
    };

    const handleSaveNote = () => {
        if (!item || !newNote.trim() || !itemType) return;
        const result = handleSaveLabNotes(item.id, itemType === 'raw', newNote.trim());
        setFeedback(result);
        if (result.success) {
            setNewNote('');
            refreshItem();
        }
    };
    
    const handleDeleteDoc = (docName: string) => {
        if (!item || !itemType) return;
        const result = handleDeleteDocument(item.id, itemType, docName);
        setFeedback(result);
    };
    
    const analysisOptions = useMemo(() => [
        { value: '', label: 'Wybierz analizę...' },
        ...(analysisRanges || []).map((r: AnalysisRange) => ({ value: r.name, label: r.name })),
    ], [analysisRanges]);

    const getResultVerification = (name: string, value: string) => {
        const range = (analysisRanges || []).find(r => r.name === name);
        if (!range || !value) return { status: 'none', message: '', range: null };
        const num = parseFloat(value);
        if (isNaN(num)) return { status: 'nok', message: 'Wartość musi być liczbą', range };
        if (num < range.min || num > range.max) return { status: 'nok', message: `Poza zakresem (${range.min} - ${range.max})`, range };
        return { status: 'ok', message: 'Zgodne', range };
    };

    const handleAnalysisChange = (index: number, field: 'name' | 'value' | 'unit', value: string) => {
        const newResults = [...analysisResults];
        const updatedItem = { ...newResults[index], [field]: value };

        if (field === 'name') {
            const range = (analysisRanges || []).find((r: AnalysisRange) => r.name === value);
            if (range) {
                updatedItem.unit = range.unit;
            }
        }
        
        newResults[index] = updatedItem;
        setAnalysisResults(newResults);
    };
    
    const handleAddResultRow = () => {
        setAnalysisResults([...analysisResults, { name: '', value: '', unit: '' }]);
    };

    const handleRemoveResult = (index: number) => {
        setAnalysisResults(analysisResults.filter((_, i) => i !== index));
    };
    
    const handleSaveAllResults = () => {
        if (!item || !itemType || !currentUser) return;
        const validResults = analysisResults.filter(r => r.name.trim() && r.value.trim());
        
        // Sprawdź czy jest jakikolwiek NOK
        const hasNok = validResults.some(r => getResultVerification(r.name, r.value).status === 'nok');
        
        const result = handleSaveAnalysisResults(item.id, itemType as 'raw' | 'fg', validResults);
        
        if (result.success && hasNok) {
            handleBlockPallet(item.id, itemType, "Blokada analityczna", currentUser);
            showToast("Wykryto wyniki poza normą. Paleta została zablokowana.", "warning");
        }

        setFeedback(result);
        if (result.success) refreshItem();
    };

    const handleRelease = () => {
        if (!item || !currentUser) return;
        const today = new Date().toISOString().split('T')[0];
        const expiryDate = itemType === 'raw' 
            ? (item as RawMaterialLogEntry).palletData.dataPrzydatnosci 
            : (item as FinishedGoodItem).expiryDate;

        if (expiryDate < today) {
             modalHandlers.openExtendExpiryDateModal(item);
        } else {
             modalHandlers.openUnblockReasonModal(item);
        }
    };
    
    const handleBlock = () => {
        if (!item) return;
        modalHandlers.openBlockPalletModal(item);
    };

    if (!item) {
        return <div className="p-4"><Alert type="error" message="Nie można załadować danych palety." /></div>;
    }

    const isRaw = itemType === 'raw';
    const palletData = isRaw ? (item as RawMaterialLogEntry).palletData : null;
    const { isBlocked, reason } = getBlockInfo(item);
    
    const displayId = isRaw ? palletData!.nrPalety : ((item as FinishedGoodItem).displayId || item.id);
    const productName = isRaw ? palletData!.nazwa : (item as FinishedGoodItem).productName;

    return (
        <div 
            className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900 h-full overflow-y-auto"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragOver && (
                <div className="fixed inset-0 bg-primary-500/50 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
                    <p className="text-2xl font-bold text-white">Upuść plik, aby go dodać</p>
                </div>
            )}
            <header className="flex items-center justify-between mb-4 pb-3 border-b dark:border-secondary-700">
                <div className="flex items-center gap-3">
                    <Button onClick={() => handleSetView(View.LabPalletRelease)} variant="secondary" className="p-2"><ArrowLeftIcon className="h-5 w-5"/></Button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Analiza Laboratoryjna</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{displayId}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isBlocked ? (
                        <Button onClick={handleRelease} variant="secondary" className="bg-green-100 text-green-800 border-green-200 h-12 px-6 shadow-md" leftIcon={<LockOpenIcon className="h-5 w-5"/>}>
                            Zwolnij Paletę
                        </Button>
                    ) : (
                        <Button onClick={handleBlock} variant="secondary" className="bg-red-100 text-red-800 border-red-200 h-12 px-6 shadow-md" leftIcon={<LockClosedIcon className="h-5 w-5"/>}>
                            Zablokuj Paletę
                        </Button>
                    )}
                </div>
            </header>
            
            {feedback && <div className="mb-4"><Alert type={feedback.type} message={feedback.message} /></div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <section className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2">Informacje o Palecie</h3>
                        <div className="space-y-2">
                            <DetailItem label="Produkt" value={productName} />
                            <DetailItem label="Status" value={isBlocked ? `Zablokowana (${reason})` : 'Dostępna'} />
                            <DetailItem label="Data Produkcji" value={formatDate(isRaw ? palletData!.dataProdukcji : (item as FinishedGoodItem).productionDate)} />
                            <DetailItem label="Data Ważności" value={formatDate(isRaw ? palletData!.dataPrzydatnosci : (item as FinishedGoodItem).expiryDate)} />
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-2 space-y-6">
                     <section className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2">Notatki</h3>
                        <div className="space-y-2">
                            <Textarea label="Dodaj nową notatkę" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Wpisz treść nowej notatki..." />
                            <Button onClick={handleSaveNote} disabled={!newNote.trim()}>Zapisz Notatkę</Button>
                        </div>
                        {labNotesHistory.length > 0 && (
                            <div className="mt-4 pt-3 border-t dark:border-secondary-600">
                                <h4 className="text-sm font-semibold mb-2">Historia Notatek</h4>
                                <ul className="text-xs space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {labNotesHistory.map((note, idx) => (
                                        <li key={idx} className="p-2 bg-slate-100 dark:bg-secondary-700 rounded-md">
                                            <p className="font-semibold">{note.notes}</p>
                                            <p className="text-gray-500 dark:text-gray-400">{note.movedBy} - {formatDate(note.movedAt, true)}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>

                    <section className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2">Dokumenty</h3>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="image/*,.pdf,application/pdf"
                        />
                        <Button 
                            onClick={() => fileInputRef.current?.click()} 
                            leftIcon={<DocumentPlusIcon className="h-5 w-5"/>}
                            className="w-full justify-center mb-4"
                        >
                            Dodaj dokument z dysku
                        </Button>
                        
                        {documents.length > 0 && (
                            <ul className="space-y-2">
                                {documents.map((doc, idx) => (
                                    <li key={idx} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-secondary-700 rounded-md">
                                        <span className="text-sm flex items-center gap-2 truncate pr-2">
                                            <DocumentTextIcon className="h-4 w-4 flex-shrink-0"/> 
                                            <span className="truncate" title={doc.name}>{doc.name}</span>
                                        </span>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button variant="secondary" className="p-1.5" title="Podgląd" onClick={() => modalHandlers.openDocumentPreviewModal(doc)}>
                                                <EyeIcon className="h-4 w-4"/>
                                            </Button>
                                            <a href={doc.url} download={doc.name}>
                                                 <Button variant="secondary" className="p-1.5" title="Pobierz">
                                                    <DownloadIcon className="h-4 w-4"/>
                                                </Button>
                                            </a>
                                            <Button onClick={() => handleDeleteDoc(doc.name)} variant="danger" className="p-1.5" title="Usuń">
                                                <TrashIcon className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                            <BeakerIcon className="h-5 w-5 text-primary-500" />
                            Wyniki Badań Sensorycznych i Fizykochemicznych
                        </h3>
                        <div className="space-y-4">
                           {analysisResults.map((result, index) => {
                                const verification = getResultVerification(result.name, result.value);
                                const isNok = verification.status === 'nok';

                               return (
                                <div key={index} className={`p-4 rounded-xl border-2 transition-all ${isNok ? 'bg-red-50 border-red-500 shadow-sm' : 'bg-slate-50 dark:bg-secondary-900 border-transparent'}`}>
                                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-end">
                                       <Select 
                                            label={index === 0 ? "Parametr" : ""}
                                            options={analysisOptions}
                                            value={result.name}
                                            onChange={e => handleAnalysisChange(index, 'name', e.target.value)}
                                        />
                                       <div className="relative">
                                           <Input 
                                                label={index === 0 ? "Wynik" : ""} 
                                                value={result.value} 
                                                onChange={e => handleAnalysisChange(index, 'value', e.target.value)}
                                                className={`text-center font-bold !py-2 ${verification.status === 'ok' ? 'bg-green-50 border-green-500 text-green-700' : isNok ? 'bg-white border-red-600 text-red-700 !text-lg' : ''}`}
                                            />
                                       </div>
                                       <Input 
                                            label={index === 0 ? "Jedn." : ""} 
                                            value={result.unit} 
                                            onChange={e => handleAnalysisChange(index, 'unit', e.target.value)}
                                            placeholder="np. %"
                                            className="text-center"
                                        />
                                       <Button onClick={() => handleRemoveResult(index)} variant="danger" className="p-2 mb-1" title="Usuń parametr"><TrashIcon className="h-5 w-5"/></Button>
                                   </div>
                                   {isNok && (
                                        <div className="mt-2 ml-1">
                                            <span className="text-xs font-black text-red-700 uppercase tracking-widest bg-red-200 px-3 py-1 rounded shadow-sm flex items-center gap-2 w-fit">
                                                ⚠️ POZA NORMĄ: {verification.message}
                                            </span>
                                        </div>
                                   )}
                               </div>
                               );
                           })}
                           <div className="pt-4 border-t dark:border-secondary-600">
                                <Button onClick={handleAddResultRow} variant="secondary" leftIcon={<PlusIcon className="h-4 w-4"/>} className="text-xs">
                                    Dodaj parametr badania
                                </Button>
                           </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                           <Button onClick={handleSaveAllResults} variant="primary" className="px-8 py-3 text-lg font-black uppercase tracking-tighter">Zapisz Wyniki Analizy</Button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default LabAnalysisPage;
