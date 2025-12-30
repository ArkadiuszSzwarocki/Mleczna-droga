
import { View, Permission, UserRole, WarehouseInfo, Recipe, AnalysisRange, PrinterDef } from './types';

export const INITIAL_PRINTERS: PrinterDef[] = [
    { id: 'biuro', name: 'Biuro (TSC)', ip: '192.168.1.236' },
    { id: 'magazyn', name: 'Magazyn (TSC)', ip: '192.168.1.237' },
    { id: 'handel', name: 'Handel (TSC)', ip: '192.168.1.240' },
    { id: 'osip', name: 'OSIP', ip: '192.168.1.160' },
];

export const R_LOCATIONS_R01_CONST: string[] = [];
export const R_LOCATIONS_R02_CONST: string[] = [];
export const R_LOCATIONS_R03_CONST: string[] = [];
export const R_LOCATIONS_R04_CONST = Array.from({ length: 20 }, (_, i) => `R04${(i + 1).toString().padStart(2, '0')}01`);
export const R_LOCATIONS_R05_CONST = Array.from({ length: 20 }, (_, i) => `R05${(i + 1).toString().padStart(2, '0')}01`);
export const R_LOCATIONS_R06_CONST = Array.from({ length: 10 }, (_, i) => `R06${(i + 1).toString().padStart(2, '0')}01`);
export const R_LOCATIONS_R07_CONST = Array.from({ length: 20 }, (_, i) => `R07${(i + 1).toString().padStart(2, '0')}01`);

export const OSIP_LOCATIONS_CONST = Array.from({ length: 77 }, (_, i) => `OS${(i + 1).toString().padStart(2, '0')}`);

export const SOURCE_WAREHOUSE_ID_MS01 = 'MS01';
export const SUB_WAREHOUSE_ID = 'MP01';
export const BUFFER_MS01_ID = 'BF_MS01';
export const BUFFER_MP01_ID = 'BF_MP01';
export const MDM01_WAREHOUSE_ID = 'MDM01';
export const KO01_WAREHOUSE_ID = 'KO01';
export const PSD_WAREHOUSE_ID = 'PSD';
export const MGW01_WAREHOUSE_ID = 'MGW01';
export const MGW02_WAREHOUSE_ID = 'MGW02';
export const MOP01_WAREHOUSE_ID = 'MOP01';
export const MGW01_RECEIVING_AREA_ID = 'MGW01-PRZYJECIA';
export const LOADING_BAY_ID = 'RAMPA';
export const MIXING_ZONE_ID = 'MIX01';
export const VIRTUAL_LOCATION_MISSING = 'ZAGUBIONE';
export const OSIP_WAREHOUSE_ID = 'OSIP';
export const IN_TRANSIT_OSIP_ID = 'W_TRANZYCIE_OSIP';
export const VIRTUAL_LOCATION_ARCHIVED = 'ARCHIVED';


export const PRODUCTION_STATIONS_BB = Array.from({ length: 24 }, (_, i) => `BB${(i + 1).toString().padStart(2, '0')}`);
export const PRODUCTION_STATIONS_MZ = ['MZ01', 'MZ02', 'MZ03', 'MZ04', 'MZ05', 'MZ06', 'MZ05-01', 'MZ06-01'];
export const M_LOCATIONS_BIG_BAGS = ['M01', 'M02'];
export const MZ_LOCATIONS_BAGS: string[] = [];

