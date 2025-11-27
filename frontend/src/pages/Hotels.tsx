import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HotelCard from "@/components/HotelCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const Hotels = () => {
  type Hotel = { id: number; name: string; location: string; rating: number; reviews: number; price: number; image: string; amenities?: string[]; description?: string }
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState("")
  useEffect(()=>{ setQ(searchParams.get('q') || '') }, [searchParams])
  const [price, setPrice] = useState<[number, number]>([0, 100000])
  const [minRating, setMinRating] = useState<number | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("Rating")
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ["hotels"],
    queryFn: () => apiGet<{ hotels: Hotel[] }>(`/api/hotels`)
  })
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
  const displayHotels = useMemo(()=>{
    const hotels: Hotel[] = data?.hotels || []
    let list = hotels
    if (qLower) {
      list = list.filter(h => (h.name||'').toLowerCase().includes(qLower) || (h.location||'').toLowerCase().includes(qLower))
    }
    list = list.filter(h => h.price >= price[0] && h.price <= price[1])
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
    if (sortBy === 'Price: Low to High') list = [...list].sort((a,b)=>a.price-b.price)
    else if (sortBy === 'Price: High to Low') list = [...list].sort((a,b)=>b.price-a.price)
    else if (sortBy === 'Rating') list = [...list].sort((a,b)=>b.rating-a.rating)
    return list
  }, [data?.hotels, qLower, price, minRating, selectedTypes, selectedAmenities, sortBy])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-6">Find Your Perfect Stay</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-card rounded-lg p-6 shadow-card sticky top-20">
              <h2 className="text-xl font-semibold mb-4">Filters</h2>
              
              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Hotel name..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Price Range
                  </label>
                  <Slider defaultValue={[0, 100000]} max={100000} step={100} onValueChange={(v) => setPrice([v[0], v[1]])} />
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
                    {["WiFi", "Pool", "Parking", "Breakfast", "AC", "Pet Friendly"].map(
                      (amenity) => (
                        <div key={amenity} className="flex items-center space-x-2">
                          <Checkbox id={amenity} checked={selectedAmenities.includes(amenity)} onCheckedChange={(checked)=>{
                            setSelectedAmenities(prev=>{
                              const set = new Set(prev)
                              if (checked) set.add(amenity); else set.delete(amenity)
                              return Array.from(set)
                            })
                          }} />
                          <label htmlFor={amenity} className="text-sm cursor-pointer">
                            {amenity}
                          </label>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <Button className="w-full" onClick={() => { /* filters apply automatically */ }}>Apply Filters</Button>
              </div>
            </div>
          </aside>

          {/* Hotels Grid */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <p className="text-muted-foreground">{isLoading ? "Loading..." : isError ? "Failed to load" : `${displayHotels.length} properties found`}</p>
              <select className="border rounded-lg px-4 py-2 bg-background" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Rating</option>
                <option>Popularity</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayHotels.map((hotel) => (
                <HotelCard key={hotel.id} {...hotel} />
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Hotels;
