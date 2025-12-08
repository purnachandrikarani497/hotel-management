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
  availableTypes?: { type: string; members?: number; available?: number }[];
}

const HotelCard = ({ id, name, location, price, image, amenities = [], rating, reviews, availableTypes = [] }: HotelCardProps) => {
  const resolveImage = (src?: string) => {
    const s = String(src||'')
    if (!s) return 'https://placehold.co/800x600?text=Hotel'
    const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>
    let base = env?.VITE_API_URL || 'http://localhost:5000'
    if (/localhost:\d+/i.test(base) && !/localhost:5000/i.test(base)) base = base.replace(/localhost:\d+/i, 'localhost:5000')
    if (/^https?:\/\/localhost:\d+\/uploads\//i.test(s)) return s.replace(/localhost:\d+/i,'localhost:5000')
    if (s.startsWith('/uploads')) return `${base}${s}`
    if (s.startsWith('uploads')) return `${base}/${s}`
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
    <div className="group rounded-2xl overflow-hidden bg-gradient-to-br from-white via-purple-50 to-pink-50 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
      <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
        <img
          src={resolveImage(image)}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e)=>{ e.currentTarget.src='https://placehold.co/800x600?text=Hotel' }}
        />
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-bold text-foreground group-hover:text-purple-700 transition-colors">
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
        
        <div className="flex items-center text-muted-foreground mb-2">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="text-sm">{location}</span>
      </div>

        {availableTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {availableTypes.slice(0, 2).map((rt, idx) => (
              <Badge key={`${id}-${rt.type}-${idx}`} variant="secondary" className="text-xs">
                {rt.type} • {Number(rt.members||0)} • {Number(rt.available||0)} left
              </Badge>
            ))}
          </div>
        )}

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
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
