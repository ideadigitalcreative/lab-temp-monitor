import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface Room {
  id: string;
  name: string;
  location: string;
  barcode: string;
  created_at: string;
  updated_at: string;
}

export interface TemperatureLog {
  id: string;
  room_id: string;
  temperature: number;
  humidity: number;
  recorded_by: string | null;
  recorded_at: string;
  rooms?: {
    name: string;
    location: string;
  };
}

export interface RoomWithLatestReading extends Room {
  latestReading?: TemperatureLog;
  status: 'normal' | 'warning' | 'critical';
}

// Get temperature status based on room type
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

// Fetch all rooms
export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Room[];
    },
  });
}

// Fetch room by barcode
export function useRoomByBarcode(barcode: string | null) {
  return useQuery({
    queryKey: ['room', 'barcode', barcode],
    queryFn: async () => {
      if (!barcode) return null;

      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();

      if (error) throw error;
      return data as Room | null;
    },
    enabled: !!barcode,
  });
}

// Fetch temperature logs with filters
export function useTemperatureLogs(roomId?: string, fromDate?: Date, toDate?: Date) {
  return useQuery({
    queryKey: ['temperature_logs', roomId, fromDate?.toISOString(), toDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('temperature_logs')
        .select(`
          *,
          rooms (
            name,
            location
          )
        `)
        .order('recorded_at', { ascending: true });

      if (roomId) {
        query = query.eq('room_id', roomId);
      }
      if (fromDate) {
        query = query.gte('recorded_at', fromDate.toISOString());
      }
      if (toDate) {
        query = query.lte('recorded_at', toDate.toISOString());
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data as TemperatureLog[];
    },
  });
}

// Fetch rooms with latest readings
export function useRoomsWithLatestReadings() {
  const { data: rooms, isLoading: roomsLoading } = useRooms();

  const { data: latestLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['latest_temperature_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('temperature_logs')
        .select(`
          *,
          rooms (
            name,
            location
          )
        `)
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return data as TemperatureLog[];
    },
  });

  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('temperature_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'temperature_logs',
        },
        () => {
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['latest_temperature_logs'] });
          queryClient.invalidateQueries({ queryKey: ['temperature_logs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const roomsWithReadings: RoomWithLatestReading[] = (rooms || []).map((room) => {
    const latestLog = latestLogs?.find((log) => log.room_id === room.id);
    const status = latestLog
      ? getTemperatureStatus(latestLog.temperature, room.name)
      : 'normal';

    return {
      ...room,
      latestReading: latestLog,
      status,
    };
  });

  return {
    data: roomsWithReadings,
    isLoading: roomsLoading || logsLoading,
  };
}

// Add temperature log mutation
export function useAddTemperatureLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roomId,
      temperature,
      humidity,
      recordedAt,
    }: {
      roomId: string;
      temperature: number;
      humidity: number;
      recordedAt?: Date;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('temperature_logs')
        .insert({
          room_id: roomId,
          temperature,
          humidity,
          recorded_by: user.id,
          recorded_at: recordedAt ? recordedAt.toISOString() : undefined
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temperature_logs'] });
      queryClient.invalidateQueries({ queryKey: ['latest_temperature_logs'] });
    },
  });
}

// Room Management Mutations
export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (room: Omit<Room, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('rooms')
        .insert(room)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Room> & { id: string }) => {
      const { data, error } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First delete all related temperature logs
      const { error: logsError } = await supabase
        .from('temperature_logs')
        .delete()
        .eq('room_id', id);

      if (logsError) throw logsError;

      // Then delete the room
      const { error, data } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error("Supabase delete room error:", error);
        throw error;
      }



      if (!data || data.length === 0) {
        console.error("Delete room returned no data. Check RLS policies or if ID exists.");
        throw new Error('Room could not be deleted. It may not exist or permission is denied.');
      }

      // DEBUG: Verify deletion
      const { data: checkData } = await supabase
        .from('rooms')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (checkData) {
        throw new Error('CRITICAL: Deletion appeared successful but record still exists in DB. Check Database Triggers or RLS.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

// Temperature Log Management Mutations (Admin Only)
export function useUpdateTemperatureLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TemperatureLog> & { id: string }) => {
      const { data, error } = await supabase
        .from('temperature_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temperature_logs'] });
      queryClient.invalidateQueries({ queryKey: ['latest_temperature_logs'] });
    },
  });
}

export function useDeleteTemperatureLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error, count } = await supabase
        .from('temperature_logs')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) throw error;

      if (count === 0) {
        throw new Error("Failed to delete log: Record not found or permission denied.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temperature_logs'] });
      queryClient.invalidateQueries({ queryKey: ['latest_temperature_logs'] });
    },
  });
}
