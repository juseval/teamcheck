import React, { useState, useEffect } from 'react';
import { Task, Employee, TaskStatus } from '../types.ts';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (taskData: Omit<Task, 'id'>) => void;
  employees: Employee[];
  initialStatus: TaskStatus | null;
}

const colorPalette = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#6B7280'];


const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onAddTask, employees, initialStatus }) => {
  const [taskData, setTaskData] = useState({
      name: '',
      assigneeId: employees.length > 0 ? employees[0].id : undefined,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: initialStatus || 'To-do',
      progress: 0,
      color: colorPalette[0],
  });
  
  useEffect(() => {
    if (initialStatus) {
        setTaskData(prev => ({...prev, status: initialStatus}));
    }
  }, [initialStatus]);


  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setTaskData(prev => ({ ...prev, [name]: name === 'assigneeId' || name === 'progress' ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskData.name.trim()) {
      onAddTask(taskData);
      onClose(); // Close modal on submit
    }
  };
  
  const isFormValid = taskData.name.trim() && taskData.startDate && taskData.endDate && taskData.startDate <= taskData.endDate;

  return (
    <div className="fixed inset-0 bg-bokara-grey bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-bright-white rounded-xl shadow-2xl p-6 w-full max-w-lg border border-bokara-grey/10" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-bokara-grey mb-6">Add New Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="taskName" className="block text-sm font-medium text-lucius-lime mb-1">Task Name</label>
              <input id="taskName" name="name" type="text" value={taskData.name} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" placeholder="e.g., Finalize project report" required />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="taskAssignee" className="block text-sm font-medium text-lucius-lime mb-1">Assignee</label>
                    <select id="taskAssignee" name="assigneeId" value={taskData.assigneeId} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime">
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="taskStatus" className="block text-sm font-medium text-lucius-lime mb-1">Status</label>
                    <select id="taskStatus" name="status" value={taskData.status} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime">
                        <option value="To-do">To-do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Complete">Complete</option>
                    </select>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="taskStartDate" className="block text-sm font-medium text-lucius-lime mb-1">Start Date</label>
                    <input id="taskStartDate" name="startDate" type="date" value={taskData.startDate} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" required />
                </div>
                <div>
                    <label htmlFor="taskEndDate" className="block text-sm font-medium text-lucius-lime mb-1">End Date</label>
                    <input id="taskEndDate" name="endDate" type="date" value={taskData.endDate} onChange={handleChange} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" required />
                </div>
            </div>

             <div>
              <label htmlFor="taskProgress" className="block text-sm font-medium text-lucius-lime mb-1">Progress ({taskData.progress}%)</label>
              <input id="taskProgress" name="progress" type="range" min="0" max="100" step="5" value={taskData.progress} onChange={handleChange} className="w-full h-2 bg-whisper-white rounded-lg appearance-none cursor-pointer" />
            </div>
             <div>
              <label className="block text-sm font-medium text-lucius-lime mb-1">Color</label>
              <div className="flex gap-2">
                {colorPalette.map(color => (
                    <button key={color} type="button" onClick={() => setTaskData(prev => ({...prev, color}))} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${taskData.color === color ? 'border-bokara-grey' : 'border-transparent'}`} style={{backgroundColor: color}}></button>
                ))}
              </div>
            </div>
          
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-bokara-grey rounded-lg hover:bg-gray-300 transition-colors">
              Cancel
            </button>
            <button type="submit" className="py-2 px-4 bg-lucius-lime text-bokara-grey font-bold rounded-lg hover:bg-opacity-80 transition-colors disabled:bg-lucius-lime/40 disabled:cursor-not-allowed" disabled={!isFormValid}>
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;