import React from 'react';
import { ChecklistItem } from '../types';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';

interface ChecklistProps {
  items: any[];
  title: string;
}

const Checklist: React.FC<ChecklistProps> = ({ items, title }) => {
  const completedCount = (items || []).filter(item => item.status === 'completed').length;
  const totalCount = (items || []).length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="p-4 bg-slate-100 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
        <div 
          className="bg-primary-600 h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      <ul className="space-y-2">
        {(items || []).map(item => {
          let icon;
          let textClass = 'text-gray-500';
          if (item.status === 'completed') {
            icon = <CheckCircleIcon className="h-6 w-6 text-green-500" />;
            textClass = 'text-gray-800 font-medium line-through';
          } else {
            icon = <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white" />;
          }

          return (
            <li key={item.id} className="flex items-center gap-3 p-2 bg-white rounded-md shadow-sm">
              <div className="flex-shrink-0">{icon}</div>
              <span className={`text-sm transition-colors ${textClass}`}>{item.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Checklist;