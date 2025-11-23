
import { Employee } from '../types';

export const initialEmployees: Employee[] = [
  { 
    id: '1', 
    uid: 'user_lucius_fixed', // Stable UID
    name: 'Lucius', 
    email: 'lucius@example.com', 
    phone: '111-222-3333', 
    location: 'Main Office', 
    role: 'admin', 
    status: 'Clocked Out', 
    lastClockInTime: null, 
    currentStatusStartTime: null 
  },
  { 
    id: '2', 
    uid: 'user_hunter_fixed', // Stable UID
    name: 'Hunter', 
    email: 'hunter@example.com', 
    phone: '222-333-4444', 
    location: 'Remote', 
    role: 'employee', 
    status: 'Clocked Out', 
    lastClockInTime: null, 
    currentStatusStartTime: null 
  },
  { 
    id: '3', 
    uid: 'user_bokara_fixed', // Stable UID
    name: 'Bokara', 
    email: 'bokara@example.com', 
    phone: '333-444-5555', 
    location: 'Main Office', 
    role: 'employee', 
    status: 'Clocked Out', 
    lastClockInTime: null, 
    currentStatusStartTime: null 
  },
  { 
    id: '4', 
    uid: 'user_sandy_fixed', // Stable UID
    name: 'Sandy', 
    email: 'sandy@example.com', 
    phone: '444-555-6666', 
    location: 'Field Office', 
    role: 'employee', 
    status: 'Clocked Out', 
    lastClockInTime: null, 
    currentStatusStartTime: null 
  },
];
