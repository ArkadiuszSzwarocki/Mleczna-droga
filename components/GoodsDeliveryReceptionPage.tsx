
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Delivery, DeliveryItem, User, View, RawMaterialLogEntry, AnalysisRange, AnalysisResult, Document, DeliveryStatus, Permission, DeliveryEvent } from '../types';
import { useUIContext } from './contexts/UIContext';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useAuth } from './contexts/AuthContext';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import SearchableSelect from './SearchableSelect';
import Textarea from './Textarea';
import Alert from './Alert';
import ConfirmationModal from './ConfirmationModal';
import { formatDate, generate18DigitId, getArchivizationCountdown, getDaysInMonth } from '../src/utils';
import { BUFFER_MS01_ID, OSIP_WAREHOUSE_ID } from '../constants';
import TruckIcon from './icons/TruckIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import BeakerIcon from './icons/BeakerIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import LockClosedIcon from './icons/LockClosedIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';
import ClockIcon from './icons/ClockIcon';

const EditableDropdownPart = React.forwardRef<HTMLInputElement, {
    placeholder: string;
    value: string;
    options: string[];
    onChange: (val: string) => void;
    disabled?: boolean;
    className?: string;
}>(({ placeholder, value, options, onChange, disabled, className }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    
    const localInputRef = useRef<HTMLInputElement>(null);
    const actualInputRef = (ref as React.RefObject<HTMLInputElement>) || localInputRef;
    const dropdownRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        if (isOpen && actualInputRef.current) {
            const rect = actualInputRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const dropdownHeight = 200; 
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

            setDropdownStyle({
                position: 'fixed',
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                zIndex: 9999,
                top: showAbove ? 'auto' : `${rect.bottom + 4}px`,
                bottom: showAbove ? `${viewportHeight - rect.top + 4}px` : 'auto',
                maxHeight: '200px'
            });
        }
    }, [isOpen, actualInputRef]);

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, updatePosition]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && 
                actualInputRef.current && !actualInputRef.current.contains(event.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, actualInputRef]);

    const filteredOptions = useMemo(() => {
        if (!value) return options;
        return options.filter(opt => opt.startsWith(value));
    }, [options, value]);

    const handleBlur = () => {
        if (value.length === 1 && parseInt(value) > 0 && (placeholder === "DD" || placeholder === "MM")) {
            onChange('0' + value);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative w-full">
            <input
                ref={actualInputRef}
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    onChange(val);
                    if (!isOpen) setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={handleBlur}
                disabled={disabled}
                className={`w-full text-center py-2 text-sm bg-white dark:bg-secondary-800 border border-gray-300 dark:border-secondary-600 rounded-md focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100 dark:disabled:bg-secondary-700 text-gray-900 dark:text-gray-100 font-mono transition-all ${className}`}
            />
            {isOpen && !disabled && ReactDOM.createPortal(
                <div 
                    ref={dropdownRef}
                    style={dropdownStyle}
                    className="bg-white dark:bg-secondary-700 shadow-2xl rounded-md border border-gray-200 dark:border-secondary-700 overflow-y-auto scrollbar-hide animate-fadeIn"
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(opt => (
                            <button
                                key={opt}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault(); 
                                    onChange(opt);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/30 text-gray-700 dark:text-gray-200 border-b last:border-0 dark:border-secondary-600"
                            >
                                {opt}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-2 text-xs text-gray-400 italic">Brak podpowiedzi</div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
});

EditableDropdownPart.displayName = 'EditableDropdownPart';

const DatePartsSelector: React.FC<{
    label: string;
    value: string; 
    onChange: (newValue: string) => void;
    disabled?: boolean;
    error?: string;
}> = ({ label, value, onChange, disabled, error }) => {
    const monthRef = useRef<HTMLInputElement>(null);
    const dayRef = useRef<HTMLInputElement>(null);

    const [year, month, day] = useMemo(() => {
        if (!value) return ['', '', ''];
        const parts = value.split('-');
        return [parts[0] || '', parts[1] || '', parts[2] || ''];
    }, [value]);

    const daysList = useMemo(() => {
        const yVal = parseInt(year, 10);
        const mVal = parseInt(month, 10);
        const max = (yVal && mVal) ? getDaysInMonth(mVal, yVal) : 31;
        return Array.from({ length: max }, (_, i) => String(i + 1).padStart(2, '0'));
    }, [year, month]);

    const monthsList = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')), []);
    const yearsList = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 13 }, (_, i) => String(currentYear - 2 + i));
    }, []);

    const handlePartChange = (part: 'y' | 'm' | 'd', newVal: string) => {
        let newY = year, newM = month, newD = day;
        
        if (part === 'y') {
            newY = newVal.substring(0, 4);
            if (newY.length === 4) setTimeout(() => monthRef.current?.focus(), 10);
        }
        if (part === 'm') {
            let mVal = parseInt(newVal, 10);
            if (!isNaN(mVal) && mVal > 12) mVal = 12;
            newM = newVal.length > 0 ? String(mVal).padStart(2, '0').substring(0, 2) : '';
            if (newM.length === 2) setTimeout(() => dayRef.current?.focus(), 10);
        }
        if (part === 'd') {
            let dVal = parseInt(newVal, 10);
            const max = (parseInt(newY, 10) && parseInt(newM, 10)) ? getDaysInMonth(parseInt(newM, 10), parseInt(newY, 10)) : 31;
            if (!isNaN(dVal) && dVal > max) dVal = max;
            newD = newVal.length > 0 ? String(dVal).padStart(2, '0').substring(0, 2) : '';
        }

        // Re-validate day if month or year changed
        if (newY && newM && newD) {
            const maxDays = getDaysInMonth(parseInt(newM, 10), parseInt(newY, 10));
            if (parseInt(newD, 10) > maxDays) {
                newD = String(maxDays).padStart(2, '0');
            }
        }

        onChange(!newY && !newM && !newD ? '' : `${newY}-${newM}-${newD}`);
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1 tracking-wider">{label}</label>
            <div className={`grid grid-cols-[1.2fr_1fr_1fr] gap-1 p-1 bg-slate-100/50 dark:bg-secondary-700/50 rounded-lg border ${error ? 'border-red-500' : 'border-slate-200/50 dark:border-secondary-600/50'}`}>
                <EditableDropdownPart placeholder="RRRR" value={year} options={yearsList} onChange={val => handlePartChange('y', val)} disabled={disabled} className="font-bold" />
                <EditableDropdownPart ref={monthRef} placeholder="MM" value={month} options={monthsList} onChange={val => handlePartChange('m', val)} disabled={disabled} />
                <EditableDropdownPart ref={dayRef} placeholder="DD" value={day} options={daysList} onChange={val => handlePartChange('d', val)} disabled={disabled} />
            </div>
            {error && <p className="mt-1 text-[10px] text-red-600 dark:text-red-400 font-bold ml-1">{error}</p>}
        </div>
    );
};

