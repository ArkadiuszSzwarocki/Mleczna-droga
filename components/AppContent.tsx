
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useUIContext } from './contexts/UIContext';
import { View } from '../types';
import { WAREHOUSE_SUB_VIEWS, ALL_NAV_DEFINITIONS } from '../src/navigation';
import { useAppContext } from './contexts/AppContext';
import { logger } from '../utils/logger';

// Ładowanie komponentów za pomocą ścieżek relatywnych
const LoginPage = lazy(() => import('./LoginPage'));
const DashboardPage = lazy(() => import('./DashboardPage'));
const ScanPage = lazy(() => import('./ScanPage'));
const WarehouseDashboardPage = lazy(() => import('./WarehouseDashboardPage'));
const UsersPage = lazy(() => import('./UsersPage'));
const SettingsPage = lazy(() => import('./SettingsPage'));
const InformationPage = lazy(() => import('./InformationPage'));
const InstructionsPage = lazy(() => import('./InstructionsPage'));
const HistoryPage = lazy(() => import('./HistoryPage'));
const TraceabilityPage = lazy(() => import('./TraceabilityPage'));
const ProductionStockPage = lazy(() => import('./ProductionStockPage'));
const QueueStatusPage = lazy(() => import('./QueueStatusPage'));
const RecipesPage = lazy(() => import('./RecipesPage'));
const MyAccountPage = lazy(() => import('./MyAccountPage'));
const ControlPage = lazy(() => import('./ControlPage'));
const GenerateLoginQrPage = lazy(() => import('./GenerateLoginQrPage'));
const LabPalletReleasePage = lazy(() => import('./LabPalletReleasePage'));
const LabAnalysisPage = lazy(() => import('./LabAnalysisPage'));
const LabAnalysisRangesPage = lazy(() => import('./LabAnalysisRangesPage'));
const WhatsNewPage = lazy(() => import('./WhatsNewPage'));
const GlobalSearchPage = lazy(() => import('./GlobalSearchPage'));
const SplitPalletPage = lazy(() => import('./SplitPalletPage'));
const LogisticsPage = lazy(() => import('./LogisticsPage'));
const DispatchFulfillmentPage = lazy(() => import('./DispatchFulfillmentPage'));
const ProductionPlanningAgroPage = lazy(() => import('./ProductionPlanningAgroPage'));
const CurrentProductionRunPage = lazy(() => import('./CurrentProductionRunPage'));
const ArchivedProductionRunsPage = lazy(() => import('./ArchivedProductionRunsPage'));
const ArchivedProductionRunReportPage = lazy(() => import('./ArchivedProductionRunReportPage'));
const PsdWeeklyPlannerPage = lazy(() => import('./PsdWeeklyPlannerPage'));
const MixingPlannerPage = lazy(() => import('./MixingPlannerPage'));
const MixingWorkerPage = lazy(() => import('./MixingWorkerPage'));
const AddMixingOrderPage = lazy(() => import('./AddMixingOrderPage'));
const EditMixingOrderPage = lazy(() => import('./EditMixingOrderPage'));
const ArchivedMixingOrdersPage = lazy(() => import('./ArchivedMixingOrdersPage'));
const ArchivedDispatchOrdersPage = lazy(() => import('./ArchivedDispatchOrdersPage'));
const ArchivedDeliveriesPage = lazy(() => import('./ArchivedDeliveriesPage'));
const OeeReportPage = lazy(() => import('./reports/OeeReportPage'));
const ReportsLandingPage = lazy(() => import('./ReportsLandingPage'));
const DeliveryReportPage = lazy(() => import('./reports/DeliveryReportPage'));
const BlockedPalletsReportPage = lazy(() => import('./reports/BlockedPalletsReportPage'));
const SlowMovingPalletsReportPage = lazy(() => import('./reports/SlowMovingPalletsReportPage'));
const YieldVarianceReportPage = lazy(() => import('./reports/YieldVarianceReportPage'));
const SupplierPerformanceReportPage = lazy(() => import('./reports/SupplierPerformanceReportPage'));
const InventoryReportsPage = lazy(() => import('./reports/InventoryReportsPage'));
const AdjustmentReportPage = lazy(() => import('./reports/AdjustmentReportPage'));
const LPSDProductionPage = lazy(() => import('./LPSDProductionPage'));
const PsdReportsPage = lazy(() => import('./PsdReportsPage'));
const PsdTaskReportPage = lazy(() => import('./PsdTaskReportPage'));
const RecipeAdjustmentsPage = lazy(() => import('./RecipeAdjustmentsPage'));
const CreateAdjustmentOrderPage = lazy(() => import('./CreateAdjustmentOrderPage'));
const ManageAdjustmentsPage = lazy(() => import('./ManageAdjustmentsPage'));
const ProductManagementPage = lazy(() => import('./ProductManagementPage'));
const ManagePackagingFormsPage = lazy(() => import('./ManagePackagingFormsPage'));
const ManageSuppliersPage = lazy(() => import('./ManageSuppliersPage'));
const ManageCustomersPage = lazy(() => import('./ManageCustomersPage'));
const ManagePalletBalancesPage = lazy(() => import('./ManagePalletBalancesPage'));
const InventoryDashboardPage = lazy(() => import('./InventoryPage'));
const InventoryScannerPage = lazy(() => import('./InventoryScannerPage'));
const InventoryReviewPage = lazy(() => import('./InventoryReviewPage'));
const InventoryFinalizationPage = lazy(() => import('./InventoryFinalizationPage'));
const AllRawMaterialsViewPage = lazy(() => import('./AllRawMaterialsViewPage'));
const AllFinishedGoodsViewPage = lazy(() => import('./AllFinishedGoodsViewPage'));
const AllPackagingMaterialsViewPage = lazy(() => import('./AllPackagingMaterialsViewPage'));
const ManageProductionStationsPage = lazy(() => import('./ManageProductionStationsPage'));
const AppLogsView = lazy(() => import('./AppLogsView'));
const SidebarLayoutSettingsPage = lazy(() => import('./SidebarLayoutSettingsPage'));
const WarehouseGroupSettingsPage = lazy(() => import('./WarehouseGroupSettingsPage'));
const WarehouseAdmin = lazy(() => import('./WarehouseLayoutInfoPage'));
const GoodsDeliveryReceptionPage = lazy(() => import('./GoodsDeliveryReceptionPage'));
const DeliveryListPage = lazy(() => import('./DeliveryListPage'));
const UserPermissionsPage = lazy(() => import('./UserPermissionsPage'));
const RawMaterialDemandPage = lazy(() => import('./RawMaterialDemandPage'));
const PackagingDemandPage = lazy(() => import('./PackagingDemandPage'));
const PalletMovementTesterPage = lazy(() => import('./PalletMovementTesterPage'));
const LabArchivePage = lazy(() => import('./LabArchivePage'));
const OsipWarehousePage = lazy(() => import('./OsipWarehousePage'));
const InternalTransfersPage = lazy(() => import('./InternalTransfersPage'));
const InternalTransferReceptionPage = lazy(() => import('./InternalTransferReceptionPage'));
const WorkFlowPage = lazy(() => import('./WorkFlowPage'));
const ProductionReleasePage = lazy(() => import('./ProductionReleasePage'));
const PackagingOperatorPage = lazy(() => import('./PackagingOperatorPage'));
const AssemblyReportPage = lazy(() => import('./AssemblyReportPage'));
const ArchivePage = lazy(() => import('./ArchivePage'));
const NotFoundPage = lazy(() => import('./NotFoundPage'));
const RolesManagementPage = lazy(() => import('./RolesManagementPage'));

