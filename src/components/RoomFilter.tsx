import { Room } from '@/hooks/useRooms';
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
import { Input } from '@/components/ui/input';
import { CalendarIcon, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface RoomFilterProps {
  rooms: Room[];
  selectedRoom: string | null;
  dateRange: DateRange | undefined;
  onRoomChange: (roomId: string | null) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onSearchQueryChange?: (query: string) => void;
}

export function RoomFilter({
  rooms,
  selectedRoom,
  dateRange,
  onRoomChange,
  onDateRangeChange,
  onSearchQueryChange,
}: RoomFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearchQueryChange) {
      onSearchQueryChange(query);
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4">
      {/* Search Input */}
      <div className="relative flex-1 sm:flex-none">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari ruangan..."
          className="pl-10 w-full sm:w-[200px] h-11 sm:h-10"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {/* Room Select */}
      <div className="flex-1 sm:flex-none">
        <Select
          value={selectedRoom || 'all'}
          onValueChange={(value) => onRoomChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-[200px] h-11 sm:h-10">
            <SelectValue placeholder="Pilih Ruangan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Ruangan</SelectItem>
            {filteredRooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Picker */}
      <div className="flex-1 sm:flex-none">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-auto justify-start text-left font-normal h-11 sm:h-10"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span className="truncate">
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
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align={isMobile ? "center" : "start"}>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={isMobile ? 1 : 2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Clear Filters */}
      {(selectedRoom || dateRange || searchQuery) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onRoomChange(null);
            onDateRangeChange(undefined);
            setSearchQuery('');
            if (onSearchQueryChange) {
              onSearchQueryChange('');
            }
          }}
          className="text-muted-foreground h-10 px-4 sm:px-2"
        >
          <X className="w-4 h-4 mr-1" />
          Reset Filter
        </Button>
      )}
    </div>
  );
}
