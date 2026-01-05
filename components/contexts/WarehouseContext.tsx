import React, { createContext, useContext, useMemo, PropsWithChildren, useState, useCallback, useEffect } from 'react';
import { RawMaterialLogEntry, Delivery, ExpiringPalletInfo, WarehouseNavLayoutItem, FinishedGoodItem, User, InventorySession, PackagingMaterialLogEntry, AnalysisResult, Document, Supplier, Customer, PalletBalance, PalletTransaction, LocationDefinition, WarehouseInfo, PalletType, View, Permission, DeliveryStatus, AnalysisRange, AnalysisRangeHistoryEntry, DeliveryCorrection, DeliveryEvent, DeliveryItem } from '../../types';
import { useAuth } from './AuthContext';
import { INITIAL_RAW_MATERIALS, INITIAL_DELIVERIES, INITIAL_PACKAGING_MATERIALS, INITIAL_PRODUCTS, INITIAL_FINISHED_GOODS } from '../../src/initialData';
import { DEFAULT_WAREHOUSE_NAV_LAYOUT, BUFFER_MS01_ID, BUFFER_MP01_ID, SOURCE_WAREHOUSE_ID_MS01, SUB_WAREHOUSE_ID, OSIP_WAREHOUSE_ID, MDM01_WAREHOUSE_ID, KO01_WAREHOUSE_ID, PSD_WAREHOUSE_ID, MGW01_WAREHOUSE_ID, MGW02_WAREHOUSE_ID, MGW01_RECEIVING_AREA_ID, DEFAULT_SETTINGS, SUPPLIERS_LIST, VIRTUAL_LOCATION_ARCHIVED, MOP01_WAREHOUSE_ID, DEFAULT_ANALYSIS_RANGES, API_BASE_URL } from '../../constants';
import { getBlockInfo, getExpiryStatus, generate18DigitId } from '../../src/utils';
import { logger } from '../../utils/logger';

const INITIAL_LOCATIONS: LocationDefinition[] = [
    { id: SOURCE_WAREHOUSE_ID_MS01, name: 'Magazyn Główny', type: 'warehouse', capacity: 500 },
    { id: OSIP_WAREHOUSE_ID, name: 'Magazyn Zewnętrzny OSiP', type: 'warehouse', capacity: 1000 },
    { id: BUFFER_MS01_ID, name: 'Bufor Przyjęć Surowców', type: 'zone', capacity: 50 },
    { id: BUFFER_MP01_ID, name: 'Bufor Produkcyjny', type: 'zone', capacity: 50 },
    { id: SUB_WAREHOUSE_ID, name: 'Magazyn Produkcyjny', type: 'warehouse', capacity: 200 },
    { id: MDM01_WAREHOUSE_ID, name: 'Magazyn Dodatków', type: 'warehouse', capacity: 100 },
    { id: MOP01_WAREHOUSE_ID, name: 'Magazyn Opakowań', type: 'warehouse', capacity: 150 },
    { id: KO01_WAREHOUSE_ID, name: 'Strefa Konfekcji', type: 'zone', capacity: 30 },
    { id: PSD_WAREHOUSE_ID, name: 'Strefa PSD', type: 'zone', capacity: 40 },
    { id: MGW01_WAREHOUSE_ID, name: 'Wyroby Gotowe MGW01', type: 'warehouse', capacity: 400 },
    { id: MGW02_WAREHOUSE_ID, name: 'Wyroby Gotowe MGW02', type: 'warehouse', capacity: 400 },
    { id: MGW01_RECEIVING_AREA_ID, name: 'Przyjęcia Wyrobów Gotowych', type: 'zone', capacity: 20 },
    { id: 'R01', name: 'Regał R01', type: 'rack', capacity: 80 },
    { id: 'R02', name: 'Regał R02', type: 'rack', capacity: 80 },
    { id: 'R03', name: 'Regał R03', type: 'rack', capacity: 80 },
    { id: 'R04', name: 'Regał R04', type: 'rack', capacity: 80 },
    { id: 'R07', name: 'Regał R07', type: 'rack', capacity: 80 },
];

