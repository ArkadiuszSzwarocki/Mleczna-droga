
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ColumnDef, SortConfig } from '../types';
import SortableHeader from './SortableHeader';

// Helper to get nested value if key is dot-notation, e.g. 'palletData.nrPalety'
const getNestedValue = <T,>(obj: T, path: string): any => {
    return path.split('.').reduce((o: any, k: string) => (o ? o[k] : null), obj);
};

// FIX: The generic type constraint needs to include a flexible `id` and allow for any other properties.
interface StandardListViewProps<T extends { id: any; [key: string]: any }> {
    items: T[];
    columns: ColumnDef<T>[];
    onRowClick: (item: T) => void;
    renderMobileCard: (item: T) => React.ReactNode;
    groupBy: keyof T | string | null;
    sortConfig: SortConfig<T> | null;
    requestSort: (key: keyof T | string) => void;
    noResultsMessage: React.ReactNode;
}

const StandardListView = <T extends { id: any; [key: string]: any }>({
    items,
    columns,
    onRowClick,
    renderMobileCard,
    groupBy,
    sortConfig,
    requestSort,
    noResultsMessage,
}: StandardListViewProps<T>) => {

    const parentRef = useRef<HTMLDivElement>(null);

    const groupedItems = React.useMemo(() => {
        if (!groupBy || !items || items.length === 0) {
            return null;
        }
        
        const groups = items.reduce((acc, item) => {
            const groupKey = getNestedValue(item, groupBy as string);
            // Handle null/undefined group keys
            const key = groupKey === null || groupKey === undefined ? 'Brak wartości' : String(groupKey);
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(item);
            return acc;
        }, {} as Record<string, T[]>);
        
        // Sort groups by key
        return Object.entries(groups).sort(([keyA], [keyB]) => keyA.localeCompare(keyB, 'pl', { sensitivity: 'base' }));

    }, [items, groupBy]);
    
    // Flatten data for virtualizer if grouped
    const flatItems = React.useMemo(() => {
        if (!groupedItems) return items;
        return groupedItems.flatMap(([groupName, groupItems]) => [{ isGroupHeader: true, groupName, id: groupName }, ...groupItems]);
    }, [groupedItems, items]);

    const rowVirtualizer = useVirtualizer({
        count: flatItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => flatItems[index].isGroupHeader ? 33 : 41, // Header vs Row
        overscan: 10,
    });


    if (!items || items.length === 0) {
        return <div className="flex-grow flex items-center justify-center p-4">{noResultsMessage}</div>;
    }

    return (
        <div className="flex-grow overflow-hidden flex flex-col">
            {/* Mobile View - Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:hidden overflow-y-auto">
                {items.map(item => (
                    // The key must be on the top-level element in the map
                    <div key={item.id}>
                        {renderMobileCard(item)}
                    </div>
                ))}
            </div>

            {/* Desktop View - Table */}
            <div ref={parentRef} className="hidden md:block overflow-auto h-full w-full relative">
                <table className="min-w-full text-sm" style={{ width: '100%' }}>
                    <thead className="bg-gray-100 dark:bg-secondary-700 sticky top-0 z-10 block">
                        <tr className="flex w-full">
                            {columns.map(col => (
                                <SortableHeader
                                    key={String(col.key)}
                                    columnKey={col.key}
                                    sortConfig={sortConfig as any}
                                    requestSort={requestSort as any}
                                    thClassName={col.headerClassName || "flex-1 w-0 px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300"}
                                >
                                    {col.label}
                                </SortableHeader>
                            ))}
                        </tr>
                    </thead>
                     <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                        {rowVirtualizer.getVirtualItems().map(virtualRow => {
                            const item = flatItems[virtualRow.index] as any;
                            
                            if (item.isGroupHeader) {
                                return (
                                    <tr 
                                        key={item.id} 
                                        className="bg-slate-200 dark:bg-secondary-600 flex w-full absolute top-0 left-0"
                                        style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                                    >
                                        <th colSpan={columns.length} className="px-3 py-1 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">
                                            {item.groupName}
                                        </th>
                                    </tr>
                                );
                            }

                            return (
                                <tr 
                                    key={item.id} 
                                    onClick={() => onRowClick(item)} 
                                    className="flex w-full hover:bg-gray-50 dark:hover:bg-secondary-700/50 cursor-pointer absolute top-0 left-0"
                                    style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                                >
                                    {columns.map(col => {
                                                                let cellContent: any;
                                                                if (col.render) {
                                                                    cellContent = col.render(item);
                                                                } else {
                                                                    const keyPath = String(col.key);
                                                                    if (keyPath === 'id') {
                                                                        // Prefer displayId for user-facing ID, then palletData.nrPalety, then fallback to raw id
                                                                        cellContent = (item && (item as any).displayId) || (item && (item as any).palletData && (item as any).palletData.nrPalety) || getNestedValue(item, keyPath);
                                                                    } else {
                                                                        cellContent = getNestedValue(item, keyPath);
                                                                    }
                                                                }
                                        return (
                                            <td key={String(col.key)} className={`flex-1 w-0 px-3 py-2 border-b dark:border-secondary-700 truncate ${col.cellClassName || ''}`}>
                                                {cellContent}
                                            </td>
                                        )
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StandardListView;
