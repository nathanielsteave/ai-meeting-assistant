import React from 'react';
import type { ActionItem } from '../types/meeting';
import { CheckCircle2, Circle, User, Calendar, AlertTriangle, ClipboardList } from 'lucide-react';

interface ActionItemsProps {
  items: ActionItem[];
}

export const ActionItems: React.FC<ActionItemsProps> = ({ items }) => {
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
          icon: 'text-red-500'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
          icon: 'text-yellow-500'
        };
      case 'low':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
          icon: 'text-blue-500'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800/50',
          border: 'border-gray-200 dark:border-gray-700',
          badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
          icon: 'text-gray-500'
        };
    }
  };

  // Remove duplicates based on task
  const uniqueItems = items.filter((item, index, self) => 
    index === self.findIndex((t) => t.task === item.task)
  );

  return (
    <div className="card-modern">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Action Items</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {uniqueItems.length} tasks extracted
            </p>
          </div>
        </div>
        
        {uniqueItems.some(i => i.priority === 'high') && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              {uniqueItems.filter(i => i.priority === 'high').length} High Priority
            </span>
          </div>
        )}
      </div>

      {/* List */}
      <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
        {uniqueItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No action items yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              They will appear as the meeting progresses
            </p>
          </div>
        ) : (
          uniqueItems.map((item, index) => {
            const styles = getPriorityStyles(item.priority);
            
            return (
              <div
                key={index}
                className={`group p-4 rounded-xl border ${styles.border} ${styles.bg} 
                           hover:shadow-md transition-all duration-300 animate-enter`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${styles.icon}`}>
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {item.task}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{item.assignee}</span>
                      </div>
                      
                      {item.deadline && item.deadline !== 'TBD' && (
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>{item.deadline}</span>
                        </div>
                      )}
                      
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};