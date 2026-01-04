
import { User, RawMaterialLogEntry, FinishedGoodItem, Delivery, ProductionRun, PsdTask, MixingTask, DispatchOrder, AdjustmentOrder, PackagingMaterialLogEntry, UserRole, PsdBatch, Permission } from './types';

// FIX: Hasła są teraz przechowywane TYLKO w bazie danych, zahaszone bcryptem.
// Pola password usunięte z INITIAL_USERS. Logowanie odbywa się przez /api/login endpoint.
export const INITIAL_USERS: User[] = [
  { id: 'u-1', username: 'admin', role: 'admin' as UserRole, subRole: 'AGRO', pin: '1234', passwordLastChanged: new Date().toISOString(), permissions: [] },
  { id: 'u-2', username: 'planista', role: 'planista' as UserRole, subRole: 'AGRO', pin: '1111', passwordLastChanged: new Date().toISOString(), permissions: [] },
  { id: 'u-3', username: 'magazynier', role: 'magazynier' as UserRole, subRole: 'AGRO', pin: '2222', passwordLastChanged: new Date().toISOString(), permissions: [] },
  { id: 'u-4', username: 'kierownik', role: 'kierownik magazynu' as UserRole, subRole: 'AGRO', pin: '3333', passwordLastChanged: new Date().toISOString(), permissions: [] },
  { id: 'u-5', username: 'lab', role: 'lab' as UserRole, subRole: 'AGRO', pin: '4444', passwordLastChanged: new Date().toISOString(), permissions: [] },
  { id: 'u-6', username: 'operator_psd', role: 'operator_psd' as UserRole, subRole: 'AGRO', pin: '5555', passwordLastChanged: new Date().toISOString(), permissions: [] },
  { id: 'u-8', username: 'operator_agro', role: 'operator_agro' as UserRole, subRole: 'AGRO', pin: '6666', passwordLastChanged: new Date().toISOString(), permissions: [] },
  { id: 'u-7', username: 'user', role: 'user' as UserRole, subRole: 'AGRO', pin: '0000', passwordLastChanged: new Date().toISOString(), permissions: [] },
  { id: 'u-9', username: 'operator_procesu_1', role: 'operator_procesu' as UserRole, subRole: 'AGRO', pin: '7777', passwordLastChanged: new Date().toISOString(), permissions: [] },
  { id: 'u-10', username: 'operator_procesu_2', role: 'operator_procesu' as UserRole, subRole: 'AGRO', pin: '8888', passwordLastChanged: new Date().toISOString(), permissions: [] },
];


// Helper function to generate date-based IDs for finished goods
const generateDateId = (prefix: 'WGAGR' | 'WGPSD' | 'WGSPL'): string => {
    const d = new Date();
    // Subtract some random time to make them unique and seem historical
    d.setMilliseconds(d.getMilliseconds() - Math.floor(Math.random() * 1000000));
    const year = d.getFullYear().toString().slice(-2);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // Add 3 random digits
    return `${prefix}${year}${month}${day}${hours}${minutes}${seconds}${ms}${random}`;
};

