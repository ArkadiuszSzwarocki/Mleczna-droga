import React from 'react';
// FIX: Corrected import path for AppContext to be relative from the current file's location.
import { useAppContext } from './contexts/AppContext';
import { View } from '../types';
import Button from './Button';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

const LogoShowcasePage: React.FC = () => {
    const { handleSetView } = useAppContext();

    return (
        <div className="p-4 md:p-6 bg-slate-900 text-white h-full flex flex-col items-center justify-center animate-fadeIn">
            <div className="w-full max-w-4xl text-center">
                <h1 className="text-5xl font-bold text-white mb-4" style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.3)' }}>
                    Wizja Logo: Mleczna Droga
                </h1>
                <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
                    Nowa koncepcja logo łączy litery 'M' i 'D' w płynny, dynamiczny symbol.
                    Stylizowana litera 'M' przypomina drogę lub rzekę mleka, która przechodzi w literę 'D', tworząc spójną całość.
                    Kształt przywodzi na myśl galaktykę, podkreślając innowacyjność i wizjonerski charakter systemu.
                </p>

                <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto mb-12">
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                        <defs>
                            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style={{ stopColor: '#a7c5fd', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: '#60a5fa', stopOpacity: 1 }} />
                            </linearGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Pulsating background glow */}
                        <circle cx="100" cy="100" r="80" fill="url(#logoGradient)" opacity="0.1">
                             <animate attributeName="r" from="80" to="90" dur="4s" repeatCount="indefinite" begin="0s" />
                             <animate attributeName="opacity" from="0.1" to="0.2" dur="4s" repeatCount="indefinite" begin="0s" />
                        </circle>
                         <circle cx="100" cy="100" r="70" fill="url(#logoGradient)" opacity="0.15">
                             <animate attributeName="r" from="70" to="80" dur="4s" repeatCount="indefinite" begin="1s" />
                             <animate attributeName="opacity" from="0.15" to="0.05" dur="4s" repeatCount="indefinite" begin="1s" />
                        </circle>

                        {/* Main Logo Path */}
                        <path
                            d="M 40 140 Q 50 80, 75 110 T 100 80 Q 125 50, 130 100 A 40 40 0 1 1 130 100 C 130 150, 80 160, 40 140 Z"
                            fill="url(#logoGradient)"
                            stroke="#ffffff"
                            strokeWidth="3"
                            filter="url(#glow)"
                        />

                        {/* Stars */}
                        <circle cx="30" cy="60" r="2" fill="white" opacity="0.7" />
                        <circle cx="170" cy="80" r="1.5" fill="white" opacity="0.8" />
                        <circle cx="150" cy="160" r="1" fill="white" opacity="0.6" />
                        <circle cx="60" cy="30" r="1.2" fill="white" opacity="0.9" />
                    </svg>
                </div>

                <Button onClick={() => handleSetView(View.Information)} variant="secondary" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                    Wróć do Informacji
                </Button>
            </div>
        </div>
    );
};

export default LogoShowcasePage;