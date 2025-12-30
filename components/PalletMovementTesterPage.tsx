
import React, { useState, useMemo, useCallback } from 'react';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useProductionContext } from './contexts/ProductionContext'; // Import ProductionContext
import { RawMaterialLogEntry, FinishedGoodItem, PackagingMaterialLogEntry } from '../types';
import Input from './Input';
import Button from './Button';
import Select from './Select';
import Textarea from './Textarea';
import Alert from './Alert';
import { formatDate, getBlockInfo } from '../src/utils';
import SearchIcon from './icons/SearchIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import BeakerIcon from './icons/BeakerIcon';
import PlayIcon from './icons/PlayIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon'; 
import { PRODUCTION_STATIONS_BB, PRODUCTION_STATIONS_MZ, MGW01_WAREHOUSE_ID, SOURCE_WAREHOUSE_ID_MS01, PSD_WAREHOUSE_ID, MIXING_ZONE_ID, MOP01_WAREHOUSE_ID, VIRTUAL_LOCATION_ARCHIVED } from '../constants';

type ScannedItem = { item: RawMaterialLogEntry | FinishedGoodItem | PackagingMaterialLogEntry, type: 'raw' | 'fg' | 'pkg' };
type ValidationCheck = { message: string; pass: boolean };
type TestLogEntry = {
    timestamp: string;
    palletId: string;
    from: string;
    to: string;
    result: 'OK' | 'BŁĄD';
    reason: string;
};

type AutoTestResult = {
    locationId: string;
    isValid: boolean;
    message: string;
};

type UnitTestResult = {
    id: number;
    name: string;
    description: string;
    status: 'pass' | 'fail' | 'pending';
    message: string;
};

