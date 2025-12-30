
import React, { useState, useEffect, useMemo } from 'react';
import { ProductionRun, Recipe } from '../types';
import { useProductionContext } from './contexts/ProductionContext';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import RawMaterialStockCheck from './RawMaterialStockCheck';
import BomStockCheck from './BomStockCheck';
import SearchableSelect from './SearchableSelect';
import { useAuth } from './contexts/AuthContext';
import MaterialShortageModal, { ShortageDetail } from './MaterialShortageModal';
import SplitConfirmationModal from './SplitConfirmationModal'; // Import the split confirmation modal

interface AddEditProductionRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  runToEdit?: Partial<ProductionRun> | null;
  initialDate?: string;
  isNew?: boolean;
  initialRecipeId?: string;
}

const AddEditProductionRunModal: React.FC<AddEditProductionRunModalProps> = ({
  isOpen,
  onClose,
  runToEdit,
  initialDate,
  isNew,
  initialRecipeId,
}) => {
    const { recipes } = useAppContext();
    const { handleAddOrUpdateAgroRun, productionRunsList, handleConfirmSplitRun } = useProductionContext();
    const { currentUser } = useAuth();

    const [runId, setRunId] = useState('');
    const [selectedRecipeId, setSelectedRecipeId] = useState('');
    const [plannedAmount, setPlannedAmount] = useState('');
    const [plannedDate, setPlannedDate] = useState('');
    const [shelfLife, setShelfLife] = useState('');
    const [notes, setNotes] = useState('');
    
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    
    const [areRawMaterialsSufficient, setAreRawMaterialsSufficient] = useState(true);
    const [isBomSufficient, setIsBomSufficient] = useState(true);
    const [shortageDetails, setShortageDetails] = useState<ShortageDetail[]>([]);
    const [isShortageModalOpen, setIsShortageModalOpen] = useState(false);
    
    // Split proposal state
    const [splitProposal, setSplitProposal] = useState<any | null>(null);
    
    const isEditing = !!runToEdit && !isNew;

    useEffect(() => {
        if (isOpen) {
            let defaultDate = '';
            if (initialDate) {
                defaultDate = initialDate;
            } else if (runToEdit && runToEdit.plannedDate) {
                defaultDate = runToEdit.plannedDate;
            } else {
                const d = new Date();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                defaultDate = `${year}-${month}-${day}`;
            }

            if (runToEdit) {
                setRunId(runToEdit.id || '');
                setSelectedRecipeId(runToEdit.recipeId || '');
                setPlannedAmount(String(runToEdit.targetBatchSizeKg || ''));
                setPlannedDate(defaultDate);
                setShelfLife(String(runToEdit.shelfLifeMonths || ''));
                setNotes(runToEdit.notes || '');
            } else {
                const prefix = 'ZLEAGR';
                const existingIds = (productionRunsList || [])
                    .map(r => r.id)
                    .filter(id => id.toUpperCase().startsWith(prefix));

                let maxNum = 0;
                existingIds.forEach(id => {
                    const match = id.match(/\d+/);
                    if (match) {
                        const num = parseInt(match[0], 10);
                        if (!isNaN(num) && num > maxNum) maxNum = num;
                    }
                });

                const nextNum = maxNum + 1;
                const nextId = `${prefix}${String(nextNum).padStart(5, '0')}`;
                
                setRunId(nextId);
                setSelectedRecipeId(initialRecipeId || '');
                setPlannedAmount('');
                setPlannedDate(defaultDate);
                setShelfLife('');
                setNotes('');
            }
            setErrors({});
            setGeneralError(null);
            setShortageDetails([]);
            setIsShortageModalOpen(false);
            setSplitProposal(null);
        }
    }, [isOpen, runToEdit, initialDate, initialRecipeId, productionRunsList]);

    const recipeOptions = useMemo(() => 
        (recipes || []).map((r: Recipe) => ({ value: r.id, label: r.name })),
    [recipes]);

    const selectedRecipe = useMemo(() => 
        (recipes || []).find((r: Recipe) => r.id === selectedRecipeId), 
    [recipes, selectedRecipeId]);

    const performSave = () => {
        const amountKg = parseFloat(plannedAmount);
        const lifeMonths = parseInt(shelfLife, 10);
        
        const runData: Partial<ProductionRun> = {
            id: runId, // Use the generated or edited ID
            recipeId: selectedRecipeId,
            recipeName: selectedRecipe!.name,
            targetBatchSizeKg: amountKg,
            plannedDate: plannedDate,
            shelfLifeMonths: lifeMonths,
            notes: notes,
            hasShortages: !areRawMaterialsSufficient || !isBomSufficient
        };
        
        const result = handleAddOrUpdateAgroRun(runData);

        if (result.success) {
             if (result.splitProposal) {
                // Instead of showing error, set the split proposal to open confirmation modal
                setSplitProposal(result.splitProposal);
                setIsShortageModalOpen(false);
            } else {
                setIsShortageModalOpen(false);
                onClose();
            }
        } else {
            setGeneralError(result.message);
            setIsShortageModalOpen(false);
        }
    };

    const handleConfirmSplit = () => {
        if (!splitProposal) return;
        const result = handleConfirmSplitRun(splitProposal);
        if (result.success) {
            setSplitProposal(null);
            onClose();
        } else {
            setGeneralError(result.message);
            setSplitProposal(null);
        }
    };

    const handleSubmit = () => {
        setGeneralError(null);
        setErrors({});

        if (!currentUser) {
            setGeneralError('Błąd sesji użytkownika. Zaloguj się ponownie.');
            return;
        }

        const newErrors: Record<string, string> = {};
        
        if (!runId.trim()) newErrors.runId = 'ID zlecenia jest wymagane.';
        if (!plannedDate) newErrors.plannedDate = 'Data planowana jest wymagana.';
        if (!selectedRecipeId) newErrors.recipeId = 'Wybierz recepturę.';

        const amountKg = parseFloat(plannedAmount);
        if (!plannedAmount || isNaN(amountKg) || amountKg <= 0) {
            newErrors.plannedAmount = 'Wprowadź poprawną ilość (> 0).';
        }

        const lifeMonths = parseInt(shelfLife, 10);
        if (!shelfLife || isNaN(lifeMonths) || lifeMonths <= 0) {
            newErrors.shelfLife = 'Wprowadź poprawną ważność (> 0).';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            
            const fieldToIdMap: Record<string, string> = {
                runId: 'run-id-display',
                plannedDate: 'planned-date',
                recipeId: 'recipe-select',
                plannedAmount: 'planned-amount',
                shelfLife: 'shelf-life'
            };

            const firstErrorField = Object.keys(newErrors)[0];
            const elementId = fieldToIdMap[firstErrorField];
            
            setTimeout(() => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.focus();
                }
            }, 100);
            
            return;
        }

        if (!areRawMaterialsSufficient || !isBomSufficient) {
            setIsShortageModalOpen(true);
        } else {
            performSave();
        }
    };
    
    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[1050]" onClick={onClose}>
                <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                        <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">
                            {isEditing ? 'Edytuj Zlecenie Produkcyjne' : 'Nowe Zlecenie Produkcyjne (AGRO)'}
                        </h2>
                        <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                        {generalError && <Alert type="error" message={generalError} />}
                        {Object.keys(errors).length > 0 && <Alert type="error" message="Formularz zawiera błędy. Sprawdź zaznaczone pola." />}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Nazwa zlecenia (ID)" 
                                id="run-id-display" 
                                value={runId} 
                                onChange={(e) => {
                                    setRunId(e.target.value);
                                    if(errors.runId) setErrors(prev => ({...prev, runId: ''}));
                                }} 
                                disabled={true} 
                                error={errors.runId}
                            />
                            <Input 
                                label="Planowana data" 
                                id="planned-date" 
                                type="date" 
                                value={plannedDate} 
                                onChange={e => {
                                    setPlannedDate(e.target.value);
                                    if(errors.plannedDate) setErrors(prev => ({...prev, plannedDate: ''}));
                                }} 
                                required 
                                error={errors.plannedDate}
                            />
                        </div>
                        
                        <SearchableSelect
                            label="Wybierz recepturę"
                            id="recipe-select"
                            options={recipeOptions}
                            value={selectedRecipeId}
                            onChange={(val) => {
                                setSelectedRecipeId(val);
                                if(errors.recipeId) setErrors(prev => ({...prev, recipeId: ''}));
                            }}
                            error={errors.recipeId}
                            required
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Planowana ilość (kg)" 
                                id="planned-amount" 
                                type="number" 
                                value={plannedAmount} 
                                onChange={e => {
                                    setPlannedAmount(e.target.value);
                                    if(errors.plannedAmount) setErrors(prev => ({...prev, plannedAmount: ''}));
                                }} 
                                required 
                                min="1" 
                                step="100"
                                error={errors.plannedAmount}
                            />
                            <Input 
                                label="Ważność produktu (miesiące)" 
                                id="shelf-life" 
                                type="number" 
                                value={shelfLife} 
                                onChange={e => {
                                    setShelfLife(e.target.value);
                                    if(errors.shelfLife) setErrors(prev => ({...prev, shelfLife: ''}));
                                }} 
                                required 
                                min="1"
                                error={errors.shelfLife}
                            />
                        </div>
                        
                        <div className="w-full">
                            <label htmlFor="run-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Notatki do zlecenia (widoczne dla produkcji)
                            </label>
                            <textarea
                                id="run-notes"
                                rows={2}
                                className="block w-full px-4 py-2 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-secondary-600 rounded-lg shadow-sm sm:text-sm bg-white dark:bg-secondary-800 focus:ring-primary-500 focus:border-primary-500"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Wpisz opcjonalne uwagi..."
                            />
                        </div>

                        {selectedRecipe && plannedAmount && parseFloat(plannedAmount) > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t dark:border-secondary-700">
                                <RawMaterialStockCheck 
                                    recipe={selectedRecipe} 
                                    plannedAmount={parseFloat(plannedAmount)} 
                                    onSufficiencyChange={setAreRawMaterialsSufficient}
                                    onShortageDetailsChange={setShortageDetails}
                                    excludeItemId={isEditing ? runToEdit?.id : undefined}
                                />
                                <BomStockCheck 
                                    recipe={selectedRecipe} 
                                    plannedAmount={parseFloat(plannedAmount)} 
                                    onSufficiencyChange={setIsBomSufficient}
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3 mt-4">
                        <Button onClick={onClose} variant="secondary">Anuluj</Button>
                        <Button onClick={handleSubmit}>{isEditing ? 'Zapisz Zmiany' : 'Dodaj Zlecenie'}</Button>
                    </div>
                </div>
            </div>
            <MaterialShortageModal
                isOpen={isShortageModalOpen}
                onClose={() => setIsShortageModalOpen(false)}
                onConfirm={performSave}
                shortages={shortageDetails}
            />
            {splitProposal && (
                 <SplitConfirmationModal
                    isOpen={!!splitProposal}
                    onClose={() => setSplitProposal(null)}
                    onConfirm={handleConfirmSplit}
                    recipeName={splitProposal.originalRunData?.recipeName || 'Nieznany'}
                    originalBatchSize={splitProposal.originalRunData?.targetBatchSizeKg || 0}
                    numParts={splitProposal.parts.length}
                    partsDetails={splitProposal.parts}
                />
            )}
        </>
    );
};

export default AddEditProductionRunModal;
