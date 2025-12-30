
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, RecipeIngredient, PackagingBOM } from '../types';
import Button from './Button';
import Input from './Input';
import SearchableSelect from './SearchableSelect';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import BeakerIcon from './icons/BeakerIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import { useProductionContext } from './contexts/ProductionContext';
import { useAppContext } from './contexts/AppContext';

interface AddEditRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeToEdit?: Recipe | null;
}

const AddEditRecipeModal: React.FC<AddEditRecipeModalProps> = ({ isOpen, onClose, recipeToEdit }) => {
    const { handleAddRecipe, handleEditRecipe } = useProductionContext();
    const { allProducts } = useAppContext();

    const [name, setName] = useState('');
    const [productionRate, setProductionRate] = useState('');
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([{ productName: '', quantityKg: 0 }]);
    const [packaging, setPackaging] = useState<Partial<PackagingBOM>>({
        bag: { id: '', name: '' },
        bagCapacityKg: 0,
        foilRoll: { id: '', name: '' },
        foilWeightPerBagKg: 0,
        palletType: 'EUR'
    });
    const [errors, setErrors] = useState<any>({});
    
    const isEditing = !!recipeToEdit;

    // Filter products for dropdowns
    const rawMaterials = useMemo(() => (allProducts || []).filter((p: any) => p.type === 'raw_material').map((p: any) => ({ value: p.name, label: p.name })), [allProducts]);
    const packagingMaterials = useMemo(() => (allProducts || []).filter((p: any) => p.type === 'packaging').map((p: any) => ({ value: p.name, label: p.name })), [allProducts]);
    
    // Helper to find full product obj for BOM
    const findProduct = (name: string) => (allProducts || []).find((p: any) => p.name === name);

    useEffect(() => {
        if (isOpen) {
            if (recipeToEdit) {
                setName(recipeToEdit.name);
                setProductionRate(String(recipeToEdit.productionRateKgPerMinute || ''));
                setIngredients(recipeToEdit.ingredients.map(i => ({ ...i })));
                if (recipeToEdit.packagingBOM) {
                    setPackaging({ ...recipeToEdit.packagingBOM });
                } else {
                     setPackaging({ palletType: 'EUR' });
                }
            } else {
                setName('');
                setProductionRate('');
                setIngredients([{ productName: '', quantityKg: 0 }]);
                setPackaging({ palletType: 'EUR' });
            }
            setErrors({});
        }
    }, [isOpen, recipeToEdit]);

    const handleIngredientChange = (index: number, field: keyof RecipeIngredient, value: any) => {
        const newIngredients = [...ingredients];
        (newIngredients[index] as any)[field] = value;
        setIngredients(newIngredients);
    };

    const addIngredientRow = () => {
        setIngredients([...ingredients, { productName: '', quantityKg: 0 }]);
    };

    const removeIngredientRow = (index: number) => {
        if (ingredients.length > 1) {
            setIngredients(ingredients.filter((_, i) => i !== index));
        }
    };
    
    const handlePackagingChange = (field: keyof PackagingBOM, value: any) => {
        setPackaging(prev => ({ ...prev, [field]: value }));
    };
    
    const handlePackagingItemChange = (field: 'bag' | 'foilRoll' | 'stretchFilm' | 'slipSheet', productName: string) => {
        // We just store name and a generated ID for simplicity as per type definition, or link to real ID if available
        // In this mock, we assume ID is derived or not strictly validated against warehouse ID for BOM definition purposes
        const product = findProduct(productName);
        const item = { id: product?.id || `PKG-${Date.now()}`, name: productName };
        setPackaging(prev => ({ ...prev, [field]: item }));
    };

    const handleSubmit = () => {
        setErrors({});
        const newErrors: any = {};
        
        if (!name.trim()) newErrors.name = 'Nazwa jest wymagana.';
        if (!productionRate || parseFloat(productionRate) <= 0) newErrors.productionRate = 'Wydajność musi być > 0.';
        
        const validIngredients = ingredients.filter(i => i.productName && i.quantityKg > 0);
        if (validIngredients.length === 0) {
            newErrors.ingredients = 'Dodaj przynajmniej jeden składnik.';
        }
        
        // Basic BOM validation
        if (!packaging.bag?.name) newErrors.bag = 'Wybierz worek.';
        if (!packaging.bagCapacityKg || packaging.bagCapacityKg <= 0) newErrors.bagCapacity = 'Pojemność worka > 0.';
        if (!packaging.foilRoll?.name) newErrors.foil = 'Wybierz folię.';
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const recipeData: any = {
            name: name.trim(),
            productionRateKgPerMinute: parseFloat(productionRate),
            ingredients: validIngredients,
            packagingBOM: packaging as PackagingBOM
        };
        
        let result;
        if (isEditing && recipeToEdit) {
            result = handleEditRecipe(recipeToEdit.id, recipeData);
        } else {
            result = handleAddRecipe(recipeData);
        }
        
        if (result.success) {
            onClose();
        } else {
            setErrors({ form: result.message });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[160]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <BeakerIcon className="h-6 w-6"/>
                        {isEditing ? 'Edytuj Recepturę' : 'Nowa Receptura'}
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    {errors.form && <Alert type="error" message={errors.form} />}
                    
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nazwa Receptury" value={name} onChange={e => setName(e.target.value)} required error={errors.name} />
                        <Input label="Wydajność Linii (kg/min)" type="number" value={productionRate} onChange={e => setProductionRate(e.target.value)} required error={errors.productionRate} />
                    </div>
                    
                    {/* Ingredients */}
                    <div className="p-4 border dark:border-secondary-700 rounded-lg bg-slate-50 dark:bg-secondary-900/50">
                        <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">Składniki</h3>
                        {errors.ingredients && <p className="text-sm text-red-500 mb-2">{errors.ingredients}</p>}
                        <div className="space-y-2">
                            {ingredients.map((ing, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                                    <SearchableSelect 
                                        label={idx === 0 ? "Surowiec" : ""}
                                        options={rawMaterials}
                                        value={ing.productName}
                                        onChange={(val) => handleIngredientChange(idx, 'productName', val)}
                                        placeholder="Wybierz surowiec..."
                                    />
                                    <Input 
                                        label={idx === 0 ? "Ilość (kg)" : ""}
                                        type="number"
                                        value={String(ing.quantityKg)}
                                        onChange={e => handleIngredientChange(idx, 'quantityKg', parseFloat(e.target.value))}
                                    />
                                    <Button onClick={() => removeIngredientRow(idx)} variant="secondary" className="p-2 mb-0.5" disabled={ingredients.length <= 1}>
                                        <TrashIcon className="h-5 w-5 text-red-500"/>
                                    </Button>
                                </div>
                            ))}
                            <Button onClick={addIngredientRow} variant="secondary" leftIcon={<PlusIcon className="h-4 w-4"/>} className="mt-2 text-xs">Dodaj składnik</Button>
                        </div>
                    </div>
                    
                    {/* Packaging BOM */}
                    <div className="p-4 border dark:border-secondary-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                         <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">Opakowania (BOM)</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SearchableSelect 
                                label="Rodzaj Worka"
                                options={packagingMaterials}
                                value={packaging.bag?.name || ''}
                                onChange={(val) => handlePackagingItemChange('bag', val)}
                                error={errors.bag}
                            />
                            <Input 
                                label="Pojemność Worka (kg)"
                                type="number"
                                value={String(packaging.bagCapacityKg)}
                                onChange={e => handlePackagingChange('bagCapacityKg', parseFloat(e.target.value))}
                                error={errors.bagCapacity}
                            />
                             <SearchableSelect 
                                label="Folia (Bela)"
                                options={packagingMaterials}
                                value={packaging.foilRoll?.name || ''}
                                onChange={(val) => handlePackagingItemChange('foilRoll', val)}
                                error={errors.foil}
                            />
                             <Input 
                                label="Zużycie Folii na Worek (kg)"
                                type="number"
                                step="0.001"
                                value={String(packaging.foilWeightPerBagKg)}
                                onChange={e => handlePackagingChange('foilWeightPerBagKg', parseFloat(e.target.value))}
                            />
                            {/* Optional Items */}
                             <SearchableSelect 
                                label="Folia Stretch (Opcjonalnie)"
                                options={packagingMaterials}
                                value={packaging.stretchFilm?.name || ''}
                                onChange={(val) => handlePackagingItemChange('stretchFilm', val)}
                            />
                             <SearchableSelect 
                                label="Przekładka (Opcjonalnie)"
                                options={packagingMaterials}
                                value={packaging.slipSheet?.name || ''}
                                onChange={(val) => handlePackagingItemChange('slipSheet', val)}
                            />
                         </div>
                    </div>

                </div>

                <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3 mt-4">
                    <Button onClick={onClose} variant="secondary">Anuluj</Button>
                    <Button onClick={handleSubmit} variant="primary">{isEditing ? 'Zapisz Zmiany' : 'Utwórz Recepturę'}</Button>
                </div>
            </div>
        </div>
    );
};

export default AddEditRecipeModal;
