import React from 'react';

interface OccupancyItem {
    name: string;
    id: string;
    occupied: number;
    capacity: number;
}

interface OccupancySummaryProps {
    items: OccupancyItem[];
    zoneId: string;
    onItemClick: (sectionId: string) => void;
}

const OccupancySummary: React.FC<OccupancySummaryProps> = ({ items, zoneId, onItemClick }) => {
    return (
        <div className="p-4 bg-slate-200 shadow-inner">
            {/* Nagłówek został usunięty zgodnie z prośbą */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
                {(items || []).map(item => {
                    const percentage = item.capacity > 0 ? (item.occupied / item.capacity) * 100 : 0;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onItemClick(item.id)}
                            className="col-span-1 text-left w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 rounded-lg transition-transform hover:-translate-y-1 p-3 rounded-lg bg-white border h-full"
                            aria-label={`Przejdź do sekcji ${item.name}`}
                        >
                            <div className="flex justify-between items-baseline text-sm mb-1">
                                <span className="font-semibold text-gray-700 truncate pr-2">{item.name}</span>
                                <div className="text-right flex-shrink-0">
                                    <span className="text-gray-500">{item.occupied} / {item.capacity}</span>
                                    <span className="ml-2 font-bold text-primary-600">{percentage.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default OccupancySummary;