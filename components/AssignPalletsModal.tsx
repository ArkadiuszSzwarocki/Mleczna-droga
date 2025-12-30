import React, { useState, useMemo, useEffect } from 'react';
import { DispatchOrder, DispatchOrderItem, FinishedGoodItem, View } from '../types';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useProductionContext } from './contexts/ProductionContext';
import { useLogisticsContext } from './contexts/LogisticsContext';
import { useUIContext } from './contexts/UIContext';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import Alert from './Alert';
import ConfirmationModal from './ConfirmationModal';
import { formatDate, getBlockInfo, getExpiryStatus, getExpiryStatusClass } from '../src/utils';
import CheckCircleIcon from './icons/CheckCircleIcon';

const SUGGESTION_EXPIRY_THRESHOLD_DAYS = 30;

interface AssignPalletsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItem: DispatchOrderItem;
  dispatchOrder: DispatchOrder;
}

const PalletRow: React.FC<{
  pallet: FinishedGoodItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
  isDisabled: boolean;
  suggestion?: 'FEFO' | 'Niska Ilość' | 'Podzielona';
}> = ({ pallet, isSelected, onToggle, isDisabled, suggestion }) => {
  const { expiryWarningDays, expiryCriticalDays } = useWarehouseContext();
  const expiryStatus = getExpiryStatus({ dataPrzydatnosci: pallet.expiryDate }, expiryWarningDays, expiryCriticalDays);
  
  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-secondary-700/50 ${suggestion ? 'bg-blue-50 dark:bg-blue-900/40' : ''}`}>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(pallet.id)}
          disabled={isDisabled && !isSelected}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap font-mono">{pallet.displayId}</td>
      <td className={`px-3 py-2 whitespace-nowrap font-semibold ${getExpiryStatusClass(expiryStatus)}`}>{formatDate(pallet.expiryDate)}</td>
      <td className="px-3 py-2 text-right">{pallet.quantityKg.toFixed(2)} kg</td>
      <td className="px-3 py-2">
        {suggestion === 'FEFO' && <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200">FEFO</span>}
        {suggestion === 'Podzielona' && <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200">Podzielona</span>}
        {suggestion === 'Niska Ilość' && <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">Niska Ilość</span>}
      </td>
    </tr>
  );
};

const AssignPalletsModal: React.FC<AssignPalletsModalProps> = ({ isOpen, onClose, orderItem, dispatchOrder }) => {
  const { finishedGoodsList } = useProductionContext();
  const { dispatchOrders, handleAssignPalletsToDispatchItem } = useLogisticsContext();
  const { handleSetView, recentlySplitPalletIds } = useUIContext();
  const [selectedPalletIds, setSelectedPalletIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [splitSuggestion, setSplitSuggestion] = useState<{palletToSplit: FinishedGoodItem, neededWeight: number} | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPalletIds(orderItem.fulfilledPallets.map(p => p.palletId));
      setError(null);
      setSplitSuggestion(null);
    }
  }, [isOpen, orderItem]);

  const { availablePallets, suggestedPallets, otherPallets, suggestionReasons } = useMemo(() => {
    if (!isOpen) return { availablePallets: [], suggestedPallets: [], otherPallets: [], suggestionReasons: new Map() };
    
    // Get all pallet IDs assigned to OTHER active orders
    const allAssignedPalletIdsInOtherOrders = (dispatchOrders || [])
        .filter(o => o.id !== dispatchOrder.id && (o.status === 'planned' || o.status === 'in_fulfillment'))
        .flatMap(o => o.items.flatMap(i => i.fulfilledPallets.map(p => p.palletId)));
    
    // Get all pallet IDs assigned to OTHER items within THIS order
    const allAssignedPalletIdsInThisOrder = dispatchOrder.items
        .filter(item => item.id !== orderItem.id)
        .flatMap(item => item.fulfilledPallets.map(p => p.palletId));
    
    const allReservedIds = new Set([...allAssignedPalletIdsInOtherOrders, ...allAssignedPalletIdsInThisOrder]);

    const allAvailable = (finishedGoodsList || [])
      .filter(p => 
        p.productName === orderItem.productName && 
        p.status === 'available' &&
        !getBlockInfo(p).isBlocked &&
        !allReservedIds.has(p.id)
      )
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const suggestions: {pallet: FinishedGoodItem, reason: 'FEFO' | 'Podzielona' | 'Niska Ilość'}[] = [];
    const suggestionIds = new Set<string>();

    // 1. FEFO Suggestion
    const fefoPallet = allAvailable[0];
    if (fefoPallet) {
      suggestions.push({pallet: fefoPallet, reason: 'FEFO'});
      suggestionIds.add(fefoPallet.id);
    }

    // 2. Recently Split Suggestion
    const splitSuggestions = allAvailable
        .filter(p => recentlySplitPalletIds.includes(p.id) && !suggestionIds.has(p.id))
        .sort((a,b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    
    splitSuggestions.forEach(p => {
        suggestions.push({pallet: p, reason: 'Podzielona'});
        suggestionIds.add(p.id);
    });

    // 3. Lowest Quantity Suggestion (if FEFO is old)
    const today = new Date();
    const fefoExpiry = fefoPallet ? new Date(fefoPallet.expiryDate) : null;
    if (fefoPallet && fefoExpiry && (fefoExpiry.getTime() - today.getTime()) / (1000 * 3600 * 24) < SUGGESTION_EXPIRY_THRESHOLD_DAYS) {
        const lowestQtyPallet = allAvailable
            .filter(p => !suggestionIds.has(p.id))
            .sort((a, b) => a.quantityKg - b.quantityKg)[0];
        if (lowestQtyPallet) {
            suggestions.push({pallet: lowestQtyPallet, reason: 'Niska Ilość'});
            suggestionIds.add(lowestQtyPallet.id);
        }
    }

    const others = allAvailable.filter(p => !suggestionIds.has(p.id));

    return { 
        availablePallets: allAvailable, 
        suggestedPallets: suggestions.map(s => s.pallet), 
        otherPallets: others, 
        suggestionReasons: new Map(suggestions.map(s => [s.pallet.id, s.reason])) 
    };
}, [isOpen, orderItem.productName, finishedGoodsList, dispatchOrders, dispatchOrder.id, orderItem.id, recentlySplitPalletIds]);

  const selectedWeight = useMemo(() => {
    return availablePallets
        .filter(p => selectedPalletIds.includes(p.id))
        .reduce((sum, p) => sum + p.quantityKg, 0);
  }, [selectedPalletIds, availablePallets]);


  const handleTogglePallet = (palletId: string) => {
    setSelectedPalletIds(prev => {
      if (prev.includes(palletId)) {
        return prev.filter(id => id !== palletId);
      }
      return [...prev, palletId];
    });
  };

  const handleSubmit = () => {
    setError(null);
    const requestedWeight = Number(orderItem.requestedWeightKg);
    const currentSelectedWeight = Number(selectedWeight);

    // Case 1: Clearing assignment
    if (selectedPalletIds.length === 0) {
      const result = handleAssignPalletsToDispatchItem(dispatchOrder.id, orderItem.id, []);
      if (result.success) onClose();
      else setError(result.message);
      return;
    }

    // Case 2: Underweight
    if (currentSelectedWeight < requestedWeight) {
        setError(`Wybrana waga (${currentSelectedWeight.toFixed(2)} kg) jest mniejsza niż wymagana (${requestedWeight.toFixed(2)} kg).`);
        return;
    }

    const overage = currentSelectedWeight - requestedWeight;

    // Case 3: Weight is within tolerance, assign directly
    if (overage <= 1.0) {
        const result = handleAssignPalletsToDispatchItem(dispatchOrder.id, orderItem.id, selectedPalletIds);
        if (result.success) onClose();
        else setError(result.message);
        return;
    }
    
    // Case 4: Overage is significant, try to suggest a split
    const selectedPallets = availablePallets.filter(p => selectedPalletIds.includes(p.id));
    const palletToSplit = selectedPallets
        .filter(p => Number(p.quantityKg) > overage)
        .sort((a, b) => Number(a.quantityKg) - Number(b.quantityKg))[0];

    if (palletToSplit) {
        const neededWeight = Number(palletToSplit.quantityKg) - overage;
        setSplitSuggestion({ palletToSplit, neededWeight });
        return;
    }
    
    // Case 5: Overage is significant, but no suitable pallet to split was found
    setError(`Wybrana waga (${currentSelectedWeight.toFixed(2)} kg) znacznie przekracza wymaganą i nie można znaleźć pojedynczej palety do podziału. Zmień wybór palet.`);
  };


  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
              <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">Przypisz Palety do Zlecenia</h2>
              <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
          </div>
          
          <div className="mb-4 p-3 bg-slate-50 dark:bg-secondary-900 rounded-md border dark:border-secondary-700">
              <p><strong>Produkt:</strong> {orderItem.productName}</p>
              <p><strong>Wymagana waga:</strong> {orderItem.requestedWeightKg.toFixed(2)} kg</p>
              <p className={`font-semibold ${selectedWeight >= orderItem.requestedWeightKg ? 'text-green-600' : 'text-orange-600'}`}>
                  <strong>Wybrano:</strong> {selectedPalletIds.length} palet ({selectedWeight.toFixed(2)} kg)
              </p>
          </div>

          {error && <Alert type="error" message={error} />}
          
          <div className="flex-grow overflow-y-auto pr-2 space-y-4">
              {suggestedPallets.length > 0 && (
                  <section>
                      <h3 className="font-semibold text-md text-gray-700 dark:text-gray-300 mb-2">Sugerowane Palety</h3>
                      <table className="min-w-full text-sm">
                          <tbody>
                              {suggestedPallets.map(p => (
                                  <PalletRow 
                                      key={p.id} 
                                      pallet={p} 
                                      isSelected={selectedPalletIds.includes(p.id)}
                                      onToggle={handleTogglePallet}
                                      isDisabled={false}
                                      suggestion={suggestionReasons.get(p.id)}
                                  />
                              ))}
                          </tbody>
                      </table>
                  </section>
              )}

              <section>
                  <h3 className="font-semibold text-md text-gray-700 dark:text-gray-300 mb-2">Pozostałe Dostępne Palety ({otherPallets.length})</h3>
                  {otherPallets.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto border-t border-b dark:border-secondary-700">
                          <table className="min-w-full text-sm">
                              <tbody className="divide-y dark:divide-secondary-700">
                                  {otherPallets.map(p => (
                                      <PalletRow 
                                          key={p.id} 
                                          pallet={p} 
                                          isSelected={selectedPalletIds.includes(p.id)}
                                          onToggle={handleTogglePallet}
                                          isDisabled={false}
                                      />
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  ) : <p className="text-sm italic text-gray-500 dark:text-gray-400">Brak innych dostępnych palet.</p>}
              </section>
          </div>

          <div className="pt-4 mt-auto border-t dark:border-secondary-700 flex justify-end gap-3">
            <Button onClick={onClose} variant="secondary">Anuluj</Button>
            <Button 
              onClick={handleSubmit} 
              variant="primary"
            >
              Przypisz Wybrane Palety
            </Button>
          </div>
        </div>
      </div>
      {splitSuggestion && (
          <ConfirmationModal
              isOpen={!!splitSuggestion}
              onClose={() => setSplitSuggestion(null)}
              onConfirm={() => {
                  handleSetView(View.SplitPallet, { 
                      palletId: splitSuggestion.palletToSplit.id, 
                      suggestedWeight: splitSuggestion.neededWeight.toFixed(2) 
                  });
                  onClose();
              }}
              title="Sugerowany Podział Palety"
              message={
                  <span>
                      Wybrana waga ({selectedWeight.toFixed(2)} kg) przekracza wymaganą ({orderItem.requestedWeightKg.toFixed(2)} kg).
                      <br /><br />
                      Sugerujemy podział palety <strong>{splitSuggestion.palletToSplit.displayId}</strong> na dwie części: <strong>{splitSuggestion.neededWeight.toFixed(2)} kg</strong> do zlecenia oraz <strong>{(splitSuggestion.palletToSplit.quantityKg - splitSuggestion.neededWeight).toFixed(2)} kg</strong>, która pozostanie w magazynie.
                  </span>
              }
              confirmButtonText="Przejdź do podziału"
              cancelButtonText="Anuluj"
          />
      )}
    </>
  );
};

export default AssignPalletsModal;