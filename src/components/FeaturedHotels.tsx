import HotelCard from "./HotelCard";
import hotel1 from "@/assets/hotel-1.jpg";
import hotel2 from "@/assets/hotel-2.jpg";
import hotel3 from "@/assets/hotel-3.jpg";
import hotel4 from "@/assets/hotel-4.jpg";

const hotels = [
  {
    id: 1,
    name: "Grand Luxury Hotel",
    location: "New York, USA",
    rating: 4.8,
    reviews: 328,
    price: 299,
    image: hotel1,
    amenities: ["WiFi", "Breakfast", "Parking"]
  },
  {
    id: 2,
    name: "Tropical Paradise Resort",
    location: "Bali, Indonesia",
    rating: 4.9,
    reviews: 512,
    price: 189,
    image: hotel2,
    amenities: ["WiFi", "Breakfast", "Parking"]
  },
  {
    id: 3,
    name: "Mediterranean Villa",
    location: "Santorini, Greece",
    rating: 4.7,
    reviews: 256,
    price: 349,
    image: hotel3,
    amenities: ["WiFi", "Breakfast"]
  },
  {
    id: 4,
    name: "Alpine Mountain Lodge",
    location: "Swiss Alps, Switzerland",
    rating: 4.9,
    reviews: 425,
    price: 279,
    image: hotel4,
    amenities: ["WiFi", "Parking"]
  }
];

const FeaturedHotels = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Hotels</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover our handpicked selection of exceptional stays
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.id} {...hotel} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedHotels;
