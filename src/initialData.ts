
import { User, RawMaterialLogEntry, FinishedGoodItem, Delivery, ProductionRun, PsdTask, MixingTask, DispatchOrder, AdjustmentOrder, PackagingMaterialLogEntry, UserRole, PsdBatch, Permission } from './types';
import { DEFAULT_PERMISSIONS } from '../constants';

// FIX: Added missing required 'subRole' property to initial users to resolve type mismatch with User interface.
export const INITIAL_USERS: User[] = [
  { id: 'u-1', username: 'admin', password: 'password', role: 'admin' as UserRole, subRole: 'AGRO', pin: '1234', passwordLastChanged: new Date().toISOString() },
  { id: 'u-2', username: 'planista', password: 'password', role: 'planista' as UserRole, subRole: 'AGRO', pin: '1111', passwordLastChanged: new Date().toISOString() },
  { id: 'u-3', username: 'magazynier', password: 'password', role: 'magazynier' as UserRole, subRole: 'AGRO', pin: '2222', passwordLastChanged: new Date().toISOString() },
  { id: 'u-4', username: 'kierownik', password: 'password', role: 'kierownik magazynu' as UserRole, subRole: 'AGRO', pin: '3333', passwordLastChanged: new Date().toISOString() },
  { id: 'u-5', username: 'lab', password: 'password', role: 'lab' as UserRole, subRole: 'AGRO', pin: '4444', passwordLastChanged: new Date().toISOString() },
  { id: 'u-6', username: 'operator_psd', password: 'password', role: 'operator_psd' as UserRole, subRole: 'AGRO', pin: '5555', passwordLastChanged: new Date().toISOString() },
  { id: 'u-8', username: 'operator_agro', password: 'password', role: 'operator_agro' as UserRole, subRole: 'AGRO', pin: '6666', passwordLastChanged: new Date().toISOString() },
  { id: 'u-7', username: 'user', password: 'password', role: 'user' as UserRole, subRole: 'AGRO', pin: '0000', passwordLastChanged: new Date().toISOString() },
  { id: 'u-9', username: 'operator_procesu_1', password: 'password', role: 'operator_procesu' as UserRole, subRole: 'AGRO', pin: '7777', passwordLastChanged: new Date().toISOString() },
  { id: 'u-10', username: 'operator_procesu_2', password: 'password', role: 'operator_procesu' as UserRole, subRole: 'AGRO', pin: '8888', passwordLastChanged: new Date().toISOString() },
].map(user => ({
  ...user,
  permissions: DEFAULT_PERMISSIONS[user.role as keyof typeof DEFAULT_PERMISSIONS] || [],
}));


// Helper function to generate date-based IDs for finished goods
const generateDateId = (prefix: 'WGAGR' | 'WGPSD' | 'WGSPL'): string => {
    const d = new Date();
    d.setMilliseconds(d.getMilliseconds() - Math.floor(Math.random() * 1000000));
    const year = d.getFullYear().toString().slice(-2);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); 
    return `${prefix}${year}${month}${day}${hours}${minutes}${seconds}${ms}${random}`;
};

function generateRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const generateRawMaterialId = (): string => {
    const startDate = new Date('1960-01-01T00:00:00.000Z');
    const endDate = new Date();
    const date = generateRandomDate(startDate, endDate);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const datePart = `${year}${month}${day}${hours}${minutes}${seconds}`; 
    const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
    return `${datePart}${randomPart}`;
};

