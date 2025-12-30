import React, { useState, useEffect } from 'react';
import { QueuedAction } from '../types';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import { formatDate } from '../src/utils';
import WifiSlashIcon from './icons/WifiSlashIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import TrashIcon from './icons/TrashIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';

const QueueStatusPage: React.FC = () => {
  const { 
    connectionStatus, 
    queuedActions: warehouseQueuedActions, 
    productionQueuedActions,
    handleDeleteQueuedAction,
    handleRetrySync,
    verifyConnectionNow
  } = useAppContext();
  
  const isOnline = connectionStatus !== 'offline';

  const [allActions, setAllActions] = useState<any[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const combined = [
      ...(warehouseQueuedActions || []).map((a: any) => ({ ...a, source: 'Magazyn' })),
      ...(productionQueuedActions || []).map((a: any) => ({ ...a, source: 'Produkcja' }))
    ];
    combined.sort((a, b) => b.timestamp - a.timestamp);
    setAllActions(combined);
  }, [warehouseQueuedActions, productionQueuedActions]);
  
  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          new Notification('Mleczna Droga', {
            body: 'Powiadomienia o synchronizacji włączone!',
          });
        }
      });
    }
  };

  const handleRetryClick = async () => {
    setIsSyncing(true);
    await handleRetrySync();
    setIsSyncing(false);
  };

  const handleTestConnection = async () => {
      setIsTesting(true);
      if(verifyConnectionNow) {
          await verifyConnectionNow();
      }
      // Krótkie opóźnienie, aby użytkownik zauważył zmianę
      setTimeout(() => setIsTesting(false), 500);
  };

  const getActionDescription = (action: any) => {
    const payload = action.payload || {};
    switch (action.type) {
        case 'ADD_OR_UPDATE_LOG_ENTRY':
            const palletId = payload?.palletData?.nrPalety || payload?.id || 'nieznana';
            return `Przesuń paletę ${palletId} do ${payload.targetLocationId}`;
        case 'CREATE_DELIVERY':
            return `Utwórz nową dostawę: ${payload.orderRef}`;
        case 'UPDATE_DELIVERY':
            return `Zaktualizuj dostawę: ${payload.orderRef}`;
        case 'UPDATE_DELIVERY_STATUS':
             return `Aktualizuj status dostawy: ${payload.deliveryId}`;
        case 'PROCESS_OFFLINE_DELIVERY':
            return `Przetwórz dostawę offline: ${payload.delivery.orderRef}`;
        case 'CREATE_PSD_TASK':
            return `Utwórz zlecenie PSD: ${payload.name}`;
        case 'UPDATE_PSD_TASK':
            return `Zaktualizuj zlecenie PSD: ${payload.name}`;
        case 'INITIALIZE_BATCHES':
             return `Inicjalizuj partie dla zlecenia PSD: ${payload.taskId}`;
        case 'DELETE_PSD_TASK':
            return `Usuń zlecenie PSD: ${payload.taskId}`;
        case 'ADD_OR_UPDATE_AGRO_RUN':
            const runData = payload.runData || {};
            return `${runData.id ? 'Aktualizuj' : 'Utwórz'} zlecenie AGRO: ${runData.recipeName}`;
        case 'DELETE_AGRO_RUN':
            return `Usuń zlecenie AGRO: ${payload.runId}`;
        case 'ADD_DISPATCH_ORDER':
            return `Utwórz zlecenie wydania dla: ${payload.newOrder?.recipient}`;
        case 'UPDATE_DISPATCH_ORDER':
            return `Aktualizuj zlecenie wydania: ${payload.orderId}`;
        case 'DELETE_DISPATCH_ORDER':
            return `Usuń zlecenie wydania: ${payload.orderId}`;
        case 'FULFILL_DISPATCH_ITEM':
            return `Realizuj paletę ${payload.palletId} dla zlecenia ${payload.orderId}`;
        case 'ASSIGN_PALLETS_TO_DISPATCH':
             return `Przypisz palety do zlecenia wydania: ${payload.orderId}`;
        case 'COMPLETE_DISPATCH_ORDER':
            return `Zakończ zlecenie wydania: ${payload.orderId}`;
        case 'SPLIT_PALLET':
            return `Podziel paletę: ${payload.sourcePalletId}`;
        case 'UNBLOCK_PALLET':
            return `Odblokuj pozycję: ${payload.itemId}`;
        default:
            return `Akcja typu: ${action.type}`;
    }
  };
  
  const hasPending = allActions.some(a => a.status === 'pending');

  const renderNotificationSection = () => {
    if (!('Notification' in window)) {
        return (
            <div className="p-4 rounded-md mb-4 bg-yellow-50 border border-yellow-200 dark:bg-secondary-700 dark:border-yellow-900">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Powiadomienia nie są wspierane</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Twoja przeglądarka nie wspiera powiadomień w tle.
                </p>
            </div>
        );
    }
  
    switch (notificationPermission) {
        case 'granted':
            return (
                 <div className="p-4 rounded-md mb-4 bg-green-50 border border-green-200 dark:bg-secondary-700 dark:border-green-900">
                    <h3 className="font-semibold text-green-800 dark:text-green-200">Powiadomienia są włączone</h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Będziesz otrzymywać informacje o postępach synchronizacji.
                    </p>
                </div>
            );
        case 'denied':
            return (
                <div className="p-4 rounded-lg mb-4 bg-slate-100 dark:bg-secondary-700 border border-red-300 dark:border-red-500">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Powiadomienia zablokowane</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        Aby włączyć powiadomienia, musisz zmienić ustawienia uprawnień dla tej strony w swojej przeglądarce.
                    </p>
                    <details className="mt-2 text-xs">
                        <summary className="cursor-pointer font-medium text-gray-600 dark:text-gray-400 hover:underline">
                            Pokaż instrukcje
                        </summary>
                        <div className="mt-2 space-y-2 text-gray-700 dark:text-gray-300">
                            <p className="font-bold">W przeglądarkach Chrome / Edge:</p>
                            <ol className="list-decimal list-inside pl-4 space-y-1">
                                <li>Kliknij ikonę kłódki (🔒) po lewej stronie paska adresu.</li>
                                <li>Wybierz opcję <strong>"Uprawnienia dla tej witryny"</strong>.</li>
                                <li>Na nowej stronie znajdź "Powiadomienia" i zmień ustawienie na "Zezwalaj".</li>
                                <li>Odśwież stronę, aby zastosować zmiany.</li>
                            </ol>
                            <p className="font-bold pt-2">W przeglądarce Firefox:</p>
                            <ol className="list-decimal list-inside pl-4 space-y-1">
                                <li>Kliknij ikonę kłódki (🔒) po lewej stronie paska adresu.</li>
                                <li>Kliknij strzałkę (›) obok "Połączenie jest bezpieczne".</li>
                                <li>Kliknij "Więcej informacji", a następnie przejdź do zakładki "Uprawnienia".</li>
                                <li>Znajdź "Wysyłanie powiadomień", odznacz "Używaj domyślnych" i wybierz "Zezwalaj".</li>
                            </ol>
                        </div>
                    </details>
                </div>
            );
        case 'default':
        default:
            return (
                <div className="p-4 rounded-md mb-4 bg-blue-50 border border-blue-200 dark:bg-secondary-700 dark:border-blue-900">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200">Powiadomienia w Tle</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Włącz powiadomienia, aby otrzymywać informacje o postępach synchronizacji, gdy aplikacja działa w tle.
                    </p>
                    <Button onClick={requestNotificationPermission} variant="secondary" className="mt-2 text-sm">
                        Włącz Powiadomienia
                    </Button>
                </div>
            );
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
      <header className="flex items-center mb-6 border-b pb-4 dark:border-secondary-600">
        <WifiSlashIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Status Kolejki Offline</h2>
      </header>

      <div className={`p-4 rounded-md mb-4 flex justify-between items-center ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        <p className="font-semibold">
          Aktualny status sieci: {isOnline ? 'ONLINE' : 'OFFLINE'}
        </p>
        <div className="flex items-center gap-2">
            {isOnline && hasPending && (
              <Button onClick={handleRetryClick} disabled={isSyncing} leftIcon={<ArrowPathIcon className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`}/>}>
                {isSyncing ? 'Synchronizowanie...' : 'Ponów Synchronizację'}
              </Button>
            )}
            <Button onClick={handleTestConnection} disabled={isTesting} leftIcon={<ArrowPathIcon className={`h-5 w-5 ${isTesting ? 'animate-spin' : ''}`} />} variant="secondary">
              {isTesting ? 'Testowanie...' : 'Przetestuj połączenie'}
            </Button>
        </div>
      </div>
      
      {renderNotificationSection()}

      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Zadania w Kolejce ({allActions.length})</h3>
        {allActions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">Kolejka synchronizacji jest pusta.</p>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {allActions.map(action => (
              <div key={action.id} className="p-3 border rounded-md bg-white dark:bg-secondary-700/50 dark:border-secondary-600 shadow-sm">
                <div className="flex justify-between items-start">
                    <div className="flex-grow">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{getActionDescription(action)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {action.source} | {formatDate(new Date(action.timestamp).toISOString(), true)}
                        </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2 ml-4">
                        {action.status === 'pending' && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">Oczekuje</span>}
                        {action.status === 'synced' && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 flex items-center gap-1"><CheckCircleIcon className="h-3 w-3"/> Zsynchronizowano</span>}
                        {action.status === 'failed' && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 flex items-center gap-1"><XCircleIcon className="h-3 w-3"/> Błąd</span>}
                        
                        {action.status === 'failed' && (
                            <Button
                                onClick={() => handleDeleteQueuedAction(action.id)}
                                variant="secondary"
                                className="p-1 h-6 w-6 bg-red-100 hover:bg-red-200"
                                title="Usuń błędne zadanie"
                            >
                                <TrashIcon className="h-4 w-4 text-red-600"/>
                            </Button>
                        )}
                    </div>
                </div>
                {action.status === 'failed' && action.error && (
                    <p className="mt-2 p-2 bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs rounded border border-red-200 dark:border-red-800">
                        <strong>Powód błędu:</strong> {action.error}
                    </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueStatusPage;
