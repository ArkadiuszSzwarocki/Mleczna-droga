
import React, { ReactNode } from 'react';

export interface PrinterDef {
  id: string;
  name: string;
  ip: string;
}

export enum View {
  Dashboard = 1,
  Scan,
  Users,
  Settings,
  Information,
  Instructions,
  History,
  Traceability,
  ProductionStock,
  QueueStatus,
  Recipes,
  MyAccount,
  Control,
  GenerateLoginQr,
  LabPalletRelease,
  LabAnalysisPage,
  LabAnalysisRanges,
  WhatsNew,
  GlobalSearch,
  SplitPallet,
  Logistics,
  DispatchFulfillment,
  ProductionPlanningAgro,
  CurrentProductionRun,
  ArchivedProductionRuns,
  ProductionPlanning2,
  MIXING_PLANNER,
  MIXING_WORKER,
  ADD_MIXING_ORDER,
  EDIT_MIXING_ORDER,
  ARCHIVED_MIXING_ORDERS,
  ARCHIVED_DISPATCH_ORDERS,
  ARCHIVED_DELIVERIES,
  Reporting,
  OEE_REPORT,
  DELIVERY_REPORT,
  BLOCKED_PALLETS_REPORT,
  SLOW_MOVING_PALLETS_REPORT,
  YIELD_VARIANCE_REPORT,
  SUPPLIER_PERFORMANCE_REPORT,
  InventoryReports,
  ADJUSTMENT_REPORT,
  LPSD_PRODUCTION,
  PSD_REPORTS,
  RawMaterialDemand,
  PackagingDemand,
  PSD_TASK_REPORT,
  RecipeAdjustments,
  CreateAdjustmentOrder,
  ManageAdjustments,
  ManageProducts,
  ManageSuppliers,
  ManageCustomers,
  ManagePalletBalances,
  InventoryDashboard,
  InventorySession,
  InventoryReview,
  InventoryFinalization,
  AllRawMaterialsView,
  AllFinishedGoodsView,
  AllPackagingMaterialsView,
  ManageProductionStations,
  AppLogs,
  SidebarLayoutSettings,
  WarehouseGroupSettings,
  WarehouseAdmin,
  GoodsDeliveryReception,
  DeliveryList,
  UserPermissions,
  PalletMovementTester,
  LAB_ARCHIVE_SAMPLING,
  InternalTransfers,
  InternalTransferReception,
  WORKFLOW_VISUALIZATION,
  ProductionRelease,
  PackagingOperator,
  AssemblyReport,
  ARCHIVED_PRODUCTION_RUN_REPORT,
  MaterialArchive,
  NotFound,
  WarehouseDashboard,
  SourceWarehouseMS01,
  BufferMS01View,
  BufferMP01View,
  SubWarehouseMP01,
  MDM01View,
  PSD_WAREHOUSE,
  MGW01_Receiving,
  MGW01,
  MGW02,
  MOP01View,
  KO01View,
  PendingLabels,
  LocationDetail,
  OsipWarehouse,
  AllWarehousesView,
  LogoShowcase,
  RolesManagement,
    ManagePackagingForms,
}

export interface Supplier {
    value: string;
    label: string;
    nip?: string;
    address?: string;
    city?: string;
    zip?: string;
    email?: string;
    phone?: string;
    notes?: string;
}

export interface Customer extends Supplier {
    contactPerson?: string;
    paymentTerms?: string;
    priceList?: string;
}

export type PalletType = 'EUR' | 'EPAL' | 'H1' | 'IND' | 'PLASTIC';

export interface PalletBalance {
    contractorValue: string; 
    contractorLabel: string;
    balances: Record<PalletType, number>;
}

export interface PalletTransaction {
    id: string;
    timestamp: string;
    contractorValue: string;
    type: PalletType;
    quantity: number; 
    direction: 'IN' | 'OUT';
    referenceDoc?: string;
    createdBy: string;
}

export enum Permission {
  MANAGE_USERS = 'manage_users',
  MANAGE_PERMISSIONS = 'manage_permissions',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  MANAGE_PRODUCTS = 'manage_products',
  MANAGE_PRODUCTION_STATIONS = 'manage_production_stations',
  CREATE_DELIVERY = 'create_delivery',
  PROCESS_DELIVERY_LAB = 'process_delivery_lab',
  PROCESS_DELIVERY_WAREHOUSE = 'process_delivery_warehouse',
  MANAGE_DELIVERIES = 'manage_deliveries',
  PLAN_PRODUCTION_AGRO = 'plan_production_agro',
  EXECUTE_PRODUCTION_AGRO = 'execute_production_agro',
  PLAN_PRODUCTION_PSD = 'plan_production_psd',
  EXECUTE_PRODUCTION_PSD = 'execute_production_psd',
  PLAN_MIXING = 'plan_mixing',
  EXECUTE_MIXING = 'execute_mixing',
  PLAN_DISPATCH_ORDERS = 'plan_dispatch_orders',
  MANAGE_DISPATCH_ORDERS = 'manage_dispatch_orders',
  PROCESS_ANALYSIS = 'process_analysis',
  MANAGE_ADJUSTMENTS = 'manage_adjustments',
  MANAGE_PALLET_LOCK = 'manage_pallet_lock',
  EXTEND_EXPIRY_DATE = 'extend_expiry_date',
  PLAN_INTERNAL_TRANSFERS = 'plan_internal_transfers',
  MANAGE_INTERNAL_TRANSFERS = 'manage_internal_transfers',
  MANAGE_RECIPES = 'manage_recipes',
  VIEW_TRACEABILITY = 'view_traceability',
  MANAGE_SUPPLIERS_CUSTOMERS = 'manage_suppliers_customers'
}