export interface WarehouseContextValue {
    rawMaterialsLogList: RawMaterialLogEntry[];
    setRawMaterialsLogList: React.Dispatch<React.SetStateAction<RawMaterialLogEntry[]>>;
    finishedGoodsList: FinishedGoodItem[];
    setFinishedGoodsList: React.Dispatch<React.SetStateAction<FinishedGoodItem[]>>;
    packagingMaterialsLog: PackagingMaterialLogEntry[];
    setPackagingMaterialsLog: React.Dispatch<React.SetStateAction<PackagingMaterialLogEntry[]>>;
    deliveries: Delivery[];
    setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
    expiringPalletsDetails: ExpiringPalletInfo[];
    expiryWarningDays: number;
    setExpiryWarningDays: React.Dispatch<React.SetStateAction<number>>;
    expiryCriticalDays: number;
    setExpiryCriticalDays: React.Dispatch<React.SetStateAction<number>>;
    warehouseNavLayout: WarehouseNavLayoutItem[];
    setWarehouseNavLayout: React.Dispatch<React.SetStateAction<WarehouseNavLayoutItem[]>>;
    findPalletByUniversalId: (id: string) => { item: any; type: 'raw' | 'fg' | 'pkg' } | null;
    allProducts: any[];
    inventorySessions: InventorySession[];
    analysisRanges: AnalysisRange[];
    setAnalysisRanges: React.Dispatch<React.SetStateAction<AnalysisRange[]>>;
    analysisRangesHistory: AnalysisRangeHistoryEntry[];
    logAnalysisRangeChange: (data: Omit<AnalysisRangeHistoryEntry, 'id' | 'timestamp' | 'user'>) => void;
    refreshRawMaterials: () => Promise<void>;
    refreshProducts: () => Promise<void>;
    handleAddProduct: (product: { name: string; type: string }) => Promise<{ success: boolean; message: string }>;
    handleDeleteProduct: (name: string) => Promise<{ success: boolean; message: string }>;
    handleUpdateDeliveryStatus: (deliveryId: string, newStatus: DeliveryStatus) => { success: boolean, message: string, newPallets?: any[], delivery?: Delivery };
    handleSaveLabNotes: (itemId: string, isRaw: boolean, notes: string) => { success: boolean; message: string; type: 'success' | 'error' };
    handleAddDocument: (itemId: string, itemType: 'raw' | 'fg', file: File) => { success: boolean; message: string; type: 'success' | 'error' };
    handleDeleteDocument: (itemId: string, itemType: 'raw' | 'fg', documentName: string) => { success: boolean; message: string; type: 'success' | 'error' };
    handleSaveAnalysisResults: (itemId: string, itemType: 'raw' | 'fg', results: AnalysisResult[]) => { success: boolean; message: string; type: 'success' | 'error' };
    allManageableLocations: LocationDefinition[];
    combinedWarehouseInfos: WarehouseInfo[];
    handleArchiveItem: (id: string, type: string) => { success: boolean; message: string };
    handleRestoreItem: (id: string, type: string) => { success: boolean; message: string };
    validatePalletMove: (item: any, locationId: string) => { isValid: boolean; message: string; rulesChecked: any[] };
    handleUniversalMove: (id: string, type: string, locationId: string, notes?: string) => { success: boolean; message: string };
    handleBlockPallet: (itemId: string, itemType: string, reason: string, user: User) => { success: boolean; message: string; };
    handleUnblockPallet: (itemId: string, itemType: string, currentUser: User, notes?: string, newDate?: string) => { success: boolean; message: string; };
    handleStartInventorySession: (name: string, locationIds: string[]) => { success: boolean; message: string; };
    handleCancelInventorySession: (sessionId: string) => { success: boolean; message: string; };
    suppliers: Supplier[];
    customers: Customer[];
    palletBalances: PalletBalance[];
    palletTransactions: PalletTransaction[];
    handleAddSupplier: (name: string) => { success: boolean, message: string };
    handleDeleteSupplier: (value: string) => { success: boolean, message: string };
    handleUpdateSupplier: (value: string, data: Supplier) => { success: boolean, message: string };
    handleLookupNip: (nip: string) => Promise<{ success: boolean, message: string, data?: Partial<Supplier> }>;
    handleAddCustomer: (name: string) => { success: boolean, message: string };
    handleDeleteCustomer: (value: string) => { success: boolean, message: string };
    handleUpdateCustomer: (value: string, data: Customer) => { success: boolean, message: string };
    handleAddPalletTransaction: (data: any) => { success: boolean, message: string };
    handleAddLocation: (loc: LocationDefinition) => { success: boolean; message: string };
    handleUpdateLocation: (id: string, loc: LocationDefinition) => { success: boolean; message: string };
    handleDeleteLocation: (id: string) => { success: boolean; message: string };
    handleDeleteDelivery: (deliveryId: string) => { success: boolean; message: string };
    handleSaveDelivery: (delivery: Delivery) => { success: boolean; message: string; delivery?: Delivery };
    handleRecordInventoryScan: (sessionId: string, locationId: string, palletId: string, qty: number, force: boolean) => { success: boolean; message: string; warning?: string };
    handleUpdateInventoryLocationStatus: (sessionId: string, locationId: string, status: 'pending' | 'scanned') => void;
    handleResolveMissingPallet: (sessionId: string, palletId: string, lastKnownLocation: string) => { success: boolean, message: string };
    handleResolveUnexpectedPallet: (sessionId: string, palletId: string, newLocation: string) => { success: boolean, message: string };
    handleFinalizeInventorySession: (sessionId: string) => { success: boolean; message: string };
    handleCompleteScanningSession: (sessionId: string) => { success: boolean; message: string };
}

export const WarehouseContext = createContext<WarehouseContextValue | undefined>(undefined);