export const ALL_MANAGEABLE_WAREHOUSES: WarehouseInfo[] = [
    { id: 'all', label: 'Wszystkie Magazyny', view: View.AllWarehousesView },
    { id: SOURCE_WAREHOUSE_ID_MS01, label: 'Magazyn Główny (MS01)', view: View.SourceWarehouseMS01 },
    { id: OSIP_WAREHOUSE_ID, label: 'Magazyn Zewnętrzny (OSiP)', view: View.OsipWarehouse },
    { id: BUFFER_MS01_ID, label: 'Bufor Surowców (BF_MS01)', view: View.BufferMS01View },
    { id: BUFFER_MP01_ID, label: 'Bufor Produkcyjny (BF_MP01)', view: View.BufferMP01View },
    { id: SUB_WAREHOUSE_ID, label: 'Magazyn Produkcyjny (MP01)', view: View.SubWarehouseMP01 },
    { id: MDM01_WAREHOUSE_ID, label: 'Magazyn Dodatków (MDM01)', view: View.MDM01View },
    { id: KO01_WAREHOUSE_ID, label: 'Strefa Konfekcji (KO01)', view: View.KO01View },
    { id: PSD_WAREHOUSE_ID, label: 'Magazyn PSD', view: View.PSD_WAREHOUSE },
    { id: MOP01_WAREHOUSE_ID, label: 'Magazyn Opakowań (MOP01)', view: View.MOP01View },
    { id: 'pending_labels', label: 'Etykiety Oczekujące', view: View.PendingLabels },
    { id: MGW01_RECEIVING_AREA_ID, label: 'Strefa Przyjęć Wyrobów Gotowych', view: View.MGW01_Receiving },
    { id: MGW01_WAREHOUSE_ID, label: 'Magazyn Wyrobów Gotowych (MGW01)', view: View.MGW01 },
    { id: MGW02_WAREHOUSE_ID, label: 'Magazyn Wyrobów Gotowych (MGW02)', view: View.MGW02 },
    { id: MIXING_ZONE_ID, label: 'Strefa Miksowania', view: View.MIXING_WORKER },
    { id: 'R01', label: 'Regał R01', view: View.LocationDetail, isLocationDetailLink: true },
    { id: 'R02', label: 'Regał R02', view: View.LocationDetail, isLocationDetailLink: true },
    { id: 'R03', label: 'Regał R03', view: View.LocationDetail, isLocationDetailLink: true },
    { id: 'R04', label: 'Regał R04', view: View.LocationDetail, isLocationDetailLink: true },
    { id: 'R07', label: 'Regał R07', view: View.LocationDetail, isLocationDetailLink: true },
];

export const MGW01_LAYOUT_ROWS = 10;
export const MGW01_LAYOUT_SPOTS_PER_ROW = 10;
export const MGW02_LAYOUT_ROWS_PER_SIDE = 5;
export const MGW02_LAYOUT_SPOTS_PER_ROW = 10;

export const WAREHOUSE_RACK_PREFIX_MAP: Record<string, string[]> = {
    [SUB_WAREHOUSE_ID]: ['R01', 'R02', 'R03', 'R04', 'R05', 'R07'],
    [MDM01_WAREHOUSE_ID]: ['R06'],
};

export const SUPPLIERS_LIST = [
    { value: 'supplier_a', label: 'Dostawca A' },
    { value: 'supplier_b', label: 'Dostawca B' },
    { value: 'supplier_c', label: 'Dostawca C' },
    { value: 'transfer_wewnetrzny', label: 'Transfer Wewnętrzny' },
];

