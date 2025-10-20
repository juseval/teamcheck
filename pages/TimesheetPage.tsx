import React, { useState, useMemo, Fragment } from 'react';
import { Employee, AttendanceLogEntry, ActivityStatus, TimesheetEntry } from '../types.ts';
import { EditIcon } from '../components/Icons.tsx';

const formatDuration = (seconds: number, style: 'short' | 'long' = 'long') => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);

    if (style === 'short') {
        return [
            h > 0 ? `${h}h` : '',
            m > 0 ? `${m}m` : '',
        ].filter(Boolean).join(' ') || '0m';
    }

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
};


const TimesheetPage: React.FC<{
    employees: Employee[];
    attendanceLog: AttendanceLogEntry[];
    activityStatuses: ActivityStatus[];
    onEditEntry: (entry: TimesheetEntry) => void;
}> = ({ employees, attendanceLog, activityStatuses, onEditEntry }) => {
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const [startDate, setStartDate] = useState(lastWeek.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    const handleEmployeeSelection = (employeeId: number) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const timesheetData = useMemo(() => {
        const start = new Date(`${startDate}T00:00:00`).getTime();
        const end = new Date(`${endDate}T23:59:59.999`).getTime();

        const filteredEmployees = employees.filter(e => selectedEmployeeIds.length === 0 || selectedEmployeeIds.includes(e.id));
        
        const statusColorMap = new Map<string, string>();
        activityStatuses.forEach(s => statusColorMap.set(s.name, s.color));
        statusColorMap.set('Working', 'transparent');

        const results: Record<number, {
            employeeName: string;
            dailyData: Record<string, {
                entries: TimesheetEntry[];
                totalWork: number;
                totalActivities: number;
            }>;
            totalWork: number;
            totalActivities: number;
        }> = {};

        for (const employee of filteredEmployees) {
            const employeeLogs = attendanceLog
                .filter(log => log.employeeId === employee.id && log.timestamp >= start && log.timestamp <= end)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (employeeLogs.length === 0) continue;

            results[employee.id] = { employeeName: employee.name, dailyData: {}, totalWork: 0, totalActivities: 0 };

            const logsByDay: Record<string, AttendanceLogEntry[]> = {};
            for (const log of employeeLogs) {
                const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
                if (!logsByDay[dateStr]) logsByDay[dateStr] = [];
                logsByDay[dateStr].push(log);
            }

            for (const dateStr in logsByDay) {
                const dailyLogs = logsByDay[dateStr];
                const entries: TimesheetEntry[] = [];
                const activityCounters: Record<string, number> = {};
                let dailyTotalWork = 0;
                let dailyTotalActivities = 0;

                for (let i = 0; i < dailyLogs.length; i++) {
                    const currentLog = dailyLogs[i];
                    const nextLog = dailyLogs[i+1];

                    if (currentLog.action === 'Clock Out' || !nextLog) continue;

                    const duration = (nextLog.timestamp - currentLog.timestamp) / 1000;
                    if (duration <= 1) continue;

                    let activity = 'Working';
                    if (currentLog.action.startsWith('Start ')) {
                        activity = currentLog.action.substring(6);
                    }

                    let entryType = activity;
                    if (activity !== 'Working') {
                        if (!activityCounters[activity]) activityCounters[activity] = 0;
                        activityCounters[activity]++;
                        entryType = `${activity} ${activityCounters[activity]}`;
                        dailyTotalActivities += duration;
                    } else {
                        dailyTotalWork += duration;
                    }

                    entries.push({
                        key: `${employee.id}-${currentLog.id}`,
                        employeeId: employee.id,
                        employeeName: employee.name,
                        date: dateStr,
                        dayOfWeek: new Date(currentLog.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
                        type: entryType,
                        timeIn: currentLog.timestamp,
                        timeOut: nextLog.timestamp,
                        duration,
                        color: activity !== 'Working' ? statusColorMap.get(activity) : undefined,
                        startLogId: currentLog.id,
                        endLogId: nextLog.id,
                    });
                }

                if (entries.length > 0) {
                    results[employee.id].dailyData[dateStr] = { entries, totalWork: dailyTotalWork, totalActivities: dailyTotalActivities };
                    results[employee.id].totalWork += dailyTotalWork;
                    results[employee.id].totalActivities += dailyTotalActivities;
                }
            }
        }

        return Object.values(results).filter(res => Object.keys(res.dailyData).length > 0);
    }, [employees, attendanceLog, activityStatuses, selectedEmployeeIds, startDate, endDate]);

    return (
        <div className="w-full mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold text-bokara-grey mb-6">Timesheet</h1>
            
            <div className="bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10 mb-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-lucius-lime mb-2">Employees</label>
                        <div className="p-2 bg-whisper-white border border-bokara-grey/20 rounded-lg max-h-32 overflow-y-auto">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded-md">
                                    <input type="checkbox" checked={selectedEmployeeIds.length === 0} onChange={() => setSelectedEmployeeIds([])} className="h-4 w-4 rounded text-lucius-lime focus:ring-lucius-lime" />
                                    <span className="font-semibold">All Employees</span>
                                </label>
                                {employees.map(emp => (
                                    <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded-md">
                                        <input type="checkbox" checked={selectedEmployeeIds.includes(emp.id)} onChange={() => handleEmployeeSelection(emp.id)} className="h-4 w-4 rounded text-lucius-lime focus:ring-lucius-lime" />
                                        <span>{emp.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-lucius-lime mb-2">Start Date</label>
                        <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"/>
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-lucius-lime mb-2">End Date</label>
                        <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime"/>
                    </div>
                 </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-whisper-white/50">
                            <tr className="border-b border-bokara-grey/10">
                                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Day</th>
                                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Type</th>
                                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Time In</th>
                                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider">Time Out</th>
                                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider text-right">Duration</th>
                                <th className="p-3 text-sm font-semibold text-lucius-lime uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {timesheetData.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-16 text-bokara-grey/60">No data found for the selected criteria.</td></tr>
                            ) : (
                                timesheetData.map(empData => (
                                    <Fragment key={empData.employeeName}>
                                        <tr className="bg-dark-hunter-green/90 text-bright-white sticky top-0">
                                            <td colSpan={4} className="p-3 font-bold text-lg">{empData.employeeName}</td>
                                            <td colSpan={2} className="p-3 text-right font-semibold text-sm">
                                                Total Work: <span className="font-mono">{formatDuration(empData.totalWork)}</span> | 
                                                Activities: <span className="font-mono">{formatDuration(empData.totalActivities)}</span>
                                            </td>
                                        </tr>
                                        {Object.entries(empData.dailyData).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()).map(([date, dayData]) => {
                                            // FIX: Add type assertion for dayData because Object.entries infers the value as `unknown`.
                                            const data = dayData as { entries: TimesheetEntry[]; totalWork: number; totalActivities: number; };
                                            return (
                                            <Fragment key={date}>
                                                {data.entries.map((entry, index) => (
                                                     <tr key={entry.key} style={{backgroundColor: entry.color ? `${entry.color}20` : 'transparent'}} className="border-b border-bokara-grey/10 hover:bg-bokara-grey/5">
                                                        <td className="p-3 text-bokara-grey/80">{index === 0 ? `${entry.dayOfWeek}, ${entry.date}`: ''}</td>
                                                        <td className="p-3 text-bokara-grey">{entry.type}</td>
                                                        <td className="p-3 text-bokara-grey/80 font-mono">{formatTime(entry.timeIn)}</td>
                                                        <td className="p-3 text-bokara-grey/80 font-mono">{formatTime(entry.timeOut)}</td>
                                                        <td className="p-3 text-bokara-grey font-mono text-right">{formatDuration(entry.duration)}</td>
                                                        <td className="p-3 text-center">
                                                            <button onClick={() => onEditEntry(entry)} className="p-1 text-bokara-grey/50 hover:text-lucius-lime rounded-full hover:bg-whisper-white transition-colors" title="Edit Entry">
                                                                <EditIcon className="w-5 h-5" />
                                                            </button>
                                                        </td>
                                                     </tr>
                                                ))}
                                                <tr className="bg-whisper-white border-b-2 border-bokara-grey/20">
                                                    <td colSpan={4} className="p-2 text-right font-bold text-bokara-grey/80 text-sm">Daily Total for {date}</td>
                                                    <td className="p-2 font-semibold text-bokara-grey text-sm text-right">
                                                        Work: <span className="font-mono text-lucius-lime">{formatDuration(data.totalWork)}</span>
                                                    </td>
                                                     <td className="p-2 font-semibold text-bokara-grey text-sm text-right">
                                                        Activities: <span className="font-mono text-wet-sand">{formatDuration(data.totalActivities)}</span>
                                                    </td>
                                                </tr>
                                            </Fragment>
                                        )})}
                                    </Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TimesheetPage;