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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const HotelDetail = () => {
  type Hotel = { id: number; name: string; location: string; rating: number; reviews: number; price: number; image: string; amenities?: string[]; description?: string }
  const { id } = useParams();
  const { data, isLoading, isError } = useQuery({ queryKey: ["hotel", id], queryFn: () => apiGet<{ hotel: Hotel }>(`/api/hotels/${id}`), enabled: !!id })
  const hotel: Hotel | undefined = data?.hotel
  const reviews = useQuery({ queryKey: ["hotel","reviews",id], queryFn: () => apiGet<{ reviews: { id:number; userId:number; hotelId:number; rating:number; comment:string; createdAt:string }[] }>(`/api/hotels/${id}/reviews`), enabled: !!id })
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(1)
  const [checkInTime, setCheckInTime] = useState("")
  const [checkOutTime, setCheckOutTime] = useState("")
  const raw = typeof window !== "undefined" ? localStorage.getItem("auth") : null
  const auth = raw ? JSON.parse(raw) as { user?: { id?: number } } : null
  

  const price = hotel?.price ?? 0
  const hasDateTime = !!checkIn && !!checkOut && !!checkInTime && !!checkOutTime
  const ci = hasDateTime ? new Date(`${checkIn}T${checkInTime}:00`) : null
  const co = hasDateTime ? new Date(`${checkOut}T${checkOutTime}:00`) : null
  const diffMs = ci && co ? Math.max(0, co.getTime() - ci.getTime()) : 0
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const stayDays = diffHours > 0 && diffHours <= 24 ? 1 : Math.floor(diffHours / 24)
  const extraHours = diffHours > 24 ? (diffHours - stayDays * 24) : 0
  const baseAmount = stayDays * price
  const extraAmount = Math.round((price / 24) * extraHours)
  const subtotal = baseAmount + extraAmount
  const grandTotal = subtotal

  const reserve = useMutation({ mutationFn: () => apiPost<{ status: string; id: number }, { userId:number; hotelId: number; checkIn: string; checkOut: string; guests: number; total: number }>("/api/bookings", { userId: auth?.user?.id || 0, hotelId: Number(id), checkIn: hasDateTime ? ci!.toISOString() : checkIn, checkOut: hasDateTime ? co!.toISOString() : checkOut, guests, total: subtotal }) })

  const [open, setOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'upi'|'cod'|''>('')
  const [upiId, setUpiId] = useState("")
  const [paid, setPaid] = useState(false)

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
                  {(reviews.data?.reviews||[]).map(r => (
                    <div key={r.id} className="p-6 rounded-lg bg-card border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-semibold">Guest #{r.userId}</p>
                            <p className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 text-accent">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-bold">{r.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground">{r.comment}</p>
                    </div>
                  ))}
                  {(!reviews.data?.reviews || reviews.data.reviews.length===0) && <div className="text-sm text-muted-foreground">No reviews yet</div>}
                </div>
              </div>
            </div>

            {/* Booking Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 p-6 rounded-2xl border bg-card shadow-card">
                <div className="mb-6">
                  <div className="text-3xl font-bold text-primary mb-1">${hotel?.price ?? 0}</div>
                  <p className="text-muted-foreground">per 24h</p>
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
                  <input
                    type="time"
                    className="w-full mt-2 px-4 py-2 rounded-lg border bg-background"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
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
                  <input
                    type="time"
                    className="w-full mt-2 px-4 py-2 rounded-lg border bg-background"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
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

                <Button className="w-full h-12 bg-accent hover:bg-accent/90 text-white mb-4" disabled={reserve.isPending || !hasDateTime} onClick={() => { setOpen(true); reserve.mutate(); }}>
                  {reserve.isPending ? "Reserving..." : "Reserve Now"}
                </Button>
                {reserve.isError && <div className="text-red-600 text-sm">Reservation failed</div>}

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">${price} × {stayDays} days</span>
                    <span className="font-medium">${baseAmount}</span>
                  </div>
                  {extraHours>0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Extra hours {extraHours}h</span>
                      <span className="font-medium">${extraAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>${grandTotal}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(v)=>{ setOpen(v); if (!v) { setPaymentMethod(''); setUpiId(''); setPaid(false) } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{reserve.isPending ? "Processing reservation" : reserve.isSuccess ? "Reservation successful" : reserve.isError ? "Reservation failed" : "Reserve"}</DialogTitle>
              <DialogDescription>{reserve.isSuccess ? "Choose a payment method to complete your booking." : reserve.isPending ? "Please wait while we reserve your room." : reserve.isError ? "Please try again." : ""}</DialogDescription>
            </DialogHeader>
            {reserve.isSuccess && !paid && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Payment method</Label>
                  <RadioGroup value={paymentMethod} onValueChange={(v)=>setPaymentMethod(v as 'upi'|'cod')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="upi" id="pm-upi" />
                      <Label htmlFor="pm-upi">UPI</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cod" id="pm-cod" />
                      <Label htmlFor="pm-cod">Cash on Delivery</Label>
                    </div>
                  </RadioGroup>
                </div>
                {paymentMethod === 'upi' && (
                  <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI ID</Label>
                    <Input id="upi-id" placeholder="name@bank" value={upiId} onChange={(e)=>setUpiId(e.target.value)} />
                  </div>
                )}
            <DialogFooter>
              <Button variant="secondary" onClick={()=>setOpen(false)}>Close</Button>
              <Button disabled={paymentMethod==='' || (paymentMethod==='upi' && !upiId)} onClick={()=>setPaid(true)}>Pay Now</Button>
            </DialogFooter>
              </div>
            )}
            {reserve.isSuccess && paid && (
              <div className="space-y-4">
                <div className="text-green-600 font-medium">Payment confirmed</div>
                <div className="text-sm text-muted-foreground">Booking completed. Thank you!</div>
                <DialogFooter>
                  <Button onClick={()=>setOpen(false)}>Done</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default HotelDetail;
