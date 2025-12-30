
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { usePersistedState } from '../../src/usePersistedState';
import { View, User, Recipe, ProductionRun, PsdTask, RawMaterialLogEntry, FinishedGoodItem, CombinedSearchResult, AppNotification, ExpiringPalletInfo, PackagingMaterialLogEntry, DispatchOrder, MixingTask, InternalTransferOrder, Document, AdjustmentOrder, Delivery, PrinterDef } from '../../types';
import { ALL_NAV_DEFINITIONS } from '../../src/navigation';
import { getBlockInfo, getExpiryStatus, getFinishedGoodStatusLabel } from '../../src/utils';
import { DEFAULT_SETTINGS, DEFAULT_PRINT_SERVER_URL, DEFAULT_NOTIFICATION_SERVER_URL, SOUND_OPTIONS, INITIAL_PRINTERS } from '../../constants';
import XCircleIcon from '../components/icons/XCircleIcon';
import CheckCircleIcon from '../components/icons/CheckCircleIcon';
import InformationCircleIcon from '../components/icons/InformationCircleIcon';
import { useSound } from '../../src/useSound';
import { useAuth } from './AuthContext';
import { useWarehouseContext } from './WarehouseContext';
import { useProductionContext } from './ProductionContext';
import { usePsdContext } from './PsdContext';
import { useLogisticsContext } from './LogisticsContext';
import { useMixingContext } from './MixingContext';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