const generatePackagingId = (): string => {
    const d = new Date();
    d.setMilliseconds(d.getMilliseconds() - Math.floor(Math.random() * 1000000));
    const year = d.getFullYear().toString().slice(-2);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}${ms}${random}`;
};

const rawMaterialNames = ['Serwatka w proszku', 'Olej palmowy', 'Pszenica ekstrudowana', 'Soja', 'Mączka rybna', 'Śruta kukurydziana', 'Śruta sojowa', 'Kukurydza', 'Olej sojowy', 'Pszenżyto'];
const locations = ['MS01', 'BUFFER_MS01', 'R040101', 'R040201', 'R040301', 'R050101', 'R050201', 'R060101', 'R070101', 'PSD', 'MP01', 'MGW01', 'MGW02', 'MGW01-PRZYJECIA', 'BB01', 'MZ01'];
const blockReasons = ['Oczekuje na analizę', 'Niezgodność jakościowa', 'Uszkodzone opakowanie'];

const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

const tempRawMaterials: RawMaterialLogEntry[] = [];
for (let i = 0; i < 25; i++) {
  const id = generateRawMaterialId();
  const isBlocked = Math.random() < 0.2;
  const initialWeight = Math.floor(Math.random() * 201) + 800; 
  const currentWeight = isBlocked ? initialWeight : Math.floor(Math.random() * (initialWeight - 100)) + 100;
  const prodDate = generateRandomDate(new Date(2023, 0, 1), new Date());
  const expiryDate = new Date(prodDate.getTime());
  expiryDate.setMonth(expiryDate.getMonth() + 6 + Math.floor(Math.random() * 6));

  tempRawMaterials.push({
    id: id,
    palletData: {
      nrPalety: id,
      nazwa: getRandom(rawMaterialNames),
      dataProdukcji: prodDate.toISOString().split('T')[0],
      dataPrzydatnosci: expiryDate.toISOString().split('T')[0],
      initialWeight: initialWeight,
      currentWeight: currentWeight,
      isBlocked: isBlocked,
      blockReason: isBlocked ? getRandom(blockReasons) : undefined,
      batchNumber: `BATCH-EXT-${1000 + i}`
    },
    currentLocation: getRandom(locations),
    locationHistory: [{
        movedBy: 'system',
        movedAt: prodDate.toISOString(),
        previousLocation: null,
        targetLocation: 'BUFFER_MS01',
        action: 'added_new_to_delivery_buffer',
        deliveryOrderRef: `WZ-EXT-${200 + i}`
    }],
    dateAdded: prodDate.toISOString(),
    lastValidatedAt: prodDate.toISOString(),
  });
}

const finishedGoodNames = ['MlekoMax Cielak', 'Prosiak Prestarter Forte', 'Cielak Grower', 'Kurczak Finiszer Plus', 'Indyk Starter Max', 'Nioska Gold Egg'];

const tempFinishedGoods: FinishedGoodItem[] = [];
for (let i = 0; i < 25; i++) {
    const d = new Date();
    d.setMilliseconds(d.getMilliseconds() - Math.floor(Math.random() * 1000 * 3600 * 24 * 30));
    const year = d.getFullYear().toString().slice(-2);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    const id = `WGAGR${year}${month}${day}${hours}${minutes}${seconds}${ms}`;

    const isBlocked = Math.random() < 0.15;
    const status = isBlocked ? 'blocked' : 'available';

    const prodDate = new Date(d);
    const expiryDate = new Date(d);
    expiryDate.setMonth(expiryDate.getMonth() + 6);
  
    tempFinishedGoods.push({
        id: id,
        displayId: id,
        finishedGoodPalletId: id,
        productName: getRandom(finishedGoodNames),
        palletType: 'EUR',
        quantityKg: 1000,
        producedWeight: 1000,
        grossWeightKg: 1025,
        productionDate: prodDate.toISOString(),
        expiryDate: expiryDate.toISOString().split('T')[0],
        status: status,
        blockReason: isBlocked ? 'Niezgodność' : undefined,
        isBlocked: isBlocked,
        currentLocation: getRandom(['MGW01', 'MGW02', 'MGW01-PRZYJECIA']),
        productionRunId: `ZLEAGR-0${10 + i}`,
        locationHistory: [{
            movedBy: 'system',
            movedAt: prodDate.toISOString(),
            previousLocation: null,
            targetLocation: 'MGW01-PRZYJECIA',
            action: 'produced'
        }],
        producedAt: prodDate.toISOString(),
    });
}

const today = new Date();
const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);
const twoDaysAgo = new Date();
twoDaysAgo.setDate(today.getDate() - 2);

const formatDateForInitialData = (date: Date): string => date.toISOString().split('T')[0];

export const INITIAL_RAW_MATERIALS: RawMaterialLogEntry[] = tempRawMaterials;
export const INITIAL_FINISHED_GOODS: FinishedGoodItem[] = tempFinishedGoods;
export const INITIAL_DELIVERIES: Delivery[] = [];
export const INITIAL_PRODUCTION_RUNS: ProductionRun[] = [
  {
    id: 'ZLEAGR-00001',
    recipeId: 'REC001',
    recipeName: 'MlekoMax Cielak',
    targetBatchSizeKg: 20000,
    plannedDate: formatDateForInitialData(today),
    status: 'planned',
    createdBy: 'planista',
    createdAt: yesterday.toISOString(),
    notes: 'Pilne zlecenie dla klienta Kowalski.',
    hasShortages: false,
    shelfLifeMonths: 12,
    batches: [],
  },
];
export const INITIAL_PSD_TASKS: PsdTask[] = [];
export const INITIAL_MIXING_TASKS: MixingTask[] = [];
export const INITIAL_DISPATCH_ORDERS: DispatchOrder[] = [];
export const INITIAL_ADJUSTMENT_ORDERS: AdjustmentOrder[] = [];
export const INITIAL_PACKAGING_MATERIALS: PackagingMaterialLogEntry[] = [];

// GENEROWANIE 60 PRODUKTÓW TESTOWYCH
const generateTestProducts = () => {
    const products: {name: string, type: string}[] = [];
    
    // 20x MLxxxx - Surowce
    for(let i=1; i<=20; i++) {
        products.push({ 
            name: `ML${String(i).padStart(4, '0')} - Surowiec Bazowy ${i}`, 
            type: 'raw_material' 
        });
    }

    // 20x PXxxxx - Surowce
    for(let i=1; i<=20; i++) {
        products.push({ 
            name: `PX${String(i).padStart(4, '0')} - Dodatek/Premiks ${i}`, 
            type: 'raw_material' 
        });
    }

    // 20x OPxxxx - Opakowania
    for(let i=1; i<=20; i++) {
        products.push({ 
            name: `OP${String(i).padStart(4, '0')} - Opakowanie Techniczne ${i}`, 
            type: 'packaging' 
        });
    }

    return products;
};

export const INITIAL_PRODUCTS: {name: string, type: string}[] = [
    { name: 'Serwatka w proszku', type: 'raw_material' },
    { name: 'Olej palmowy', type: 'raw_material' },
    { name: 'Pszenica ekstrudowana', type: 'raw_material' },
    { name: 'Soja', type: 'raw_material' },
    { name: 'Mączka rybna', type: 'raw_material' },
    { name: 'MlekoMax Cielak', type: 'finished_good' },
    { name: 'Prosiak Prestarter Forte', type: 'finished_good' },
    ...generateTestProducts()
];
