import { Room } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface RoomFilterProps {
  rooms: Room[];
  selectedRoom: string | null;
  dateRange: DateRange | undefined;
  onRoomChange: (roomId: string | null) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function RoomFilter({
  rooms,
  selectedRoom,
  dateRange,
  onRoomChange,
  onDateRangeChange,
}: RoomFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Room Select */}
      <Select
        value={selectedRoom || 'all'}
        onValueChange={(value) => onRoomChange(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Pilih Ruangan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Ruangan</SelectItem>
          {rooms.map((room) => (
            <SelectItem key={room.id} value={room.id}>
              {room.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'dd MMM', { locale: id })} -{' '}
                  {format(dateRange.to, 'dd MMM yyyy', { locale: id })}
                </>
              ) : (
                format(dateRange.from, 'dd MMM yyyy', { locale: id })
              )
            ) : (
              'Pilih Tanggal'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {(selectedRoom || dateRange) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onRoomChange(null);
            onDateRangeChange(undefined);
          }}
          className="text-muted-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Reset Filter
        </Button>
      )}
    </div>
  );
}
