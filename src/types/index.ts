export interface Room {
  id: string;
  name: string;
  location: string;
  barcode: string;
  createdAt: Date;
}

export interface TemperatureLog {
  id: string;
  roomId: string;
  roomName?: string;
  temperature: number;
  humidity: number;
  recordedAt: Date;
}

export interface RoomWithLatestReading extends Room {
  latestReading?: TemperatureLog;
  status: 'normal' | 'warning' | 'critical';
}

export type DateRange = {
  from: Date;
  to: Date;
};

export type ChartDataPoint = {
  time: string;
  temperature: number;
  humidity: number;
  roomName?: string;
};
