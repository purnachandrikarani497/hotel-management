import { Search, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroImage from "@/assets/hero-resort.jpg";

const Hero = () => {
  return (
    <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70 z-10" />
      <img
        src={heroImage}
        alt="Luxury resort"
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      <div className="container relative z-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          Find Your Perfect Stay
        </h1>
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Discover amazing hotels, resorts, and unique stays around the world
        </p>

        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground mb-2 block text-left">
                Where
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search destinations or hotels"
                  className="pl-10 h-12 border-2 focus-visible:ring-primary"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block text-left">
                Check-in / Check-out
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Add dates"
                  className="pl-10 h-12 border-2 focus-visible:ring-primary"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block text-left">
                Guests
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="2 guests"
                  className="pl-10 h-12 border-2 focus-visible:ring-primary"
                />
              </div>
            </div>
          </div>
          
          <Button className="w-full md:w-auto mt-4 h-12 px-8 bg-accent hover:bg-accent/90 text-white">
            <Search className="mr-2 h-5 w-5" />
            Search Hotels
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
