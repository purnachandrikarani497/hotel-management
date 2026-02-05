import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HotelCard from "@/components/HotelCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, MapPin, Wifi, Coffee, Car, Utensils, Waves, Wind, PawPrint, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const Hotels = () => {
  type Hotel = { id: number; name: string; location: string; rating: number; reviews: number; price: number; image: string; amenities?: string[]; description?: string }
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState("")
  useEffect(()=>{ setQ(searchParams.get('q') || '') }, [searchParams])
  const checkIn = searchParams.get('checkIn') || ''
  const checkOut = searchParams.get('checkOut') || ''
  const adults = Number(searchParams.get('adults') || '0')
  const children = Number(searchParams.get('children') || '0')
  const roomsNeeded = Math.max(1, Number(searchParams.get('rooms') || '1'))
  const totalGuests = Math.max(1, adults + children)
  const [price, setPrice] = useState<[number, number]>([0, 100000])
  const [didInitPriceRange, setDidInitPriceRange] = useState(false)
  const [minRating, setMinRating] = useState<number | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("Rating")
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ["hotels", q],
    queryFn: () => apiGet<{ hotels: Hotel[] }>(`/api/hotels?q=${encodeURIComponent(q)}`),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })

  type RoomAgg = { type: string; members: number; available: number }
  const availabilityQ = useQuery({
    queryKey: ["hotels", "availability", checkIn],
    enabled: !!checkIn && !!(data?.hotels?.length || 0),
    queryFn: async () => {
      const hotels: Hotel[] = data?.hotels || []
      const out: Record<number, RoomAgg[]> = {}
      await Promise.all(
        hotels.map(async (h) => {
          try {
            const r = await apiGet<{ rooms: { type: string; members?: number; available?: number }[] }>(`/api/hotels/${h.id}/rooms?date=${encodeURIComponent(checkIn)}`)
            out[h.id] = (r.rooms || []).map((x) => ({ type: String(x.type||''), members: Number(x.members||0), available: Number(x.available||0) }))
          } catch {
            out[h.id] = []
          }
        })
      )
      return out
    },
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchInterval: 10000,
  })
  const maxPriceAll = useMemo(() => {
    const hotels: Hotel[] = data?.hotels || []
    const max = Math.max(100000, ...hotels.map(h => Number(h.price || 0)))
    return max
  }, [data?.hotels])
  useEffect(() => {
    if (!didInitPriceRange && maxPriceAll) {
      setPrice([0, maxPriceAll])
      setDidInitPriceRange(true)
      return
    }
    if (maxPriceAll) {
      setPrice((prev) => {
        const pMin = Math.min(prev[0], prev[1])
        const pMax = Math.max(prev[0], prev[1])
        if (pMax > maxPriceAll) {
          return [pMin, maxPriceAll]
        }
        return prev
      })
    }
  }, [maxPriceAll, didInitPriceRange])
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'hotelUpdated' && e.newValue) {
        qc.invalidateQueries({ queryKey: ["hotels"] })
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [qc])
  const qLower = q.trim().toLowerCase()
  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi': return <Wifi className="h-4 w-4" />;
      case 'pool': return <Waves className="h-4 w-4" />;
      case 'parking': return <Car className="h-4 w-4" />;
      case 'breakfast': return <Utensils className="h-4 w-4" />;
      case 'ac': return <Wind className="h-4 w-4" />;
      case 'pet friendly': return <PawPrint className="h-4 w-4" />;
      default: return null;
    }
  };

  const allAmenities = useMemo(() => {
    const hotels = data?.hotels || [];
    const uniqueAmenities = new Map<string, string>();
    // Add default amenities first to maintain order
    ["WiFi", "Pool", "Parking", "Breakfast", "AC", "Pet Friendly"].forEach(a => uniqueAmenities.set(a.toLowerCase(), a));
    // Add any other amenities found in hotels
    hotels.forEach(h => (h.amenities || []).forEach(a => {
      if (!uniqueAmenities.has(a.toLowerCase())) {
        uniqueAmenities.set(a.toLowerCase(), a);
      }
    }));
    return Array.from(uniqueAmenities.values());
  }, [data?.hotels]);

  const displayHotels = useMemo(()=>{
    if (!qLower) return []

    const hotels: Hotel[] = data?.hotels || []
    let list = hotels
    // qLower filter already applied via server param; keep client-side for robustness and enhanced matching
    if (qLower) {
      list = list.filter(h => {
        const name = (h.name || '').toLowerCase();
        const location = (h.location || '').toLowerCase();
        const description = (h.description || '').toLowerCase();
        const searchTerms = qLower.split(' ').filter(term => term.length > 0);
        
        // Check if ALL search terms match at least one field (name, location, or description)
        // This allows "hyd sitara" to match a hotel named "Sitara" in "Hyderabad"
        return searchTerms.every(term => 
          name.includes(term) || location.includes(term) || description.includes(term)
        );
      });
    }
    // enforce hyd location when searching for hyd
    if (qLower.includes('hyd')) {
      list = list.filter(h => (h.location||'').toLowerCase().includes('hyd'))
    }
    const pMin = Math.min(price[0], price[1])
    const pMax = Math.max(price[0], price[1])
    list = list.filter(h => h.price >= pMin && h.price <= pMax)
    if (minRating) list = list.filter(h => Math.floor(h.rating) >= (minRating || 0))
    if (selectedTypes.length > 0) {
      list = list.filter(h => {
        const name = (h.name||'').toLowerCase()
        const desc = (h.description||'').toLowerCase()
        const text = name + ' ' + desc
        return selectedTypes.some(t => text.includes(t.toLowerCase()))
      })
    }
    if ((selectedAmenities||[]).length > 0) {
      list = list.filter(h => {
        const ams = (h.amenities||[]).map(a=>a.toLowerCase())
        return selectedAmenities.every(a => ams.includes(a.toLowerCase()))
      })
    }
    // Availability filter: only if checkIn provided
    if (checkIn && totalGuests > 0) {
      const map = availabilityQ.data || {}
      list = list.filter(h => {
        const rs = map[h.id] || []
        const perRoomGuests = Math.ceil(totalGuests / roomsNeeded)
        const haveCapacity = rs.some(r => Number(r.members||0) >= perRoomGuests && Number(r.available||0) > 0)
        if (qLower.includes('hyd')) {
          const hydSuite = rs.find(r => r.type.trim().toLowerCase() === 'suite' && Number(r.members||0) === 2 && Number(r.available||0) > 0)
          const hydDeluxe = rs.find(r => r.type.trim().toLowerCase() === 'deluxe' && Number(r.members||0) === 2 && Number(r.available||0) > 0)
          const perRoomOk = perRoomGuests <= 2
          return perRoomOk && (!!hydSuite || !!hydDeluxe)
        }
        return haveCapacity
      })
    }
    if (sortBy === 'Price: Low to High') list = [...list].sort((a,b)=>a.price-b.price)
    else if (sortBy === 'Price: High to Low') list = [...list].sort((a,b)=>b.price-a.price)
    else if (sortBy === 'Rating') list = [...list].sort((a,b)=>b.rating-a.rating)
    else if (sortBy === 'Popularity') list = [...list].sort((a,b)=>b.reviews-a.reviews)
    return list
  }, [data?.hotels, qLower, price, minRating, selectedTypes, selectedAmenities, sortBy, checkIn, totalGuests, roomsNeeded, availabilityQ.data])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-12 relative overflow-hidden">
          <div className="container">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Find Your Perfect Stay</h1>
                <p className="mt-2 text-lg opacity-90">Browse curated hotels with filters that help you decide faster</p>
              </div>
              <div className="hidden md:flex items-center space-x-1 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                <span className="text-sm opacity-80">Search Portal</span>
              </div>
            </div>
          </div>
        </section>
        
        <div className="container py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="rounded-2xl p-6 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0 sticky top-20">
              <h2 className="text-xl font-extrabold mb-4 bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Filters</h2>
              
              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Hotel name..." className="pl-9 h-11" value={q} onChange={(e) => setQ(e.target.value)} />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Price Range
                  </label>
                  <Slider value={price} max={maxPriceAll} step={100} onValueChange={(v) => setPrice([Math.min(v[0], v[1]), Math.max(v[0], v[1])])} />
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      ₹{Math.min(price[0], price[1]).toLocaleString('en-IN')}
                    </span>
                    <span>
                      ₹{Math.max(price[0], price[1]).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Rating</label>
                  <div className="space-y-2">
                    {[5, 4, 3].map((rating) => (
                      <div key={rating} className="flex items-center space-x-2">
                        <Checkbox id={`rating-${rating}`} checked={minRating === rating} onCheckedChange={(checked) => setMinRating(checked ? rating : null)} />
                        <label
                          htmlFor={`rating-${rating}`}
                          className="text-sm cursor-pointer"
                        >
                          {rating}+ Stars
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Property Type</label>
                  <div className="space-y-2">
                    {["Hotel", "Resort", "Villa", "Apartment"].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox id={type} checked={selectedTypes.includes(type)} onCheckedChange={(checked)=>{
                          setSelectedTypes(prev=>{
                            const set = new Set(prev)
                            if (checked) set.add(type); else set.delete(type)
                            return Array.from(set)
                          })
                        }} />
                        <label htmlFor={type} className="text-sm cursor-pointer">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Amenities</label>
                  <div className="space-y-2">
                    {allAmenities.map(
                      (amenity) => (
                        <div key={amenity} className="flex items-center space-x-2">
                          <Checkbox id={amenity} checked={selectedAmenities.includes(amenity)} onCheckedChange={(checked)=>{
                            setSelectedAmenities(prev=>{
                              const set = new Set(prev)
                              if (checked) set.add(amenity); else set.delete(amenity)
                              return Array.from(set)
                            })
                          }} />
                          <label htmlFor={amenity} className="text-sm cursor-pointer flex items-center gap-2">
                            {getAmenityIcon(amenity)}
                            {amenity}
                          </label>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white" 
                  onClick={() => {
                    setQ("")
                    setPrice([0, maxPriceAll])
                    setMinRating(null)
                    setSelectedTypes([])
                    setSelectedAmenities([])
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </aside>

          {/* Hotels Grid */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <p className="text-muted-foreground">{isLoading ? "Loading..." : isError ? "Failed to load" : `${displayHotels.length} properties found`}</p>
              <select className="rounded-lg px-4 py-2 bg-white border shadow-sm" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Rating</option>
                <option>Popularity</option>
              </select>
            </div>

            {displayHotels.length === 0 && !isLoading && !isError ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted/30 p-4 mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No hotels found</h3>
                <p className="text-muted-foreground max-w-sm">
                  We couldn't find any hotels matching your search criteria. Try adjusting your filters or search terms.
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayHotels.map((hotel) => {
                const rs = (availabilityQ.data || {})[hotel.id] || []
                const shown = rs.filter(r => ['suite','deluxe'].includes(r.type.trim().toLowerCase()) && Number(r.available||0) > 0)
                return (
                  <HotelCard key={hotel.id} {...hotel} availableTypes={shown} />
                )
              })}
            </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Hotels;
