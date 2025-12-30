
import React from 'react';

interface WeighingScaleGraphicProps {
    id: string;
    label: string;
    currentWeight: number; // Masa w aktualnej szarży
    totalStockWeight?: number; // Całkowity zapas w silosach powyżej
    isActive: boolean;
}

const WeighingScaleGraphic: React.FC<WeighingScaleGraphicProps> = ({ id, label, currentWeight, totalStockWeight, isActive }) => {
    return (
        <div className="flex flex-col items-center w-full min-w-[200px]">
            <svg width="100%" height="100" viewBox="0 0 600 100" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Szyna nośna wagi (rozciągnięta) */}
                <rect x="0" y="60" width="600" height="6" fill="#475569" />
                
                {/* Nogi wagi */}
                <rect x="20" y="66" width="10" height="34" fill="#64748b" />
                <rect x="570" y="66" width="10" height="34" fill="#64748b" />
                
                {/* Zbiornik wagowy - trapez rozciągnięty od krawędzi do krawędzi */}
                <path d="M0 0 L600 0 L560 50 L40 50 Z" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
                
                {/* Wylot zbiornika */}
                <rect x="285" y="50" width="30" height="10" fill="#334155" />

                {/* LCD Terminala (zawsze na środku, stały rozmiar) */}
                <g transform="translate(240, 60)">
                    <rect x="0" y="0" width="120" height="38" rx="4" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.5" />
                    <text x="60" y="10" textAnchor="middle" fontSize="6" fill="#60a5fa" fontWeight="bold" fontFamily="Arial" className="uppercase tracking-widest">{label}</text>
                    
                    {/* Główny odczyt: Masa Szarży */}
                    <text x="60" y="26" textAnchor="middle" fontFamily="monospace" fontSize="16" fill={isActive ? "#4ade80" : "#94a3b8"} fontWeight="bold">
                        {currentWeight.toFixed(1)}
                    </text>
                    <text x="105" y="24" fontSize="5" fill="#60a5fa" fontFamily="Arial">kg</text>

                    {/* Pomocniczy odczyt: Zapas (opcjonalnie) */}
                    {totalStockWeight !== undefined && (
                        <g transform="translate(0, 30)">
                            <text x="60" y="4" textAnchor="middle" fontSize="5" fill="#94a3b8" fontFamily="Arial">ZAPAS: {totalStockWeight.toFixed(0)} kg</text>
                        </g>
                    )}
                </g>
                
                {/* Animacja przepływu jeśli aktywna */}
                {isActive && (
                    <g className="animate-pulse">
                        <circle cx="300" cy="25" r="3" fill="#4ade80" />
                    </g>
                )}
            </svg>
        </div>
    );
};

export default WeighingScaleGraphic;
