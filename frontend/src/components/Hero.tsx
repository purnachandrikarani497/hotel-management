import { useState } from "react";
import { Search, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import heroImage from "@/assets/hero-resort.jpg";
// Guests & Rooms selection removed per request
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [query, setQuery] = useState("");
  // Removed guests/rooms state
  const navigate = useNavigate();

  return (
    <section className="relative py-14 flex items-center justify-center overflow-hidden bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600">
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
        <div className="absolute top-16 left-16 w-20 h-20 border-2 border-pink-200 rotate-45"></div>
        <div className="absolute top-32 right-32 w-16 h-16 border-2 border-violet-200 rotate-12"></div>
        <div className="absolute bottom-32 left-32 w-14 h-14 border-2 border-cyan-200 rounded-full"></div>
      </div>
      <div className="container relative z-10 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-primary-foreground mb-3">Find Your Perfect Stay</h1>
        <p className="text-lg md:text-xl text-primary-foreground/90 mb-6 max-w-3xl mx-auto">Discover amazing hotels, resorts, and unique stays around the world</p>

        <div className="rounded-2xl p-5 max-w-4xl mx-auto bg-gradient-to-br from-white via-blue-50 to-cyan-100 shadow-2xl border-0 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
            <div className="md:col-span-1">
              <label className="text-sm font-medium text-muted-foreground mb-2 block text-left">
                Where
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by hotel or place"
                   className="pl-10 h-11 border focus-visible:ring-primary"
                  value={query}
                  onChange={(e)=>setQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block text-left">
                Check-in
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                     className={cn(
                       "w-full justify-start text-left font-normal h-11 border",
                      !checkIn && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {checkIn ? format(checkIn, "PP") : "Add date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={setCheckIn}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block text-left">
                Check-out
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                     className={cn(
                       "w-full justify-start text-left font-normal h-11 border",
                      !checkOut && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {checkOut ? format(checkOut, "PP") : "Add date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    initialFocus
                    disabled={(date) => date < (checkIn || new Date())}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Guests & Rooms selector intentionally removed */}
          </div>
          
          <Button className="w-full md:w-auto mt-5 h-11 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md" onClick={()=>{
            const params = new URLSearchParams()
            if (query) params.set('q', query)
            if (checkIn) params.set('checkIn', checkIn.toISOString().slice(0,10))
            if (checkOut) params.set('checkOut', checkOut.toISOString().slice(0,10))
            // No guests/rooms params
            navigate(`/hotels?${params.toString()}`)
          }}>
            <Search className="mr-2 h-5 w-5" />
            Search Hotels
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-white/60" />
      </div>
    </section>
  );
};

export default Hero;
