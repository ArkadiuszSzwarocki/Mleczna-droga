
import React, { useState, useRef, useEffect } from 'react';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import { View } from '../types';
import MenuIcon from './icons/MenuIcon';
import SearchIcon from './icons/SearchIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import LogoutIcon from './icons/LogoutIcon';
import NotificationBell from './NotificationBell';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import HomeIcon from './icons/HomeIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import MLogoIcon from './icons/MLogoIcon';


interface HeaderProps {
    toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
    const { 
        pageTitle, 
        pageSubtitle,
        handleSetView,
        notificationCount,
        modalHandlers,
        handleNavBack,
        handleNavForward,
        handleNavHome,
        canGoBack,
        canGoForward,
        sidebarPosition,
    } = useUIContext();
    const { currentUser, handleLogout, getRoleLabel } = useAuth();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const HamburgerButton = () => (
        <button 
            onClick={toggleSidebar} 
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-secondary-700 lg:hidden"
            aria-label="Otwórz menu boczne"
            title="Menu boczne"
        >
            <MenuIcon className="h-6 w-6" />
        </button>
    );

    const handleSecretAdminClick = () => {
        if (currentUser?.role === 'admin' || currentUser?.role === 'boss') {
            handleSetView(View.PalletMovementTester);
        }
    };

    return (
        <header className="flex-shrink-0 bg-white dark:bg-secondary-800 shadow-md z-40 no-print">
            <div className="flex items-center justify-between h-16 px-4">
                <div className="flex items-center gap-2">
                    {sidebarPosition === 'left' && <HamburgerButton />}
                    
                    {/* Secret Admin Button wrapped in Logo */}
                    <div 
                        onClick={handleSecretAdminClick}
                        className="h-8 w-8 ml-2 cursor-pointer transition-transform active:scale-90"
                        title="Mleczna Droga MES"
                    >
                        <MLogoIcon className="h-full w-full" />
                    </div>

                     <div className="hidden md:flex items-center gap-1 ml-2">
                        <button 
                            onClick={handleNavBack} 
                            disabled={!canGoBack} 
                            className="p-2 rounded-full text-gray-500 disabled:text-gray-300 dark:text-gray-400 dark:disabled:text-gray-600 hover:bg-gray-100 dark:hover:bg-secondary-700 disabled:cursor-not-allowed"
                            aria-label="Wróć do poprzedniej strony"
                            title="Wstecz"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                         <button 
                            onClick={handleNavForward} 
                            disabled={!canGoForward} 
                            className="p-2 rounded-full text-gray-500 disabled:text-gray-300 dark:text-gray-400 dark:disabled:text-gray-600 hover:bg-gray-100 dark:hover:bg-secondary-700 disabled:cursor-not-allowed"
                            aria-label="Przejdź do następnej strony"
                            title="Dalej"
                        >
                            <ArrowRightIcon className="h-5 w-5" />
                        </button>
                        <button 
                            onClick={handleNavHome} 
                            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-secondary-700"
                            aria-label="Wróć na pulpit główny"
                            title="Pulpit główny"
                        >
                            <HomeIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="ml-4">
                        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 leading-tight">{pageTitle}</h1>
                        {pageSubtitle && <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{pageSubtitle}</div>}
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={() => handleSetView(View.GlobalSearch)}
                        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-secondary-700"
                        aria-label="Otwórz wyszukiwarkę globalną"
                        title="Szukaj"
                    >
                        <SearchIcon className="h-6 w-6" />
                    </button>
                    
                    <NotificationBell count={notificationCount} onClick={modalHandlers.toggleNotificationCenter} />
                    
                    <div className="relative" ref={userMenuRef}>
                        <button 
                            onClick={() => setIsUserMenuOpen(prev => !prev)} 
                            className="flex items-center gap-2 p-1 pl-3 rounded-full hover:bg-gray-100 dark:hover:bg-secondary-700 border dark:border-secondary-600 transition-colors"
                            aria-label="Otwórz menu użytkownika"
                            title="Użytkownik"
                        >
                            <div className="flex flex-col items-end mr-1 text-right">
                                <span className="hidden sm:inline text-sm font-bold text-gray-800 dark:text-gray-200 leading-none">{currentUser?.username}</span>
                                <span className="text-[9px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-tighter">{getRoleLabel(currentUser?.role || '')}</span>
                            </div>
                            <UserCircleIcon className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                            <ChevronDownIcon className={`h-4 w-4 text-gray-500 dark:text-gray-400 hidden sm:inline transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}/>
                        </button>

                        {isUserMenuOpen && (
                             <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-secondary-700 rounded-xl shadow-2xl py-2 ring-1 ring-black ring-opacity-5 animate-fadeIn z-50 overflow-hidden">
                                <div className="px-4 py-3 border-b dark:border-secondary-600 mb-1 bg-slate-50 dark:bg-secondary-800/50">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Zalogowany użytkownik</p>
                                    <p className="text-sm font-bold text-primary-600 dark:text-primary-400">{currentUser?.username}</p>
                                </div>
                                
                                <button 
                                    onClick={() => { handleSetView(View.MyAccount); setIsUserMenuOpen(false); }} 
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-secondary-600 transition-colors"
                                >
                                    <UserCircleIcon className="h-5 w-5 text-gray-400" />
                                    <span>Moje Konto</span>
                                </button>
                                
                                <div className="border-t my-1 border-gray-100 dark:border-secondary-600"></div>
                                
                                <button 
                                    onClick={() => { setIsUserMenuOpen(false); handleLogout(); }} 
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    <LogoutIcon className="h-5 w-5" />
                                    <span>Wyloguj się</span>
                                </button>
                            </div>
                        )}
                    </div>
                    {sidebarPosition === 'right' && <HamburgerButton />}
                </div>
            </div>
        </header>
    );
};
export default Header;
