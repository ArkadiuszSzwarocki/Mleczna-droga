
import React, { useState, useEffect, useMemo } from 'react';
import { PsdTask, Recipe } from '../types';
import { usePsdContext } from './contexts/PsdContext';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import Input from './Input';
import Textarea from './Textarea';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import BeakerIcon from './icons/BeakerIcon';
import SearchableSelect from './SearchableSelect';
import RawMaterialStockCheck from './RawMaterialStockCheck';
import BomStockCheck from './BomStockCheck';
import MaterialShortageModal, { ShortageDetail } from './MaterialShortageModal';

interface EditPsdTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: PsdTask | null;
}

const EditPsdTaskModal: React.FC<EditPsdTaskModalProps> = ({ isOpen, onClose, task }) => {
    const { handleSavePsdTask } = usePsdContext();
    const { recipes, psdTasks } = useAppContext();

    const [recipeId, setRecipeId] = useState('');
    const [targetQuantity, setTargetQuantity] = useState('');
    const [shelfLife, setShelfLife] = useState('');
    const [notes, setNotes] = useState('');
    const [plannedDate, setPlannedDate] = useState('');
    const [errors, setErrors] = useState<any>({});
    
    const [areRawMaterialsSufficient, setAreRawMaterialsSufficient] = useState(true);
    const [isBomSufficient, setIsBomSufficient] = useState(true);
    const [shortageDetails, setShortageDetails] = useState<ShortageDetail[]>([]);
    const [isShortageModalOpen, setIsShortageModalOpen] = useState(false);

    const isEditing = useMemo(() => task && (psdTasks || []).some((t: PsdTask) => t.id === task.id && t.recipeId), [task, psdTasks]);

    useEffect(() => {
        if (isOpen && task) {
            setRecipeId(task.recipeId || '');
            setTargetQuantity(String(task.targetQuantity || ''));
            setShelfLife(String(task.shelfLifeMonths || '12'));
            setNotes(task.notes || '');

            let defaultDate = '';
            if (task.plannedDate) {
                defaultDate = task.plannedDate;
            } else {
                const d = new Date();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                defaultDate = `${year}-${month}-${day}`;
            }
            setPlannedDate(defaultDate);
            setErrors({});
            setShortageDetails([]);
            setIsShortageModalOpen(false);
        }
    }, [isOpen, task]);

    const recipeOptions = useMemo(() => 
        (recipes || []).map((r: Recipe) => ({ value: r.id, label: r.name })),
    [recipes]);

    const selectedRecipe = useMemo(() => 
        (recipes || []).find((r: Recipe) => r.id === recipeId), 
    [recipes, recipeId]);
    
    const performSave = () => {
        const quantity = parseFloat(targetQuantity);
        const life = parseInt(shelfLife, 10);
        
        const taskData: PsdTask = {
            ...task!,
            recipeId,
            recipeName: selectedRecipe?.name || '',
            targetQuantity: quantity,
            shelfLifeMonths: life,
            notes: notes.trim(),
            plannedDate: plannedDate,
            hasShortages: !areRawMaterialsSufficient || !isBomSufficient
        };

        const result = handleSavePsdTask(taskData);

        if (result.success) {
            setIsShortageModalOpen(false);
            onClose();
        } else {
            setErrors({ form: result.message });
            setIsShortageModalOpen(false);
        }
    };

    const handleSubmit = () => {
        setErrors({});
        const validationErrors: any = {};

        if (!recipeId) validationErrors.recipeId = "Receptura jest wymagana.";
        const quantity = parseFloat(targetQuantity);
        if (isNaN(quantity) || quantity <= 0) validationErrors.targetQuantity = "Ilość docelowa musi być dodatnia.";
        const life = parseInt(shelfLife, 10);
        if (isNaN(life) || life <= 0) validationErrors.shelfLife = "Ważność musi być dodatnią liczbą miesięcy.";
        if (!plannedDate) validationErrors.plannedDate = "Data planowana jest wymagana.";
        
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        // Jeśli są braki, najpierw pokaż modal ostrzegawczy
        if (!areRawMaterialsSufficient || !isBomSufficient) {
            setIsShortageModalOpen(true);
        } else {
            performSave();
        }
    };

    if (!isOpen || !task) return null;

    return (
        <>
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[160]" onClick={onClose}>
                <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                        <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                            <BeakerIcon className="h-6 w-6"/> {isEditing ? 'Edytuj Zlecenie PSD' : 'Nowe Zlecenie PSD'}
                        </h2>
                        <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                    </div>

                    <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                        {errors.form && <Alert type="error" message={errors.form} />}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="ID Zlecenia" id="psd-task-id" value={task.id} disabled />
                            <Input 
                                label="Data Planowana" 
                                id="psd-task-date"
                                type="date"
                                value={plannedDate}
                                onChange={e => setPlannedDate(e.target.value)}
                                error={errors.plannedDate}
                                required
                            />
                        </div>

                        <SearchableSelect
                            label="Receptura"
                            id="psd-recipe"
                            options={recipeOptions}
                            value={recipeId}
                            onChange={setRecipeId}
                            error={errors.recipeId}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Ilość Docelowa (kg)" 
                                id="psd-target-qty" 
                                type="number"
                                value={targetQuantity}
                                onChange={e => setTargetQuantity(e.target.value)}
                                error={errors.targetQuantity}
                                min="1"
                            />
                            <Input 
                                label="Ważność Produktu (miesiące)" 
                                id="psd-shelf-life" 
                                type="number"
                                value={shelfLife}
                                onChange={e => setShelfLife(e.target.value)}
                                error={errors.shelfLife}
                                min="1"
                            />
                        </div>
                        
                        <Textarea
                            label="Notatki do zlecenia (opcjonalnie)"
                            id="psd-task-notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                        />

                        {selectedRecipe && targetQuantity && parseFloat(targetQuantity) > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t dark:border-secondary-700">
                                <RawMaterialStockCheck 
                                    recipe={selectedRecipe} 
                                    plannedAmount={parseFloat(targetQuantity)} 
                                    onSufficiencyChange={setAreRawMaterialsSufficient}
                                    onShortageDetailsChange={setShortageDetails}
                                    excludeItemId={isEditing ? task.id : undefined}
                                />
                                <BomStockCheck 
                                    recipe={selectedRecipe} 
                                    plannedAmount={parseFloat(targetQuantity)} 
                                    onSufficiencyChange={setIsBomSufficient}
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3 mt-4">
                        <Button onClick={onClose} variant="secondary">Anuluj</Button>
                        <Button onClick={handleSubmit}>{isEditing ? 'Zapisz Zmiany' : 'Utwórz Zlecenie'}</Button>
                    </div>
                </div>
            </div>
            <MaterialShortageModal
                isOpen={isShortageModalOpen}
                onClose={() => setIsShortageModalOpen(false)}
                onConfirm={performSave}
                shortages={shortageDetails}
            />
        </>
    );
};

export default EditPsdTaskModal;
