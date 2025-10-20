import { Employee } from '../types';

export const initialEmployees: Employee[] = [
  // FIX: Added missing properties email, phone, location, and role to satisfy the Employee type.
  { id: 1, name: 'Lucius', email: 'lucius@example.com', phone: '111-222-3333', location: 'Main Office', role: 'admin', status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null },
  // FIX: Added missing properties email, phone, location, and role to satisfy the Employee type.
  { id: 2, name: 'Hunter', email: 'hunter@example.com', phone: '222-333-4444', location: 'Remote', role: 'employee', status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null },
  // FIX: Added missing properties email, phone, location, and role to satisfy the Employee type.
  { id: 3, name: 'Bokara', email: 'bokara@example.com', phone: '333-444-5555', location: 'Main Office', role: 'employee', status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null },
  // FIX: Added missing properties email, phone, location, and role to satisfy the Employee type.
  { id: 4, name: 'Sandy', email: 'sandy@example.com', phone: '444-555-6666', location: 'Field Office', role: 'employee', status: 'Clocked Out', lastClockInTime: null, currentStatusStartTime: null },
];
