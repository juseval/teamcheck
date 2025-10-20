import React from 'react';
import { Task, Employee } from '../types';

interface TaskTimelineCardProps {
    task: Task;
    assignee: Employee | null | undefined;
    style: React.CSSProperties;
}

const getInitials = (name: string) => {
  const names = name.trim().split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const TaskTimelineCard: React.FC<TaskTimelineCardProps> = ({ task, assignee, style }) => {
    return (
        <div 
            style={style}
            className="h-10 p-2 flex items-center justify-between rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
            <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: task.color, opacity: 0.2 }}></div>
            <div 
                className="absolute inset-0 rounded-lg" 
                style={{ 
                    backgroundColor: task.color, 
                    opacity: 0.4,
                    width: `${task.progress}%`
                }}
            ></div>

            <div className="relative flex items-center gap-2 overflow-hidden w-full">
                <div className="w-1 h-full rounded-full flex-shrink-0" style={{ backgroundColor: task.color }}></div>
                <span className="font-semibold text-sm text-bokara-grey/90 truncate flex-grow" title={task.name}>
                    {task.name}
                </span>
                {assignee && (
                     <div className="w-6 h-6 bg-lucius-lime/20 rounded-full flex items-center justify-center border border-lucius-lime/50 flex-shrink-0" title={`Assigned to ${assignee.name}`}>
                        <span className="text-xs font-bold text-bokara-grey select-none">{getInitials(assignee.name)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskTimelineCard;
