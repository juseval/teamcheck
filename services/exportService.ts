
import { AttendanceLogEntry, TimesheetEntry } from '../types';

interface EmployeeTimeData {
  employeeName: string;
  workSeconds: number;
  breakSeconds: number;
}

const formatDurationForExport = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function exportToCsv(filename: string, rows: string[][]) {
  const csvContent = "data:text/csv;charset=utf-8," 
    + rows.map(e => e.join(",")).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportActivityLog(logEntries: AttendanceLogEntry[]) {
  const headers = ["Date", "Time", "Employee", "Action"];
  const rows = logEntries.map(entry => {
    const date = new Date(entry.timestamp);
    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      `"${entry.employeeName.replace(/"/g, '""')}"`,
      entry.action,
    ];
  });
  exportToCsv("activity_log_export.csv", [headers, ...rows.reverse()]);
}

export function exportDashboardData(employeeData: EmployeeTimeData[]) {
  const headers = ["Employee", "Total Work Time (HH:MM:SS)", "Total Break Time (HH:MM:SS)"];
  const rows = employeeData.map(data => [
    `"${data.employeeName.replace(/"/g, '""')}"`,
    formatDurationForExport(data.workSeconds),
    formatDurationForExport(data.breakSeconds),
  ]);
  exportToCsv("dashboard_export.csv", [headers, ...rows]);
}

export function exportTimesheet(timesheetData: any[]) {
  const headers = ["Employee", "Date", "Day", "Type", "Time In", "Time Out", "Duration"];
  const rows: string[][] = [];

  timesheetData.forEach(data => {
      // Sort days chronologically
      const sortedDates = Object.keys(data.dailyData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      
      sortedDates.forEach(date => {
          const dailyInfo = data.dailyData[date];
          if (dailyInfo && dailyInfo.entries) {
              dailyInfo.entries.forEach((entry: TimesheetEntry) => {
                  rows.push([
                      `"${data.employeeName.replace(/"/g, '""')}"`,
                      entry.date,
                      entry.dayOfWeek,
                      entry.type,
                      new Date(entry.timeIn).toLocaleTimeString(),
                      new Date(entry.timeOut).toLocaleTimeString(),
                      formatDurationForExport(entry.duration)
                  ]);
              });
          }
      });
  });
  exportToCsv("timesheet_export.csv", [headers, ...rows]);
}