const getBatchColorClass = (batchNumber?: string) => {
    if (!batchNumber || batchNumber.trim() === '') return 'bg-white dark:bg-secondary-800 border-slate-200 dark:border-secondary-700';
    const colors = ['bg-blue-50 dark:bg-blue-900/20 border-blue-200', 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200', 'bg-violet-50 dark:bg-violet-900/20 border-violet-200', 'bg-amber-50 dark:bg-amber-900/20 border-amber-200', 'bg-rose-50 dark:bg-rose-900/20 border-rose-200', 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200'];
    let hash = 0;
    for (let i = 0; i < batchNumber.length; i++) hash = batchNumber.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const getStatusInfo = (status: any) => {
    switch (status) {
      case 'REGISTRATION': return { label: 'Rejestracja', colorClass: 'bg-gray-200 text-gray-800 dark:bg-secondary-700 dark:text-gray-200' };
      case 'PENDING_LAB': return { label: 'Oczekuje na Laboratorium', colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' };
      case 'PENDING_WAREHOUSE': return { label: 'Oczekuje na Magazyn', colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' };
      case 'COMPLETED': return { label: 'Zakończona', colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' };
      default: return { label: status, colorClass: 'bg-gray-100 text-gray-800' };
    }
};

export const GoodsDeliveryReceptionPage: React.FC = () => {
    const { viewParams, handleSetView, modalHandlers, showToast } = useUIContext();
    const { deliveries, handleSaveDelivery, handleUpdateDeliveryStatus, suppliers, allProducts, analysisRanges, rawMaterialsLogList, packagingMaterialsLog } = useWarehouseContext();
    const { currentUser, checkPermission } = useAuth();
    
    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [palletCount, setPalletCount] = useState(0);
    const [errors, setErrors] = useState<Record<string, Record<string, boolean>>>({});
    const [showDateConflictModal, setShowDateConflictModal] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);

    const isCreating = !viewParams?.deliveryId;
    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (isCreating) {
            const defaultWarehouse = currentUser?.subRole === 'OSIP' ? OSIP_WAREHOUSE_ID : BUFFER_MS01_ID;
            const newDelivery: Delivery = {
                id: '', orderRef: '', supplier: '', deliveryDate: todayStr,
                status: 'REGISTRATION', items: [], createdBy: currentUser?.username || 'system',
                createdAt: new Date().toISOString(), requiresLab: false, destinationWarehouse: defaultWarehouse,
                eventLog: []
            };
            setDelivery(newDelivery);
            setPalletCount(0);
        } else {
            const existing = (deliveries || []).find((d: any) => d.id === viewParams.deliveryId);
            if (existing) {
                setDelivery(JSON.parse(JSON.stringify(existing)));
                setPalletCount(existing.items.length);
            }
        }
        setErrors({});
    }, [deliveries, isCreating, currentUser, todayStr, viewParams]);

    const supplierOptions = useMemo(() => [{ value: '', label: 'Wybierz lub wpisz...' }, ...suppliers], [suppliers]);
    const productOptions = useMemo(() => (allProducts || []).map((p: any) => ({ value: p.name, label: p.name })), [allProducts]);

    const calculateRequiresLab = (items: DeliveryItem[], destinationWarehouse?: string) => {
        if (destinationWarehouse === OSIP_WAREHOUSE_ID) return false;
        return items.some(item => item.packageForm === 'big_bag' || item.packageForm === 'bags');
    };

    const handleHeaderChange = (field: string, value: any) => {
        if (!delivery) return;
        const updatedDelivery = { ...delivery, [field]: value };
        if (field === 'destinationWarehouse') {
            updatedDelivery.requiresLab = calculateRequiresLab(updatedDelivery.items, value);
        }
        setDelivery(updatedDelivery);
    };

    const getResultVerification = (name: string, value: string) => {
        const range = (analysisRanges || []).find(r => r.name === name);
        if (!range || !value) return { status: 'none', message: '', range: null };
        const num = parseFloat(value);
        if (isNaN(num)) return { status: 'nok', message: 'Wartość musi być liczbą', range };
        if (num < range.min || num > range.max) return { status: 'nok', message: `Poza zakresem (${range.min} - ${range.max})`, range };
        return { status: 'ok', message: 'Zgodne', range };
    };

    const handleItemChange = useCallback((itemId: string, field: string, value: any) => {
        setDelivery(prev => {
            if (!prev) return null;
            const isRegistration = prev.status === 'REGISTRATION';
            const newItems = prev.items.map(item => {
                if (item.id === itemId) {
                    const updated = { ...item, [field]: value };
                    
                    // --- LOGIKA AUTOMATYCZNEJ BLOKADY ---
                    if (field === 'packageForm') {
                        const isSypki = (value === 'big_bag' || value === 'bags');
                        if (isSypki) {
                            updated.isBlocked = true;
                            updated.blockReason = "auto blokada dostawy";
                        } else {
                            // Jeśli zmieniono na opakowanie lub coś innego, zdejmujemy blokadę tylko jeśli powód był "auto"
                            if (updated.blockReason === "auto blokada dostawy") {
                                updated.isBlocked = false;
                                updated.blockReason = "";
                            }
                        }
                    }

                    if (field === 'productName' && typeof value === 'string' && value.startsWith('OP')) {
                        updated.packageForm = 'packaging';
                    }
                    if (field === 'packageForm' && value !== 'packaging') {
                        updated.unit = 'kg'; 
                    }
                    if (field === 'productionDate' && value && value.length === 10) {
                        const dateParts = value.split('-');
                        const yearNum = parseInt(dateParts[0], 10);
                        if (!isNaN(yearNum)) updated.expiryDate = `${yearNum + 1}-${dateParts[1]}-${dateParts[2]}`;
                    }
                    if (field === 'netWeight' || field === 'weightPerBag') {
                        const net = field === 'netWeight' ? parseFloat(value) : (updated.netWeight || 0);
                        const perBag = field === 'weightPerBag' ? parseFloat(value) : (updated.weightPerBag || 0);
                        if (net > 0 && perBag > 0) {
                            updated.unitsPerPallet = Math.floor(net / perBag);
                        }
                    }
                    if (updated.isCopied && field !== 'isCopied') updated.isCopied = false;
                    return updated;
                }
                return item;
            });
            return { 
                ...prev, 
                items: newItems, 
                requiresLab: calculateRequiresLab(newItems, prev.destinationWarehouse) 
            };
        });
    }, []);

    const handleResultChange = useCallback((itemId: string, resultIdx: number, field: keyof AnalysisResult, value: string) => {
        setDelivery(prev => {
            if (!prev) return null;
            const newItems = prev.items.map(item => {
                if (item.id === itemId) {
                    const results = [...(item.analysisResults || [])];
                    const updatedResult = { ...results[resultIdx], [field]: value };
                    if (field === 'name') {
                        const range = (analysisRanges || []).find((r: AnalysisRange) => r.name === value);
                        if (range) updatedResult.unit = range.unit;
                    }
                    results[resultIdx] = updatedResult;
                    let shouldBlock = item.isBlocked;
                    let blockReason = item.blockReason;
                    const anyNok = results.some(r => getResultVerification(r.name, r.value).status === 'nok');
                    if (anyNok) {
                        shouldBlock = true;
                        blockReason = "Blokada analityczna";
                    }
                    return { ...item, analysisResults: results, isBlocked: shouldBlock, blockReason: blockReason };
                }
                return item;
            });
            return { ...prev, items: newItems };
        });
    }, [analysisRanges]);

    const handleAddResultRow = useCallback((itemId: string) => {
        setDelivery(prev => {
            if (!prev) return null;
            const newItems = prev.items.map(item => {
                if (item.id === itemId) {
                    const results = [...(item.analysisResults || [])];
                    results.push({ name: '', value: '', unit: '' });
                    return { ...item, analysisResults: results };
                }
                return item;
            });
            return { ...prev, items: newItems };
        });
    }, []);

    const handleRemoveResultRow = useCallback((itemId: string, resultIdx: number) => {
        setDelivery(prev => {
            if (!prev) return null;
            const newItems = prev.items.map(item => {
                if (item.id === itemId) {
                    const results = (item.analysisResults || []).filter((_, idx) => idx !== resultIdx);
                    return { ...item, analysisResults: results };
                }
                return item;
            });
            return { ...prev, items: newItems };
        });
    }, []);

    const handleCopyFromPrevious = useCallback((index: number, isChecked: boolean) => {
        if (index === 0) return;
        setDelivery(prev => {
            if (!prev) return null;
            const prevItem = prev.items[index - 1];
            if (!isChecked) {
                const updatedItems = prev.items.map((item, idx) => idx === index ? { ...item, isCopied: false } : item);
                return { ...prev, items: updatedItems };
            }
            const newItems = prev.items.map((item, idx) => {
                if (idx === index) {
                    return {
                        ...item,
                        productName: prevItem.productName,
                        batchNumber: prevItem.batchNumber,
                        productionDate: prevItem.productionDate,
                        expiryDate: prevItem.expiryDate,
                        netWeight: prevItem.netWeight,
                        unit: prevItem.unit,
                        weightPerBag: prevItem.weightPerBag,
                        unitsPerPallet: prevItem.unitsPerPallet,
                        packageForm: prevItem.packageForm,
                        isBlocked: prevItem.isBlocked,
                        blockReason: prevItem.blockReason,
                        analysisResults: prevItem.analysisResults ? JSON.parse(JSON.stringify(prevItem.analysisResults)) : [],
                        isCopied: true 
                    };
                }
                return item;
            });
            return { ...prev, items: newItems, requiresLab: calculateRequiresLab(newItems, prev.destinationWarehouse) };
        });
    }, []);

    const handleRemoveItem = useCallback((itemId: string) => {
        setDelivery(prev => {
            if (!prev) return null;
            const newItems = prev.items.filter(i => i.id !== itemId).map((it, idx) => ({ ...it, position: idx + 1 }));
            setPalletCount(newItems.length);
            return { ...prev, items: newItems, requiresLab: calculateRequiresLab(newItems, prev.destinationWarehouse) };
        });
    }, []);

    const handlePalletCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = Math.min(Math.max(parseInt(e.target.value, 10) || 0, 0), 100);
        setPalletCount(count);
        setDelivery(prev => {
            if (!prev) return null;
            let newItems = [...prev.items];
            if (count > newItems.length) {
                for (let i = newItems.length; i < count; i++) {
                    newItems.push({ id: generate18DigitId(), position: i + 1, productId: '', productName: '', productionDate: '', expiryDate: '', isBlocked: false, unit: 'kg', analysisResults: [] });
                }
            } else {
                newItems = newItems.slice(0, count);
            }
            return { ...prev, items: newItems, requiresLab: calculateRequiresLab(newItems, prev.destinationWarehouse) };
        });
    };

    const handleAddPallet = () => {
        const newCount = palletCount + 1;
        if (newCount > 100) return;
        setPalletCount(newCount);
        setDelivery(prev => {
            if (!prev) return null;
            const newItem: DeliveryItem = { 
                id: generate18DigitId(), 
                position: newCount,
                productId: '', 
                productName: '', 
                productionDate: '', 
                expiryDate: '', 
                isBlocked: false, 
                unit: 'kg',
                analysisResults: []
            };
            const newItems = [...prev.items, newItem];
            return { ...prev, items: newItems, requiresLab: calculateRequiresLab(newItems, prev.destinationWarehouse) };
        });
    };

    const executeStepConfirmation = () => {
        if (!delivery) return;
        
        const saveResult = handleSaveDelivery(delivery);
        if (!saveResult.success || !saveResult.delivery) {
            showToast('Błąd podczas zapisywania dostawy.', 'error');
            return;
        }

        const savedId = saveResult.delivery.id;

        modalHandlers.openDeliverySummaryConfirmModal(saveResult.delivery, () => {
            let nextStatus: DeliveryStatus = delivery.status;
            
            if (delivery.status === 'REGISTRATION') {
                if (delivery.requiresLab) {
                    nextStatus = 'PENDING_LAB';
                } else {
                    nextStatus = 'COMPLETED';
                }
            } else if (delivery.status === 'PENDING_LAB') {
                nextStatus = 'PENDING_WAREHOUSE';
            } else if (delivery.status === 'PENDING_WAREHOUSE') {
                nextStatus = 'COMPLETED';
            }

            if (nextStatus === 'COMPLETED') {
                const result = handleUpdateDeliveryStatus(savedId, 'COMPLETED');
                if (result.success) {
                    showToast(result.message, 'success');
                    if (result.newPallets) {
                        modalHandlers.openNetworkPrintModal({ 
                            type: 'raw_material_batch', 
                            data: result.newPallets,
                            onSuccess: () => {
                                // Powrót na główną listę po udanym druku (opcjonalnie dodatkowe zabezpieczenie)
                                handleSetView(View.DeliveryList);
                            }
                        });
                        // KLUCZOWA POPRAWKA: Przejdź do listy od razu po zatwierdzeniu statusu, okno druku zostanie na wierzchu
                        handleSetView(View.DeliveryList);
                    } else {
                        handleSetView(View.DeliveryList);
                    }
                }
            } else {
                handleSaveDelivery({ ...saveResult.delivery, status: nextStatus });
                showToast(`Zlecenie przekazane do etapu: ${nextStatus}`, 'success');
                handleSetView(View.DeliveryList);
            }
        });
    };

    const handleStepConfirmation = async () => {
        if (!delivery) return;
        const newErrors: Record<string, Record<string, boolean>> = {};
        
        if (!delivery.orderRef) { if (!newErrors['header']) newErrors['header'] = {}; newErrors['header']['orderRef'] = true; }
        if (!delivery.supplier) { if (!newErrors['header']) newErrors['header'] = {}; newErrors['header']['supplier'] = true; }

        let sameDateDetected = false;

        delivery.items.forEach(item => {
            const itemErrors: Record<string, boolean> = {};
            if (!item.productName) itemErrors['productName'] = true;
            if (!item.batchNumber) itemErrors['batchNumber'] = true;
            if (!item.packageForm) itemErrors['packageForm'] = true;
            
            const isPcsPackaging = item.packageForm === 'packaging' && item.unit === 'szt.';
            if (!isPcsPackaging && (!item.netWeight || item.netWeight <= 0)) {
                itemErrors['netWeight'] = true;
            }
            if (isPcsPackaging && (!item.unitsPerPallet || item.unitsPerPallet <= 0)) {
                itemErrors['unitsPerPallet'] = true;
            }
            if (!item.productionDate || item.productionDate.length < 10) itemErrors['productionDate'] = true;
            if (item.packageForm === 'packaging' && !item.unit) itemErrors['unit'] = true;
            if (item.packageForm === 'bags' && (!item.weightPerBag || item.weightPerBag <= 0)) itemErrors['weightPerBag'] = true;
            
            if (item.productionDate && item.expiryDate && item.productionDate === item.expiryDate) {
                sameDateDetected = true;
            }
            if (Object.keys(itemErrors).length > 0) newErrors[item.id] = itemErrors;
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            showToast('Wypełnij wszystkie wymagane pola.', 'error');
            return;
        }

        if (sameDateDetected) {
            setShowDateConflictModal(true);
            return;
        }
        executeStepConfirmation();
    };

    const handleReprintLabels = () => {
        if (!delivery || (delivery.status !== 'COMPLETED' && delivery.status !== 'PENDING_WAREHOUSE')) return;
        
        // Szukaj w obu rejestrach: surowcach i opakowaniach
        const rawPallets = rawMaterialsLogList.filter(p => 
            p.locationHistory.some(h => h.deliveryOrderRef === delivery.orderRef)
        );
        
        const pkgUnits = packagingMaterialsLog.filter(p => 
            p.locationHistory.some(h => h.deliveryOrderRef === delivery.orderRef)
        );

        const allToPrint = [...rawPallets, ...pkgUnits];

        if (allToPrint.length > 0) {
            modalHandlers.openNetworkPrintModal({
                type: 'raw_material_batch', // Wspólny typ dla podglądu zbiorczego
                data: allToPrint,
                context: 'reprint'
            });
        } else {
            showToast('Nie znaleziono wygenerowanych jednostek dla tego zamówienia do ponownego druku.', 'warning');
        }
    };

    const handleSaveCorrectionLocal = () => {
        if (!delivery) return;
        
        const correctedDelivery = { 
            ...delivery, 
            status: 'PENDING_WAREHOUSE' as DeliveryStatus 
        };

        const result = handleSaveDelivery(correctedDelivery);
        if (result.success) {
            showToast('Korekta została zapisana. Dostawa jest ponownie otwarta.', 'success');
            modalHandlers.openDeliverySummaryConfirmModal(correctedDelivery, () => {
                handleSetView(View.DeliveryList);
            });
        } else {
            showToast('Błąd zapisu korekty.', 'error');
        }
    };

    const analysisOptions = useMemo(() => [
        { value: '', label: 'Wybierz...' },
        ...(analysisRanges || []).map((r: AnalysisRange) => ({ value: r.name, label: r.name }))
    ], [analysisRanges]);

    if (!delivery) return null;

    const statusInfo = getStatusInfo(delivery.status);
    const isRegistration = delivery.status === 'REGISTRATION';
    const isLab = delivery.status === 'PENDING_LAB';
    const isWarehousePending = delivery.status === 'PENDING_WAREHOUSE';
    const isCompleted = delivery.status === 'COMPLETED';
    
    const canWarehouseEdit = checkPermission(Permission.CREATE_DELIVERY) || checkPermission(Permission.MANAGE_DELIVERIES);
    const canLabEdit = checkPermission(Permission.PROCESS_DELIVERY_LAB) || currentUser?.role === 'lab' || currentUser?.role === 'admin';
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'boss';

    const canEditBasicInfo = (isRegistration && canWarehouseEdit) || (isCompleted && isAdmin) || (isWarehousePending && isAdmin);
    const canEditLabInfo = isLab && canLabEdit;

    const archCountdown = isCompleted ? getArchivizationCountdown(delivery.warehouseStageCompletedAt) : null;

    return (
        <div className="h-full flex flex-col bg-slate-100 dark:bg-secondary-900 overflow-hidden">
            <header className="flex-shrink-0 bg-white dark:bg-secondary-800 px-6 py-3 border-b dark:border-secondary-700 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <Button onClick={() => handleSetView(View.DeliveryList)} variant="secondary" className="p-2"><ArrowLeftIcon className="h-5 w-5"/></Button>
                    <div>
                        <div className="flex items-center gap-2">
                             <h2 className="text-xl font-black tracking-tighter text-gray-800 dark:text-gray-200 uppercase">{isCreating ? 'Nowa Dostawa' : `Dostawa ${delivery.orderRef}`}</h2>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                            <span className={`px-2 py-0.5 rounded-full ${statusInfo.colorClass}`}>{statusInfo.label}</span>
                            {isCompleted && isAdmin && <span className="text-orange-600 font-black">[WYMAGANA KOREKTA]</span>}
                            {archCountdown && (
                                <span className="text-blue-500 font-black flex items-center gap-1">
                                    <ClockIcon className="h-3 w-3"/> Archiwizacja za: {archCountdown}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {isRegistration && canWarehouseEdit && (
                        <Button onClick={handleStepConfirmation} className="bg-primary-600 h-10 px-6 font-bold uppercase text-xs tracking-widest shadow-lg">
                            {delivery.requiresLab ? 'Zapisz i Przekaż do Lab' : 'Zakończ i Drukuj Etykiety'}
                        </Button>
                    )}
                    {isLab && canLabEdit && <Button onClick={handleStepConfirmation} className="bg-yellow-600 h-10 px-6 font-bold uppercase text-xs tracking-widest shadow-lg">Zatwierdź i Prześlij do Magazynu</Button>}
                    {isWarehousePending && canWarehouseEdit && <Button onClick={handleStepConfirmation} className="bg-green-600 h-10 px-6 font-bold uppercase text-xs tracking-widest shadow-lg">Zakończ Przyjęcie</Button>}
                    
                    {isCompleted && (
                        <Button onClick={handleReprintLabels} variant="secondary" className="h-10 px-6 font-bold uppercase text-xs tracking-widest border-2 border-primary-500 text-primary-700" leftIcon={<PrintLabelIcon className="h-4 w-4"/>}>
                            Drukuj Ponownie Etykiety
                        </Button>
                    )}

                    {isCompleted && isAdmin && <Button onClick={handleSaveCorrectionLocal} className="bg-orange-600 h-10 px-6 font-bold uppercase text-xs tracking-widest shadow-lg">Zapisz Korektę i Otwórz</Button>}
                </div>
            </header>

            <div className="flex-grow overflow-y-auto p-6 scrollbar-hide space-y-6">
                <div ref={headerRef} className="bg-white dark:bg-secondary-800 p-6 rounded-xl shadow-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border-l-4 border-primary-500">
                    <Input label="Nr Zamówienia / WZ" value={delivery.orderRef} onChange={e => handleHeaderChange('orderRef', e.target.value)} disabled={!canEditBasicInfo} error={errors['header']?.orderRef ? 'Wymagane' : ''} />
                    <SearchableSelect label="Dostawca" options={supplierOptions} value={delivery.supplier} onChange={val => handleHeaderChange('supplier', val)} disabled={!canEditBasicInfo} error={errors['header']?.supplier ? 'Wymagane' : ''} />
                    <Input label="Ilość Palet" type="number" value={String(palletCount)} onChange={handlePalletCountChange} disabled={!canEditBasicInfo} />
                    <Input label="Data Dostawy" type="date" value={delivery.deliveryDate} onChange={e => handleHeaderChange('deliveryDate', e.target.value)} disabled={!canEditBasicInfo} />
                </div>

                <div className="space-y-4">
                    {delivery.items.map((item, index) => {
                        const isPcsPackaging = item.packageForm === 'packaging' && item.unit === 'szt.';
                        return (
                            <div key={item.id} className={`p-5 border-2 rounded-2xl shadow-sm relative transition-all duration-300 ${getBatchColorClass(item.batchNumber)}`}>
                                {item.isCopied && (
                                    <div className="absolute top-[-10px] left-10 z-10">
                                        <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full border border-white shadow-md uppercase tracking-widest">SKOPIOWANO</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center mb-4 border-b border-black/5 pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center font-black text-white shadow-lg text-sm">{item.position}</div>
                                        <span className="font-black text-gray-800 dark:text-gray-200 uppercase tracking-tighter">Pozycja Dostawy <span className="text-[10px] font-mono opacity-40 ml-2">ID: {item.id}</span></span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {index > 0 && canEditBasicInfo && (
                                            <label className="flex items-center cursor-pointer gap-2 bg-white/60 px-3 py-1 rounded-full border border-black/5 hover:bg-white transition-all shadow-sm">
                                                <input type="checkbox" checked={!!item.isCopied} onChange={(e) => handleCopyFromPrevious(index, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-primary-500" />
                                                <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Kopiuj z poprz.</span>
                                            </label>
                                        )}
                                        {canEditBasicInfo && <button onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"><TrashIcon className="h-5 w-5" /></button>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SearchableSelect label="Szukaj Produktu" options={productOptions} value={item.productName} onChange={val => handleItemChange(item.id, 'productName', val)} disabled={!canEditBasicInfo} error={errors[item.id]?.productName ? '!' : ''} />
                                    <Input label="Numer Partii Dostawcy" value={item.batchNumber} onChange={e => handleItemChange(item.id, 'batchNumber', e.target.value)} disabled={!canEditBasicInfo} error={errors[item.id]?.batchNumber ? '!' : ''} uppercase />
                                    <div className="space-y-3">
                                        <Select label="Forma Opakowania" options={[{ value: '', label: 'Wybierz...' }, { value: 'big_bag', label: 'Big Bag' }, { value: 'bags', label: 'Worki' }, { value: 'packaging', label: 'Opakowania' }]} value={item.packageForm} onChange={e => handleItemChange(item.id, 'packageForm', e.target.value)} disabled={!canEditBasicInfo} error={errors[item.id]?.packageForm ? '!' : ''} />
                                        {(item.packageForm === 'big_bag' || item.packageForm === 'bags') && (
                                            <p className="mt-1 text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase flex items-center gap-1 animate-fadeIn">
                                                <LockClosedIcon className="h-3 w-3" /> auto blokada dostawy - wymagana weryfikacja laboratoryjna
                                            </p>
                                        )}
                                        {item.packageForm === 'packaging' && (
                                            <div className="animate-fadeIn">
                                                 <Select label="Wybierz Jednostkę" options={[{ value: 'kg', label: 'Kilogramy (kg)' }, { value: 'szt.', label: 'Sztuki (szt.)' }]} value={item.unit || 'kg'} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} disabled={!canEditBasicInfo} error={errors[item.id]?.unit ? '!' : ''} />
                                            </div>
                                        )}
                                    </div>
                                    {!isPcsPackaging ? (
                                        <Input label="Waga netto (kg)" type="number" value={String(item.netWeight || '')} onChange={e => handleItemChange(item.id, 'netWeight', parseFloat(e.target.value))} disabled={!canEditBasicInfo} error={errors[item.id]?.netWeight ? '!' : ''} />
                                    ) : (
                                        <Input label="Ilość (szt.)" type="number" value={String(item.unitsPerPallet || '')} onChange={e => handleItemChange(item.id, 'unitsPerPallet', parseInt(e.target.value, 10))} disabled={!canEditBasicInfo} error={errors[item.id]?.unitsPerPallet ? '!' : ''} />
                                    )}
                                    {item.packageForm === 'bags' && (
                                        <div className="grid grid-cols-2 gap-2 animate-fadeIn">
                                            <Input label="Waga worka (kg)" type="number" value={String(item.weightPerBag || '')} onChange={e => handleItemChange(item.id, 'weightPerBag', parseFloat(e.target.value))} disabled={!canEditBasicInfo} error={errors[item.id]?.weightPerBag ? '!' : ''} />
                                            <Input label="Liczba worków" value={String(item.unitsPerPallet || '')} disabled readOnly className="bg-gray-100 font-bold text-center" />
                                        </div>
                                    )}
                                    <DatePartsSelector label="Data Produkcji" value={item.productionDate} onChange={(val) => handleItemChange(item.id, 'productionDate', val)} disabled={!canEditBasicInfo} error={errors[item.id]?.productionDate ? '!' : ''} />
                                    <DatePartsSelector label="Data Ważności" value={item.expiryDate} onChange={(val) => handleItemChange(item.id, 'expiryDate', val)} disabled={!canEditBasicInfo} error={errors[item.id]?.expiryDate ? '!' : ''} />
                                </div>
                                {(isLab || isWarehousePending || isCompleted) && (
                                    <div className="mt-6 p-5 bg-yellow-50 dark:bg-yellow-900/10 border-t-2 border-yellow-400 dark:border-yellow-700 rounded-b-2xl">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                            <h4 className="text-sm font-black text-yellow-800 dark:text-yellow-400 flex items-center gap-2 uppercase tracking-widest">
                                                <BeakerIcon className="h-5 w-5" /> Etap 2: Weryfikacja Jakościowa
                                            </h4>
                                            <div className="flex items-center gap-2 bg-white/80 dark:bg-black/20 p-2 rounded-xl border border-yellow-300 dark:border-yellow-800 shadow-sm">
                                                <span className="text-[10px] font-black uppercase text-gray-500 mr-2 ml-1">Decyzja Lab:</span>
                                                <button onClick={() => handleItemChange(item.id, 'isBlocked', true)} disabled={!canEditLabInfo} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1.5 ${item.isBlocked ? 'bg-red-600 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-red-500'}`}><LockClosedIcon className="h-3.5 w-3.5" />Zablokowana</button>
                                                <button onClick={() => handleItemChange(item.id, 'isBlocked', false)} disabled={!canEditLabInfo} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1.5 ${!item.isBlocked ? 'bg-green-600 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-green-500'}`}><ShieldCheckIcon className="h-3.5 w-3.5" />Zwolniona</button>
                                            </div>
                                        </div>
                                        <div className="space-y-4 mb-4 bg-white/60 dark:bg-black/10 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800/30">
                                            <h5 className="text-[10px] font-black text-yellow-700 dark:text-yellow-500 uppercase tracking-widest mb-2">Pomiary i Analizy Parametryczne</h5>
                                            {(item.analysisResults || []).length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {(item.analysisResults || []).map((res, resIdx) => {
                                                        const verification = getResultVerification(res.name, res.value);
                                                        const isNok = verification.status === 'nok';
                                                        return (
                                                            <div key={resIdx} className={`p-3 rounded-xl border-2 transition-all ${isNok ? 'bg-red-50 border-red-500 shadow-sm' : 'bg-slate-50 dark:bg-secondary-900 border-transparent'}`}>
                                                                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-end">
                                                                   <Select label={resIdx === 0 ? "Parametr" : ""} options={analysisOptions} value={res.name} onChange={e => handleResultChange(item.id, resIdx, 'name', e.target.value)} disabled={!canEditLabInfo} className="text-xs" />
                                                                   <Input label={resIdx === 0 ? "Wynik" : ""} value={res.value} onChange={e => handleResultChange(item.id, resIdx, 'value', e.target.value)} disabled={!canEditLabInfo} className={`text-center font-bold ${isNok ? 'text-red-700' : 'text-gray-900'}`} />
                                                                   <Input label={resIdx === 0 ? "Jedn." : ""} value={res.unit} disabled className="text-center bg-transparent border-none font-bold" />
                                                                   <button onClick={() => handleRemoveResultRow(item.id, resIdx)} disabled={!canEditLabInfo} className="p-2 text-red-500 hover:bg-red-50 rounded-full mb-0.5"><TrashIcon className="h-4 w-4"/></button>
                                                                </div>
                                                                {isNok && <p className="mt-2 text-[10px] font-black text-red-700 uppercase tracking-tighter">Błąd: {verification.message}</p>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic text-center py-4">Brak wprowadzonych badań laboratoryjnych.</p>
                                            )}
                                            {canLabEdit && <Button onClick={() => handleAddResultRow(item.id)} variant="secondary" className="text-[10px] py-2 px-4 mt-2 bg-white shadow-sm border-yellow-200" leftIcon={<PlusIcon className="h-3 w-3"/>}>Dodaj Parametr Analizy</Button>}
                                        </div>
                                        <div className="space-y-4">
                                            <Textarea label="Uwagi i Komentarze Laboratoryjne" value={item.labNotes || ''} onChange={e => handleItemChange(item.id, 'labNotes', e.target.value)} disabled={!canEditLabInfo} placeholder="Wprowadź szczegółowe uwagi jakościowe..." className="text-sm" />
                                            <div className="flex justify-end">
                                                 <Button onClick={() => modalHandlers.openManageLabDocumentsModal(item)} variant="secondary" className="text-xs font-black uppercase tracking-widest bg-white border-yellow-300" disabled={!canEditLabInfo} leftIcon={<DocumentTextIcon className="h-4 w-4"/>}>Załącz Dokumenty Analiz</Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    {canEditBasicInfo && (
                        <Button onClick={handleAddPallet} variant="secondary" className="w-full h-16 text-md font-black uppercase tracking-widest border-2 border-dashed border-primary-300 bg-primary-50/30 hover:bg-primary-50 transition-all text-primary-700" leftIcon={<PlusIcon className="h-6 w-6"/>}>
                            Dodaj Kolejną Paletę do Dostawy
                        </Button>
                    )}
                </div>

                {/* --- SEKCJA HISTORII ZDARZEŃ --- */}
                {delivery.eventLog && delivery.eventLog.length > 0 && (
                    <section className="bg-white dark:bg-secondary-800 p-6 rounded-xl shadow-md border-l-4 border-gray-400 mt-6">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ClockIcon className="h-4 w-4" /> Historia i Logi Zdarzeń Dostawy
                        </h3>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-hide">
                            {[...delivery.eventLog].reverse().map((event, idx) => (
                                <div key={idx} className="flex gap-3 text-xs bg-slate-50 dark:bg-secondary-900 p-2 rounded border border-black/5 shadow-sm transition-all hover:bg-slate-100">
                                    <div className="flex-shrink-0 font-mono text-gray-400 font-bold w-32 border-r pr-2 flex items-center">
                                        {formatDate(event.timestamp, true)}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-black text-primary-600 uppercase tracking-tighter">{event.action}</p>
                                        <p className="text-gray-700 dark:text-gray-300">{event.details}</p>
                                        <p className="text-[10px] text-gray-400 font-bold mt-1">Użytkownik: {event.user}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
            {showDateConflictModal && (
                <ConfirmationModal 
                    isOpen={true}
                    onClose={() => setShowDateConflictModal(false)}
                    onConfirm={() => { setShowDateConflictModal(false); executeStepConfirmation(); }}
                    title="Wykryto Błąd Dat"
                    message="Dla jednej lub więcej pozycji Data Produkcji jest identyczna z Datą Ważności. Czy na pewno chcesz kontynuować? Zazwyczaj data ważności powinna być późniejsza o min. 1 dzień."
                    confirmButtonText="Tak, dane są poprawne"
                    cancelButtonText="Nie, wracam do edycji"
                />
            )}
        </div>
    );
};

export default GoodsDeliveryReceptionPage;