export const SAMPLE_RECIPES: Recipe[] = [
    { id: 'REC001', name: 'MlekoMax Cielak', ingredients: [{ productName: 'Serwatka w proszku', quantityKg: 600 }, { productName: 'Olej palmowy', quantityKg: 200 }], productionRateKgPerMinute: 83.33, packagingBOM: { bag: { id: 'PKG-BAG-25KG', name: 'Worek 25kg' }, bagCapacityKg: 25, foilRoll: { id: 'PKG-FOIL-PE80', name: 'Bela folii PE 80kg' }, foilWeightPerBagKg: 0.1, palletType: 'EUR' } },
    { id: 'REC002', name: 'Prosiak Prestarter Forte', ingredients: [{ productName: 'Pszenica ekstrudowana', quantityKg: 400 }, { productName: 'Soja', quantityKg: 300 }, { productName: 'Mączka rybna', quantityKg: 150 }], productionRateKgPerMinute: 83.33, packagingBOM: { bag: { id: 'PKG-BAG-25KG', name: 'Worek 25kg' }, bagCapacityKg: 25, foilRoll: { id: 'PKG-FOIL-PE80', name: 'Bela folii PE 80kg' }, foilWeightPerBagKg: 0.1, palletType: 'EUR' } },
    { id: 'REC003', name: 'Cielak Grower', ingredients: [{ productName: 'Śruta kukurydziana', quantityKg: 500 }, { productName: 'Śruta sojowa', quantityKg: 300 }], productionRateKgPerMinute: 83.33, packagingBOM: { bag: { id: 'PKG-BAG-25KG', name: 'Worek 25kg' }, bagCapacityKg: 25, foilRoll: { id: 'PKG-FOIL-PE80', name: 'Bela folii PE 80kg' }, foilWeightPerBagKg: 0.1, palletType: 'EUR' } },
    { id: 'REC004', name: 'Kurczak Finiszer Plus', ingredients: [{ productName: 'Kukurydza', quantityKg: 650 }, { productName: 'Olej sojowy', quantityKg: 100 }, { productName: 'Pszenżyto', quantityKg: 250 }], productionRateKgPerMinute: 83.33, packagingBOM: { bag: { id: 'PKG-BAG-25KG', name: 'Worek 25kg' }, bagCapacityKg: 25, foilRoll: { id: 'PKG-FOIL-PE80', name: 'Bela folii PE 80kg' }, foilWeightPerBagKg: 0.1, palletType: 'EUR' } },
    { id: 'REC005', name: 'Indyk Starter Max', ingredients: [{ productName: 'Soja', quantityKg: 450 }, { productName: 'Kukurydza', quantityKg: 450 }, { productName: 'Olej palmowy', quantityKg: 100 }], productionRateKgPerMinute: 83.33, packagingBOM: { bag: { id: 'PKG-BAG-25KG', name: 'Worek 25kg' }, bagCapacityKg: 25, foilRoll: { id: 'PKG-FOIL-PE80', name: 'Bela folii PE 80kg' }, foilWeightPerBagKg: 0.1, palletType: 'EUR' } },
    { id: 'REC006', name: 'Nioska Gold Egg', ingredients: [{ productName: 'Pszenica ekstrudowana', quantityKg: 300 }, { productName: 'Wapień paszowy', quantityKg: 100 }, { productName: 'Śruta kukurydziana', quantityKg: 600 }], productionRateKgPerMinute: 83.33, packagingBOM: { bag: { id: 'PKG-BAG-25KG', name: 'Worek 25kg' }, bagCapacityKg: 25, foilRoll: { id: 'PKG-FOIL-PE80', name: 'Bela folii PE 80kg' }, foilWeightPerBagKg: 0.1, palletType: 'EUR' } },
    { id: 'REC007', name: 'Bydło Opmilk 3000', ingredients: [{ productName: 'Wysłodki buraczane', quantityKg: 400 }, { productName: 'Drożdże paszowe', quantityKg: 100 }, { productName: 'Śruta sojowa', quantityKg: 500 }], productionRateKgPerMinute: 83.33, packagingBOM: { bag: { id: 'PKG-BAG-25KG', name: 'Worek 25kg' }, bagCapacityKg: 25, foilRoll: { id: 'PKG-FOIL-PE80', name: 'Bela folii PE 80kg' }, foilWeightPerBagKg: 0.1, palletType: 'EUR' } },
    { id: 'REC008', name: 'Trzoda Farmer Pro', ingredients: [{ productName: 'Pszenżyto', quantityKg: 700 }, { productName: 'Koncentrat białkowy', quantityKg: 250 }, { productName: 'Zakwaszacz', quantityKg: 50 }], productionRateKgPerMinute: 83.33, packagingBOM: { bag: { id: 'PKG-BAG-25KG', name: 'Worek 25kg' }, bagCapacityKg: 25, foilRoll: { id: 'PKG-FOIL-PE80', name: 'Bela folii PE 80kg' }, foilWeightPerBagKg: 0.1, palletType: 'EUR' } },
    { id: 'REC009', name: 'Cielak Super Start', ingredients: [{ productName: 'Odtłuszczone mleko w proszku', quantityKg: 500 }, { productName: 'Serwatka w proszku', quantityKg: 300 }, { productName: 'Laktoza', quantityKg: 200 }], productionRateKgPerMinute: 83.33, packagingBOM: { bag: { id: 'PKG-BAG-25KG', name: 'Worek 25kg' }, bagCapacityKg: 25, foilRoll: { id: 'PKG-FOIL-PE80', name: 'Bela folii PE 80kg' }, foilWeightPerBagKg: 0.1, palletType: 'EUR' } },
    { id: 'REC010', name: 'Królik Hodowca', ingredients: [{ productName: 'Wysłodki buraczane', quantityKg: 800 }, { productName: 'Premiks mineralny Bydło', quantityKg: 200 }], productionRateKgPerMinute: 83.33, packagingBOM: { bag: { id: 'PKG-BAG-25KG', name: 'Worek 25kg' }, bagCapacityKg: 25, foilRoll: { id: 'PKG-FOIL-PE80', name: 'Bela folii PE 80kg' }, foilWeightPerBagKg: 0.1, palletType: 'EUR' } },
    { id: 'REC011', name: 'Super Prosiak Turbo', ingredients: [{ productName: 'Koncentrat białkowy', quantityKg: 300 }, { productName: 'Pszenica ekstrudowana', quantityKg: 700 }], productionRateKgPerMinute: 50, packagingBOM: { bag: { id: 'PKG-BAG-25KG', name: 'Worek 25kg' }, bagCapacityKg: 25, foilRoll: { id: 'PKG-FOIL-PE80', name: 'Bela folii PE 80kg' }, foilWeightPerBagKg: 0.1, palletType: 'EUR' } },
];
export const AGRO_LINE_PRODUCTION_RATE_KG_PER_MINUTE = 40000 / (8 * 60); // 40,000 kg / 8h
export const PRODUCTION_RATE_KG_PER_MINUTE = 50;
export const DEFAULT_SETTINGS = { EXPIRY_WARNING_DAYS: 45, EXPIRY_CRITICAL_DAYS: 7, SESSION_TIMEOUT_MINUTES: 15, PROMPT_TIMEOUT_MINUTES: 2 };
export const DEFAULT_PRINT_SERVER_URL = 'https://192.168.1.143:3001';
export const DEFAULT_NOTIFICATION_SERVER_URL = '';
export const DEFAULT_WAREHOUSE_NAV_LAYOUT: any[] = [
    {
        id: 'all',
        isGroup: false,
    },
    {
        id: 'group-raw-materials',
        isGroup: true,
        label: 'Magazyny Surowców',
        warehouseIds: [
            SOURCE_WAREHOUSE_ID_MS01,
            MDM01_WAREHOUSE_ID,
            OSIP_WAREHOUSE_ID,
        ]
    },
    {
        id: 'group-buffers',
        isGroup: true,
        label: 'Bufory',
        warehouseIds: [
            BUFFER_MS01_ID,
            BUFFER_MP01_ID,
        ]
    },
    {
        id: 'group-production-warehouse',
        isGroup: true,
        label: 'Magazyn Produkcyjny',
        warehouseIds: [
            SUB_WAREHOUSE_ID,
            'R01',
            'R02',
            'R03',
            'R04',
            'R07',
            PSD_WAREHOUSE_ID,
        ]
    },
    {
        id: 'group-finished-goods',
        isGroup: true,
        label: 'Magazyn Wyrobów Gotowych',
        warehouseIds: [
            MGW01_RECEIVING_AREA_ID,
            MGW01_WAREHOUSE_ID,
            MGW02_WAREHOUSE_ID,
            'pending_labels'
        ]
    },
    {
        id: 'group-special-zones',
        isGroup: true,
        label: 'Strefy Specjalne',
        warehouseIds: [
            KO01_WAREHOUSE_ID,
            MOP01_WAREHOUSE_ID,
            MIXING_ZONE_ID
        ]
    }
];
export const STATION_RAW_MATERIAL_MAPPING_DEFAULT: Record<string, string> = {
    'BB01': 'Serwatka w proszku',
    'BB02': 'Olej palmowy',
    'BB03': 'Pszenica ekstrudowana',
    'BB04': 'Pszenica ekstrudowana',
    'BB05': 'Mączka rybna',
    'BB06': 'Śruta kukurydziana',
    'BB07': 'Śruta sojowa',
    'BB08': 'Soja',
    'BB09': 'Olej sojowy',
    'BB10': 'Pszenżyto',
    'BB11': 'Koncentrat białkowy',
    'BB12': 'Odtłuszczone mleko w proszku',
    'BB13': 'Wysłodki buraczane',
    'MZ01': 'Pszenica ekstrudowana',
    'MZ02': 'Wapień paszowy',
    'MZ03': 'Drożdże paszowe',
    'MZ04': 'Zakwaszacz',
    'MZ05': 'Laktoza',
    'MZ06': 'Premiks mineralny Bydło'
};

