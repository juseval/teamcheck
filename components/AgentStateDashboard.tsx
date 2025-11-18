
import React, { useState, useEffect, useMemo } from 'react';
import { Employee, WorkSchedule, ActivityStatus, CalendarEvent } from '../types';
import { PowerIcon, PhoneStatusIcon, CrossStatusIcon, CheckStatusIcon, SpeakerStatusIcon, FilterIcon } from './Icons';

interface AgentStateDashboardProps {
  employees: Employee[];
  workSchedules: WorkSchedule[];
  activityStatuses: ActivityStatus[];
  calendarEvents: CalendarEvent[];
}

type AgentState = 'After Call Work' | 'Not Ready' | 'Ready' | 'On Call' | 'Offline';

interface Agent {
  // FIX: Changed id type from number to string.
  id: string;
  fullName: string;
  state: AgentState;
  reasonCode: string;
  stateDuration: number | null;
  callType: 'Inbound' | 'Outbound' | '-';
  schedule: string;
}

const formatDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
        return `${hours.toString()}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const StateIcon: React.FC<{ state: AgentState | string, reasonCode: string }> = ({ state, reasonCode }) => {
    const iconProps = { className: 'w-5 h-5 p-0.5 rounded-full text-white' };
    
    // Special handling for calendar events
    if (state === 'Not Ready' && reasonCode !== 'Not Ready' && reasonCode !== '-') {
         return <div className="bg-purple-500 rounded-full p-0.5" title={reasonCode}><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>;
    }

    switch (state) {
        case 'After Call Work':
            return <div className="bg-blue-400 rounded-full p-0.5"><PhoneStatusIcon {...iconProps} className="w-4 h-4 text-white" /></div>;
        case 'Not Ready':
            return <div className="bg-red-500 rounded-full p-0.5"><CrossStatusIcon {...iconProps} className="w-4 h-4 text-white" /></div>;
        case 'Ready':
            return <div className="bg-green-500 rounded-full p-0.5"><CheckStatusIcon {...iconProps} className="w-4 h-4 text-white" /></div>;
        case 'On Call':
            return <div className="bg-yellow-500 rounded-full p-0.5"><SpeakerStatusIcon {...iconProps} className="w-4 h-4 text-white" /></div>;
        case 'Offline':
            return <div className="bg-gray-400 rounded-full p-0.5"><PowerIcon className="w-4 h-4 text-white" /></div>;
        default:
            return <div className="bg-gray-400 rounded-full p-0.5"><CrossStatusIcon {...iconProps} className="w-4 h-4 text-white" /></div>;
    }
};

const AgentStateDashboard: React.FC<AgentStateDashboardProps> = ({ employees, workSchedules, activityStatuses, calendarEvents }) => {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setTick(t => t + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const scheduleMap = useMemo(() => new Map(workSchedules.map(s => [s.id, s])), [workSchedules]);
    
    const agents = useMemo(() => {
        const now = new Date();
        const nowTs = now.getTime();
        
        // Construct YYYY-MM-DD string safely using local time values
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const todaysEventsMap = new Map<string, CalendarEvent>();
        for (const event of calendarEvents) {
            // Compare date strings directly to avoid timezone shifts
            if (todayStr >= event.startDate && todayStr <= event.endDate) {
                todaysEventsMap.set(event.employeeId, event);
            }
        }

        const processedAgentList: Agent[] = [];
        const processedEmployeeIds = new Set<string>();

        // 1. Process employees with calendar events for today
        todaysEventsMap.forEach((event, employeeId) => {
            const employee = employees.find(e => e.id === employeeId);
            if (employee) {
                processedEmployeeIds.add(employeeId);

                const schedule = employee.workScheduleId ? scheduleMap.get(employee.workScheduleId) : null;
                const scheduleString = schedule ? `${schedule.startTime} - ${schedule.endTime}` : 'N/A';
                
                // For calendar events (Novedades), we do NOT show a duration/timer.
                // It should display as static.

                processedAgentList.push({
                    id: employee.id,
                    fullName: employee.name,
                    state: 'Not Ready',
                    reasonCode: event.type,
                    stateDuration: null, // Set to null to display '-'
                    callType: '-',
                    schedule: scheduleString,
                });
            }
        });

        // 2. Process all other employees (including Clocked Out)
        employees.forEach(employee => {
            if (processedEmployeeIds.has(employee.id)) {
                return; // Already processed
            }

            const schedule = employee.workScheduleId ? scheduleMap.get(employee.workScheduleId) : null;
            const scheduleString = schedule ? `${schedule.startTime} - ${schedule.endTime}` : 'N/A';

            if (employee.status === 'Clocked Out') {
                processedAgentList.push({
                    id: employee.id,
                    fullName: employee.name,
                    state: 'Offline',
                    reasonCode: '-',
                    stateDuration: null, // Set to null for Offline
                    callType: '-',
                    schedule: scheduleString,
                });
            } else {
                let state: AgentState = 'Not Ready';
                let reasonCode = employee.status;
                let callType: Agent['callType'] = '-';
                let duration: number | null = employee.currentStatusStartTime ? Math.floor((nowTs - employee.currentStatusStartTime) / 1000) : 0;

                switch(employee.status) {
                    case 'Working':
                        state = 'Ready';
                        reasonCode = '-';
                        break;
                    case 'On Call':
                        state = 'On Call';
                        reasonCode = '-';
                        callType = 'Inbound';
                        break;
                    case 'After Call Work':
                        state = 'After Call Work';
                        reasonCode = '-';
                        callType = 'Inbound';
                        break;
                    default:
                        state = 'Not Ready';
                        reasonCode = employee.status;
                }
                
                // FIX: If the duration is absurdly high (e.g., > 24 hours), it likely means the status is a long-term one (like Vacation/Sick)
                // that wasn't caught by the calendar event logic, or a stale timer. We should hide the timer.
                if (duration && duration > 86400) {
                    duration = null;
                }

                processedAgentList.push({
                    id: employee.id,
                    fullName: employee.name,
                    state,
                    reasonCode,
                    stateDuration: duration,
                    callType,
                    schedule: scheduleString,
                });
            }
        });


        return processedAgentList.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }, [employees, calendarEvents, scheduleMap, tick]);

    return (
        <div className="w-full max-w-7xl bg-white rounded-xl shadow-md p-6 border border-bokara-grey/10">
            <div className="flex items-center gap-4 mb-4">
                <h2 className="text-2xl font-bold text-bokara-grey">Agent State</h2>
                <span className="bg-red-600 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">{agents.length}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-bokara-grey">
                    <thead className="text-xs text-bokara-grey/80 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-4 py-3">Full Name & Username</th>
                            <th scope="col" className="px-4 py-3">State</th>
                            <th scope="col" className="px-4 py-3 flex items-center gap-1">
                                <FilterIcon className="w-3.5 h-3.5" /> Reason Code
                            </th>
                            <th scope="col" className="px-4 py-3">State Duration</th>
                            <th scope="col" className="px-4 py-3 bg-blue-50/50">Call Type</th>
                            <th scope="col" className="px-4 py-3">Schedule</th>
                            <th scope="col" className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {agents.map(agent => (
                             <tr key={agent.id} className={`border-b transition-colors ${
                                agent.state === 'Offline'
                                    ? 'bg-gray-50 text-gray-500'
                                    : agent.state === 'On Call'
                                    ? 'bg-yellow-100/70 hover:bg-gray-50'
                                    : 'hover:bg-gray-50'
                            }`}>
                                <td className="px-4 py-2 font-medium whitespace-nowrap">
                                    <a href="#" className={`underline ${agent.state === 'Offline' ? '' : 'text-bokara-grey hover:text-lucius-lime'}`}>{agent.fullName}</a>
                                </td>
                                <td className="px-4 py-2">{agent.state}</td>
                                <td className="px-4 py-2">{agent.reasonCode}</td>
                                <td className="px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        <StateIcon state={agent.state} reasonCode={agent.reasonCode} />
                                        {agent.stateDuration !== null ? (
                                            <span className="font-mono">{formatDuration(agent.stateDuration)}</span>
                                        ) : (
                                            <span className="font-mono">-</span>
                                        )}
                                    </div>
                                </td>
                                <td className={`px-4 py-2 font-semibold ${agent.callType !== '-' && agent.state !== 'Offline' ? 'text-blue-800 bg-blue-50/50' : ''}`}>{agent.callType}</td>
                                <td className="px-4 py-2 font-mono">{agent.schedule}</td>
                                <td className="px-4 py-2">
                                     <button className={agent.state === 'Offline' ? 'text-gray-400' : 'text-bokara-grey/60'} disabled={agent.state === 'Offline'}>▼</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AgentStateDashboard;
