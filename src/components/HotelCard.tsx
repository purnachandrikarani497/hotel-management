import { Star, MapPin, Wifi, Coffee, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface HotelCardProps {
  id: number;
  name: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  image: string;
  amenities?: string[];
}

const HotelCard = ({ id, name, location, rating, reviews, price, image, amenities = [] }: HotelCardProps) => {
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
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <Badge className="absolute top-4 right-4 bg-accent text-white">
          Featured
        </Badge>
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
            {name}
          </h3>
          <div className="flex items-center space-x-1 text-accent">
            <Star className="h-5 w-5 fill-current" />
            <span className="font-bold">{rating}</span>
          </div>
        </div>
        
        <div className="flex items-center text-muted-foreground mb-4">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="text-sm">{location}</span>
          <span className="mx-2">•</span>
          <span className="text-sm">{reviews} reviews</span>
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
            <span className="text-2xl font-bold text-primary">${price}</span>
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