export const useWarehouseContext = (): WarehouseContextValue => {
    const context = useContext(WarehouseContext);
    if (!context) throw new Error('useWarehouseContext must be used within a WarehouseProvider');
    return context;
};

export const WarehouseProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const { currentUser } = useAuth();
    
    const [rawMaterialsLogList, setRawMaterialsLogList] = useState<RawMaterialLogEntry[]>(INITIAL_RAW_MATERIALS);
    const [finishedGoodsList, setFinishedGoodsList] = useState<FinishedGoodItem[]>(INITIAL_FINISHED_GOODS);
    const [deliveries, setDeliveries] = useState<Delivery[]>(INITIAL_DELIVERIES);
    const [packagingMaterialsLog, setPackagingMaterialsLog] = useState<PackagingMaterialLogEntry[]>(INITIAL_PACKAGING_MATERIALS);
    const [inventorySessions, setInventorySessions] = useState<InventorySession[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [warehouseNavLayout, setWarehouseNavLayout] = useState<WarehouseNavLayoutItem[]>(DEFAULT_WAREHOUSE_NAV_LAYOUT);
    
    const [expiryWarningDays, setExpiryWarningDays] = useState<number>(DEFAULT_SETTINGS.EXPIRY_WARNING_DAYS);
    const [expiryCriticalDays, setExpiryCriticalDays] = useState<number>(DEFAULT_SETTINGS.EXPIRY_CRITICAL_DAYS);

    const [suppliers, setSuppliers] = useState<Supplier[]>(SUPPLIERS_LIST);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [palletBalances, setPalletBalances] = useState<PalletBalance[]>([]);
    const [palletTransactions, setPalletTransactions] = useState<PalletTransaction[]>([]);
    
    const [managedLocations, setManagedLocations] = useState<LocationDefinition[]>(INITIAL_LOCATIONS);

    const [analysisRanges, setAnalysisRanges] = useState<AnalysisRange[]>(DEFAULT_ANALYSIS_RANGES);
    const [analysisRangesHistory, setAnalysisRangesHistory] = useState<AnalysisRangeHistoryEntry[]>([]);

    // Pobieranie produktów z API
    const refreshProducts = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/products`);
            if (response.ok) {
                const data = await response.json();
                setAllProducts(data);
            }
        } catch (error) {
            console.error('Błąd pobierania produktów:', error);
        }
    }, []);

    // Pobieranie surowców z API
    const refreshRawMaterials = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/raw-materials`);
            if (response.ok) {
                const data = await response.json();
                // Transformuj dane z bazy na format aplikacji
                const transformed: RawMaterialLogEntry[] = data.map((row: any) => ({
                    id: row.id,
                    palletData: {
                        // Prefer the pallet code printed on the label (`nrPalety` / `pallet_id`) if present,
                        // otherwise fall back to the DB `id` (18-digit code).
                        nrPalety: row.nrPalety || row.id,
                        nazwa: row.nazwa,
                        dataProdukcji: row.dataProdukcji,
                        dataPrzydatnosci: row.dataPrzydatnosci,
                        initialWeight: parseFloat(row.initialWeight),
                        currentWeight: parseFloat(row.currentWeight),
                        isBlocked: row.isBlocked === 1,
                        blockReason: row.blockReason,
                        batchNumber: row.batchNumber,
                        packageForm: row.packageForm,
                        unit: row.unit,
                        labAnalysisNotes: row.labAnalysisNotes,
                    },
                    currentLocation: row.currentLocation,
                    locationHistory: [],
                    dateAdded: row.createdAt,
                    lastValidatedAt: row.updatedAt,
                }));
                setRawMaterialsLogList(transformed);
            }
        } catch (err) {
            console.error('Błąd pobierania surowców z API:', err);
            logger.logError(err as Error, 'WarehouseContext:refreshRawMaterials');
        }
    }, []);

    // Pobierz dane na starcie i co 5 sekund
    useEffect(() => {
        refreshRawMaterials(); // Pobierz na starcie
        refreshProducts(); // Pobierz produkty
        const interval = setInterval(() => {
            refreshRawMaterials();
            refreshProducts();
        }, 5000); // Odśwież co 5 sekund
        return () => clearInterval(interval);
    }, [refreshRawMaterials, refreshProducts]);

    // --- INTEGRACJA Z API (Pobieranie danych przy starcie) ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const deliveryRes = await fetch(`${API_BASE_URL}/deliveries`);
                if (deliveryRes.ok) {
                    const data = await deliveryRes.json();
                    console.log('📦 Pobrano dostawy z API:', data.length, 'rekordów');
                    if (data.length > 0) {
                        console.log('📦 Surowe dane pierwszej dostawy:', data[0]);
                        console.log('📦 Items pierwszej dostawy:', data[0].items);
                    }
                    
                    // Helper do konwersji dat z ISO/MySQL na yyyy-MM-dd
                    const formatDateToInput = (dateStr: string | null) => {
                        if (!dateStr) return '';
                        // Jeśli format YYYY-MM-DD - zostaw
                        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
                        // Jeśli ISO lub MySQL datetime - wyciągnij datę
                        return dateStr.split('T')[0];
                    };
                    
                    // Transformuj dane z bazy na format aplikacji
                    const transformed = data.map((row: any) => ({
                        id: row.id,
                        orderRef: row.order_ref,
                        supplier: row.supplier_name || row.supplier || 'Nieznany Dostawca',
                        deliveryDate: formatDateToInput(row.delivery_date),
                        status: row.status,
                        items: (row.items || []).map((item: any) => ({
                            id: item.id,
                            position: item.position || 0,
                            productId: item.product_id || '',
                            productName: item.product_name,
                            batchNumber: item.batch_number || item.supplier_batch || '',
                            productionDate: formatDateToInput(item.production_date),
                            expiryDate: formatDateToInput(item.expiry_date),
                            netWeight: parseFloat(item.net_weight || 0),
                            unit: item.unit || 'kg',
                            weightPerBag: item.weight_per_bag ? parseFloat(item.weight_per_bag) : undefined,
                            unitsPerPallet: item.units_per_pallet || undefined,
                            packageForm: item.packaging_type || 'bags',
                            isBlocked: item.is_blocked === 1 || item.is_blocked === true,
                            blockReason: item.block_reason,
                            labNotes: item.lab_notes,
                            analysisResults: [],
                            documents: [],
                            isCopied: false
                        })),
                        createdBy: row.created_by,
                        createdAt: row.created_at,
                        requiresLab: row.requires_lab === 1 || row.requires_lab === true,
                        destinationWarehouse: row.target_warehouse,
                        warehouseStageCompletedAt: row.completed_at || row.updated_at,
                        correctionLog: [],
                        eventLog: []
                    }));
                    
                    if (transformed.length > 0) {
                        console.log('✅ Pierwsza dostawa po transformacji:', transformed[0]);
                        console.log('✅ Items po transformacji:', transformed[0].items);
                    }
                    setDeliveries(transformed);
                }
            } catch (err) {
                console.error('Błąd połączenia z API QNAP:', err);
                logger.logError('Błąd połączenia z bazą SQL na QNAP. Używam danych lokalnych.', 'API Connection');
            }
        };
        fetchData();
    }, [setDeliveries]);

    const findPalletByUniversalId = useCallback((id: string) => {
        const raw = (rawMaterialsLogList || []).find(p => p.id === id || p.palletData.nrPalety === id);
        if (raw) return { item: raw, type: 'raw' as const };
        const fg = (finishedGoodsList || []).find(p => p.id === id || p.finishedGoodPalletId === id);
        if (fg) return { item: fg, type: 'fg' as const };
        const pkg = (packagingMaterialsLog || []).find(p => p.id === id);
        if (pkg) return { item: pkg, type: 'pkg' as const };
        return null;
    }, [rawMaterialsLogList, finishedGoodsList, packagingMaterialsLog]);

    const logAnalysisRangeChange = useCallback((data: Omit<AnalysisRangeHistoryEntry, 'id' | 'timestamp' | 'user'>) => {
        const newEntry: AnalysisRangeHistoryEntry = {
            id: `range-hist-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: currentUser?.username || 'system',
            ...data
        };
        setAnalysisRangesHistory(prev => [newEntry, ...prev].slice(0, 100));
    }, [currentUser, setAnalysisRangesHistory]);

    const expiringPalletsDetails = useMemo((): ExpiringPalletInfo[] => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const allPallets = [
            ...(rawMaterialsLogList || []).map(p => ({ pallet: p, isRaw: true })),
            ...(finishedGoodsList || []).map(p => ({ pallet: p, isRaw: false })),
        ];
        return allPallets.map(({ pallet, isRaw }) => {
            const palletData = isRaw ? (pallet as RawMaterialLogEntry).palletData : { dataPrzydatnosci: (pallet as FinishedGoodItem).expiryDate };
            const status = getExpiryStatus(palletData, expiryWarningDays, expiryCriticalDays);
            if (status === 'default') return null;
            const expiryDateStr = isRaw ? (pallet as RawMaterialLogEntry).palletData.dataPrzydatnosci : (pallet as FinishedGoodItem).expiryDate;
            const expiryDate = new Date(expiryDateStr);
            const daysLeft = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
            return { pallet, daysLeft, status, isRaw } as ExpiringPalletInfo;
        }).filter((p): p is ExpiringPalletInfo => p !== null).sort((a, b) => a.daysLeft - b.daysLeft);
    }, [rawMaterialsLogList, finishedGoodsList, expiryWarningDays, expiryCriticalDays]);

    const validatePalletMove = useCallback((item: any, locationId: string) => {
        const { isBlocked, reason } = getBlockInfo(item);
        if (isBlocked) return { isValid: false, message: `Paleta zablokowana: ${reason}`, rulesChecked: [] };
        if (item.currentLocation === locationId) return { isValid: false, message: "Paleta już jest w tej lokalizacji.", rulesChecked: [] };
        return { isValid: true, message: "OK", rulesChecked: [] };
    }, []);

    const handleUniversalMove = useCallback((id: string, type: string, locationId: string, notes?: string) => {
        const timestamp = new Date().toISOString();
        const moveEntry = { movedBy: currentUser?.username || 'system', movedAt: timestamp, targetLocation: locationId, action: 'move', notes };
        if (type === 'raw') {
            setRawMaterialsLogList(prev => prev.map(p => p.id === id ? { ...p, currentLocation: locationId, locationHistory: [...p.locationHistory, { ...moveEntry, previousLocation: p.currentLocation }] } : p));
        } else if (type === 'fg') {
            setFinishedGoodsList(prev => prev.map(p => p.id === id ? { ...p, currentLocation: locationId, locationHistory: [...(p.locationHistory || []), { ...moveEntry, previousLocation: p.currentLocation }] } : p));
        } else {
            setPackagingMaterialsLog(prev => prev.map(p => p.id === id ? { ...p, currentLocation: locationId, locationHistory: [...p.locationHistory, { ...moveEntry, previousLocation: p.currentLocation }] } : p));
        }
        return { success: true, message: "Przeniesiono pomyślnie." };
    }, [currentUser, setRawMaterialsLogList, setFinishedGoodsList, setPackagingMaterialsLog]);

    const handleSaveDelivery = useCallback(async (delivery: Delivery) => {
        let finalDelivery: Delivery = { ...delivery };
        try {
            const isNew = !delivery.id;
            const method = isNew ? 'POST' : 'PUT';
            const url = isNew ? `${API_BASE_URL}/deliveries` : `${API_BASE_URL}/deliveries/${delivery.id}`;
            
            // Przygotuj dane w formacie oczekiwanym przez nowy backend
            const backendData = {
                orderRef: delivery.orderRef,
                supplierId: delivery.supplier && !isNaN(parseInt(delivery.supplier)) ? parseInt(delivery.supplier) : null,
                supplierName: delivery.supplier || '',
                deliveryDate: delivery.deliveryDate,
                targetWarehouse: delivery.destinationWarehouse || 'BF_MS01',
                status: delivery.status || 'REGISTRATION',
                items: delivery.items.map((item, index) => ({
                    id: item.id,
                    position: index + 1,
                    product_name: item.productName,
                    product_code: item.productCode || '',
                    batch_number: item.batchNumber || '',
                    packaging_type: item.packageForm || 'bags',
                    net_weight: item.netWeight || 0,
                    unit: item.unit || 'kg',
                    weight_per_bag: item.weightPerBag || null,
                    units_per_pallet: item.unitsPerPallet || null,
                    production_date: item.productionDate || null,
                    expiry_date: item.expiryDate || null,
                    is_blocked: item.isBlocked ? 1 : 0,
                    block_reason: item.blockReason || null,
                    lab_notes: item.labNotes || null
                })),
                createdBy: currentUser?.username || 'system',
                notes: delivery.notes || ''
            };
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(backendData)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (isNew) {
                    finalDelivery.id = result.deliveryId || `DEL-${Date.now()}`;
                    finalDelivery.status = result.status || 'REGISTRATION';
                }
                logger.log('info', `Zsynchronizowano dostawę ${finalDelivery.orderRef} z bazą SQL`, 'API Sync', currentUser?.username);
            } else {
                const error = await response.json();
                console.error('❌ Błąd zapisu dostawy:', error);
                return { success: false, message: error.error || 'Błąd zapisu dostawy' };
            }
        } catch (err) {
            console.warn('API Offline - zapisuję lokalnie:', err);
        }
        setDeliveries(prev => {
            const existingIndex = prev.findIndex(d => d.id === delivery.id);
            if (existingIndex !== -1) {
                const newDeliveries = [...prev];
                newDeliveries[existingIndex] = finalDelivery;
                return newDeliveries;
            } else {
                if (!finalDelivery.id) finalDelivery.id = `DEL-${Date.now()}`;
                finalDelivery.createdAt = new Date().toISOString();
                return [...prev, finalDelivery];
            }
        });
        return { success: true, message: 'Dostawa zapisana.', delivery: finalDelivery };
    }, [currentUser, setDeliveries]);

    const handleUpdateDeliveryStatus = useCallback(async (deliveryId: string, newStatus: DeliveryStatus) => {
        let success = false;
        let newPallets: any[] = [];
        
        // Jeśli status to COMPLETED, wywołaj endpoint finalizacji na backendzie
        if (newStatus === 'COMPLETED') {
            try {
                const response = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}/finalize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        completedBy: currentUser?.username || 'system' 
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Dostawa sfinalizowana, utworzono palety:', result.pallets);
                    
                    // Odśwież dane dostaw z API
                    const deliveryRes = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}`);
                    if (deliveryRes.ok) {
                        const updatedDelivery = await deliveryRes.json();
                        setDeliveries(prev => prev.map(d => d.id === deliveryId ? updatedDelivery : d));
                    }
                    
                    // Odśwież dane surowców z API aby pobrać nowo utworzone palety
                    const rawRes = await fetch(`${API_BASE_URL}/raw-materials`);
                    if (rawRes.ok) {
                        const rawData = await rawRes.json();
                        // TODO: Transformacja danych z bazy do formatu aplikacji
                        setRawMaterialsLogList(rawData.map((row: any) => ({
                            id: row.id,
                            palletData: {
                                // Prefer the pallet code printed on the label (`nrPalety` / `pallet_id`) if present,
                                // otherwise fall back to the DB `id` (18-digit code).
                                nrPalety: row.nrPalety || row.id,
                                nazwa: row.nazwa,
                                dataProdukcji: row.dataProdukcji,
                                dataPrzydatnosci: row.dataPrzydatnosci,
                                initialWeight: row.initialWeight,
                                currentWeight: row.currentWeight,
                                isBlocked: row.isBlocked,
                                batchNumber: row.batchNumber,
                                packageForm: row.packageForm,
                                unit: row.unit,
                                labAnalysisNotes: row.labAnalysisNotes
                            },
                            currentLocation: row.currentLocation,
                            dateAdded: row.createdAt,
                            lastValidatedAt: row.updatedAt
                        })));
                    }
                    
                    return { success: true, message: 'Dostawa zakończona - palety utworzone w magazynie', newPallets: result.pallets || [] };
                } else {
                    const error = await response.json();
                    console.error('❌ Błąd finalizacji dostawy:', error);
                    return { success: false, message: error.error || 'Błąd finalizacji dostawy' };
                }
            } catch (err) {
                console.error('❌ Błąd API podczas finalizacji:', err);
                // Fallback do lokalnej logiki jeśli API nie działa
            }
        }
        
        // Lokalna aktualizacja statusu (dla innych statusów lub fallback)
        setDeliveries(prev => prev.map(d => {
            if (d.id === deliveryId) {
                success = true;
                const updated = { ...d, status: newStatus };
                if (newStatus === 'COMPLETED') {
                    updated.warehouseStageCompletedAt = new Date().toISOString();
                }
                return updated;
            }
            return d;
        }));
        return { success, message: `Status zmieniony na ${newStatus}`, newPallets };
    }, [currentUser, setDeliveries, setRawMaterialsLogList]);

    const combinedWarehouseInfos = useMemo((): WarehouseInfo[] => {
        const baseInfos: Record<string, { label: string, view: View, isLink?: boolean }> = {
            'all': { label: 'Wszystkie Magazyny', view: View.AllWarehousesView },
            [SOURCE_WAREHOUSE_ID_MS01]: { label: 'Magazyn Główny (MS01)', view: View.SourceWarehouseMS01 },
            [OSIP_WAREHOUSE_ID]: { label: 'Magazyn Zewnętrzny OSiP', view: View.OsipWarehouse },
            [BUFFER_MS01_ID]: { label: 'Bufor Przyjęć Surowców (BF_MS01)', view: View.BufferMS01View },
            [BUFFER_MP01_ID]: { label: 'Bufor Produkcyjny (BF_MP01)', view: View.BufferMP01View },
            [SUB_WAREHOUSE_ID]: { label: 'Magazyn Produkcyjny (MP01)', view: View.SubWarehouseMP01 },
            [MDM01_WAREHOUSE_ID]: { label: 'Magazyn Dodatków (MDM01)', view: View.MDM01View },
            [KO01_WAREHOUSE_ID]: { label: 'Strefa Konfekcji (KO01)', view: View.KO01View },
            [PSD_WAREHOUSE_ID]: { label: 'Magazyn IF (PSD)', view: View.PSD_WAREHOUSE },
            [MOP01_WAREHOUSE_ID]: { label: 'Magazyn Opakowań (MOP01)', view: View.MOP01View },
            [MGW01_RECEIVING_AREA_ID]: { label: 'Strefa Przyjęć WG', view: View.MGW01_Receiving },
            [MGW01_WAREHOUSE_ID]: { label: 'Wyroby Gotowe (MGW01)', view: View.MGW01 },
            [MGW02_WAREHOUSE_ID]: { label: 'Wyroby Gotowe (MGW02)', view: View.MGW02 },
            'pending_labels': { label: 'Etykiety Oczekujące', view: View.PendingLabels }
        };
        const dynamicInfos: WarehouseInfo[] = managedLocations
            .filter(loc => loc.type === 'rack' || loc.type === 'zone' || loc.type === 'bin')
            .map(loc => ({ id: loc.id, label: loc.name, view: View.LocationDetail, isLocationDetailLink: true }));
        const staticInfos: WarehouseInfo[] = Object.entries(baseInfos).map(([id, info]) => ({ id, label: info.label, view: info.view, isLocationDetailLink: info.isLink }));
        return [...staticInfos, ...dynamicInfos];
    }, [managedLocations]);

    // FIX: Defining missing functions shorthand properties rely on.
    const handleArchiveItem = useCallback((id: string, type: string) => {
        const timestamp = new Date().toISOString();
        const target = VIRTUAL_LOCATION_ARCHIVED;
        if (type === 'raw') {
            setRawMaterialsLogList(prev => prev.map(p => p.id === id ? { ...p, currentLocation: target, locationHistory: [...p.locationHistory, { movedBy: currentUser?.username || 'system', movedAt: timestamp, action: 'archive', previousLocation: p.currentLocation, targetLocation: target }] } : p));
        } else {
            setFinishedGoodsList(prev => prev.map(p => p.id === id ? { ...p, currentLocation: target, locationHistory: [...(p.locationHistory || []), { movedBy: currentUser?.username || 'system', movedAt: timestamp, action: 'archive', previousLocation: p.currentLocation, targetLocation: target }] } : p));
        }
        return { success: true, message: "Zarchiwizowano." };
    }, [currentUser, setRawMaterialsLogList, setFinishedGoodsList]);

    const handleRestoreItem = useCallback((id: string, type: string) => {
        const timestamp = new Date().toISOString();
        const target = SOURCE_WAREHOUSE_ID_MS01;
        if (type === 'raw') {
            setRawMaterialsLogList(prev => prev.map(p => p.id === id ? { ...p, currentLocation: target, locationHistory: [...p.locationHistory, { movedBy: currentUser?.username || 'system', movedAt: timestamp, action: 'restore', previousLocation: p.currentLocation, targetLocation: target }] } : p));
        } else {
            setFinishedGoodsList(prev => prev.map(p => p.id === id ? { ...p, currentLocation: target, locationHistory: [...(p.locationHistory || []), { movedBy: currentUser?.username || 'system', movedAt: timestamp, action: 'restore', previousLocation: p.currentLocation, targetLocation: target }] } : p));
        }
        return { success: true, message: "Przywrócono." };
    }, [currentUser, setRawMaterialsLogList, setFinishedGoodsList]);

    const handleAddLocation = useCallback((loc: LocationDefinition) => {
        if (managedLocations.some(l => l.id === loc.id)) return { success: false, message: 'Lokalizacja o tym ID już istnieje.' };
        setManagedLocations(prev => [...prev, loc]);
        return { success: true, message: 'Lokalizacja dodana.' };
    }, [managedLocations, setManagedLocations]);

    const handleUpdateLocation = useCallback((id: string, loc: LocationDefinition) => {
        setManagedLocations(prev => prev.map(l => l.id === id ? loc : l));
        return { success: true, message: 'Lokalizacja zaktualizowana.' };
    }, [setManagedLocations]);

    const handleDeleteLocation = useCallback((id: string) => {
        setManagedLocations(prev => prev.filter(l => l.id !== id));
        return { success: true, message: 'Lokalizacja usunięta.' };
    }, [setManagedLocations]);

    const handleDeleteDelivery = useCallback((deliveryId: string) => {
        setDeliveries(prev => prev.filter(d => d.id !== deliveryId));
        logger.log('warn', `Usunięto dostawę ${deliveryId}`, 'Logistics', currentUser?.username);
        return { success: true, message: `Dostawa ${deliveryId} została usunięta.` };
    }, [currentUser, setDeliveries]);

    const handleBlockPallet = useCallback((itemId: string, itemType: string, reason: string, user: User) => {
        const timestamp = new Date().toISOString();
        if (itemType === 'raw') {
            setRawMaterialsLogList(prev => prev.map(p => p.id === itemId ? {
                ...p, 
                palletData: { ...p.palletData, isBlocked: true, blockReason: reason },
                locationHistory: [...p.locationHistory, { movedBy: user.username, movedAt: timestamp, action: 'lab_pallet_blocked', notes: reason, previousLocation: p.currentLocation, targetLocation: p.currentLocation! }]
            } : p));
        } else {
            setFinishedGoodsList(prev => prev.map(p => p.id === itemId ? {
                ...p, 
                isBlocked: true, status: 'blocked', blockReason: reason,
                locationHistory: [...p.locationHistory, { movedBy: user.username, movedAt: timestamp, action: 'finished_good_blocked', notes: reason, previousLocation: p.currentLocation, targetLocation: p.currentLocation! }]
            } : p));
        }
        return { success: true, message: "Zablokowano paletę." };
    }, [setRawMaterialsLogList, setFinishedGoodsList]);

    const handleUnblockPallet = useCallback((itemId: string, itemType: string, user: User, notes?: string, newDate?: string) => {
        const timestamp = new Date().toISOString();
        if (itemType === 'raw') {
            setRawMaterialsLogList(prev => prev.map(p => p.id === itemId ? {
                ...p, 
                palletData: { ...p.palletData, isBlocked: false, dataPrzydatnosci: newDate || p.palletData.dataPrzydatnosci },
                locationHistory: [...p.locationHistory, { movedBy: user.username, movedAt: timestamp, action: 'lab_pallet_unblocked', notes, previousLocation: p.currentLocation, targetLocation: p.currentLocation! }]
            } : p));
        } else {
            setFinishedGoodsList(prev => prev.map(p => p.id === itemId ? {
                ...p, 
                isBlocked: false, status: 'available', expiryDate: newDate || p.expiryDate,
                locationHistory: [...p.locationHistory, { movedBy: user.username, movedAt: timestamp, action: 'lab_pallet_unblocked', notes, previousLocation: p.currentLocation, targetLocation: p.currentLocation! }]
            } : p));
        }
        return { success: true, message: "Zwolniono paletę." };
    }, [setRawMaterialsLogList, setFinishedGoodsList]);

    const handleAddProduct = useCallback(async (product: { name: string; type: string }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product),
            });
            if (response.ok) {
                await refreshProducts();
                return { success: true, message: 'Produkt został dodany' };
            } else {
                const error = await response.json();
                return { success: false, message: error.error || 'Błąd dodawania produktu' };
            }
        } catch (err) {
            console.error('Błąd dodawania produktu:', err);
            return { success: false, message: 'Błąd połączenia z serwerem' };
        }
    }, [refreshProducts]);

    const handleDeleteProduct = useCallback(async (name: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(name)}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                await refreshProducts();
                return { success: true, message: 'Produkt został usunięty' };
            } else {
                const error = await response.json();
                return { success: false, message: error.error || 'Błąd usuwania produktu' };
            }
        } catch (err) {
            console.error('Błąd usuwania produktu:', err);
            return { success: false, message: 'Błąd połączenia z serwerem' };
        }
    }, [refreshProducts]);

    const value = {
        rawMaterialsLogList, setRawMaterialsLogList, finishedGoodsList, setFinishedGoodsList, packagingMaterialsLog, setPackagingMaterialsLog,
        deliveries, setDeliveries, expiringPalletsDetails, expiryWarningDays, setExpiryWarningDays, expiryCriticalDays, setExpiryCriticalDays,
        warehouseNavLayout, setWarehouseNavLayout, findPalletByUniversalId, allProducts, inventorySessions,
        analysisRanges, setAnalysisRanges, analysisRangesHistory, logAnalysisRangeChange,
        refreshRawMaterials, refreshProducts,
        handleAddProduct, handleDeleteProduct,
        handleUpdateDeliveryStatus,
        handleSaveLabNotes: () => ({ success: true, message: 'OK', type: 'success' as const }),
        handleAddDocument: () => ({ success: true, message: 'OK', type: 'success' as const }),
        handleDeleteDocument: () => ({ success: true, message: 'OK', type: 'success' as const }),
        handleSaveAnalysisResults: () => ({ success: true, message: 'OK', type: 'success' as const }),
        allManageableLocations: managedLocations, combinedWarehouseInfos,
        handleArchiveItem, handleRestoreItem,
        validatePalletMove, handleUniversalMove, handleUnblockPallet,
        handleBlockPallet,
        handleStartInventorySession: () => ({ success: true, message: 'OK' }),
        handleCancelInventorySession: () => ({ success: true, message: 'OK' }),
        suppliers, customers, palletBalances, palletTransactions,
        handleAddSupplier: (n: any) => ({ success: true, message: 'OK' }),
        handleDeleteSupplier: (v: any) => ({ success: true, message: 'OK' }),
        handleUpdateSupplier: (value: string, data: Supplier) => {
            setSuppliers(prev => prev.map(s => s.value === value ? data : s));
            return { success: true, message: 'Zaktualizowano dostawcę.' };
        },
        handleLookupNip: async (nip: string) => ({ success: true, message: 'OK (Mock)', data: { label: 'Firma Testowa Sp. z o.o.', nip, city: 'Gdańsk', address: 'ul. Morska 1', zip: '80-001' } }),
        handleAddCustomer: (name: string) => {
            const newCustomer = { value: name.toLowerCase().replace(/\s+/g, '_'), label: name };
            setCustomers(prev => [...prev, newCustomer]);
            return { success: true, message: 'Klient dodany.' };
        },
        handleDeleteCustomer: (v: any) => ({ success: true, message: 'OK' }),
        handleUpdateCustomer: (v: any, d: any) => ({ success: true, message: 'OK' }),
        handleAddPalletTransaction: () => ({ success: true, message: 'OK' }),
        handleAddLocation, handleUpdateLocation, handleDeleteLocation,
        handleDeleteDelivery,
        handleSaveDelivery,
        handleRecordInventoryScan: () => ({ success: true, message: 'OK' }),
        handleUpdateInventoryLocationStatus: () => {},
        handleResolveMissingPallet: () => ({ success: true, message: 'OK' }),
        handleResolveUnexpectedPallet: () => ({ success: true, message: 'OK' }),
        handleFinalizeInventorySession: () => ({ success: true, message: 'OK' }),
        handleCompleteScanningSession: () => ({ success: true, message: 'OK' }),
    };

    return <WarehouseContext.Provider value={value as any}>{children}</WarehouseContext.Provider>;
};
