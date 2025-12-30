
import React from 'react';
import XCircleIcon from './icons/XCircleIcon';

interface ChargingStationGraphicProps {
    stationId: string;
    productName: string;
    weight: number;
    status: string;
    isBlocked: boolean;
    isEmpty: boolean;
}

const ChargingStationGraphic: React.FC<ChargingStationGraphicProps> = ({ 
    stationId, 
    productName, 
    weight, 
    status, 
    isBlocked, 
    isEmpty 
}) => {
    const getBagColor = () => {
        if (isEmpty || weight <= 0) return "transparent"; 
        if (weight <= 100) return "#f97316"; 
        return "#22c55e"; 
    };

    const getStatusColor = () => {
        return (isEmpty || weight <= 0) ? "#ef4444" : "#22c55e"; 
    };

    const shadowEffect = isBlocked 
        ? "drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))" 
        : "drop-shadow(0 1px 3px rgba(0,0,0,0.2))";

    const shouldShowBag = !isEmpty && weight > 0;

    return (
        <div className="relative w-[65px] mx-auto transition-all duration-300 group">
            <svg 
                width="65" 
                height="220" 
                viewBox="0 0 65 220" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: shadowEffect }}
            >
                {/* 1. SEKCJA GÓRNA - ULTRA SLIM BIG BAG */}
                {shouldShowBag && (
                    <g id="big-bag-ultra-slim" className="animate-fadeIn">
                        <rect x="14" y="5" width="36" height="3" fill="#333" />
                        <path 
                            d="M14 12 L14 90 C14 100 22 105 32 105 C42 105 50 100 50 90 L50 12 C50 8 45 5 40 5 L24 5 C19 5 14 8 14 12 Z" 
                            fill={getBagColor()} 
                            stroke="#444" 
                            strokeWidth="1"
                        />
                        <rect x="27" y="105" width="10" height="3" fill="#999" />
                    </g>
                )}

                {/* 2. SEKCJA DOLNA - ULTRA SLIM SILOS (dotyka krawędzi 0-65) */}
                <g id="silos-ultra-slim" transform="translate(0, 100)">
                    <rect x="0" y="0" width="65" height="65" fill="#C0C0C0" stroke="#444" strokeWidth="2"/>
                    <path d="M0 35 L32.5 65 L65 35 Z" fill="#A0A0A0" stroke="#444" strokeWidth="2"/>
                    
                    {/* Status dot */}
                    <circle cx="32.5" cy="52" r="3.5" fill={getStatusColor()} stroke="white" strokeWidth="1" />

                    {/* Produkt */}
                    <rect x="5" y="6" width="55" height="12" fill="white" stroke="#999" strokeWidth="0.5" />
                    <text x="32.5" y="15" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="5" fill="black">
                        {isEmpty ? 'PUSTA' : productName.substring(0, 8).toUpperCase()}
                    </text>
                    
                    {/* ID Stacji */}
                    <rect x="5" y="20" width="55" height="12" fill="#222" stroke="#444" />
                    <text x="32.5" y="30" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="7.5" fill="white">
                        {stationId}
                    </text>

                    {/* LCD Wagi */}
                    <g transform="translate(5, 65)">
                        <path d="M1 0 L53 0 L53 14 L30 14 L27 20 L24 14 L1 14 Z" fill="white" stroke="black" strokeWidth="1"/>
                        <text x="22" y="10" textAnchor="middle" fontFamily="monospace" fontSize="8.5" fontWeight="bold" fill="black">
                            {isEmpty ? '0.0' : weight.toFixed(0)}
                        </text>
                        <text x="40" y="9" fontFamily="Arial" fontSize="4.5" fontWeight="bold" fill="#666">kg</text>
                    </g>
                </g>
            </svg>

            {isBlocked && (
                <div className="absolute top-[52%] right-[-4px] bg-red-600 text-white rounded-full p-0.5 shadow-md z-20 animate-pulse border border-white">
                    <XCircleIcon className="w-2 h-2" />
                </div>
            )}
        </div>
    );
};

export default ChargingStationGraphic;
