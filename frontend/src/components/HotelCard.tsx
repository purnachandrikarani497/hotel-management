import { Star, MapPin, Wifi, Coffee, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface HotelCardProps {
  id: number;
  name: string;
  location: string;
  price: number;
  image: string;
  amenities?: string[];
  rating?: number;
  reviews?: number;
}

const HotelCard = ({ id, name, location, price, image, amenities = [], rating, reviews }: HotelCardProps) => {
  const resolveImage = (src?: string) => {
    const s = String(src||'')
    if (!s) return 'https://placehold.co/800x600?text=Hotel'
    if (s.startsWith('/uploads')) return `http://localhost:3015${s}`
    if (s.startsWith('uploads')) return `http://localhost:3015/${s}`
    return s
  }
  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi':
        return <Wifi className="h-4 w-4" />;
      case 'breakfast':
        return <Coffee className="h-4 w-4" />;
      case 'parking':
        return <Car className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="group rounded-2xl overflow-hidden bg-card shadow-card hover:shadow-card-hover transition-all duration-300">
      <div className="relative h-64 overflow-hidden">
        <img
          src={resolveImage(image)}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e)=>{ e.currentTarget.src='https://placehold.co/800x600?text=Hotel' }}
        />
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
            {name}
          </h3>
          {typeof rating === 'number' ? (
            <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-sm">
              <Star className="h-4 w-4 text-accent fill-current" />
              <span>{Math.round(rating * 10) / 10}</span>
              {typeof reviews === 'number' ? (<span className="text-muted-foreground">({reviews})</span>) : null}
            </div>
          ) : null}
        </div>
        
        <div className="flex items-center text-muted-foreground mb-4">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="text-sm">{location}</span>
      </div>

        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {amenities.slice(0, 3).map((amenity, index) => (
              <div key={index} className="flex items-center space-x-1 text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {getAmenityIcon(amenity)}
                <span>{amenity}</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold text-primary">₹{price}</span>
            <span className="text-muted-foreground"> / night</span>
          </div>
          <Link to={`/hotel/${id}`}>
            <Button className="bg-primary hover:bg-primary/90">
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
