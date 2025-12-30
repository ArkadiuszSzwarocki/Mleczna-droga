import React, { useMemo, useEffect } from 'react';
import { Recipe } from '../types';
import { useAppContext } from './contexts/AppContext';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import Alert from './Alert';

interface BomStockCheckProps {
    recipe: Recipe | null;
    plannedAmount: number; // in kg
    onSufficiencyChange: (isSufficient: boolean) => void;
}

const BomStockCheck: React.FC<BomStockCheckProps> = ({ recipe, plannedAmount, onSufficiencyChange }) => {
    const { packagingMaterialsLog } = useAppContext();

    const requiredMaterials = useMemo(() => {
        if (!recipe || !recipe.packagingBOM || plannedAmount <= 0) {
            return [];
        }

        const { bagCapacityKg, foilWeightPerBagKg, stretchFilm, slipSheet } = recipe.packagingBOM;
        const totalBags = Math.ceil(plannedAmount / bagCapacityKg);
        const totalFoilWeight = totalBags * foilWeightPerBagKg;
        
        const needed: { id: string, name: string, required: number, unit: 'kg' | 'szt.' }[] = [];
        
        needed.push({ ...recipe.packagingBOM.bag, required: totalBags, unit: 'szt.' });
        needed.push({ ...recipe.packagingBOM.foilRoll, required: totalFoilWeight, unit: 'kg' });
        
        if (stretchFilm) {
            const requiredStretchKg = (plannedAmount / 1000) * 1.2;
            needed.push({ ...stretchFilm, required: requiredStretchKg, unit: 'kg' });
        }
        if (slipSheet) {
            const requiredSlipSheets = Math.ceil(plannedAmount / 1000);
            needed.push({ ...slipSheet, required: requiredSlipSheets, unit: 'szt.' });
        }

        return needed;
    }, [recipe, plannedAmount]);

    const stockStatus = useMemo(() => {
        const status: {
            id: string;
            name: string;
            required: number;
            unit: 'kg' | 'szt.';
            available: number;
            isSufficient: boolean;
        }[] = [];

        if (requiredMaterials.length === 0) return status;

        const availableStock = (packagingMaterialsLog || []).reduce((acc, material) => {
            acc[material.productName] = (acc[material.productName] || 0) + material.currentWeight; // Assuming everything is tracked by weight for now
            return acc;
        }, {} as Record<string, number>);
        
        // This is a simplification. A real system needs to track units (szt) and weight (kg) separately.
        // For now, we assume a mock value for items tracked by pieces.
        availableStock['Worek 25kg'] = 5000;
        availableStock['Worek 20kg'] = 5000;
        availableStock['Folia Stretch'] = 100; // 100 rolls
        availableStock['Przekładka Tekturowa'] = 200; // 200 pieces

        requiredMaterials.forEach(req => {
            const available = availableStock[req.name] || 0;
            status.push({
                ...req,
                available,
                isSufficient: available >= req.required,
            });
        });

        return status;
    }, [requiredMaterials, packagingMaterialsLog]);

    const isGloballySufficient = useMemo(() => stockStatus.every(item => item.isSufficient), [stockStatus]);

    useEffect(() => {
        onSufficiencyChange(isGloballySufficient);
    }, [isGloballySufficient, onSufficiencyChange]);
    
    if (!recipe || plannedAmount <= 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Materiały Opakowaniowe (BOM)</h4>
            {!isGloballySufficient && (
                 <Alert type="warning" message="Brak wystarczającej ilości materiałów opakowaniowych." />
            )}
            <div className="space-y-2 text-xs">
                {stockStatus.map(item => (
                    <div key={item.id} className={`p-2 rounded flex justify-between items-center ${item.isSufficient ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                        <div className="flex items-center gap-2">
                            {item.isSufficient 
                                ? <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                                : <XCircleIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
                            }
                            <div>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                                <p className="text-gray-500 dark:text-gray-400 font-mono text-[10px]">{item.id}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className={`font-semibold ${!item.isSufficient ? 'text-red-600 dark:text-red-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                {item.required.toFixed(2)} / {item.available.toFixed(2)}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">{item.unit}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BomStockCheck;