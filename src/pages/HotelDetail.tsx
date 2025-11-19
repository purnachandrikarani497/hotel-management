import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Wifi, Coffee, Car, Users, BedDouble, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import hotel1 from "@/assets/hotel-1.jpg";

const HotelDetail = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-8">
          {/* Hero Image Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 rounded-2xl overflow-hidden">
            <div className="md:row-span-2">
              <img src={hotel1} alt="Hotel" className="w-full h-full object-cover" />
            </div>
            <img src={hotel1} alt="Hotel" className="w-full h-64 object-cover" />
            <img src={hotel1} alt="Hotel" className="w-full h-64 object-cover" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-4xl font-bold">Grand Luxury Hotel</h1>
                  <div className="flex items-center space-x-1 text-accent">
                    <Star className="h-6 w-6 fill-current" />
                    <span className="text-2xl font-bold">4.8</span>
                  </div>
                </div>
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>123 Luxury Avenue, New York, NY 10001</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Free WiFi</Badge>
                  <Badge variant="secondary">Free Parking</Badge>
                  <Badge variant="secondary">Breakfast Included</Badge>
                  <Badge variant="secondary">Pool</Badge>
                  <Badge variant="secondary">Gym</Badge>
                </div>
              </div>

              {/* About Section */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">About this hotel</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Experience luxury and comfort at our Grand Luxury Hotel. Located in the heart of New York City, 
                  our hotel offers world-class amenities and exceptional service. Each room is elegantly designed 
                  with modern furnishings and state-of-the-art technology to ensure your comfort during your stay.
                </p>
              </div>

              {/* Amenities */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { icon: Wifi, label: "Free WiFi" },
                    { icon: Coffee, label: "Breakfast" },
                    { icon: Car, label: "Free Parking" },
                    { icon: Users, label: "Gym" },
                    { icon: BedDouble, label: "Room Service" },
                    { icon: Check, label: "24/7 Reception" },
                  ].map((amenity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-4 rounded-lg bg-muted">
                      <amenity.icon className="h-5 w-5 text-primary" />
                      <span className="font-medium">{amenity.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Guest Reviews</h2>
                <div className="space-y-4">
                  {[1, 2, 3].map((review) => (
                    <div key={review} className="p-6 rounded-lg bg-card border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-bold text-primary">JD</span>
                          </div>
                          <div>
                            <p className="font-semibold">John Doe</p>
                            <p className="text-sm text-muted-foreground">2 days ago</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 text-accent">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-bold">5.0</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground">
                        Excellent hotel with amazing service! The rooms were clean and spacious. 
                        Would definitely recommend to anyone visiting New York.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 p-6 rounded-2xl border bg-card shadow-card">
                <div className="mb-6">
                  <div className="text-3xl font-bold text-primary mb-1">$299</div>
                  <p className="text-muted-foreground">per night</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Check-in</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Check-out</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Guests</label>
                    <select className="w-full px-4 py-2 rounded-lg border bg-background">
                      <option>1 Guest</option>
                      <option>2 Guests</option>
                      <option>3 Guests</option>
                      <option>4+ Guests</option>
                    </select>
                  </div>
                </div>

                <Button className="w-full h-12 bg-accent hover:bg-accent/90 text-white mb-4">
                  Reserve Now
                </Button>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">$299 × 3 nights</span>
                    <span className="font-medium">$897</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service fee</span>
                    <span className="font-medium">$45</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxes</span>
                    <span className="font-medium">$89</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>$1,031</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HotelDetail;