export interface UIContextValue {
    theme: 'light' | 'dark' | 'system';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    sidebarPosition: 'left' | 'right';
    setSidebarPosition: (position: 'left' | 'right') => void;
    isSoundEnabled: boolean;
    toggleSoundEnabled: () => void;
    notificationSound: string;
    setNotificationSound: React.Dispatch<React.SetStateAction<string>>;
    printServerUrl: string;
    setPrintServerUrl: React.Dispatch<React.SetStateAction<string>>;
    gatewayServerUrl: string;
    setGatewayServerUrl: React.Dispatch<React.SetStateAction<string>>;
    notificationServerUrl: string;
    setNotificationServerUrl: React.Dispatch<React.SetStateAction<string>>;
    printers: PrinterDef[];
    setPrinters: React.Dispatch<React.SetStateAction<PrinterDef[]>>;
    playNotificationSound: (soundIdOverride?: string) => Promise<void>;
    modalState: any;
    modalHandlers: any;
    showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    toasts: Toast[];
    removeToast: (id: number) => void;
    popupNotifications: AppNotification[];
    centerNotifications: AppNotification[];
    readNotifications: AppNotification[];
    markNotificationAsRead: (id: string) => void;
    dismissPopup: (id: string) => void;
    markAllAsRead: () => void;
    clearReadNotifications: () => void;
    deleteNotificationById: (id: string) => void;
    notificationCount: number;
    globalSearchTerm: string;
    setGlobalSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    globalSearchResults: CombinedSearchResult[];
    pageTitle: string;
    pageSubtitle: string;
    handleNavBack: () => void;
    handleNavForward: () => void;
    handleNavHome: () => void;
    canGoBack: boolean;
    canGoForward: boolean;
    handleSetView: (view: View, params?: any, reset?: boolean) => void;
    currentView: View;
    viewParams: any;
    setNotificationData: React.Dispatch<React.SetStateAction<any>>;
    recentlySplitPalletIds: string[];
    addRecentlySplitPalletIds: (ids: string[]) => void;
    clearRecentlySplitPalletIds: () => void;
    isIdleLockEnabled: boolean;
    setIsIdleLockEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    pinModal: { isOpen: boolean; onSuccess: (() => void) | null; error: string | null; };
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const useUIContext = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUIContext must be used within a UIProvider');
    }
    return context;
};

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = usePersistedState<'light' | 'dark' | 'system'>('app_settings_theme_v1', 'system');
    const [sidebarPosition, setSidebarPosition] = usePersistedState<'left' | 'right'>('app_settings_sidebar_pos_v1', 'left');
    const [printServerUrl, setPrintServerUrl] = usePersistedState<string>('settings_printServerUrl_v1', DEFAULT_PRINT_SERVER_URL);
    const [gatewayServerUrl, setGatewayServerUrl] = usePersistedState<string>('settings_gatewayServerUrl_v1', 'http://localhost:3002');
    const [notificationServerUrl, setNotificationServerUrl] = usePersistedState<string>('settings_notificationServerUrl_v1', DEFAULT_NOTIFICATION_SERVER_URL);
    
    const [printers, setPrinters] = usePersistedState<PrinterDef[]>('app_settings_printers_v1', INITIAL_PRINTERS);
    
    useEffect(() => {
        setPrinters(currentPrinters => {
            let hasChanges = false;
            const updated = currentPrinters.map(p => {
                if ((p.id === 'osip' || p.name === 'OSIP') && p.ip === '192.168.1.150') {
                    hasChanges = true;
                    return { ...p, ip: '192.168.1.160' };
                }
                return p;
            });
            return hasChanges ? updated : currentPrinters;
        });
    }, [setPrinters]);

    const { 
        isSoundEnabled, 
        toggleSoundEnabled, 
        notificationSound, 
        setNotificationSound, 
        playNotificationSound 
    } = useSound();
    
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [modalState, setModalState] = useState<any>({
        isPackagingMaterialDetailModalOpen: false,
        itemForPackagingDetail: null,
        isManageTemplatesModalOpen: false,
        isChooseProductionTypeModalOpen: false,
        productionChoiceModalProps: {},
        isAddEditRecipeModalOpen: false, 
        recipeToEdit: null, 
    });
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');
    
    const [currentView, setCurrentView] = useState<View>(View.Dashboard);
    const [viewParams, setViewParams] = useState<any>(null);
    const [navHistory, setNavHistory] = usePersistedState<{ view: View, params: any }[]>('navHistory', [{ view: View.Dashboard, params: null }]);
    const [navIndex, setNavIndex] = usePersistedState<number>('navIndex', 0);
    
    const [readNotificationIds, setReadNotificationIds] = usePersistedState<string[]>('read_notifications_v2', []);
    const [deletedNotificationIds, setDeletedNotificationIds] = usePersistedState<string[]>('deleted_notifications_v1', []);
    const [recentlySplitPalletIds, setRecentlySplitPalletIds] = useState<string[]>([]);
    const [dismissedPopupIds, setDismissedPopupIds] = useState(new Set<string>());
    
    const { currentUser } = useAuth();
    const { rawMaterialsLogList, packagingMaterialsLog, expiringPalletsDetails, expiryWarningDays, expiryCriticalDays } = useWarehouseContext();
    const { finishedGoodsList, productionRunsList } = useProductionContext();
    const { psdTasks } = usePsdContext();
    const { dispatchOrders } = useLogisticsContext();
    const { mixingTasks } = useMixingContext();


    const [isIdleLockEnabled, setIsIdleLockEnabled] = useState(false);
    const [pinModal, setPinModal] = useState<{ isOpen: boolean, onSuccess: (() => void) | null, error: string | null }>({ isOpen: false, onSuccess: null, error: null });

    useEffect(() => {
        if (!currentUser) {
            setIsIdleLockEnabled(false);
        }
    }, [currentUser]);

    const allGeneratedNotifications = useMemo((): AppNotification[] => {
        const notifications: AppNotification[] = [];
        const deletedIds = new Set(deletedNotificationIds);

        // Pallets pending labeling
        (finishedGoodsList || []).forEach((item: FinishedGoodItem) => {
            if (item.status === 'pending_label' && !deletedIds.has(item.id)) {
                notifications.push({
                    id: item.id, type: 'receiving', title: 'Nowa paleta do oznaczenia',
                    body: `Zarejestrowano paletę ${item.displayId} (${item.productName}).`,
                    timestamp: item.producedAt, relatedItem: item, isRead: false, isUrgent: false,
                });
            }
        });
        
        // Expiry warnings
        (expiringPalletsDetails || []).forEach((detail: any) => {
            const id = detail.pallet.id + '_expiry';
            if (!deletedIds.has(id)) {
                notifications.push({
                    id, type: 'expiry',
                    title: `Termin ważności: ${'palletData' in detail.pallet ? detail.pallet.palletData.nazwa : detail.pallet.productName}`,
                    body: detail.daysLeft < 0 ? `Paleta przeterminowana.` : `Pozostało ${detail.daysLeft} dni.`,
                    timestamp: 'palletData' in detail.pallet ? detail.pallet.palletData.dataPrzydatnosci : detail.pallet.expiryDate,
                    relatedItem: detail.pallet, isRead: false, isUrgent: detail.status === 'critical' || detail.status === 'expired',
                });
            }
        });

        // New planned AGRO runs
        (productionRunsList || []).forEach((run: ProductionRun) => {
            if (run.status === 'planned' && !deletedIds.has(run.id) && isFinite(run.targetBatchSizeKg)) {
                const isEdited = !!run.updatedAt;
                notifications.push({
                    id: run.id, type: 'new_order', 
                    title: isEdited ? 'Edytowano zlecenie AGRO' : 'Nowe zlecenie AGRO',
                    body: `${isEdited ? 'Zaktualizowano' : 'Zaplanowano'} produkcję: ${run.recipeName} (${run.targetBatchSizeKg} kg)`,
                    timestamp: run.updatedAt || run.createdAt, relatedItem: run, isRead: false, isUrgent: false,
                });
            }
        });

        // New planned PSD tasks
        (psdTasks || []).forEach((task: PsdTask) => {
            if (task.status === 'planned' && !deletedIds.has(task.id) && isFinite(task.targetQuantity)) {
                const isEdited = !!task.updatedAt;
                notifications.push({
                    id: task.id, type: 'new_order', 
                    title: isEdited ? 'Edytowano zlecenie PSD' : 'Nowe zlecenie PSD',
                    body: `${isEdited ? 'Zaktualizowano' : 'Zaplanowano'} produkcję: ${task.recipeName || 'Nowe zadanie'} (${task.targetQuantity} kg)`,
                    timestamp: task.updatedAt || task.createdAt, relatedItem: task, isRead: false, isUrgent: false,
                });
            }
        });

        // New planned Dispatch Orders
        (dispatchOrders || []).forEach((order: DispatchOrder) => {
            if (order.status === 'planned' && !deletedIds.has(order.id)) {
                notifications.push({
                    id: order.id, type: 'new_order', title: 'Nowe zlecenie wydania',
                    body: `Zaplanowano wydanie dla: ${order.recipient}`,
                    timestamp: order.createdAt, relatedItem: order, isRead: false, isUrgent: false,
                });
            }
        });

        // New planned Mixing Tasks
        (mixingTasks || []).forEach((task: MixingTask) => {
            if (task.status === 'planned' && !deletedIds.has(task.id)) {
                notifications.push({
                    id: task.id, type: 'new_order', title: 'Nowe zlecenie miksowania',
                    body: `Zaplanowano miksowanie: ${task.name}`,
                    timestamp: task.createdAt, relatedItem: task, isRead: false, isUrgent: false,
                });
            }
        });


        return notifications;
    }, [finishedGoodsList, expiringPalletsDetails, productionRunsList, psdTasks, dispatchOrders, mixingTasks, deletedNotificationIds]);


    const centerNotifications = useMemo(() => 
        allGeneratedNotifications
            .filter(n => !readNotificationIds.includes(n.id))
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [allGeneratedNotifications, readNotificationIds]);
    
    const readNotifications = useMemo(() => 
        allGeneratedNotifications
            .filter(n => readNotificationIds.includes(n.id))
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [allGeneratedNotifications, readNotificationIds]);

    const dismissPopup = useCallback((id: string) => {
        setDismissedPopupIds(prev => {
            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });
    }, []);

    const popupNotifications = useMemo(() => 
        centerNotifications.filter(n => 
            (n.type === 'receiving' || n.type === 'new_order') && !dismissedPopupIds.has(n.id)
        ), 
    [centerNotifications, dismissedPopupIds]);

    const notificationCount = centerNotifications.length;

    const markNotificationAsRead = useCallback((id: string) => {
        setReadNotificationIds(prev => Array.from(new Set([...prev, id])));
    }, [setReadNotificationIds]);

    const markAllAsRead = useCallback(() => {
        const unreadIds = centerNotifications.map(n => n.id);
        setReadNotificationIds(prev => Array.from(new Set([...prev, ...unreadIds])));
    }, [centerNotifications, setReadNotificationIds]);

    const clearReadNotifications = useCallback(() => {
        setDeletedNotificationIds(prev => Array.from(new Set([...prev, ...readNotificationIds])));
        setReadNotificationIds([]);
    }, [readNotificationIds, setDeletedNotificationIds, setReadNotificationIds]);

    const deleteNotificationById = useCallback((id: string) => {
        setDeletedNotificationIds(prev => Array.from(new Set([...prev, id])));
    }, [setDeletedNotificationIds]);

    const addRecentlySplitPalletIds = (ids: string[]) => {
        setRecentlySplitPalletIds(prev => [...new Set([...prev, ...ids])]);
    };

    const clearRecentlySplitPalletIds = () => {
        setRecentlySplitPalletIds([]);
    };

    const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
        setThemeState(newTheme);
        const root = window.document.documentElement;
        root.classList.remove('dark', 'light');
        if (newTheme === 'system') {
            root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        } else {
            root.classList.add(newTheme);
        }
    };

    useEffect(() => { setTheme(theme); }, [theme]);

    const removeToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        setToasts(prev => [...prev, { id: Date.now(), message, type }]);
    }, []);

    const handleSetView = useCallback((view: View, params: any = null) => {
        setCurrentView(view);
        setViewParams(params);
    }, []);
    
    const handleSetViewWithHistory = useCallback((view: View, params: any = null, reset: boolean = false) => {
        if (typeof view !== 'number') {
            console.warn('Blocked attempt to navigate to a non-View type:', view);
            return;
        }

        handleSetView(view, params);

        if (reset) {
            const newHistory = [{ view, params }];
            setNavHistory(newHistory);
            setNavIndex(0);
            return;
        }

        const currentNavState = navHistory[navIndex];
        if (currentNavState && currentNavState.view === view && JSON.stringify(currentNavState.params) === JSON.stringify(params)) return;
        
        const newHistory = navHistory.slice(0, navIndex + 1);
        newHistory.push({ view, params });
        setNavHistory(newHistory);
        setNavIndex(newHistory.length - 1);
    }, [handleSetView, navHistory, navIndex, setNavHistory, setNavIndex]);

    const globalSearchResults = useMemo((): CombinedSearchResult[] => {
        const term = globalSearchTerm.trim().toLowerCase();
        if (!term) return [];
        
        const results: CombinedSearchResult[] = [];
        
        (rawMaterialsLogList || []).forEach((item: RawMaterialLogEntry) => {
            const displayId = item.palletData.nrPalety;
            const name = item.palletData.nazwa;
            const location = item.currentLocation || '';
            
            if (displayId.toLowerCase().includes(term) || name.toLowerCase().includes(term) || location.toLowerCase().includes(term)) {
                const { isBlocked, reason } = getBlockInfo(item);
                const expiryStatus = getExpiryStatus(item.palletData, expiryWarningDays, expiryCriticalDays);
                results.push({
                    id: item.id, displayId, name, isRaw: true,
                    location: item.currentLocation, status: isBlocked ? 'Zablokowana' : 'Dostępny', isBlocked,
                    blockReason: reason || undefined, date: item.palletData.dataPrzydatnosci, originalItem: item, expiryStatus,
                });
            }
        });

        (finishedGoodsList || []).forEach((item: FinishedGoodItem) => {
            const displayId = item.displayId || item.id;
            const name = item.productName;
            const location = item.currentLocation || '';
            
            if (displayId.toLowerCase().includes(term) || name.toLowerCase().includes(term) || location.toLowerCase().includes(term)) {
                const { isBlocked, reason } = getBlockInfo(item);
                const expiryStatus = getExpiryStatus({ dataPrzydatnosci: item.expiryDate } as any, expiryWarningDays, expiryCriticalDays);
                results.push({
                    id: item.id, displayId, name, isRaw: false,
                    location: item.currentLocation, status: getFinishedGoodStatusLabel(item.status), isBlocked,
                    blockReason: reason || undefined, date: item.expiryDate, originalItem: item, expiryStatus,
                });
            }
        });

        (packagingMaterialsLog || []).forEach((item: PackagingMaterialLogEntry) => {
            const displayId = item.id;
            const name = item.productName;
            const location = item.currentLocation || '';

            if (displayId.toLowerCase().includes(term) || name.toLowerCase().includes(term) || location.toLowerCase().includes(term)) {
                 results.push({
                    id: item.id, displayId: item.id, name: item.productName, isRaw: true,
                    location: item.currentLocation, status: 'Dostępny', isBlocked: false,
                    blockReason: undefined, date: item.dateAdded, originalItem: item, expiryStatus: 'default',
                });
            }
        });

        return results;
    }, [globalSearchTerm, rawMaterialsLogList, finishedGoodsList, packagingMaterialsLog, expiryWarningDays, expiryCriticalDays]);

    const canGoBack = navIndex > 0;
    const canGoForward = navIndex < navHistory.length - 1;

    const handleNavBack = () => {
        if (canGoBack) {
            const newIndex = navIndex - 1;
            setNavIndex(newIndex);
            handleSetView(navHistory[newIndex].view, navHistory[newIndex].params);
        }
    };
    const handleNavForward = () => {
        if (canGoForward) {
            const newIndex = navIndex + 1;
            setNavIndex(newIndex);
            handleSetView(navHistory[newIndex].view, navHistory[newIndex].params);
        }
    };
    const handleNavHome = () => handleSetViewWithHistory(View.Dashboard, null, true);

    const pageTitle = useMemo(() => {
        const values = Array.from(ALL_NAV_DEFINITIONS.values()) as any[];
        const navDef = values.find((def: any) => def.view === currentView);
        return navDef?.label || 'Pulpit';
    }, [currentView]);

    const modalHandlers = useMemo(() => ({
        openPalletDetailModal: (pallet: RawMaterialLogEntry) => setModalState(p => ({...p, isPalletDetailModalOpen: true, palletForDetailModal: pallet})),
        openFinishedGoodDetailModal: (item: FinishedGoodItem) => setModalState(p => ({...p, isFinishedGoodDetailModalOpen: true, fgItemForDetail: item})),
        openNetworkPrintModal: (payload: any) => setModalState(p => ({...p, isNetworkPrintModalOpen: true, labelPayloadForPrint: payload})),
        openConfirmationModal: (props: any) => setModalState(p => ({...p, isConfirmationModalOpen: true, confirmationModalProps: props})),
        openMoveFinishedGoodModal: (item: FinishedGoodItem) => setModalState(p => ({...p, isMoveFinishedGoodModalOpen: true, fgItemToMove: item})),
        openLabActionsModal: (item: any) => setModalState(p => ({...p, isLabActionsModalOpen: true, itemForLabActions: item})),
        openBlockPalletModal: (item: any) => setModalState(p => ({...p, isBlockPalletModalOpen: true, itemToBlock: item})),
        openEditLabNotesModal: (item: any) => setModalState(p => ({...p, isEditLabNotesModalOpen: true, itemForLabNotes: item})),
        openAddEditUserModal: (user?: User) => setModalState(p => ({...p, isAddEditUserModalOpen: true, userToEdit: user})),
        openResetPasswordModal: (user: User) => setModalState(p => ({...p, isResetPasswordModalOpen: true, userToResetPassword: user})),
        openDocumentListModal: (title: string, documents: string[]) => setModalState(p => ({...p, isDocumentListModalOpen: true, documentListModalContent: {title, documents}})),
        openEditPsdTaskModal: (task: PsdTask) => setModalState(p => ({...p, isEditPsdTaskModalOpen: true, taskForPsdEditModal: task})),
        openAssignToStationModal: (stationId: string) => setModalState(p => ({...p, isAssignToStationModalOpen: true, stationForAssignment: stationId})),
        openRecipeDetailModal: (recipe: Recipe) => setModalState(p => ({...p, isRecipeDetailModalOpen: true, recipeForDetailModal: recipe})),
        openAddEditRunModal: (props: any) => setModalState(p => ({...p, isAddEditRunModalOpen: true, addEditRunModalProps: props })),
        openVerifyAssignmentsModal: (runs: ProductionRun[]) => setModalState(p => ({ ...p, isVerifyAssignmentsModalOpen: true, runsToVerify: runs })),
        toggleNotificationCenter: () => setModalState(p => ({ ...p, isNotificationCenterOpen: !p.isNotificationCenterOpen })),
        closeNotificationCenter: () => setModalState(p => ({ ...p, isNotificationCenterOpen: false })),
        openManageLabDocumentsModal: (item: any) => setModalState(p => ({...p, isManageLabDocumentsModalOpen: true, itemForLabDocuments: item })),
        openTextDisplayModal: (title: string, content: string) => setModalState(p => ({...p, isTextDisplayModalOpen: true, textDisplayModalContent: {title, content} })),
        openFinishedGoodListModal: (productName: string) => setModalState(p => ({ ...p, isFinishedGoodListModalOpen: true, productNameForFgList: productName })),
        openRawMaterialListModal: (productName: string) => setModalState(p => ({...p, isRawMaterialListModalOpen: true, productNameForList: productName})),
        openPackagingMaterialListModal: (productName: string) => setModalState(p => ({...p, isPackagingMaterialListModalOpen: true, productNameForPackagingList: productName})),
        openPackagingMaterialDetailModal: (item: PackagingMaterialLogEntry) => setModalState(p => ({...p, isPackagingMaterialDetailModalOpen: true, itemForPackagingDetail: item })),
        openManageTemplatesModal: () => setModalState(p => ({...p, isManageTemplatesModalOpen: true})),
        openChooseProductionTypeModal: (props: any) => setModalState(p => ({ ...p, isChooseProductionTypeModalOpen: true, productionChoiceModalProps: props })),
        openConsumptionHistoryModal: (runId: string, batchId: string, productName: string, isWeighingFinished: boolean) => setModalState((p: any) => ({ ...p, isConsumptionHistoryModalOpen: true, itemForConsumptionHistory: {runId, batchId, productName, isWeighingFinished} })),
        openDeliverySummaryConfirmModal: (delivery: Delivery, onConfirm: () => void) => setModalState((p: any) => ({ ...p, isDeliverySummaryConfirmModalOpen: true, deliveryForSummary: { delivery, onConfirm } })),
        openSuggestPalletModal: (pallet: RawMaterialLogEntry) => setModalState((p: any) => ({...p, isSuggestPalletModalOpen: true, palletForSuggestion: pallet})),
        openUnblockReasonModal: (item: any) => setModalState((p: any) => ({...p, isUnblockReasonModalOpen: true, itemForUnblockReason: item})),
        openExtendExpiryDateModal: (item: any) => setModalState((p: any) => ({...p, isExtendExpiryDateModalOpen: true, itemForExpiryExtension: item})),
        openDispatchOrderDetailModal: (order: DispatchOrder) => setModalState((p: any) => ({...p, isDispatchOrderDetailModalOpen: true, orderForDetail: order})),
        openAssignAdjustmentToProductionModal: (order: AdjustmentOrder, onAssignSuccess: (order: AdjustmentOrder) => void) => setModalState((p: any) => ({ ...p, isAssignAdjustmentModalOpen: true, orderForAssignment: order, onAssignSuccess: onAssignSuccess })),
        openAdjustmentPickingModal: (order: AdjustmentOrder) => setModalState((p: any) => ({ ...p, isAdjustmentPickingModalOpen: true, orderForPicking: order })),
        openEditAdjustmentOrderModal: (order: AdjustmentOrder) => setModalState((p: any) => ({...p, isEditAdjustmentOrderModalOpen: true, orderForEdit: order })),
        openFeedbackModal: () => setModalState((p: any) => ({...p, isFeedbackModalOpen: true})),
        openCreateInternalTransferModal: () => setModalState((p: any) => ({...p, isCreateInternalTransferModalOpen: true})),
        openDispatchInternalTransferModal: (order: InternalTransferOrder) => setModalState((p: any) => ({...p, isDispatchInternalTransferModalOpen: true, transferOrderForDispatch: order})),
        openAddEditRecipeModal: (recipe?: Recipe | null) => setModalState((p: any) => ({ ...p, isAddEditRecipeModalOpen: true, recipeToEdit: recipe })), 
        
        showPinPrompt: (onSuccessCallback: () => void) => {
            if (isIdleLockEnabled) {
                onSuccessCallback();
                return;
            }
            const wrappedOnSuccess = () => {
                onSuccessCallback();
                setIsIdleLockEnabled(true);
            };
            setPinModal({ isOpen: true, onSuccess: wrappedOnSuccess, error: null });
        },
        closePinPrompt: () => setPinModal({ isOpen: false, onSuccess: null, error: null }),
        setPinPromptError: (error: string) => setPinModal(prev => ({...prev, error})),

        // Close handlers
        closePalletDetailModal: () => setModalState(p => ({...p, isPalletDetailModalOpen: false})),
        closeFinishedGoodDetailModal: () => setModalState(p => ({...p, isFinishedGoodDetailModalOpen: false})),
        closeNetworkPrintModal: () => setModalState(p => ({...p, isNetworkPrintModalOpen: false})),
        closeConfirmationModal: () => setModalState(p => ({...p, isConfirmationModalOpen: false})),
        closeMoveFinishedGoodModal: () => setModalState(p => ({...p, isMoveFinishedGoodModalOpen: false})),
        closeLabActionsModal: () => setModalState(p => ({...p, isLabActionsModalOpen: false})),
        closeBlockPalletModal: () => setModalState(p => ({...p, isBlockPalletModalOpen: false})),
        closeEditLabNotesModal: () => setModalState(p => ({...p, isEditLabNotesModalOpen: false})),
        closeAddEditUserModal: () => setModalState(p => ({...p, isAddEditUserModalOpen: false})),
        closeResetPasswordModal: () => setModalState(p => ({...p, isResetPasswordModalOpen: false})),
        closeDocumentListModal: () => setModalState(p => ({...p, isDocumentListModalOpen: false})),
        closeEditPsdTaskModal: () => setModalState(p => ({...p, isEditPsdTaskModalOpen: false})),
        closeAssignToStationModal: () => setModalState(p => ({...p, isAssignToStationModalOpen: false})),
        closeRecipeDetailModal: () => setModalState(p => ({...p, isRecipeDetailModalOpen: false})),
        closeAddEditRunModal: () => setModalState(p => ({...p, isAddEditRunModalOpen: false})),
        closeVerifyAssignmentsModal: () => setModalState(p => ({ ...p, isVerifyAssignmentsModalOpen: false })),
        closeManageLabDocumentsModal: () => setModalState(p => ({...p, isManageLabDocumentsModalOpen: false })),
        closeTextDisplayModal: () => setModalState(p => ({...p, isTextDisplayModalOpen: false })),
        closeFinishedGoodListModal: () => setModalState(p => ({ ...p, isFinishedGoodListModalOpen: false })),
        closeRawMaterialListModal: () => setModalState(p => ({...p, isRawMaterialListModalOpen: false})),
        closePackagingMaterialListModal: () => setModalState(p => ({...p, isPackagingMaterialListModalOpen: false })),
        closePackagingMaterialDetailModal: () => setModalState(p => ({...p, isPackagingMaterialDetailModalOpen: false, itemForPackagingDetail: null })),
        closeManageTemplatesModal: () => setModalState(p => ({...p, isManageTemplatesModalOpen: false})),
        closeChooseProductionTypeModal: () => setModalState(p => ({ ...p, isChooseProductionTypeModalOpen: false })),
        closeConsumptionHistoryModal: () => setModalState((p: any) => ({ ...p, isConsumptionHistoryModalOpen: false, itemForConsumptionHistory: null })),
        closeDeliverySummaryConfirmModal: () => setModalState((p: any) => ({ ...p, isDeliverySummaryConfirmModalOpen: false, deliveryForSummary: null })),
        closeSuggestPalletModal: () => setModalState((p: any) => ({...p, isSuggestPalletModalOpen: false, palletForSuggestion: null})),
        closeUnblockReasonModal: () => setModalState((p: any) => ({...p, isUnblockReasonModalOpen: false, itemForUnblockReason: null})),
        closeExtendExpiryDateModal: () => setModalState((p: any) => ({...p, isExtendExpiryDateModalOpen: false, itemForExpiryExtension: null})),
        closeDispatchOrderDetailModal: () => setModalState((p: any) => ({...p, isDispatchOrderDetailModalOpen: false, orderForDetail: null})),
        closeAssignAdjustmentToProductionModal: () => setModalState((p: any) => ({ ...p, isAssignAdjustmentModalOpen: false, orderForAssignment: null, onAssignSuccess: null })),
        closeAdjustmentPickingModal: () => setModalState((p: any) => ({ ...p, isAdjustmentPickingModalOpen: false, orderForPicking: null })),
        closeEditAdjustmentOrderModal: () => setModalState((p: any) => ({...p, isEditAdjustmentOrderModalOpen: false, orderForEdit: null })),
        closeFeedbackModal: () => setModalState((p: any) => ({...p, isFeedbackModalOpen: false})),
        closeCreateInternalTransferModal: () => setModalState((p: any) => ({...p, isCreateInternalTransferModalOpen: false})),
        closeDispatchInternalTransferModal: () => setModalState((p: any) => ({...p, isDispatchInternalTransferModalOpen: false, transferOrderForDispatch: null})),
        closeAddEditRecipeModal: () => setModalState((p: any) => ({ ...p, isAddEditRecipeModalOpen: false, recipeToEdit: null })), 
    }), [isIdleLockEnabled, setIsIdleLockEnabled]);
    
    const value: UIContextValue = {
        theme, setTheme, sidebarPosition, setSidebarPosition, isSoundEnabled,
        notificationSound, setNotificationSound,
        printServerUrl, setPrintServerUrl,
        gatewayServerUrl, setGatewayServerUrl,
        notificationServerUrl, setNotificationServerUrl,
        printers, setPrinters,
        toggleSoundEnabled, playNotificationSound,
        modalState, modalHandlers, showToast, toasts, removeToast,
        popupNotifications, centerNotifications, readNotifications, markNotificationAsRead, dismissPopup, markAllAsRead, clearReadNotifications, deleteNotificationById, notificationCount,
        globalSearchTerm, setGlobalSearchTerm, globalSearchResults,
        pageTitle, pageSubtitle: '', handleSetView: handleSetViewWithHistory,
        handleNavBack, handleNavForward, handleNavHome, canGoBack, canGoForward,
        currentView, viewParams,
        setNotificationData: () => {}, 
        recentlySplitPalletIds, addRecentlySplitPalletIds, clearRecentlySplitPalletIds,
        isIdleLockEnabled, setIsIdleLockEnabled,
        pinModal,
    };

    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