export const PREDEFINED_ROLES = [
    'admin', 'planista', 'magazynier', 'kierownik magazynu', 'lab', 
    'operator_psd', 'operator_agro', 'user', 'boss', 'operator_procesu', 'lider'
];

export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
    admin: Object.values(Permission),
    planista: [Permission.PLAN_PRODUCTION_AGRO, Permission.PLAN_PRODUCTION_PSD, Permission.PLAN_MIXING, Permission.PLAN_DISPATCH_ORDERS, Permission.MANAGE_DELIVERIES, Permission.CREATE_DELIVERY, Permission.MANAGE_ADJUSTMENTS, Permission.PLAN_INTERNAL_TRANSFERS, Permission.MANAGE_INTERNAL_TRANSFERS],
    magazynier: [Permission.CREATE_DELIVERY, Permission.PROCESS_DELIVERY_WAREHOUSE, Permission.EXECUTE_PRODUCTION_AGRO, Permission.MANAGE_DISPATCH_ORDERS, Permission.MANAGE_INTERNAL_TRANSFERS],
    'kierownik magazynu': [Permission.CREATE_DELIVERY, Permission.PROCESS_DELIVERY_WAREHOUSE, Permission.EXECUTE_PRODUCTION_AGRO, Permission.MANAGE_DISPATCH_ORDERS, Permission.MANAGE_PALLET_LOCK, Permission.MANAGE_INTERNAL_TRANSFERS],
    boss: Object.values(Permission),
    lab: [Permission.PROCESS_DELIVERY_LAB, Permission.PROCESS_ANALYSIS, Permission.MANAGE_ADJUSTMENTS, Permission.MANAGE_PALLET_LOCK, Permission.EXTEND_EXPIRY_DATE, Permission.CREATE_DELIVERY],
    operator_psd: [Permission.EXECUTE_PRODUCTION_PSD],
    operator_agro: [Permission.EXECUTE_PRODUCTION_AGRO],
    operator_procesu: [Permission.MANAGE_PRODUCTION_STATIONS, Permission.EXECUTE_PRODUCTION_AGRO, Permission.MANAGE_ADJUSTMENTS],
    lider: [Permission.EXECUTE_PRODUCTION_AGRO, Permission.EXECUTE_PRODUCTION_PSD, Permission.EXECUTE_MIXING, Permission.MANAGE_ADJUSTMENTS, Permission.MANAGE_INTERNAL_TRANSFERS],
    user: [],
};