const Sidebar = lazy(() => import('./Sidebar'));
const Header = lazy(() => import('./Header'));
const NotificationManager = lazy(() => import('./NotificationManager'));
const OfflineIndicator = lazy(() => import('./OfflineIndicator'));
const SessionExpiryPrompt = lazy(() => import('./SessionExpiryPrompt'));
const ForcePasswordChangeModal = lazy(() => import('./ForcePasswordChangeModal'));
const PasswordExpiryNotification = lazy(() => import('./PasswordExpiryNotification'));

const PalletDetailModal = lazy(() => import('./PalletDetailModal'));
const FinishedGoodDetailModal = lazy(() => import('./FinishedGoodDetailModal'));
const NetworkPrintModal = lazy(() => import('./NetworkPrintModal'));
const ConfirmationModal = lazy(() => import('./ConfirmationModal'));
const MoveFinishedGoodModal = lazy(() => import('./MoveFinishedGoodModal'));
const LabActionsModal = lazy(() => import('./LabActionsModal'));
const BlockPalletModal = lazy(() => import('./BlockPalletModal'));
const EditLabNotesModal = lazy(() => import('./EditLabNotesModal'));
const UnblockReasonModal = lazy(() => import('./UnblockReasonModal'));
const NotificationCenter = lazy(() => import('./NotificationCenter'));
const AddEditUserModal = lazy(() => import('./AddEditUserModal'));
const ResetPasswordModal = lazy(() => import('./ResetPasswordModal'));
const TextDisplayModal = lazy(() => import('./TextDisplayModal'));
const DocumentListModal = lazy(() => import('./DocumentListModal'));
const ManageLabDocumentsModal = lazy(() => import('./ManageLabDocumentsModal'));
const RawMaterialPalletListModal = lazy(() => import('./RawMaterialPalletListModal'));
const FinishedGoodPalletListModal = lazy(() => import('./FinishedGoodPalletListModal'));
const PackagingMaterialListModal = lazy(() => import('./PackagingMaterialListModal'));
const PackagingMaterialDetailModal = lazy(() => import('./PackagingMaterialDetailModal'));
const EditPsdTaskModal = lazy(() => import('./EditPsdTaskModal'));
const AssignToProductionStationModal = lazy(() => import('./AssignToProductionStationModal'));
const VerifyAssignmentsModal = lazy(() => import('./VerifyAssignmentsModal'));
const ToastContainer = lazy(() => import('./ToastContainer'));
const PinEntryModal = lazy(() => import('./PinEntryModal'));
const ChooseProductionTypeModal = lazy(() => import('./ChooseProductionTypeModal'));
const DocumentPreviewModal = lazy(() => import('./DocumentPreviewModal'));
const AddEditProductionRunModal = lazy(() => import('./AddEditProductionRunModal'));
const RecipeDisplayModal = lazy(() => import('./RecipeDisplayModal'));
const SuggestPalletFromSubWarehouseModal = lazy(() => import('./SuggestPalletFromSubWarehouseModal'));
const AssignAdjustmentToProductionModal = lazy(() => import('./AssignAdjustmentToProductionModal'));
const AdjustmentPickingModal = lazy(() => import('./AdjustmentPickingModal'));
const ExtendExpiryDateModal = lazy(() => import('./ExtendExpiryDateModal'));
const EditAdjustmentOrderModal = lazy(() => import('./EditAdjustmentOrderModal'));
const FeedbackModal = lazy(() => import('./FeedbackModal'));
const ConsumptionHistoryModal = lazy(() => import('./ConsumptionHistoryModal'));
const DeliverySummaryConfirmModal = lazy(() => import('./DeliverySummaryConfirmModal'));
const DispatchOrderDetailModal = lazy(() => import('./DispatchOrderDetailModal'));
const CreateInternalTransferModal = lazy(() => import('./CreateInternalTransferModal'));
const DispatchInternalTransferModal = lazy(() => import('./DispatchInternalTransferModal'));
const AddEditRecipeModal = lazy(() => import('./AddEditRecipeModal'));
const AddEditPackagingFormModal = lazy(() => import('./AddEditPackagingFormModal'));