// Helper function to generate a random date between two dates
function generateRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate 18-digit date-based IDs for raw materials
const generateRawMaterialId = (): string => {
    // Generate a random date between 1960 and today.
    const startDate = new Date('1960-01-01T00:00:00.000Z');
    const endDate = new Date();
    const date = generateRandomDate(startDate, endDate);
    
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    const datePart = `${year}${month}${day}${hours}${minutes}${seconds}`; // 14 digits
    
    // Generate 4 random digits to make it 18 digits long
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
  const initialWeight = Math.floor(Math.random() * 201) + 800; // 800-1000
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

// Add PSD Finished Goods
const psdProdDate1 = new Date();
psdProdDate1.setDate(psdProdDate1.getDate() - 5);
const psdExpiryDate1 = new Date(psdProdDate1);
psdExpiryDate1.setMonth(psdExpiryDate1.getMonth() + 4);
const psdId1 = generateDateId('WGPSD');

tempFinishedGoods.push({
    id: psdId1,
    displayId: psdId1,
    finishedGoodPalletId: psdId1,
    productName: 'Super Prosiak Turbo',
    palletType: 'EUR',
    quantityKg: 1000,
    producedWeight: 1000,
    grossWeightKg: 1025,
    productionDate: psdProdDate1.toISOString(),
    expiryDate: psdExpiryDate1.toISOString().split('T')[0],
    status: 'available',
    isBlocked: false,
    currentLocation: 'PSD',
    psdTaskId: 'ZLEPSD00001',
    batchId: 'ZLEPSD00001-B1',
    locationHistory: [{
        movedBy: 'psd',
        movedAt: psdProdDate1.toISOString(),
        previousLocation: null,
        targetLocation: 'PSD',
        action: 'produced'
    }],
    producedAt: psdProdDate1.toISOString(),
});

const psdProdDate2 = new Date();
psdProdDate2.setDate(psdProdDate2.getDate() - 2);
const psdExpiryDate2 = new Date(psdProdDate2);
psdExpiryDate2.setMonth(psdExpiryDate2.getMonth() + 6);
const psdId2 = generateDateId('WGPSD');

tempFinishedGoods.push({
    id: psdId2,
    displayId: psdId2,
    finishedGoodPalletId: psdId2,
    productName: 'Cielak Grower', // Using an existing one
    palletType: 'EUR',
    quantityKg: 500, // different weight
    producedWeight: 500,
    grossWeightKg: 525,
    productionDate: psdProdDate2.toISOString(),
    expiryDate: psdExpiryDate2.toISOString().split('T')[0],
    status: 'available',
    isBlocked: false,
    currentLocation: 'MGW01',
    psdTaskId: 'ZLEPSD00002',
    batchId: 'ZLEPSD00002-B1',
    locationHistory: [{
        movedBy: 'psd',
        movedAt: psdProdDate2.toISOString(),
        previousLocation: null,
        targetLocation: 'PSD',
        action: 'produced'
    },{
        movedBy: 'magazynier',
        movedAt: new Date().toISOString(),
        previousLocation: 'PSD',
        targetLocation: 'MGW01',
        action: 'move'
    }],
    producedAt: psdProdDate2.toISOString(),
});

const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);
const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);
const twoDaysAgo = new Date();
twoDaysAgo.setDate(today.getDate() - 2);
const fourDaysAgo = new Date();
fourDaysAgo.setDate(today.getDate() - 4);
const fiveDaysAgo = new Date();
fiveDaysAgo.setDate(today.getDate() - 5);
const sixDaysAgo = new Date();
sixDaysAgo.setDate(today.getDate() - 6);
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(today.getDate() - 7);
const eightDaysAgo = new Date();
eightDaysAgo.setDate(today.getDate() - 8);

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
  {
    id: 'ZLEAGR-00002',
    recipeId: 'REC002',
    recipeName: 'Prosiak Prestarter Forte',
    targetBatchSizeKg: 10000,
    plannedDate: formatDateForInitialData(yesterday),
    status: 'ongoing',
    startTime: yesterday.toISOString(),
    createdBy: 'planista',
    createdAt: twoDaysAgo.toISOString(),
    hasShortages: false,
    shelfLifeMonths: 9,
    actualProducedQuantityKg: 4000,
    actualIngredientsUsed: [
// FIX: Added missing properties 'consumptionId' and 'isAnnulled' to match AgroConsumedMaterial type.
        { consumptionId: `cons-${Date.now() - 30000}`, isAnnulled: false, productName: 'Pszenica ekstrudowana', actualConsumedQuantityKg: 941, actualSourcePalletId: 'some-raw-id-1', batchId: 'ZLEAGR-00002-B1' },
        { consumptionId: `cons-${Date.now() - 29000}`, isAnnulled: false, productName: 'Soja', actualConsumedQuantityKg: 705, actualSourcePalletId: 'some-raw-id-2', batchId: 'ZLEAGR-00002-B1' },
        { consumptionId: `cons-${Date.now() - 28000}`, isAnnulled: false, productName: 'Mączka rybna', actualConsumedQuantityKg: 353, actualSourcePalletId: 'some-raw-id-3', batchId: 'ZLEAGR-00002-B1' },
        { consumptionId: `cons-${Date.now() - 20000}`, isAnnulled: false, productName: 'Pszenica ekstrudowana', actualConsumedQuantityKg: 941, actualSourcePalletId: 'some-raw-id-4', batchId: 'ZLEAGR-00002-B2' },
        { consumptionId: `cons-${Date.now() - 19000}`, isAnnulled: false, productName: 'Soja', actualConsumedQuantityKg: 705, actualSourcePalletId: 'some-raw-id-5', batchId: 'ZLEAGR-00002-B2' },
        { consumptionId: `cons-${Date.now() - 18000}`, isAnnulled: false, productName: 'Mączka rybna', actualConsumedQuantityKg: 353, actualSourcePalletId: 'some-raw-id-6', batchId: 'ZLEAGR-00002-B2' },
    ],
    batches: [
      { id: 'ZLEAGR-00002-B1', batchNumber: 1, targetWeight: 2000, status: 'completed', startTime: yesterday.toISOString(), endTime: yesterday.toISOString(), consumedPallets: [], producedGoods: [] },
      { id: 'ZLEAGR-00002-B2', batchNumber: 2, targetWeight: 2000, status: 'completed', startTime: yesterday.toISOString(), endTime: today.toISOString(), consumedPallets: [], producedGoods: [] },
      { id: 'ZLEAGR-00002-B3', batchNumber: 3, targetWeight: 2000, status: 'ongoing', startTime: today.toISOString(), consumedPallets: [], producedGoods: [] },
      { id: 'ZLEAGR-00002-B4', batchNumber: 4, targetWeight: 2000, status: 'planned', consumedPallets: [], producedGoods: [] },
      { id: 'ZLEAGR-00002-B5', batchNumber: 5, targetWeight: 2000, status: 'planned', consumedPallets: [], producedGoods: [] },
    ],
  },
  {
    id: 'ZLEAGR-00003',
    recipeId: 'REC003',
    recipeName: 'Cielak Grower',
    targetBatchSizeKg: 15000,
    plannedDate: formatDateForInitialData(sevenDaysAgo),
    status: 'completed',
    startTime: sevenDaysAgo.toISOString(),
    endTime: sixDaysAgo.toISOString(),
    createdBy: 'planista',
    createdAt: eightDaysAgo.toISOString(),
    actualProducedQuantityKg: 14950,
    hasShortages: false,
    shelfLifeMonths: 18,
    batches: [
        ...Array.from({ length: 7 }, (_, i): PsdBatch => ({
            id: `ZLEAGR-00003-B${i + 1}`,
            batchNumber: i + 1,
            targetWeight: 2000,
            status: 'completed',
            startTime: sevenDaysAgo.toISOString(),
            endTime: sixDaysAgo.toISOString(),
            consumedPallets: [],
            producedGoods: []
        })),
        {
            id: `ZLEAGR-00003-B8`,
            batchNumber: 8,
            targetWeight: 1000,
            status: 'completed',
            startTime: sixDaysAgo.toISOString(),
            endTime: sixDaysAgo.toISOString(),
            consumedPallets: [],
            producedGoods: []
        }
    ],
  },
    {
    id: 'ZLEAGR-00004',
    recipeId: 'REC004',
    recipeName: 'Kurczak Finiszer Plus',
    targetBatchSizeKg: 5000,
    plannedDate: formatDateForInitialData(today),
    status: 'planned',
    createdBy: 'planista',
    createdAt: today.toISOString(),
    hasShortages: true,
    shelfLifeMonths: 12,
    batches: [],
    notes: 'Uwaga: braki surowca Kukurydza. Zamówienie w drodze.'
  },
];
export const INITIAL_PSD_TASKS: PsdTask[] = [
  {
    id: 'ZLEPSD00001',
    name: 'ZLEPSD00001',
    recipeId: 'REC011',
    recipeName: 'Super Prosiak Turbo',
    targetQuantity: 1000,
    plannedDate: formatDateForInitialData(twoDaysAgo),
    shelfLifeMonths: 6,
    status: 'completed',
    startTime: twoDaysAgo.toISOString(),
    completedAt: yesterday.toISOString(),
    createdBy: 'planista',
    createdAt: fiveDaysAgo.toISOString(),
    batches: [{
        id: 'ZLEPSD00001-B1',
        batchNumber: 1,
        targetWeight: 1000,
        status: 'completed',
        startTime: twoDaysAgo.toISOString(),
        endTime: yesterday.toISOString(),
        consumedPallets: [
            { palletId: 'some-raw-id-7', displayId: 'some-raw-id-7', productName: 'Koncentrat białkowy', consumedWeight: 300 },
            { palletId: 'some-raw-id-8', displayId: 'some-raw-id-8', productName: 'Pszenica ekstrudowana', consumedWeight: 700 },
        ],
        producedGoods: [
            { id: 'fg-psd-1', displayId: psdId1, productName: 'Super Prosiak Turbo', producedWeight: 1000, productionDate: yesterday.toISOString(), expiryDate: new Date().toISOString(), isAnnulled: false }
        ]
    }]
  },
  {
    id: 'ZLEPSD00002',
    name: 'ZLEPSD00002',
    recipeId: 'REC003',
    recipeName: 'Cielak Grower',
    targetQuantity: 500,
    plannedDate: formatDateForInitialData(tomorrow),
    shelfLifeMonths: 12,
    status: 'planned',
    createdBy: 'planista',
    createdAt: today.toISOString(),
    batches: []
  }
];
export const INITIAL_MIXING_TASKS: MixingTask[] = [];
export const INITIAL_DISPATCH_ORDERS: DispatchOrder[] = [];
export const INITIAL_ADJUSTMENT_ORDERS: AdjustmentOrder[] = [];
export const INITIAL_PACKAGING_MATERIALS: PackagingMaterialLogEntry[] = [
    {
        id: generatePackagingId(),
        productName: 'Bela folii PE 80kg',
        initialWeight: 80,
        currentWeight: 65.5,
        dateAdded: '2024-07-15T08:00:00Z',
        supplier: 'Dostawca B',
        batchNumber: 'FOLIA-24-07-A',
        currentLocation: 'MOP01',
        locationHistory: [
            {
                movedBy: 'system',
                movedAt: '2024-07-15T08:00:00Z',
                previousLocation: null,
                targetLocation: 'MOP01',
                action: 'added_new_to_delivery_buffer',
                notes: 'Przyjęcie z dostawy'
            }
        ]
    },
    {
        id: generatePackagingId(),
        productName: 'Worek 25kg',
        initialWeight: 1250, // Assuming weight of empty bags, this might be better tracked in units
        currentWeight: 1000,
        dateAdded: '2024-07-18T11:30:00Z',
        supplier: 'Dostawca A',
        batchNumber: 'WOREK-24-07-C',
        currentLocation: 'MOP01',
        locationHistory: [
            {
                movedBy: 'system',
                movedAt: '2024-07-18T11:30:00Z',
                previousLocation: null,
                targetLocation: 'MOP01',
                action: 'added_new_to_delivery_buffer',
                notes: 'Przyjęcie z dostawy'
            }
        ]
    },
    {
        id: generatePackagingId(),
        productName: 'Worek 25kg',
        initialWeight: 500,
        currentWeight: 500,
        dateAdded: '2024-07-20T10:00:00Z',
        supplier: 'Dostawca C',
        batchNumber: 'WOREK-24-07-D',
        currentLocation: 'MOP01',
        isBlocked: true,
        blockReason: 'Zanieczyszczenie',
        locationHistory: [
            {
                movedBy: 'system',
                movedAt: '2024-07-20T10:00:00Z',
                previousLocation: null,
                targetLocation: 'MOP01',
                action: 'added_new_to_delivery_buffer',
                notes: 'Przyjęcie z dostawy'
            },
            {
                movedBy: 'lab',
                movedAt: '2024-07-21T11:00:00Z',
                previousLocation: 'MOP01',
                targetLocation: 'MOP01',
                action: 'lab_pallet_blocked',
                notes: 'Zanieczyszczenie'
            }
        ]
    }
];
export const INITIAL_PRODUCTS: {name: string, type: string}[] = [
    { name: 'Serwatka w proszku', type: 'raw_material' },
    { name: 'Olej palmowy', type: 'raw_material' },
    { name: 'Pszenica ekstrudowana', type: 'raw_material' },
    { name: 'Soja', type: 'raw_material' },
    { name: 'Mączka rybna', type: 'raw_material' },
    { name: 'Śruta kukurydziana', type: 'raw_material' },
    { name: 'Śruta sojowa', type: 'raw_material' },
    { name: 'Kukurydza', type: 'raw_material' },
    { name: 'Olej sojowy', type: 'raw_material' },
    { name: 'Pszenżyto', type: 'raw_material' },
    { name: 'Koncentrat białkowy', type: 'raw_material' },
    { name: 'MlekoMax Cielak', type: 'finished_good' },
    { name: 'Prosiak Prestarter Forte', type: 'finished_good' },
    { name: 'Cielak Grower', type: 'finished_good' },
    { name: 'Kurczak Finiszer Plus', type: 'finished_good' },
    { name: 'Indyk Starter Max', type: 'finished_good' },
    { name: 'Nioska Gold Egg', type: 'finished_good' },
    { name: 'Super Prosiak Turbo', type: 'finished_good' },
    { name: 'Worek 25kg', type: 'packaging' },
    { name: 'Bela folii PE 80kg', type: 'packaging' },
];
