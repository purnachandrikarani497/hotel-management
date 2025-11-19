import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Wifi, Coffee, Car, Users, BedDouble, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { useState } from "react";

const HotelDetail = () => {
  type Hotel = { id: number; name: string; location: string; rating: number; reviews: number; price: number; image: string; amenities?: string[]; description?: string }
  const { id } = useParams();
  const { data, isLoading, isError } = useQuery({ queryKey: ["hotel", id], queryFn: () => apiGet<{ hotel: Hotel }>(`/api/hotels/${id}`), enabled: !!id })
  const hotel: Hotel | undefined = data?.hotel
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(1)
  const reserve = useMutation({ mutationFn: () => apiPost<{ status: string; id: number }, { hotelId: number; checkIn: string; checkOut: string; guests: number; total: number }>("/api/bookings", { hotelId: Number(id), checkIn, checkOut, guests, total: (hotel?.price || 0) * 3 }) })

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-8">
          {/* Hero Image Gallery */}
          {isLoading && <div>Loading...</div>}
          {isError && <div>Failed to load</div>}
          {!isLoading && !isError && hotel && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 rounded-2xl overflow-hidden">
              <div className="md:row-span-2">
                <img src={hotel.image} alt="Hotel" className="w-full h-full object-cover" />
              </div>
              <img src={hotel.image} alt="Hotel" className="w-full h-64 object-cover" />
              <img src={hotel.image} alt="Hotel" className="w-full h-64 object-cover" />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-4xl font-bold">{hotel?.name || "Hotel"}</h1>
                  <div className="flex items-center space-x-1 text-accent">
                    <Star className="h-6 w-6 fill-current" />
                    <span className="text-2xl font-bold">4.8</span>
                  </div>
                </div>
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{hotel?.location || ""}</span>
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
                <p className="text-muted-foreground leading-relaxed">{hotel?.description}</p>
              </div>

              {/* Amenities */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(hotel?.amenities || []).map((label: string, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-4 rounded-lg bg-muted">
                      <Wifi className="h-5 w-5 text-primary" />
                      <span className="font-medium">{label}</span>
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
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Check-out</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg border bg-background"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Guests</label>
                  <select className="w-full px-4 py-2 rounded-lg border bg-background" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                      <option value={1}>1 Guest</option>
                      <option value={2}>2 Guests</option>
                      <option value={3}>3 Guests</option>
                      <option value={4}>4+ Guests</option>
                    </select>
                  </div>
                </div>

                <Button className="w-full h-12 bg-accent hover:bg-accent/90 text-white mb-4" disabled={reserve.isPending} onClick={() => reserve.mutate()}>
                  {reserve.isPending ? "Reserving..." : "Reserve Now"}
                </Button>
                {reserve.isError && <div className="text-red-600 text-sm">Reservation failed</div>}
                {reserve.isSuccess && <div className="text-green-600 text-sm">Reserved successfully</div>}

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