PREDEFINED_ROLES.forEach(role => {
    if (!DEFAULT_PERMISSIONS[role]) {
        DEFAULT_PERMISSIONS[role] = [];
    }
});

export const DEFAULT_CUSTOM_PERMISSIONS: Permission[] = [];
export const SOUND_OPTIONS = [ { id: 'default', name: 'Domyślny (Beep)', path: null }, { id: 'ding', name: 'Ding', path: '/sounds/ding.mp3' }, ];
export const CHANGELOG_DATA: any[] = [
    { version: "1.0.0", date: "2024-07-26", changes: [{type: 'new', description: 'Initial release'}] }
];
export const DEFAULT_ANALYSIS_RANGES: AnalysisRange[] = [
  { id: '1', name: 'Tłuszcz', min: 50, max: 70, unit: '%' },
  { id: '2', name: 'Białko', min: 20, max: 40, unit: '%' },
  { id: '3', name: 'pH', min: 3, max: 5, unit: '' },
  { id: '4', name: 'Wilgotność', min: 5, max: 15, unit: '%' },
  { id: '5', name: 'Popiół surowy', min: 0, max: 10, unit: '%' },
  { id: '6', name: 'Włókno surowe', min: 2, max: 8, unit: '%' },
];
export const ADJUSTMENT_REASONS = [
    { value: '', label: 'Wybierz powód...' },
    { value: 'korekta_wilgotnosci', label: 'Korekta wilgotności' },
    { value: 'blad_nawazania', label: 'Błąd naważania' },
    { value: 'problem_z_surowcem', label: 'Problem z surowcem' },
    { value: 'inny', label: 'Inny' },
];
