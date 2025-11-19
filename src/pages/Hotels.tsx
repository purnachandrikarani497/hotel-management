import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HotelCard from "@/components/HotelCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useState } from "react";

const Hotels = () => {
  type Hotel = { id: number; name: string; location: string; rating: number; reviews: number; price: number; image: string; amenities?: string[]; description?: string }
  const [q, setQ] = useState("")
  const [price, setPrice] = useState<[number, number]>([50, 500])
  const [minRating, setMinRating] = useState<number | null>(null)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["hotels", q, price, minRating],
    queryFn: () => apiGet<{ hotels: Hotel[] }>(`/api/hotels?q=${encodeURIComponent(q)}&minPrice=${price[0]}&maxPrice=${price[1]}&minRating=${minRating ?? ''}`)
  })
  const hotels: Hotel[] = data?.hotels || []

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
                    Price Range: $50 - $500
                  </label>
                  <Slider defaultValue={[50, 500]} max={1000} step={10} onValueChange={(v) => setPrice([v[0], v[1]])} />
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
                        <Checkbox id={type} />
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
                          <Checkbox id={amenity} />
                          <label htmlFor={amenity} className="text-sm cursor-pointer">
                            {amenity}
                          </label>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <Button className="w-full" onClick={() => { /* queryKey updates trigger refetch automatically */ }}>Apply Filters</Button>
              </div>
            </div>
          </aside>

          {/* Hotels Grid */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <p className="text-muted-foreground">{isLoading ? "Loading..." : isError ? "Failed to load" : `${hotels.length} properties found`}</p>
              <select className="border rounded-lg px-4 py-2 bg-background">
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Rating</option>
                <option>Popularity</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hotels.map((hotel) => (
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
