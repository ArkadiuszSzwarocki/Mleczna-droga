import React, { useMemo, useState } from 'react';
import { Recipe } from '../types';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import BeakerIcon from './icons/BeakerIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';

interface RecipeDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
}

const RecipeDisplayModal: React.FC<RecipeDisplayModalProps> = ({ isOpen, onClose, recipe }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const totalWeight = useMemo(() => {
    if (!recipe) return 0;
    return (recipe.ingredients || []).reduce((sum, ing) => sum + ing.quantityKg, 0);
  }, [recipe]);

  const bomDetails = useMemo(() => {
    if (!recipe?.packagingBOM || totalWeight <= 0) return null;
    const { bag, bagCapacityKg, foilRoll, foilWeightPerBagKg, stretchFilm, slipSheet, palletType } = recipe.packagingBOM;
    
    // Assuming one recipe batch fits on one pallet for this display
    const totalBags = Math.ceil(totalWeight / bagCapacityKg);
    const totalFoilWeight = totalBags * foilWeightPerBagKg;
    
    return {
        bag,
        totalBags,
        bagCapacityKg,
        foilRoll,
        totalFoilWeight,
        stretchFilm,
        slipSheet,
        palletType,
        palletsPerBatch: 1, // Simplified for recipe view
    };
  }, [recipe, totalWeight]);

  if (!isOpen || !recipe) return null;

  const handlePrintBOM = () => {
    const bomSection = document.getElementById('printable-bom-section');
    if (bomSection) {
        document.body.classList.add('printing-single-section');
        bomSection.classList.add('section-to-print');
        setIsPrinting(true);
        window.print();
        // Use setTimeout to allow the print dialog to open before cleaning up
        setTimeout(() => {
            document.body.classList.remove('printing-single-section');
            bomSection.classList.remove('section-to-print');
            setIsPrinting(false);
        }, 500);
    }
  };

  return (
    <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[160] ${isPrinting ? 'printing-active-modal' : ''}`} onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4 no-print">
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <BeakerIcon className="h-6 w-6"/>
                Szczegóły Receptury: {recipe.name}
            </h2>
            <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>
        
        <div className="overflow-y-auto pr-2 flex-grow space-y-6">
            <section>
                <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Składniki (na {totalWeight.toFixed(2)} kg produktu)</h3>
                <ul className="space-y-2">
                    {(recipe.ingredients || []).map((ingredient, index) => (
                        <li key={index} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-secondary-700 rounded-md">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{ingredient.productName}</span>
                            <div className="text-right">
                                <span className="font-bold text-lg text-primary-600 dark:text-primary-300">{ingredient.quantityKg.toFixed(2)} kg</span>
                                {totalWeight > 0 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                        ({((ingredient.quantityKg / totalWeight) * 100).toFixed(2)}%)
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </section>

            <div id="printable-bom-section">
                {bomDetails && <hr className="border-slate-200 dark:border-secondary-600" />}

                {bomDetails && (
                    <section className="pt-4">
                        <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Materiały Opakowaniowe (BOM)</h3>
                        <ul className="space-y-2 text-sm">
                            <li className="flex justify-between items-center p-2 bg-slate-50 dark:bg-secondary-700 rounded-md">
                                <div>
                                    <span>Worki ({bomDetails.bagCapacityKg} kg)</span>
                                    <span className="block text-xs text-gray-500 font-mono">{bomDetails.bag.name} ({bomDetails.bag.id})</span>
                                </div>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{bomDetails.totalBags} szt.</span>
                            </li>
                            <li className="flex justify-between items-center p-2 bg-slate-50 dark:bg-secondary-700 rounded-md">
                                <div>
                                    <span className="truncate pr-2">Folia na worki</span>
                                    <span className="block text-xs text-gray-500 font-mono">{bomDetails.foilRoll.name} ({bomDetails.foilRoll.id})</span>
                                </div>
                                <span className="font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">{bomDetails.totalFoilWeight.toFixed(2)} kg</span>
                            </li>
                            {bomDetails.stretchFilm && (
                                <li className="flex justify-between items-center p-2 bg-slate-50 dark:bg-secondary-700 rounded-md">
                                    <div>
                                      <span>Folia Stretch</span>
                                      <span className="block text-xs text-gray-500 font-mono">{bomDetails.stretchFilm.name} ({bomDetails.stretchFilm.id})</span>
                                    </div>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{bomDetails.palletsPerBatch} szt.</span>
                                </li>
                            )}
                            {bomDetails.slipSheet && (
                                <li className="flex justify-between items-center p-2 bg-slate-50 dark:bg-secondary-700 rounded-md">
                                    <div>
                                      <span>Przekładka Tekturowa</span>
                                      <span className="block text-xs text-gray-500 font-mono">{bomDetails.slipSheet.name} ({bomDetails.slipSheet.id})</span>
                                    </div>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{bomDetails.palletsPerBatch} szt.</span>
                                </li>
                            )}
                            <li className="flex justify-between items-center p-2 bg-slate-50 dark:bg-secondary-700 rounded-md">
                                <span>Paleta</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{bomDetails.palletsPerBatch} szt. ({bomDetails.palletType})</span>
                            </li>
                        </ul>
                    </section>
                )}
            </div>
        </div>

        <div className="mt-4 pt-3 border-t dark:border-secondary-600 flex justify-between items-center font-bold text-lg no-print">
            <span className="text-gray-800 dark:text-gray-200">SUMA (surowce):</span>
            <span className="text-gray-800 dark:text-gray-200">{totalWeight.toFixed(2)} kg</span>
        </div>

        <div className="mt-4 pt-4 border-t dark:border-secondary-700 flex justify-end gap-3 no-print">
             <Button onClick={handlePrintBOM} variant="secondary" leftIcon={<PrintLabelIcon className="h-5 w-5"/>}>Drukuj BOM</Button>
             <Button onClick={onClose} variant="primary">Zamknij</Button>
        </div>
      </div>
    </div>
  );
};

export default RecipeDisplayModal;
