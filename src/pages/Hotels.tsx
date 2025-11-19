import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HotelCard from "@/components/HotelCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

const Hotels = () => {
  const hotels = [
    {
      id: 1,
      name: "Luxury Beach Resort",
      location: "Miami, Florida",
      rating: 4.8,
      reviews: 342,
      price: 250,
      image: "/src/assets/hotel-1.jpg",
    },
    {
      id: 2,
      name: "Mountain View Hotel",
      location: "Aspen, Colorado",
      rating: 4.6,
      reviews: 215,
      price: 180,
      image: "/src/assets/hotel-2.jpg",
    },
    {
      id: 3,
      name: "City Center Plaza",
      location: "New York, NY",
      rating: 4.7,
      reviews: 489,
      price: 320,
      image: "/src/assets/hotel-3.jpg",
    },
    {
      id: 4,
      name: "Seaside Villa",
      location: "Malibu, California",
      rating: 4.9,
      reviews: 567,
      price: 450,
      image: "/src/assets/hotel-4.jpg",
    },
  ];

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
                    <Input placeholder="Hotel name..." className="pl-9" />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Price Range: $50 - $500
                  </label>
                  <Slider defaultValue={[50, 500]} max={1000} step={10} />
                </div>

                {/* Rating */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Rating</label>
                  <div className="space-y-2">
                    {[5, 4, 3].map((rating) => (
                      <div key={rating} className="flex items-center space-x-2">
                        <Checkbox id={`rating-${rating}`} />
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

                <Button className="w-full">Apply Filters</Button>
              </div>
            </div>
          </aside>

          {/* Hotels Grid */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <p className="text-muted-foreground">{hotels.length} properties found</p>
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
