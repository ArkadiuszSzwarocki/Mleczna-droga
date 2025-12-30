import React from 'react';
// FIX: Removed file extensions from all imports to fix module resolution errors.
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import ChevronUpIcon from './icons/ChevronUpIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import ChevronDownIcon from './icons/ChevronDownIcon';
import ChevronUpDownIcon from './icons/ChevronUpDownIcon';
import { SortConfig } from '../types';

// FIX: Refactored props to use React.PropsWithChildren. This is a more robust way to
// ensure the 'children' prop is correctly typed for generic components, resolving
// a widespread TypeScript error where 'children' was not being recognized.
interface SortableHeaderOwnProps<T> {
  columnKey: keyof T | string;
  sortConfig: SortConfig<T> | null;
  requestSort: (key: keyof T | string) => void;
  className?: string;
  thClassName?: string;
}

type SortableHeaderProps<T> = React.PropsWithChildren<SortableHeaderOwnProps<T>>;


const SortableHeader = <T extends object>({
  children,
  columnKey,
  sortConfig,
  requestSort,
  className = '',
  thClassName = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
}: SortableHeaderProps<T>) => {
  const isSorted = sortConfig?.key === columnKey;
  const isAscending = isSorted && sortConfig?.direction === 'ascending';

  return (
    <th scope="col" className={`${thClassName} cursor-pointer hover:bg-gray-100 dark:hover:bg-secondary-700/50 transition-colors`} onClick={() => requestSort(columnKey)}>
      <div className={`flex items-center ${className}`}>
        <span>{children}</span>
        <span className="ml-1 w-4 h-4 flex-shrink-0">
          {isSorted ? (isAscending ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />) : <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />}
        </span>
      </div>
    </th>
  );
};

export default SortableHeader;