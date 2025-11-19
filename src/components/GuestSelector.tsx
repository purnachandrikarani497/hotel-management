import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, Plus, Minus } from "lucide-react";

interface GuestCounts {
  adults: number;
  children: number;
  rooms: number;
  pets: boolean;
}

const GuestSelector = () => {
  const [guests, setGuests] = useState<GuestCounts>({
    adults: 2,
    children: 0,
    rooms: 1,
    pets: false,
  });

  const updateCount = (key: keyof Omit<GuestCounts, 'pets'>, delta: number) => {
    setGuests(prev => ({
      ...prev,
      [key]: Math.max(key === 'adults' || key === 'rooms' ? 1 : 0, prev[key] + delta)
    }));
  };

  const guestSummary = `${guests.adults} adult${guests.adults > 1 ? 's' : ''}${
    guests.children > 0 ? `, ${guests.children} child${guests.children > 1 ? 'ren' : ''}` : ''
  }, ${guests.rooms} room${guests.rooms > 1 ? 's' : ''}${guests.pets ? ', with pets' : ''}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal h-12 border-2"
        >
          <Users className="mr-2 h-5 w-5 text-muted-foreground" />
          <span className="truncate">{guestSummary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-popover z-50" align="start">
        <div className="space-y-4">
          {/* Adults */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Adults</div>
              <div className="text-sm text-muted-foreground">Age 13+</div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => updateCount('adults', -1)}
                disabled={guests.adults <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center">{guests.adults}</span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => updateCount('adults', 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Children */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Children</div>
              <div className="text-sm text-muted-foreground">Age 0-12</div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => updateCount('children', -1)}
                disabled={guests.children <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center">{guests.children}</span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => updateCount('children', 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Rooms */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Rooms</div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => updateCount('rooms', -1)}
                disabled={guests.rooms <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center">{guests.rooms}</span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => updateCount('rooms', 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Pets */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="font-medium">Traveling with pets?</div>
            <Button
              size="sm"
              variant={guests.pets ? "default" : "outline"}
              onClick={() => setGuests(prev => ({ ...prev, pets: !prev.pets }))}
            >
              {guests.pets ? "Yes" : "No"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GuestSelector;
