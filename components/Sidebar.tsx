
import React, { useState, useMemo } from 'react';
import { getNavItemsDefinition } from '../src/navigation';
import { View, User, Permission } from '../types';
import QrCodeIcon from './icons/QrCodeIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import { useWarehouseContext } from './contexts/WarehouseContext';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  onOpenFeedbackModal: () => void;
  onLogout: () => void;
}

const NavItem: React.FC<{ item: any; isActive: boolean; onClick: () => void; level: number }> = ({ item, isActive, onClick, level }) => {
    const getDynamicStyles = () => {
        if (level === 0) return {};
        const baseRem = 2.75; 
        const levelOffsetRem = (level - 1) * 1.0;
        return { paddingLeft: `${baseRem + levelOffsetRem}rem` };
    };

    return (
        <li className="list-none">
            <a
                href="#"
                onClick={(e) => { e.preventDefault(); onClick(); }}
                aria-label={`Przejdź do: ${item.label}`}
                title={item.label}
                className={`flex items-center rounded-lg text-base font-medium transition-colors w-full ${level === 0 ? 'p-3' : 'p-2'} ${
                    isActive
                        ? (level === 0 ? 'bg-primary-600 text-white' : 'text-white bg-primary-600/80')
                        : (level === 0 ? 'text-gray-300 hover:bg-secondary-700 hover:text-white' : 'text-gray-400 hover:bg-secondary-600/50 hover:text-white')
                }`}
                style={getDynamicStyles()}
            >
                {item.icon && <span className="h-6 w-6 flex-shrink-0">{item.icon}</span>}
                <span className={`${item.icon ? 'ml-3' : ''} flex-1`}>{item.label}</span>
            </a>
        </li>
    );
};


const NavGroup: React.FC<{
    group: any;
    currentView: number;
    onItemClick: (view: number) => void;
    checkPermission: (item: any) => boolean;
    level: number;
}> = ({ group, currentView, onItemClick, checkPermission, level }) => {
    const visibleSubItems = (group.subItems || []).filter(checkPermission);

    if (visibleSubItems.length === 0) return null;

    const isSubItemActive = (item: any): boolean => {
        if (item.view === currentView) return true;
        if (item.isGroup && item.subItems) {
            return item.subItems.some(isSubItemActive);
        }
        return false;
    };

    const isGroupActive = visibleSubItems.some(isSubItemActive);
    const [isOpen, setIsOpen] = useState(group.defaultOpen || false);
    
    const getDynamicStyles = () => {
        if (level === 0) return {};
        const baseRem = 2.75; 
        const levelOffsetRem = (level - 1) * 1.0;
        return { paddingLeft: `${baseRem + levelOffsetRem}rem` };
    };
    
    return (
        <li className="list-none">
            <button 
                type="button" 
                aria-label={isOpen ? `Zwiń grupę: ${group.label}` : `Rozwiń grupę: ${group.label}`}
                title={group.label}
                data-group="true"
                className={`flex items-center w-full text-base font-medium rounded-lg group transition-colors text-left ${level === 0 ? 'p-3 text-gray-300' : 'p-2 text-gray-400'} ${isGroupActive ? 'text-white' : ''} hover:bg-secondary-700 hover:text-white`}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                style={getDynamicStyles()}
            >
                {group.icon && <span className="h-6 w-6 flex-shrink-0">{group.icon}</span>}
                <span className={`flex-1 ${group.icon ? 'ml-3' : ''}`}>{group.label}</span>
                <ChevronDownIcon className={`w-6 h-6 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <ul className={`space-y-1 list-none transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[1200px] mt-1' : 'max-h-0'}`}>
                 {visibleSubItems.map((subItem: any) => {
                    if (subItem.isGroup) {
                        return <NavGroup key={subItem.key} group={subItem} currentView={currentView} onItemClick={onItemClick} checkPermission={checkPermission} level={level + 1} />;
                    }
                    if(subItem.isSeparator) {
                        return <li key={`${subItem.key}-hr`} className="list-none"><hr className="my-1 border-secondary-700/50 mx-4" /></li>;
                    }
                    return <NavItem key={subItem.key} item={subItem} isActive={currentView === subItem.view} onClick={() => subItem.action ? subItem.action() : onItemClick(subItem.view)} level={level + 1} />;
                })}
            </ul>
        </li>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  toggleSidebar,
  onOpenFeedbackModal,
  onLogout
}) => {
  const { handleSetView, currentView, sidebarPosition } = useUIContext();
  const { checkPermission: hasPermission, currentUser } = useAuth();
  const { inventorySessions } = useWarehouseContext();

  const isInventoryActive = useMemo(() => inventorySessions.some(s => s.status === 'ongoing'), [inventorySessions]);
  
  const navItems = useMemo(() => 
    getNavItemsDefinition(
        onOpenFeedbackModal, 
        isInventoryActive, 
        currentUser?.role || '', 
        currentUser?.subRole || 'AGRO'
    ), 
  [onOpenFeedbackModal, isInventoryActive, currentUser]);

  const handleItemClick = (view: number) => {
    handleSetView(view as View);
    if (window.innerWidth < 1024) { 
        toggleSidebar();
    }
  };

  const checkPermission = (item: any) => {
    if (item.hidden) return false;
    if (item.allowedRoles && (!currentUser || !item.allowedRoles.includes(currentUser.role))) {
        return false;
    }
    if (item.permission && !hasPermission(item.permission as Permission)) {
        return false;
    }
    return true; 
  };
  
  return (
      <aside
        className={`fixed inset-y-0 ${sidebarPosition === 'left' ? 'left-0 border-r' : 'right-0 border-l'} z-40 h-screen bg-secondary-800 dark:bg-secondary-800 border-secondary-700 dark:border-secondary-700 transition-transform duration-300 ease-in-out w-64 md:w-72 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : (sidebarPosition === 'left' ? '-translate-x-full' : 'translate-x-full')}`}
        aria-label="Pasek boczny nawigacji"
      >
        <div className="w-64 md:w-72 h-full px-3 py-4 flex flex-col overflow-hidden">
          <div className="flex-grow overflow-y-auto scrollbar-hide">
                <ul className="space-y-2 list-none">
                {navItems.flatMap(item => {
                    if (!checkPermission(item)) {
                        return [];
                    }

                    let itemContent: React.ReactNode = null;
                    if (item.isGroup) {
                        if ((item.subItems || []).some(checkPermission)) {
                            itemContent = <NavGroup key={item.key} group={item} currentView={currentView} onItemClick={handleItemClick} checkPermission={checkPermission} level={0} />;
                        }
                    } else {
                        itemContent = <NavItem key={item.key} item={item} isActive={currentView === item.view} onClick={() => item.action ? item.action() : handleItemClick(item.view)} level={0} />;
                    }
                    
                    if (!itemContent) {
                        return [];
                    }

                    if (item.separatorBefore) {
                        const separator = <li key={`${item.key}-hr`} className="list-none"><hr className="my-2 border-secondary-700" /></li>;
                        return [separator, itemContent];
                    }
                    
                    return [itemContent];
                })}
                </ul>
          </div>
          <div className="flex-shrink-0 pt-4 mt-4 border-t border-secondary-700 space-y-2">
            <NavItem item={{ label: 'Skanuj', icon: <QrCodeIcon className="h-6 w-6 flex-shrink-0"/> }} isActive={currentView === View.Scan} onClick={() => handleItemClick(View.Scan)} level={0}/>
          </div>
        </div>
      </aside>
  );
};

export default Sidebar;