const LoadingFallback = () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-secondary-900">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

export const AppContent = () => {
    const { isSessionPromptOpen, onExtendSession, remainingTime, showPasswordExpiryNotification, passwordExpiryDaysLeft, handleDismissPasswordExpiry, handleSaveLabNotes, handleUnblockPallet, handleBlockPallet, psdTasks, productionRunsList } = useAppContext();
    const { modalState, currentView, viewParams, handleSetView, modalHandlers, pinModal, theme, sidebarPosition } = useUIContext();
    const { currentUser, handleLogin, handleLogout, users } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [forcePasswordChange, setForcePasswordChange] = useState<{ user: any, reason: 'temporary' | 'expired' } | null>(null);
    const lastWidth = useRef(window.innerWidth);

    // Globalne śledzenie kliknięć (Interaction Tracking)
    useEffect(() => {
        const handleGlobalClick = (event: MouseEvent) => {
            if (!currentUser) return;

            const target = event.target as HTMLElement;
            const interactiveElement = target.closest('button, a, input, select, textarea, [role="button"]') as HTMLElement;
            
            if (interactiveElement) {
                // 1. Nazwa bazowa (z atrybutów lub tekstu)
                let actionName = 
                    interactiveElement.getAttribute('aria-label') || 
                    interactiveElement.getAttribute('title') || 
                    interactiveElement.getAttribute('name') ||
                    interactiveElement.innerText?.trim();
                
                if (!actionName || actionName === interactiveElement.tagName) {
                    const svgTitle = interactiveElement.querySelector('svg title');
                    actionName = svgTitle ? svgTitle.textContent?.trim() : (interactiveElement.id || interactiveElement.tagName);
                }

                // 2. Wykrywanie kontekstu (Menu vs Treść)
                const sidebar = interactiveElement.closest('aside');
                const header = interactiveElement.closest('header');
                const modal = interactiveElement.closest('[role="dialog"]');
                
                let finalLogMessage = actionName;
                let logContext = 'UI';

                if (sidebar) {
                    logContext = 'Nawigacja';
                    const group = interactiveElement.closest('li')?.querySelector('button[data-group]');
                    const groupName = group?.getAttribute('title');
                    finalLogMessage = groupName ? `${groupName} > ${actionName}` : actionName;
                } else if (header) {
                    logContext = 'Nagłówek';
                } else if (modal) {
                    logContext = 'Modal';
                    const modalTitle = modal.querySelector('h1, h2, h3')?.textContent?.trim();
                    finalLogMessage = modalTitle ? `${modalTitle}: ${actionName}` : actionName;
                } else {
                    const parentSection = interactiveElement.closest('section, div[class*="bg-white"], div[class*="bg-slate-50"]');
                    const sectionTitle = parentSection?.querySelector('h1, h2, h3, h4')?.textContent?.trim();
                    if (sectionTitle && !actionName.includes(sectionTitle)) {
                        finalLogMessage = `${sectionTitle}: ${actionName}`;
                    }
                }

                const viewName = ALL_NAV_DEFINITIONS.get(String(currentView))?.label || `Widok ${currentView}`;
                logger.log('info', `Kliknięcie: ${finalLogMessage.substring(0, 80)}`, `${logContext}:${viewName}`, currentUser.username);
            }
        };

        window.addEventListener('click', handleGlobalClick, { capture: true });
        return () => window.removeEventListener('click', handleGlobalClick, { capture: true });
    }, [currentUser, currentView]);

    useEffect(() => {
        const handleResize = () => {
            const currentWidth = window.innerWidth;
            const isDesktop = currentWidth >= 1024;
            const wasDesktop = lastWidth.current >= 1024;
            if (isDesktop && !wasDesktop) setIsSidebarOpen(true);
            else if (!isDesktop && wasDesktop) setIsSidebarOpen(false);
            lastWidth.current = currentWidth;
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const prevUserRef = useRef(currentUser);
    useEffect(() => {
        if (prevUserRef.current && !currentUser) handleSetView(View.Dashboard, null, true);
        prevUserRef.current = currentUser;
    }, [currentUser, handleSetView]);

    const handleLoginSuccess = (user: any) => {
        console.log('🔐 handleLoginSuccess wołane');
        // currentUser jest już ustawiony w AuthContext.handleLogin
        // Sprawdzujemy czy user ma hasło tymczasowe (z JWT)
        setForcePasswordChange(null);
        if (user?.isTemporaryPassword) {
            console.log('🔐 Hasło tymczasowe - pokazuję modal');
            setForcePasswordChange({ user, reason: 'temporary' });
        }
        else {
            console.log('🔐 Normalny login - idę do dashboardu');
            handleSetView(View.Dashboard, null, true);
        }
    };

    const handlePasswordChangeSuccess = (user: any) => {
        setForcePasswordChange(null);
        handleSetView(View.Dashboard, null, true);
    };

    // Modal do zmiany hasła powinien się pokazać ZAWSZE gdy forcePasswordChange jest ustawione
    if (forcePasswordChange) {
        console.log('🔐 Renderuję modal zmiany hasła');
        return (
            <Suspense fallback={<LoadingFallback />}>
                <div className="w-full h-screen bg-slate-100 dark:bg-secondary-900 flex items-center justify-center">
                    <ForcePasswordChangeModal 
                        isOpen={true}
                        user={forcePasswordChange.user}
                        reason={forcePasswordChange.reason}
                        onSuccess={handlePasswordChangeSuccess}
                        onClose={() => setForcePasswordChange(null)}
                    />
                </div>
            </Suspense>
        );
    }

    // Jeśli nie ma currentUser to pokaż LoginPage
    if (!currentUser) {
        console.log('🔐 Renderuję LoginPage');
        return (
            <Suspense fallback={<LoadingFallback />}>
                <LoginPage onLoginSuccess={handleLoginSuccess} />
            </Suspense>
        );
    }

    const handleGenerateLabel = (item: any) => {
        const isRaw = 'palletData' in item;
        modalHandlers.openNetworkPrintModal({
            type: isRaw ? 'raw_material' : 'finished_good',
            data: item,
            context: 'reprint'
        });
    };

    const handlePinSubmit = (pin: string) => {
        if (currentUser?.pin === pin) {
            if (pinModal.onSuccess) pinModal.onSuccess();
            modalHandlers.closePinPrompt();
        } else modalHandlers.setPinPromptError('Nieprawidłowy kod PIN.');
    };

    const renderView = () => {
        if (WAREHOUSE_SUB_VIEWS.has(currentView)) return <WarehouseDashboardPage />;

        switch (currentView) {
            case View.Dashboard: return <DashboardPage />;
            case View.Scan: return <ScanPage />;
            case View.Users: return <UsersPage />;
            case View.Settings: return <SettingsPage />;
            case View.Information: return <InformationPage />;
            case View.Instructions: return <InstructionsPage />;
            case View.History: return <HistoryPage />;
            case View.Traceability: return <TraceabilityPage />;
            case View.ProductionStock: return <ProductionStockPage />;
            case View.QueueStatus: return <QueueStatusPage />;
            case View.Recipes: return <RecipesPage />;
            case View.MyAccount: return <MyAccountPage />;
            case View.Control: return <ControlPage />;
            case View.GenerateLoginQr: return <GenerateLoginQrPage />;
            case View.LabPalletRelease: return <LabPalletReleasePage />;
            case View.LabAnalysisPage: return <LabAnalysisPage />;
            case View.LabAnalysisRanges: return <LabAnalysisRangesPage />;
            case View.WhatsNew: return <WhatsNewPage />;
            case View.GlobalSearch: return <GlobalSearchPage />;
            case View.SplitPallet: return <SplitPalletPage />;
            case View.Logistics: return <LogisticsPage />;
            case View.DispatchFulfillment: return <DispatchFulfillmentPage />;
            case View.ProductionPlanningAgro: return <ProductionPlanningAgroPage />;
            case View.CurrentProductionRun: return <CurrentProductionRunPage />;
            case View.ArchivedProductionRuns: return <ArchivedProductionRunsPage />;
            case View.ProductionPlanning2: return <PsdWeeklyPlannerPage />;
            case View.MIXING_PLANNER: return <MixingPlannerPage />;
            case View.MIXING_WORKER: return <MixingWorkerPage />;
            case View.ADD_MIXING_ORDER: return <AddMixingOrderPage />;
            case View.EDIT_MIXING_ORDER: return <EditMixingOrderPage />;
            case View.ARCHIVED_MIXING_ORDERS: return <ArchivedMixingOrdersPage />;
            case View.ARCHIVED_DISPATCH_ORDERS: return <ArchivedDispatchOrdersPage />;
            case View.ARCHIVED_DELIVERIES: return <ArchivedDeliveriesPage />;
            case View.Reporting: return <ReportsLandingPage onSelectReport={handleSetView} />;
            case View.OEE_REPORT: return <OeeReportPage />;
            case View.DELIVERY_REPORT: return <DeliveryReportPage />;
            case View.BLOCKED_PALLETS_REPORT: return <BlockedPalletsReportPage />;
            case View.SLOW_MOVING_PALLETS_REPORT: return <SlowMovingPalletsReportPage />;
            case View.YIELD_VARIANCE_REPORT: return <YieldVarianceReportPage />;
            case View.SUPPLIER_PERFORMANCE_REPORT: return <SupplierPerformanceReportPage />;
            case View.InventoryReports: return <InventoryReportsPage />;
            case View.ADJUSTMENT_REPORT: return <AdjustmentReportPage />;
            case View.LPSD_PRODUCTION: return <LPSDProductionPage />;
            case View.PSD_REPORTS: return <PsdReportsPage />;
            case View.RawMaterialDemand: return <RawMaterialDemandPage />;
            case View.PackagingDemand: return <PackagingDemandPage />;
            case View.PSD_TASK_REPORT: {
                const task = (psdTasks || []).find((t: any) => t && t.id === viewParams?.taskId);
                return task ? <PsdTaskReportPage task={task} /> : <div>Błąd raportu</div>;
            }
            case View.RecipeAdjustments: return <RecipeAdjustmentsPage />;
            case View.CreateAdjustmentOrder: return <CreateAdjustmentOrderPage />;
            case View.ManageAdjustments: return <ManageAdjustmentsPage />;
            case View.ManageProducts: return <ProductManagementPage />;
            case View.ManagePackagingForms: return <ManagePackagingFormsPage />;
            case View.ManageSuppliers: return <ManageSuppliersPage />;
            case View.ManageCustomers: return <ManageCustomersPage />;
            case View.ManagePalletBalances: return <ManagePalletBalancesPage />;
            case View.InventoryDashboard: return <InventoryDashboardPage />;
            case View.InventorySession: return <InventoryScannerPage />;
            case View.InventoryReview: return <InventoryReviewPage />;
            case View.InventoryFinalization: return <InventoryFinalizationPage />;
            case View.AllRawMaterialsView: return <AllRawMaterialsViewPage />;
            case View.AllFinishedGoodsView: return <AllFinishedGoodsViewPage />;
            case View.AllPackagingMaterialsView: return <AllPackagingMaterialsViewPage />;
            case View.ManageProductionStations: return <ManageProductionStationsPage />;
            case View.AppLogs: return <AppLogsView />;
            case View.SidebarLayoutSettings: return <SidebarLayoutSettingsPage />;
            case View.WarehouseGroupSettings: return <WarehouseGroupSettingsPage />;
            case View.WarehouseAdmin: return <WarehouseAdmin />;
            case View.GoodsDeliveryReception: return <GoodsDeliveryReceptionPage />;
            case View.DeliveryList: return <DeliveryListPage />;
            case View.UserPermissions: return <UserPermissionsPage />;
            case View.PalletMovementTester: return <PalletMovementTesterPage />;
            case View.LAB_ARCHIVE_SAMPLING: return <LabArchivePage />;
            case View.InternalTransfers: return <InternalTransfersPage />;
            case View.InternalTransferReception: return <InternalTransferReceptionPage />;
            case View.WORKFLOW_VISUALIZATION: return <WorkFlowPage />;
            case View.ProductionRelease: return <ProductionReleasePage />;
            case View.PackagingOperator: return <PackagingOperatorPage />;
            case View.AssemblyReport: return <AssemblyReportPage />;
            case View.MaterialArchive: return <ArchivePage />;
            case View.RolesManagement: return <RolesManagementPage />;
            case View.ARCHIVED_PRODUCTION_RUN_REPORT: {
                const run = (productionRunsList || []).find((r: any) => r.id === viewParams?.runId);
                return run ? <ArchivedProductionRunReportPage run={run} /> : <div>Błąd raportu</div>;
            }
            default: return <NotFoundPage />;
        }
    };

    return (
        <div className={`theme-${theme} h-screen flex bg-slate-100 dark:bg-secondary-900 overflow-hidden relative`}>
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
            <Suspense fallback={<div className="w-64 md:w-72 h-full bg-secondary-800" />}>
                {sidebarPosition === 'left' && <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onOpenFeedbackModal={() => modalHandlers.openFeedbackModal()} onLogout={handleLogout} />}
            </Suspense>
            <div className="flex-1 flex flex-col overflow-hidden w-full">
                <Suspense fallback={<div className="h-16 bg-white dark:bg-secondary-800" />}>
                    <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                </Suspense>
                <main className="flex-1 overflow-y-auto">
                    <Suspense fallback={<LoadingFallback />}>{renderView()}</Suspense>
                </main>
            </div>
             <Suspense fallback={<div className="w-64 md:w-72 h-full bg-secondary-800" />}>
                {sidebarPosition === 'right' && <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onOpenFeedbackModal={() => modalHandlers.openFeedbackModal()} onLogout={handleLogout} />}
            </Suspense>
            <Suspense fallback={null}>
                <NotificationManager /><OfflineIndicator /><ToastContainer />
                <SessionExpiryPrompt isOpen={isSessionPromptOpen} onExtendSession={onExtendSession} onLogout={handleLogout} remainingTime={remainingTime} />
                {showPasswordExpiryNotification && <PasswordExpiryNotification daysLeft={passwordExpiryDaysLeft} onDismiss={handleDismissPasswordExpiry} />}
                <PinEntryModal isOpen={pinModal.isOpen} onClose={modalHandlers.closePinPrompt} onSubmit={handlePinSubmit} error={pinModal.error} />
                <PalletDetailModal isOpen={modalState.isPalletDetailModalOpen} onClose={modalHandlers.closePalletDetailModal} pallet={modalState.palletForDetailModal} onGenerateLabel={handleGenerateLabel} />
                <FinishedGoodDetailModal isOpen={modalState.isFinishedGoodDetailModalOpen} onClose={modalHandlers.closeFinishedGoodDetailModal} item={modalState.fgItemForDetail} onGenerateLabel={handleGenerateLabel} onUpdateStatus={() => {}} />
                <NetworkPrintModal isOpen={modalState.isNetworkPrintModalOpen} onClose={modalHandlers.closeNetworkPrintModal} labelPayload={modalState.labelPayloadForPrint} />
                <ConfirmationModal isOpen={modalState.isConfirmationModalOpen} onClose={modalHandlers.closeConfirmationModal} {...modalState.confirmationModalProps} />
                <MoveFinishedGoodModal isOpen={modalState.isMoveFinishedGoodModalOpen} onClose={modalHandlers.closeMoveFinishedGoodModal} itemToMove={modalState.fgItemToMove} />
                <LabActionsModal isOpen={modalState.isLabActionsModalOpen} onClose={modalHandlers.closeLabActionsModal} item={modalState.itemForLabActions} />
                <BlockPalletModal isOpen={modalState.isBlockPalletModalOpen} onClose={modalHandlers.closeBlockPalletModal} item={modalState.itemToBlock} onConfirm={(id, r, u) => handleBlockPallet(id, 'raw', r, u)} currentUser={currentUser} />
                <UnblockReasonModal isOpen={modalState.isUnblockReasonModalOpen} onClose={modalHandlers.closeUnblockReasonModal} item={modalState.itemForUnblockReason} onConfirm={(reason) => handleUnblockPallet(modalState.itemForUnblockReason.id, 'raw', currentUser, reason)} />
                <ExtendExpiryDateModal isOpen={modalState.isExtendExpiryDateModalOpen} onClose={modalHandlers.closeExtendExpiryDateModal} item={modalState.itemForExpiryExtension} onSave={(itemId, newDate, reason) => handleUnblockPallet(itemId, 'raw', currentUser, reason, newDate)} />
                <EditLabNotesModal isOpen={modalState.isEditLabNotesModalOpen} onClose={modalHandlers.closeEditLabNotesModal} item={modalState.itemForLabNotes} onSave={(notes) => handleSaveLabNotes(modalState.itemForLabNotes.id, 'palletData' in modalState.itemForLabNotes, notes)} />
                <NotificationCenter isOpen={modalState.isNotificationCenterOpen} onClose={modalHandlers.closeNotificationCenter} />
                <AddEditUserModal isOpen={modalState.isAddEditUserModalOpen} onClose={modalHandlers.closeAddEditUserModal} userToEdit={modalState.userToEdit} />
                <AddEditPackagingFormModal isOpen={modalState.isAddEditPackagingFormModalOpen} onClose={modalHandlers.closeAddEditPackagingFormModal} formToEdit={modalState.packagingFormToEdit} onSaved={() => {/* noop: components can refresh */}} />
                <ResetPasswordModal isOpen={modalState.isResetPasswordModalOpen} onClose={modalHandlers.closeResetPasswordModal} user={modalState.userToResetPassword} />
                <AddEditRecipeModal isOpen={modalState.isAddEditRecipeModalOpen} onClose={modalHandlers.closeAddEditRecipeModal} recipeToEdit={modalState.recipeToEdit} />
                <TextDisplayModal isOpen={modalState.isTextDisplayModalOpen} onClose={modalHandlers.closeTextDisplayModal} title={modalState.textDisplayModalContent?.title} content={modalState.textDisplayModalContent?.content} />
                <ManageLabDocumentsModal isOpen={modalState.isManageLabDocumentsModalOpen} onClose={modalHandlers.closeManageLabDocumentsModal} item={modalState.itemForLabDocuments} />
                <EditPsdTaskModal isOpen={modalState.isEditPsdTaskModalOpen} onClose={modalHandlers.closeEditPsdTaskModal} task={modalState.taskForPsdEditModal} />
                <AssignToProductionStationModal isOpen={modalState.isAssignToStationModalOpen} onClose={modalHandlers.closeAssignToStationModal} stationId={modalState.stationForAssignment} />
                <RecipeDisplayModal isOpen={modalState.isRecipeDetailModalOpen} onClose={modalHandlers.closeRecipeDetailModal} recipe={modalState.recipeForDetailModal} />
                <AddEditProductionRunModal isOpen={modalState.isAddEditRunModalOpen} onClose={modalHandlers.closeAddEditRunModal} {...modalState.addEditRunModalProps} />
                <VerifyAssignmentsModal isOpen={modalState.isVerifyAssignmentsModalOpen} onClose={modalHandlers.closeVerifyAssignmentsModal} runsToVerify={modalState.runsToVerify} />
                <FinishedGoodPalletListModal isOpen={modalState.isFinishedGoodListModalOpen} onClose={modalHandlers.closeFinishedGoodListModal} productName={modalState.productNameForFgList} />
                <RawMaterialPalletListModal isOpen={modalState.isRawMaterialListModalOpen} onClose={modalHandlers.closeRawMaterialListModal} productName={modalState.productNameForList} />
                <PackagingMaterialListModal isOpen={modalState.isPackagingMaterialListModalOpen} onClose={modalHandlers.closePackagingMaterialListModal} productName={modalState.productNameForPackagingList} onItemSelect={modalHandlers.openPackagingMaterialDetailModal} />
                <PackagingMaterialDetailModal isOpen={modalState.isPackagingMaterialDetailModalOpen} onClose={modalHandlers.closePackagingMaterialDetailModal} item={modalState.itemForPackagingDetail} />
                <ChooseProductionTypeModal isOpen={modalState.isChooseProductionTypeModalOpen} onClose={modalHandlers.closeChooseProductionTypeModal} {...modalState.productionChoiceModalProps} />
                <ConsumptionHistoryModal isOpen={modalState.isConsumptionHistoryModalOpen} onClose={modalHandlers.closeConsumptionHistoryModal} run={(productionRunsList || []).find(r => r.id === modalState.itemForConsumptionHistory?.runId) || null} batchId={modalState.itemForConsumptionHistory?.batchId || null} productName={modalState.itemForConsumptionHistory?.productName || null} isWeighingFinished={modalState.itemForConsumptionHistory?.isWeighingFinished || false} />
                <DeliverySummaryConfirmModal isOpen={modalState.isDeliverySummaryConfirmModalOpen} onClose={modalHandlers.closeDeliverySummaryConfirmModal} onConfirm={modalState.deliveryForSummary?.onConfirm} delivery={modalState.deliveryForSummary?.delivery} />
                <SuggestPalletFromSubWarehouseModal isOpen={modalState.isSuggestPalletModalOpen} onClose={modalHandlers.closeSuggestPalletModal} pallet={modalState.palletForSuggestion} />
                <AssignAdjustmentToProductionModal isOpen={modalState.isAssignAdjustmentModalOpen} onClose={modalHandlers.closeAssignAdjustmentToProductionModal} order={modalState.orderForAssignment} onAssignSuccess={(updatedOrder) => modalHandlers.openAdjustmentPickingModal(updatedOrder)} />
                <AdjustmentPickingModal isOpen={modalState.isAdjustmentPickingModalOpen} onClose={modalHandlers.closeAdjustmentPickingModal} order={modalState.orderForPicking} />
                <EditAdjustmentOrderModal isOpen={modalState.isEditAdjustmentOrderModalOpen} onClose={modalHandlers.closeEditAdjustmentOrderModal} order={modalState.orderForEdit} />
                <FeedbackModal isOpen={modalState.isFeedbackModalOpen} onClose={modalHandlers.closeFeedbackModal} />
                <DocumentListModal isOpen={modalState.isDocumentListModalOpen} onClose={modalHandlers.closeDocumentListModal} title={modalState.documentListModalContent?.title} documents={modalState.documentListModalContent?.documents} />
                <DocumentPreviewModal isOpen={modalState.isDocumentPreviewModalOpen} onClose={modalHandlers.closeDocumentPreviewModal} document={modalState.documentForPreview} />
                <DispatchOrderDetailModal isOpen={modalState.isDispatchOrderDetailModalOpen} onClose={modalHandlers.closeDispatchOrderDetailModal} order={modalState.orderForDetail} />
                <CreateInternalTransferModal isOpen={modalState.isCreateInternalTransferModalOpen} onClose={modalHandlers.closeCreateInternalTransferModal} />
                <DispatchInternalTransferModal isOpen={modalState.isDispatchInternalTransferModalOpen} onClose={modalHandlers.closeDispatchInternalTransferModal} order={modalState.transferOrderForDispatch} />
            </Suspense>
        </div>
    );
};