export type UserRole = 'admin' | 'planista' | 'magazynier' | 'kierownik magazynu' | 'lab' | 'operator_psd' | 'operator_agro' | 'operator_procesu' | 'user' | 'boss' | 'lider' | string;

export interface User {
  id: string;
  username: string;
  // FIX: Added password property to User interface for legacy support and initial setup.
  password?: string;
  role: UserRole;
  subRole: string; 
  pin?: string;
  email?: string;
  isActive?: boolean | number;
  passwordLastChanged?: string;
  isTemporaryPassword?: boolean;
  permissions?: Permission[];
}

export type ProductionEventType = 'problem' | 'downtime' | 'shift_change' | 'transition' | 'breakdown' | 'other';

export interface ProductionEvent {
    id: string;
    timestamp: string;
    type: ProductionEventType;
    description: string;
    user: string;
}

export interface WarehouseInfo {
  id: string;
  label: string;
  view: View;
  isLocationDetailLink?: boolean;
  permission?: Permission;
}

export interface MoveMetadata {
  movedBy: string;
  movedAt: string;
  previousLocation: string | null;
  targetLocation: string;
  action: string;
  notes?: string;
  deliveryOrderRef?: string;
  deliveryDate?: string;
  documentName?: string;
  deliveryPosition?: number;
}

export interface Document {
  name: string;
  type: string;
  url: string;
  addedBy: string;
  addedAt: string;
}

export interface AnalysisResult {
    name: string;
    value: string;
    unit: string;
}

export interface PalletData {
  nrPalety: string;
  nazwa: string;
  productGroup?: string;
  dataProdukcji: string;
  dataPrzydatnosci: string;
  initialWeight: number;
  currentWeight: number;
  isBlocked: boolean;
  blockReason?: string;
  batchNumber?: string;
  packageForm?: string;
  unit?: string; 
  labAnalysisNotes?: string;
  unitsPerPallet?: number;
  weightPerBag?: number;
  analysisResults?: AnalysisResult[];
  documents?: Document[];
  deliveryPosition?: number;
}

export interface RawMaterialLogEntry {
  id: string;
  palletData: PalletData;
  currentLocation: string | null;
  locationHistory: MoveMetadata[];
  dateAdded: string;
  lastValidatedAt: string;
}

export interface PackagingMaterialLogEntry {
    id: string;
    productName: string;
    initialWeight: number;
    currentWeight: number;
    dateAdded: string;
    unit?: string; 
    supplier?: string;
    batchNumber?: string;
    currentLocation: string | null;
    isBlocked?: boolean;
    blockReason?: string;
    locationHistory: MoveMetadata[];
    packageForm?: string;
}

export interface FinishedGoodItem {
  id: string;
  displayId: string;
  finishedGoodPalletId: string;
  productName: string;
  palletType: string;
  quantityKg: number;
  producedWeight: number;
  grossWeightKg: number;
  productionDate: string;
  expiryDate: string;
  status: 'pending_label' | 'available' | 'blocked' | 'dispatched' | 'consumed_in_mixing' | 'consumed_in_split' | 'returned_to_production' | 'consumed_and_archived';
  blockReason?: string;
  isBlocked: boolean;
  currentLocation: string | null;
  productionRunId?: string;
  sourceMixingTaskId?: string;
  psdTaskId?: string;
  batchId?: string;
  batchSplit?: { batchId: string; weight: number }[];
  sourceComposition?: { productName: string, weight: number, sourcePalletId: string }[];
  labAnalysisNotes?: string;
  documents?: Document[];
  analysisResults?: AnalysisResult[];
  locationHistory: MoveMetadata[];
  producedAt: string;
}

export interface AnalysisRange {
  id: string;
  name: string;
  min: number;
  max: number;
  unit: string;
}

export interface RecipeIngredient {
    productName: string;
    quantityKg: number;
}

export interface PackagingBOM {
    bag: { id: string; name: string };
    bagCapacityKg: number;
    foilRoll: { id: string; name: string };
    foilWeightPerBagKg: number;
    palletType: string;
    stretchFilm?: { id: string; name: string };
    slipSheet?: { id: string; name: string };
}

export interface Recipe {
    id: string;
    name: string;
    productionRateKgPerMinute: number;
    ingredients: RecipeIngredient[];
    packagingBOM?: PackagingBOM;
}

export interface DeliveryItem {
    id: string;
    position: number;
    productId: string;
    // FIX: Added productCode property to Delivery