import React, { useEffect, useRef } from 'react';
import { useDynamicScripts } from '../../src/useDynamicScript';

declare var Chart: any;

interface GaugeChartProps {
  value: number; // The value to display (e.g., 85 for 85%)
  label: string;
  color: string;
}

const CHARTJS_URL = ["https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"];

const GaugeChart: React.FC<GaugeChartProps> = ({ value, label, color }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const { areLoaded: scriptsLoaded, error: scriptError } = useDynamicScripts(CHARTJS_URL);

  useEffect(() => {
    if (!scriptsLoaded || !chartRef.current || typeof Chart === 'undefined') return;
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const percentage = Math.max(0, Math.min(100, value));

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [percentage, 100 - percentage],
          backgroundColor: [color, '#e5e7eb'],
          borderColor: ['#ffffff', '#ffffff'],
          borderWidth: 2,
          circumference: 180,
          rotation: 270,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [value, color, scriptsLoaded]);

  if (!scriptsLoaded) {
    return (
        <div className="relative w-full h-48 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs mt-2 text-gray-500">Ładowanie wykresu...</span>
        </div>
    );
  }

  if (scriptError) {
      return <div className="text-xs text-red-500">Błąd ładowania Chart.js</div>
  }

  return (
    <div className="relative w-full h-48 flex flex-col items-center justify-center">
      <div className="absolute top-0 left-0 right-0 bottom-0">
          <canvas ref={chartRef}></canvas>
      </div>
      <div className="absolute flex flex-col items-center justify-center text-center" style={{ top: '60%' }}>
        <span className="text-3xl font-bold text-gray-800 dark:text-gray-200">{value.toFixed(1)}%</span>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{label}</span>
      </div>
    </div>
  );
};

export default GaugeChart;