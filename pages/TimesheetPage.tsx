
import React, { useState, useMemo, Fragment } from 'react';
import { Employee, AttendanceLogEntry, ActivityStatus, TimesheetEntry } from '../types';
import { EditIcon, SearchIcon } from '../components/Icons';
import { exportTimesheet } from '../services/exportService';
import TimesheetStats from '../components/TimesheetStats';

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
    // State changed from selectedEmployeeIds array to a simple search string
    const [searchTerm, setSearchTerm] = useState('');
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const [startDate, setStartDate] = useState(lastWeek.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    // --- Data Processing Logic ---
    const timesheetData = useMemo(() => {
        const start = new Date(`${startDate}T00:00:00`).getTime();
        const end = new Date(`${endDate}T23:59:59.999`).getTime();

        // Filter employees based on search term (case insensitive)
        const filteredEmployees = employees.filter(e => 
            searchTerm === '' || e.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        const statusColorMap = new Map<string, string>();
        activityStatuses.forEach(s => statusColorMap.set(s.name, s.color));
        statusColorMap.set('Working', 'transparent');

        const results: Record<string, {
            employeeName: string;
            employeeId: string;
            location: string;
            role: string;
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
            
            // If searching specifically, show the employee even if they have 0 hours (so user knows they exist but didn't work)
            // If not searching (showing all), hide employees with 0 logs to keep list clean
            if (employeeLogs.length === 0 && searchTerm === '') continue;

            results[employee.id] = { 
                employeeName: employee.name, 
                employeeId: employee.id,
                location: employee.location,
                role: employee.role,
                dailyData: {}, 
                totalWork: 0, 
                totalActivities: 0 
            };

            if (employeeLogs.length > 0) {
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
        }

        return Object.values(results);
    }, [employees, attendanceLog, activityStatuses, searchTerm, startDate, endDate]);

    // --- Statistics Calculation ---
    const stats = useMemo(() => {
        let totalWorkSeconds = 0;
        let totalActivitySeconds = 0;
        let topPerformer = { name: '', hours: 0 };

        timesheetData.forEach(data => {
            totalWorkSeconds += data.totalWork;
            totalActivitySeconds += data.totalActivities;
            if (data.totalWork > topPerformer.hours) {
                topPerformer = { name: data.employeeName, hours: data.totalWork };
            }
        });

        // Calculate days difference
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysCovered = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        return {
            totalWorkSeconds,
            totalActivitySeconds,
            uniqueEmployees: timesheetData.length,
            daysCovered,
            topPerformer: topPerformer.hours > 0 ? topPerformer : undefined
        };
    }, [timesheetData, startDate, endDate]);

    const handleExport = () => {
        exportTimesheet(timesheetData);
    };

    // Use search term to determine if we show the detailed single view
    const isSingleEmployeeView = timesheetData.length === 1 && searchTerm !== '';
    const singleEmployeeData = isSingleEmployeeView ? timesheetData[0] : null;

    const getInitials = (name: string) => {
        const names = name.trim().split(' ');
        if (names.length > 1) {
          return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="w-full mx-auto animate-fade-in flex flex-col gap-6">
            
            {/* Header Section with Dashboard Look */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-bokara-grey">Performance & Timesheets</h1>
                    <p className="text-bokara-grey/60 text-sm mt-1">
                        Analyzing from <span className="font-bold text-bokara-grey">{startDate}</span> to <span className="font-bold text-bokara-grey">{endDate}</span>
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={timesheetData.length === 0}
                    className="bg-bokara-grey hover:bg-bokara-grey/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-lg transition-all duration-300 shadow-lg flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    <span>Export Data</span>
                </button>
            </div>

            {/* Filter / Search Bar and Date Selection */}
            <div className="flex flex-col lg:flex-row gap-4 items-center bg-white rounded-xl shadow-md p-4 border border-bokara-grey/10">
                {/* Search Bar - Stylish Pill Shape */}
                <div className="w-full lg:w-96 relative group">
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white rounded-full py-3 pl-6 pr-14 text-bokara-grey shadow-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-bokara-grey/10 transition-all placeholder:text-gray-300 font-light"
                    />
                    <div className="absolute right-1.5 top-1.5 bottom-1.5">
                        <div className="h-full aspect-square bg-bokara-grey text-white rounded-full flex items-center justify-center shadow-md">
                            <SearchIcon className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="w-full lg:flex-1 flex flex-col sm:flex-row gap-4 justify-end">
                    <div className="flex-1 lg:max-w-xs">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-[#EAE2D3] border border-bokara-grey/20 text-bokara-grey rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-lucius-lime cursor-pointer shadow-sm"/>
                    </div>
                    <div className="hidden sm:flex items-center text-bokara-grey/40 font-bold">TO</div>
                    <div className="flex-1 lg:max-w-xs">
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-[#EAE2D3] border border-bokara-grey/20 text-bokara-grey rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-lucius-lime cursor-pointer shadow-sm"/>
                    </div>
                </div>
            </div>

            {/* Dashboard Stats */}
            <TimesheetStats 
                totalWorkSeconds={stats.totalWorkSeconds}
                totalActivitySeconds={stats.totalActivitySeconds}
                uniqueEmployees={stats.uniqueEmployees}
                daysCovered={stats.daysCovered}
                topPerformer={stats.topPerformer}
            />

            {/* Detailed Single Employee View */}
            {isSingleEmployeeView && singleEmployeeData && (
                <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden mb-8 animate-fade-in">
                    <div className="bg-gradient-to-r from-bokara-grey to-dark-hunter-green p-6 text-white flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 text-2xl font-bold backdrop-blur-sm">
                            {getInitials(singleEmployeeData.employeeName)}
                        </div>
                        <div className="flex-grow text-center sm:text-left">
                            <h2 className="text-3xl font-bold">{singleEmployeeData.employeeName}</h2>
                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2 opacity-80 text-sm">
                                <span className="bg-white/10 px-2 py-1 rounded">{singleEmployeeData.role}</span>
                                <span>•</span>
                                <span>{singleEmployeeData.location}</span>
                            </div>
                        </div>
                        <div className="text-center sm:text-right">
                            <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Total Periodo</p>
                            <p className="text-4xl font-display font-bold">{formatDuration(singleEmployeeData.totalWork, 'short')}</p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Timesheet Table */}
            <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider">Day</th>
                                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider">Type</th>
                                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider">Time In</th>
                                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider">Time Out</th>
                                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider text-right">Duration</th>
                                <th className="p-4 text-xs font-bold text-bokara-grey/60 uppercase tracking-wider text-center">Edit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {timesheetData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center p-16">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg className="w-12 h-12 text-bokara-grey/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                                            <p className="text-bokara-grey/50 font-medium">No records found for this period.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                timesheetData.map(employeeData => (
                                    <Fragment key={employeeData.employeeName}>
                                        {/* Employee Header Row (Only if showing multiple employees) */}
                                        {!isSingleEmployeeView && (
                                            <tr className="bg-whisper-white/50 border-b border-bokara-grey/5">
                                                <td colSpan={6} className="px-4 py-3">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-bokara-grey text-white flex items-center justify-center text-xs font-bold">
                                                                {getInitials(employeeData.employeeName)}
                                                            </div>
                                                            <span className="font-bold text-bokara-grey">{employeeData.employeeName}</span>
                                                        </div>
                                                        <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-bokara-grey/10 shadow-sm">
                                                            Total: {formatDuration(employeeData.totalWork + employeeData.totalActivities, 'short')}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        
                                        {Object.entries(employeeData.dailyData).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()).map(([date, dailyInfo]) => {
                                            const info = dailyInfo as { entries: TimesheetEntry[]; totalWork: number; totalActivities: number; };
                                            return (
                                            <Fragment key={date}>
                                                {info.entries.map((entry, index) => (
                                                    <tr key={entry.key} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${index === 0 && !isSingleEmployeeView ? 'border-t border-gray-200' : ''}`}>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="font-bold text-sm text-bokara-grey">{entry.dayOfWeek}</div>
                                                            <div className="text-xs text-bokara-grey/50">{entry.date}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${entry.color && entry.color !== 'transparent' ? '' : 'bg-lucius-lime'}`} style={{ backgroundColor: entry.color && entry.color !== 'transparent' ? entry.color : undefined }}></div>
                                                                <span className="text-sm font-medium text-bokara-grey/80">{entry.type}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-sm text-bokara-grey/70">{formatTime(entry.timeIn)}</td>
                                                        <td className="px-4 py-3 font-mono text-sm text-bokara-grey/70">{formatTime(entry.timeOut)}</td>
                                                        <td className="px-4 py-3 font-mono text-sm text-right font-bold text-bokara-grey">{formatDuration(entry.duration)}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button onClick={() => onEditEntry(entry)} className="p-1.5 text-bokara-grey/40 hover:text-lucius-lime hover:bg-lucius-lime/10 rounded-md transition-all" title="Edit Entry">
                                                                <EditIcon className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Daily Summary Row */}
                                                <tr className="bg-gray-50/50 border-b border-gray-200">
                                                    <td colSpan={4} className="px-4 py-2 text-right text-xs font-bold text-bokara-grey/40 uppercase tracking-wide">Daily Total</td>
                                                    <td className="px-4 py-2 text-right font-mono text-sm font-bold text-bokara-grey">{formatDuration(info.totalWork + info.totalActivities)}</td>
                                                    <td></td>
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