const PalletInfoCard: React.FC<{ pallet: ScannedItem }> = ({ pallet }) => {
    const { item, type } = pallet;
    const { isBlocked } = getBlockInfo(item);
    
    let displayId, productName, weight;

    if (type === 'raw') {
        const raw = item as RawMaterialLogEntry;
        displayId = raw.palletData.nrPalety;
        productName = raw.palletData.nazwa;
        weight = raw.palletData.currentWeight;
    } else if (type === 'fg') {
        const fg = item as FinishedGoodItem;
        displayId = fg.displayId || fg.id;
        productName = fg.productName;
        weight = fg.quantityKg;
    } else { // pkg
        const pkg = item as PackagingMaterialLogEntry;
        displayId = pkg.id;
        productName = pkg.productName;
        weight = pkg.currentWeight;
    }

    return (
        <div className="p-4 mt-4 bg-slate-100 dark:bg-secondary-900 border border-slate-200 dark:border-secondary-700 rounded-lg space-y-3 animate-fadeIn">
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-bold text-lg text-primary-700 dark:text-primary-300">{productName}</p>
                    <p className="font-mono text-sm text-gray-500 dark:text-gray-400">{displayId}</p>
                </div>
                {isBlocked ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">Zablokowana</span>
                ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">Dostępna</span>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t dark:border-secondary-700">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Aktualna lokalizacja</p>
                    <p className="font-semibold font-mono">{item.currentLocation || 'Brak'}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Waga / Ilość</p>
                    <p className="font-semibold">{weight.toFixed(2)} kg</p>
                </div>
            </div>
        </div>
    );
};

const PalletMovementTesterPage: React.FC = () => {
    const { findPalletByUniversalId, validatePalletMove, handleUniversalMove, allLocations, rawMaterialsLogList } = useWarehouseContext() as any;
    const { stationRawMaterialMapping } = useProductionContext();

    const [palletIdInput, setPalletIdInput] = useState('');
    const [selectedPallet, setSelectedPallet] = useState<ScannedItem | null>(null);
    const [targetLocation, setTargetLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [validationResult, setValidationResult] = useState<{ isValid: boolean; checks: ValidationCheck[] } | null>(null);
    const [testLog, setTestLog] = useState<TestLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Auto Test State
    const [autoTestResults, setAutoTestResults] = useState<{ allowed: AutoTestResult[], denied: AutoTestResult[] } | null>(null);
    const [isAutoTesting, setIsAutoTesting] = useState(false);

    // Unit Test State
    const [unitTestResults, setUnitTestResults] = useState<UnitTestResult[]>([]);

    const locationOptions = useMemo(() => {
        if (!allLocations) return [];
        return (allLocations as any[])
            .filter(loc => loc.id !== selectedPallet?.item.currentLocation)
            .map(loc => ({ value: loc.id, label: `${loc.label} (${loc.id})` }));
    }, [allLocations, selectedPallet]);

    const handleReset = useCallback(() => {
        setPalletIdInput('');
        setSelectedPallet(null);
        setTargetLocation('');
        setNotes('');
        setValidationResult(null);
        setAutoTestResults(null);
        setIsLoading(false);
    }, []);

    const handleFindPallet = () => {
        setIsLoading(true);
        const result = findPalletByUniversalId(palletIdInput.trim());
        if (result) {
            setSelectedPallet(result as ScannedItem);
            setAutoTestResults(null);
            setValidationResult(null);
        } else {
            alert(`Nie znaleziono pozycji o ID: ${palletIdInput.trim()}`);
            handleReset();
        }
        setIsLoading(false);
    };

    const handleTestMovement = () => {
        if (!selectedPallet || !targetLocation) return;
        
        const result = validatePalletMove(selectedPallet.item, targetLocation);
        const checks = result.rulesChecked.map((r: any) => ({ message: r.description, pass: r.result === 'pass' }));
        setValidationResult({ isValid: result.isValid, checks });
        
        const newLogEntry: TestLogEntry = {
            timestamp: new Date().toLocaleString('pl-PL'),
            palletId: (selectedPallet.item as any).displayId || (selectedPallet.item as any).palletData?.nrPalety || selectedPallet.item.id,
            from: selectedPallet.item.currentLocation || 'Brak',
            to: targetLocation,
            result: result.isValid ? 'OK' : 'BŁĄD',
            reason: result.message
        };
        setTestLog(prev => [newLogEntry, ...prev].slice(0, 10));
    };

    const runAutoTest = async () => {
        if (!selectedPallet) return;
        setIsAutoTesting(true);

        // Combine all known storage locations + production stations
        const extraStations = [...PRODUCTION_STATIONS_BB, ...PRODUCTION_STATIONS_MZ].map(id => ({ id, label: `Stacja ${id}` }));
        const combinedLocations = [...allLocations, ...extraStations];
        
        // Deduplicate by ID
        const uniqueLocationsMap = new Map();
        combinedLocations.forEach((loc: any) => uniqueLocationsMap.set(loc.id, loc));
        const uniqueLocations = Array.from(uniqueLocationsMap.values());

        const allowed: AutoTestResult[] = [];
        const denied: AutoTestResult[] = [];

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));

        uniqueLocations.forEach((loc: any) => {
            // Skip current location
            if (loc.id === selectedPallet.item.currentLocation) return;

            const result = validatePalletMove(selectedPallet.item, loc.id);
            if (result.isValid) {
                allowed.push({ locationId: loc.id, isValid: true, message: 'OK' });
            } else {
                denied.push({ locationId: loc.id, isValid: false, message: result.message });
            }
        });

        setAutoTestResults({ allowed, denied });
        setIsAutoTesting(false);
    };

    // --- Unit Tests Implementation ---
    const runSegregationTests = () => {
        // 1. Find a valid station to test against.
        // We prefer a station that is NOT occupied to isolate the logic test, 
        // but we also need to know what material it expects.
        const emptyBB = PRODUCTION_STATIONS_BB.find(id => !rawMaterialsLogList.some((p: any) => p.currentLocation === id)) || PRODUCTION_STATIONS_BB[0];
        const emptyMZ = PRODUCTION_STATIONS_MZ.find(id => !rawMaterialsLogList.some((p: any) => p.currentLocation === id)) || PRODUCTION_STATIONS_MZ[0];
        
        // Get required materials from context
        const requiredMatBB = stationRawMaterialMapping[emptyBB] || 'Material BB';
        const requiredMatMZ = stationRawMaterialMapping[emptyMZ] || 'Material MZ';
        
        // --- MOCKS ---
        const mockRawItem = {
            id: 'MOCK-RAW',
            palletData: { nrPalety: 'MOCK-RAW', nazwa: 'Test Raw', currentWeight: 100, isBlocked: false },
            currentLocation: 'OSIP',
            locationHistory: []
        };
        const mockFgItem = {
            id: 'MOCK-FG',
            displayId: 'MOCK-FG',
            productName: 'Test FG',
            quantityKg: 100,
            status: 'available',
            isBlocked: false,
            currentLocation: 'OSIP',
            locationHistory: []
        };
        const mockBlockedItem = {
            id: 'MOCK-BLOCKED',
            palletData: { nrPalety: 'MOCK-BLOCKED', nazwa: 'Test Raw', currentWeight: 100, isBlocked: true, blockReason: 'Test Block' },
            currentLocation: 'MS01',
            locationHistory: []
        };
        const mockPkgItem = {
            id: 'MOCK-PKG',
            productName: 'Worek 25kg',
            currentWeight: 100,
            isBlocked: false,
            currentLocation: 'OSIP',
            locationHistory: []
        };
        // Big Bag Mock - Matches required material for BB
        const mockBigBagItem = {
            id: 'MOCK-BB',
            palletData: { nrPalety: 'MOCK-BB', nazwa: requiredMatBB, currentWeight: 1000, isBlocked: false, packageForm: 'big_bag' },
            currentLocation: 'OSIP',
            locationHistory: []
        };
         // Small Bag Mock - Matches required material for MZ
        const mockSmallBagItem = {
            id: 'MOCK-BAGS',
            palletData: { nrPalety: 'MOCK-BAGS', nazwa: requiredMatMZ, currentWeight: 1000, isBlocked: false, packageForm: 'bags' },
            currentLocation: 'OSIP',
            locationHistory: []
        };
        // Wrong Material Mock
        const mockWrongMaterialItem = {
             id: 'MOCK-WRONG',
            palletData: { nrPalety: 'MOCK-WRONG', nazwa: 'WRONG MATERIAL', currentWeight: 1000, isBlocked: false, packageForm: 'big_bag' },
            currentLocation: 'OSIP',
            locationHistory: []
        };

        const tests = [
            {
                id: 1,
                name: 'FG -> MS01 (Zabronione)',
                description: 'Wyrób gotowy nie powinien trafić na magazyn surowców.',
                test: () => !validatePalletMove(mockFgItem, SOURCE_WAREHOUSE_ID_MS01).isValid
            },
            {
                id: 2,
                name: 'FG -> MGW01 (Dozwolone)',
                description: 'Wyrób gotowy powinien trafić na magazyn wyrobów gotowych.',
                test: () => validatePalletMove(mockFgItem, MGW01_WAREHOUSE_ID).isValid
            },
            {
                id: 3,
                name: 'RAW -> MGW01 (Zabronione)',
                description: 'Surowiec nie powinien trafić na magazyn wyrobów gotowych.',
                test: () => !validatePalletMove(mockRawItem, MGW01_WAREHOUSE_ID).isValid
            },
            {
                id: 4,
                name: 'RAW -> MS01 (Dozwolone)',
                description: 'Surowiec powinien trafić na magazyn surowców.',
                test: () => validatePalletMove(mockRawItem, SOURCE_WAREHOUSE_ID_MS01).isValid
            },
             {
                id: 5,
                name: 'FG -> PSD (Zabronione)',
                description: 'Wyrób gotowy nie powinien trafić do strefy PSD.',
                test: () => !validatePalletMove(mockFgItem, PSD_WAREHOUSE_ID).isValid
            },
            {
                id: 6,
                name: 'Blocked -> MIX01 (Zabronione)',
                description: 'Zablokowana paleta nie może wejść do strefy miksowania.',
                test: () => !validatePalletMove(mockBlockedItem, MIXING_ZONE_ID).isValid
            },
             {
                id: 7,
                name: 'Blocked -> PSD (Zabronione)',
                description: 'Zablokowana paleta nie może wejść do strefy PSD.',
                test: () => !validatePalletMove(mockBlockedItem, PSD_WAREHOUSE_ID).isValid
            },
            {
                id: 8,
                name: 'PKG -> MOP01 (Dozwolone)',
                description: 'Opakowania powinny móc trafić do magazynu opakowań.',
                test: () => validatePalletMove(mockPkgItem, MOP01_WAREHOUSE_ID).isValid
            },
            {
                id: 9,
                name: 'RAW -> MOP01 (Zabronione)',
                description: 'Surowce nie powinny trafiać do magazynu opakowań.',
                test: () => !validatePalletMove(mockRawItem, MOP01_WAREHOUSE_ID).isValid
            },
            {
                id: 10,
                name: 'SmallBag -> BBxx (Zabronione)',
                description: `Małe worki nie mogą trafić na stację Big-Bag (${emptyBB}).`,
                test: () => !validatePalletMove(mockSmallBagItem, emptyBB).isValid
            },
            {
                id: 11,
                name: 'BigBag -> BBxx (Dozwolone)',
                description: `Big Bag powinien móc trafić na stację Big-Bag (${emptyBB}).`,
                test: () => validatePalletMove(mockBigBagItem, emptyBB).isValid
            },
            {
                id: 12,
                name: 'Any -> ARCHIVED (Zabronione)',
                description: 'Nie można manualnie przenieść palety do archiwum (tylko przez zużycie).',
                test: () => !validatePalletMove(mockRawItem, VIRTUAL_LOCATION_ARCHIVED).isValid
            },
            {
                id: 13,
                name: 'Zły Surowiec -> BBxx (Zabronione)',
                description: `Nie można zasypać stacji ${emptyBB} surowcem "WRONG MATERIAL" (Oczekiwany: ${requiredMatBB}).`,
                test: () => !validatePalletMove(mockWrongMaterialItem, emptyBB).isValid
            }
        ];

        const results: UnitTestResult[] = tests.map(t => {
            const passed = t.test();
            let message = passed ? 'PASS' : 'FAIL';
            
             // Extra debug info for failed tests
            if (!passed && (t.id === 10 || t.id === 11 || t.id === 13)) {
                const validation = validatePalletMove(
                    t.id === 10 ? mockSmallBagItem : (t.id === 13 ? mockWrongMaterialItem : mockBigBagItem), 
                    emptyBB
                );
                message = `FAIL. System zwrócił: ${validation.message}`;
            }

            return {
                id: t.id,
                name: t.name,
                description: t.description,
                status: passed ? 'pass' : 'fail',
                message: message
            };
        });

        setUnitTestResults(results);
    };
    
    const handleExecuteMove = () => {
        if (!selectedPallet || !targetLocation || !validationResult || !validationResult.isValid) return;

        setIsLoading(true);
        const { id } = selectedPallet.item;
        const { type } = selectedPallet;
        
        const result = handleUniversalMove(id, type, targetLocation, notes);
        
        alert(result.message);
        
        if (result.success) {
            handleReset();
        }
        setIsLoading(false);
    };

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900/50 min-h-full flex flex-col gap-6">
            <header className="flex items-center gap-3">
                <BeakerIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                <div>
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Tester Logiki Przemieszczania Palet</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Symuluj i weryfikuj ruchy palet przed ich fizycznym wykonaniem.</p>
                </div>
            </header>

             {/* Unit Tests Section */}
             <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md border-l-4 border-indigo-500">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                            <ShieldCheckIcon className="h-5 w-5" /> Testy Automatyczne: Reguły Biznesowe
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Weryfikacja segregacji magazynowej (Surowce vs WG), blokad jakościowych i typów opakowań.</p>
                    </div>
                    <Button onClick={runSegregationTests} className="bg-indigo-600 hover:bg-indigo-700" leftIcon={<PlayIcon className="h-4 w-4"/>}>
                        Uruchom Testy
                    </Button>
                </div>

                {unitTestResults.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 animate-fadeIn">
                        {unitTestResults.map(res => (
                            <div key={res.id} className={`p-3 rounded border ${res.status === 'pass' ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'}`}>
                                <div className="flex items-start justify-between mb-1">
                                    <span className="font-bold text-sm">{res.name}</span>
                                    {res.status === 'pass' 
                                        ? <CheckCircleIcon className="h-5 w-5 text-green-600" /> 
                                        : <XCircleIcon className="h-5 w-5 text-red-600" />
                                    }
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">{res.description}</p>
                                <p className={`text-xs font-semibold ${res.status === 'pass' ? 'text-green-700' : 'text-red-700'}`}>
                                    {res.message}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Configuration */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold border-b pb-2 mb-4 dark:border-secondary-700">1. Wybierz Paletę (Symulacja Rzeczywista)</h3>
                        
                        <div className="space-y-2">
                            <Input
                                label="Wprowadź ID palety"
                                id="pallet-id-input"
                                value={palletIdInput}
                                onChange={e => setPalletIdInput(e.target.value)}
                                disabled={!!selectedPallet || isLoading}
                                icon={<SearchIcon className="h-5 w-5 text-gray-400" />}
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleFindPallet} disabled={!!selectedPallet || isLoading || !palletIdInput.trim()}>
                                    {isLoading ? 'Szukam...' : 'Znajdź'}
                                </Button>
                                <Button onClick={handleReset} variant="secondary">
                                    <ArrowPathIcon className="h-5 w-5 mr-2"/> Resetuj
                                </Button>
                            </div>
                        </div>

                        {selectedPallet && <PalletInfoCard pallet={selectedPallet} />}
                    </div>

                    {selectedPallet && (
                        <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md animate-fadeIn">
                             <h3 className="text-lg font-semibold border-b pb-2 mb-4 dark:border-secondary-700">2. Manualny Test Pojedynczy</h3>
                             <div className="space-y-4">
                                <Select
                                    label="Wybierz lokalizację docelową"
                                    id="target-location"
                                    options={[{ value: '', label: 'Wybierz...' }, ...locationOptions]}
                                    value={targetLocation}
                                    onChange={e => setTargetLocation(e.target.value)}
                                />
                                <Textarea
                                    label="Notatki (opcjonalnie)"
                                    id="move-notes"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Dodaj uwagi dotyczące tego testu lub ruchu..."
                                />
                                <Button onClick={handleTestMovement} className="w-full py-3" disabled={!targetLocation}>
                                    Sprawdź to konkretne miejsce
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Results & Log */}
                <div className="space-y-6">
                    {/* Manual Result */}
                    {validationResult && (
                        <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md animate-fadeIn border-l-4 border-blue-500">
                             <h3 className="text-lg font-semibold border-b pb-2 mb-4 dark:border-secondary-700">Wynik Testu Manualnego</h3>
                            <Alert 
                                type={validationResult.isValid ? 'success' : 'error'} 
                                message={`Ruch do ${targetLocation} jest ${validationResult.isValid ? 'DOZWOLONY' : 'NIEDOZWOLONY'}`}
                            />
                            <ul className="mt-4 space-y-2 text-sm">
                                {validationResult.checks.map((check, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <div className="mt-0.5 flex-shrink-0">
                                            {check.pass ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-red-500" />}
                                        </div>
                                        <span className={check.pass ? 'text-gray-700 dark:text-gray-300' : 'text-red-700 dark:text-red-300 font-semibold'}>
                                            {check.message}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {validationResult.isValid && (
                                <div className="mt-6 pt-4 border-t dark:border-secondary-700">
                                    <Button onClick={handleExecuteMove} disabled={isLoading} className="w-full py-3 bg-green-600 hover:bg-green-700">
                                        {isLoading ? 'Przenoszenie...' : 'Wykonaj Przeniesienie'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Auto Test */}
                    {selectedPallet && (
                        <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md border-l-4 border-purple-500">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold dark:text-gray-200">Automatyczny Skaner Lokalizacji</h3>
                                <Button onClick={runAutoTest} variant="secondary" disabled={isAutoTesting} leftIcon={<PlayIcon className="h-4 w-4"/>}>
                                    {isAutoTesting ? 'Skanowanie...' : 'Sprawdź Wszystkie'}
                                </Button>
                            </div>
                            
                            {!autoTestResults && !isAutoTesting && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Kliknij "Sprawdź Wszystkie", aby automatycznie przetestować zgodność palety ze wszystkimi zdefiniowanymi lokalizacjami w systemie.
                                </p>
                            )}

                            {autoTestResults && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800 text-center">
                                            <p className="text-xs text-green-800 dark:text-green-300 uppercase font-bold">Dozwolone</p>
                                            <p className="text-2xl font-bold text-green-700 dark:text-green-200">{autoTestResults.allowed.length}</p>
                                        </div>
                                        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800 text-center">
                                            <p className="text-xs text-red-800 dark:text-red-300 uppercase font-bold">Zabronione</p>
                                            <p className="text-2xl font-bold text-red-700 dark:text-red-200">{autoTestResults.denied.length}</p>
                                        </div>
                                    </div>

                                    {autoTestResults.allowed.length > 0 && (
                                        <div className="max-h-40 overflow-y-auto pr-2 bg-slate-50 dark:bg-secondary-900 p-2 rounded border dark:border-secondary-700">
                                            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 sticky top-0 bg-slate-50 dark:bg-secondary-900">Możesz przenieść do:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {autoTestResults.allowed.map(res => (
                                                    <span key={res.locationId} className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-xs rounded font-mono border border-green-300 dark:border-green-700">
                                                        {res.locationId}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {autoTestResults.denied.length > 0 && (
                                        <div className="max-h-60 overflow-y-auto pr-2 bg-slate-50 dark:bg-secondary-900 p-2 rounded border dark:border-secondary-700">
                                             <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 sticky top-0 bg-slate-50 dark:bg-secondary-900">Zablokowane (przykłady):</p>
                                             <ul className="space-y-1 text-xs">
                                                {autoTestResults.denied.slice(0, 50).map(res => (
                                                    <li key={res.locationId} className="flex justify-between gap-2 text-gray-600 dark:text-gray-400 border-b dark:border-secondary-800 pb-1 last:border-0">
                                                        <span className="font-mono font-semibold text-red-600 dark:text-red-400">{res.locationId}</span>
                                                        <span className="text-right truncate max-w-[200px]" title={res.message}>{res.message}</span>
                                                    </li>
                                                ))}
                                                {autoTestResults.denied.length > 50 && <li className="text-center italic text-gray-500">... i {autoTestResults.denied.length - 50} więcej</li>}
                                             </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold border-b pb-2 mb-4 dark:border-secondary-700">Dziennik Testów Manualnych</h3>
                        {testLog.length > 0 ? (
                            <div className="max-h-64 overflow-y-auto space-y-2 text-xs font-mono pr-2">
                                {testLog.map((entry, index) => (
                                    <div key={index} className="p-2 bg-slate-100 dark:bg-secondary-900 rounded border dark:border-secondary-700">
                                        <p className="text-gray-500">{entry.timestamp}</p>
                                        <p>
                                            <span className="text-blue-600 dark:text-blue-400">{entry.palletId}</span> &rarr; <span className="font-bold">{entry.to}</span>
                                        </p>
                                        <p className={entry.result === 'OK' ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>
                                            {entry.result}: {entry.reason}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Brak przeprowadzonych testów manualnych.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PalletMovementTesterPage;
