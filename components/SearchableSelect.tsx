
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Input from './Input'; 
import ChevronUpDownIcon from './icons/ChevronUpDownIcon';
import { SelectOption } from '../types';

interface SearchableSelectProps {
  options: any[];
  value: string | number; 
  onChange: (value: string) => void;
  label: string;
  id?: string; 
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  label,
  id, 
  placeholder = 'Wyszukaj...',
  disabled = false,
  error,
  required,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Znajdujemy etykietę dla aktualnej wartości (jeśli istnieje w opcjach)
  const selectedOptionLabel = useMemo(() => {
    const opt = (options || []).find(opt => String(opt.value) === String(value));
    return opt ? opt.label : String(value); // Jeśli nie ma w opcjach, pokaż surową wartość
  }, [value, options]);
  
  const displayValue = isOpen ? searchTerm : selectedOptionLabel;

  const selectId = id || `searchable-select-${label.replace(/\s+/g, '')}`;

  const updatePosition = () => {
    if (isOpen && inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const estimatedDropdownHeight = 250;

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpwards = spaceBelow < estimatedDropdownHeight && spaceAbove > estimatedDropdownHeight;

      // FIX: Changed newStyle to any to resolve CSSProperties strict key checking errors on lines 67-73.
      const newStyle: any = {
        position: 'fixed',
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 9999,
      };

      if (openUpwards) {
        newStyle.bottom = `${viewportHeight - rect.top + 4}px`;
        newStyle.top = 'auto';
        newStyle.maxHeight = `${Math.min(estimatedDropdownHeight, spaceAbove - 10)}px`;
      } else {
        newStyle.top = `${rect.bottom + 4}px`;
        newStyle.bottom = 'auto';
        newStyle.maxHeight = `${Math.min(estimatedDropdownHeight, spaceBelow - 10)}px`;
      }
      setDropdownStyle(newStyle as React.CSSProperties);
    }
  };

  useEffect(() => {
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        // Przy wyjściu z pola, jeśli mamy coś wpisane w search, a nie wybrano z listy,
        // przekazujemy to jako nową wartość (dla nowych dostawców)
        if (isOpen && searchTerm.trim() !== '') {
            onChange(searchTerm.trim());
        }
        setIsOpen(false);
        setSearchTerm(''); 
      }
    };
    
    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, searchTerm, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (!isOpen) setIsOpen(true);
    // Przekazujemy zmianę w czasie rzeczywistym, aby formularz widział wpisywany tekst
    onChange(val);
  };

  const handleInputClick = () => {
    if (!disabled) {
        setIsOpen(true);
        setSearchTerm(selectedOptionLabel === String(value) ? selectedOptionLabel : ''); 
    }
  };
  
  const handleOptionClick = (option: any) => {
    onChange(String(option.value)); 
    setSearchTerm('');
    setIsOpen(false);
  };

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options || [];
    return (options || []).filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, options]);

  const DropdownList = (
    <div
      style={dropdownStyle}
      className="bg-white dark:bg-secondary-700 shadow-lg rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm animate-fadeIn flex flex-col"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <ul role="listbox" className="w-full">
      {filteredOptions.length > 0 ? (
        filteredOptions.map(option => {
          const isSelected = String(value) === String(option.value);
          return (
          <li
            key={String(option.value)}
            className={`cursor-pointer select-none relative py-2 pl-3 pr-9 transition-colors duration-150
                        ${ isSelected
                            ? 'bg-primary-100 dark:bg-primary-700 text-primary-900 dark:text-primary-100' 
                            : 'text-gray-900 dark:text-gray-100 hover:bg-primary-50 dark:hover:bg-primary-800/60'
                        }`}
            onClick={() => handleOptionClick(option)}
            role="option"
            aria-selected={isSelected}
          >
            <span className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
              {option.label}
            </span>
          </li>
        )})
      ) : (
        <li className="cursor-default select-none relative py-2 pl-3 pr-9 text-gray-500 dark:text-gray-400 italic">
          Brak na liście. Zostanie dodany: "{searchTerm}"
        </li>
      )}
      </ul>
    </div>
  );

  return (
    <div className="w-full" ref={wrapperRef}>
       {label && (
           <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {label}
           </label>
       )}
      <div className="relative" ref={inputContainerRef}>
        <input
            id={selectId}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onClick={handleInputClick}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete="off"
            className={`block w-full px-4 py-2 text-gray-900 dark:text-gray-200 border rounded-lg shadow-sm sm:text-sm 
                        pr-10
                        ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500 dark:border-red-400' 
                               : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500 dark:border-secondary-600 dark:focus:border-primary-400'
                        }
                        ${disabled ? 'bg-gray-100 dark:bg-secondary-700 cursor-not-allowed' 
                                  : (className || 'bg-white dark:bg-secondary-800')
                        }
                        `}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {isOpen && !disabled && ReactDOM.createPortal(DropdownList, document.body)}
    </div>
  );
};

export default SearchableSelect;
