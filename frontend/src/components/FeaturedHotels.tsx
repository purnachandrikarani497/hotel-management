import HotelCard from "./HotelCard";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

const FeaturedHotels = () => {
  type Hotel = { id: number; name: string; location: string; rating: number; reviews: number; price: number; image: string; amenities?: string[] }
  const { data, isLoading, isError } = useQuery({ queryKey: ["featured"], queryFn: () => apiGet<{ hotels: Hotel[] }>("/api/featured"), staleTime: 60_000, refetchOnWindowFocus: false })
  const hotels: Hotel[] = data?.hotels || []
  return (
    <section className="py-16 bg-gradient-to-br from-white via-blue-50 to-cyan-50">
      <div className="container">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Featured Hotels</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover our handpicked selection of exceptional stays
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {isLoading && <div className="col-span-4 text-center">Loading...</div>}
          {isError && <div className="col-span-4 text-center">Failed to load</div>}
          {!isLoading && !isError && hotels.map((hotel) => (
            <HotelCard key={hotel.id} {...hotel} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedHotels;
