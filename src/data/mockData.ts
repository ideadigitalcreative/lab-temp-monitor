import { Room, TemperatureLog, RoomWithLatestReading } from '@/types';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Mock Rooms
export const mockRooms: Room[] = [
  {
    id: 'room-001',
    name: 'Lab Mikrobiologi',
    location: 'Gedung A, Lantai 2',
    barcode: 'LAB-MIKRO-001',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'room-002',
    name: 'Lab Kimia Analitik',
    location: 'Gedung A, Lantai 3',
    barcode: 'LAB-KIMIA-002',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'room-003',
    name: 'Lab Biologi Molekuler',
    location: 'Gedung B, Lantai 1',
    barcode: 'LAB-BIOMOL-003',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'room-004',
    name: 'Cold Storage',
    location: 'Gedung B, Basement',
    barcode: 'LAB-COLD-004',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'room-005',
    name: 'Lab Farmasi',
    location: 'Gedung C, Lantai 2',
    barcode: 'LAB-FARM-005',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'room-006',
    name: 'Ruang Inkubator',
    location: 'Gedung A, Lantai 1',
    barcode: 'LAB-INKUB-006',
    createdAt: new Date('2024-01-01'),
  },
];

// Generate mock temperature logs for the past 7 days
const generateMockLogs = (): TemperatureLog[] => {
  const logs: TemperatureLog[] = [];
  const now = new Date();
  
  mockRooms.forEach((room) => {
    // Generate logs for each hour for the past 7 days
    for (let day = 6; day >= 0; day--) {
      for (let hour = 0; hour < 24; hour += 2) {
        const recordedAt = new Date(now);
        recordedAt.setDate(recordedAt.getDate() - day);
        recordedAt.setHours(hour, 0, 0, 0);
        
        // Generate realistic temperature based on room type
        let baseTemp = 22;
        let baseHumidity = 50;
        
        if (room.name.includes('Cold')) {
          baseTemp = 4;
          baseHumidity = 30;
        } else if (room.name.includes('Inkubator')) {
          baseTemp = 37;
          baseHumidity = 85;
        } else if (room.name.includes('Mikrobiologi')) {
          baseTemp = 25;
          baseHumidity = 60;
        }
        
        // Add some random variation
        const tempVariation = (Math.random() - 0.5) * 4;
        const humidityVariation = (Math.random() - 0.5) * 10;
        
        logs.push({
          id: generateId(),
          roomId: room.id,
          roomName: room.name,
          temperature: Math.round((baseTemp + tempVariation) * 10) / 10,
          humidity: Math.round((baseHumidity + humidityVariation) * 10) / 10,
          recordedAt,
        });
      }
    }
  });
  
  return logs.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
};

export let mockTemperatureLogs: TemperatureLog[] = generateMockLogs();

// Get status based on temperature
export const getTemperatureStatus = (temp: number, roomName: string): 'normal' | 'warning' | 'critical' => {
  if (roomName.includes('Cold')) {
    if (temp < 0 || temp > 8) return 'critical';
    if (temp < 2 || temp > 6) return 'warning';
    return 'normal';
  }
  if (roomName.includes('Inkubator')) {
    if (temp < 35 || temp > 39) return 'critical';
    if (temp < 36 || temp > 38) return 'warning';
    return 'normal';
  }
  // Standard lab
  if (temp < 15 || temp > 30) return 'critical';
  if (temp < 18 || temp > 26) return 'warning';
  return 'normal';
};

// Get rooms with latest readings
export const getRoomsWithLatestReadings = (): RoomWithLatestReading[] => {
  return mockRooms.map((room) => {
    const latestLog = mockTemperatureLogs.find((log) => log.roomId === room.id);
    const status = latestLog 
      ? getTemperatureStatus(latestLog.temperature, room.name)
      : 'normal';
    
    return {
      ...room,
      latestReading: latestLog,
      status,
    };
  });
};

// Get logs for a specific room
export const getLogsForRoom = (roomId: string, fromDate?: Date, toDate?: Date): TemperatureLog[] => {
  let logs = mockTemperatureLogs.filter((log) => log.roomId === roomId);
  
  if (fromDate) {
    logs = logs.filter((log) => log.recordedAt >= fromDate);
  }
  if (toDate) {
    logs = logs.filter((log) => log.recordedAt <= toDate);
  }
  
  return logs.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
};

// Get all logs with optional filters
export const getAllLogs = (roomId?: string, fromDate?: Date, toDate?: Date): TemperatureLog[] => {
  let logs = [...mockTemperatureLogs];
  
  if (roomId) {
    logs = logs.filter((log) => log.roomId === roomId);
  }
  if (fromDate) {
    logs = logs.filter((log) => log.recordedAt >= fromDate);
  }
  if (toDate) {
    logs = logs.filter((log) => log.recordedAt <= toDate);
  }
  
  return logs.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
};

// Add new temperature log
export const addTemperatureLog = (roomId: string, temperature: number, humidity: number): TemperatureLog => {
  const room = mockRooms.find((r) => r.id === roomId);
  const newLog: TemperatureLog = {
    id: generateId(),
    roomId,
    roomName: room?.name,
    temperature,
    humidity,
    recordedAt: new Date(),
  };
  
  mockTemperatureLogs = [newLog, ...mockTemperatureLogs];
  return newLog;
};

// Find room by barcode
export const findRoomByBarcode = (barcode: string): Room | undefined => {
  return mockRooms.find((room) => room.barcode === barcode);
};

// Get room by ID
export const getRoomById = (id: string): Room | undefined => {
  return mockRooms.find((room) => room.id === id);
};
