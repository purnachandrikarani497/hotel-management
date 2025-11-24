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
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const HotelDetail = () => {
  type Hotel = { id: number; name: string; location: string; rating: number; reviews: number; price: number; image: string; images?: string[]; amenities?: string[]; description?: string }
  const { id } = useParams();
  const { data, isLoading, isError } = useQuery({ queryKey: ["hotel", id], queryFn: () => apiGet<{ hotel: Hotel }>(`/api/hotels/${id}`), enabled: !!id })
  type RoomInfo = { id:number; hotelId:number; type:string; price:number; members:number; availability:boolean; blocked:boolean; amenities?: string[]; photos?: string[] }
  const roomsQuery = useQuery({ queryKey: ["hotel","rooms",id], queryFn: () => apiGet<{ rooms: RoomInfo[] }>(`/api/hotels/${id}/rooms`), enabled: !!id })
  const hotel: Hotel | undefined = data?.hotel
  const reviews = useQuery({ queryKey: ["hotel","reviews",id], queryFn: () => apiGet<{ reviews: { id:number; userId:number; hotelId:number; rating:number; comment:string; createdAt:string }[] }>(`/api/hotels/${id}/reviews`), enabled: !!id })
  const istTZ = 'Asia/Kolkata'
  const parts = (d: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: istTZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  const ymdIST = (d: Date) => { const p = parts(d); const y = p.find(x=>x.type==='year')?.value||'0000'; const m = p.find(x=>x.type==='month')?.value||'01'; const da = p.find(x=>x.type==='day')?.value||'01'; return `${y}-${m}-${da}` }
  const hmIST = (d: Date) => { const p = parts(d); const h = p.find(x=>x.type==='hour')?.value||'00'; const mi = p.find(x=>x.type==='minute')?.value||'00'; return `${h}:${mi}` }
  const nowInit = new Date()
  const todayStrInit = ymdIST(nowInit)
  const tomorrowStrInit = ymdIST(new Date(nowInit.getTime() + 24*60*60*1000))
  const curHMInit = hmIST(nowInit)
  const [checkIn, setCheckIn] = useState(todayStrInit)
  const [checkOut, setCheckOut] = useState(tomorrowStrInit)
  const [guests, setGuests] = useState(1)
  const [checkInTime, setCheckInTime] = useState(curHMInit)
  const [checkOutTime, setCheckOutTime] = useState(curHMInit)
  const raw = typeof window !== "undefined" ? localStorage.getItem("auth") : null
  const auth = raw ? JSON.parse(raw) as { user?: { id?: number } } : null
  

  const availableRooms = roomsQuery.data?.rooms || []
  const [roomType, setRoomType] = useState<string>(availableRooms[0]?.type || 'Standard')
  useEffect(() => {
    const rs = roomsQuery.data?.rooms || []
    if (rs.length && !rs.find(r => r.type === roomType)) setRoomType(rs[0].type)
  }, [roomsQuery.data, roomType])
  const selectedRoom = availableRooms.find(r => r.type === roomType) || availableRooms[0]
  const price = Number(selectedRoom?.price ?? hotel?.price ?? 0)
  const todayIso = ymdIST(new Date())
  const hasDateTime = !!checkIn && !!checkOut && !!checkInTime && !!checkOutTime && (()=>{
    const ci2 = new Date(`${checkIn}T${checkInTime}:00+05:30`)
    const co2 = new Date(`${checkOut}T${checkOutTime}:00+05:30`)
    const startOfToday = new Date(`${todayIso}T00:00:00+05:30`)
    const notBeforeToday = ci2 >= startOfToday
    const notAfter = co2 > ci2
    return notBeforeToday && notAfter
  })()
  
  const ci = hasDateTime ? new Date(`${checkIn}T${checkInTime}:00+05:30`) : null
  const co = hasDateTime ? new Date(`${checkOut}T${checkOutTime}:00+05:30`) : null
  const diffMs = ci && co ? Math.max(0, co.getTime() - ci.getTime()) : 0
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const stayDays = diffHours > 0 && diffHours <= 24 ? 1 : Math.floor(diffHours / 24)
  const extraHours = diffHours > 24 ? (diffHours - stayDays * 24) : 0
  const baseAmount = stayDays * price
  const extraAmount = Math.round((price / 24) * extraHours)
  const subtotal = baseAmount + extraAmount
  const grandTotal = subtotal

  type ReserveResp = { status: string; id: number; roomId: number; holdExpiresAt: string }
  const reserve = useMutation({ mutationFn: () => apiPost<ReserveResp, { userId:number; hotelId: number; checkIn: string; checkOut: string; guests: number; roomType: string }>("/api/bookings", { userId: auth?.user?.id || 0, hotelId: Number(id), checkIn: hasDateTime ? `${checkIn}T${checkInTime}:00+05:30` : checkIn, checkOut: hasDateTime ? `${checkOut}T${checkOutTime}:00+05:30` : checkOut, guests, roomType }) })

  const [open, setOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'upi'|'cod'|''>('')
  const [upiId, setUpiId] = useState("")
  const [paid, setPaid] = useState(false)
  const confirm = useMutation({ mutationFn: (id:number) => apiPost(`/api/bookings/confirm/${id}`, {}) })
  const [remaining, setRemaining] = useState(0)
  const holdUntil = reserve.data?.holdExpiresAt
  const invoice = useQuery({ queryKey: ["booking","invoice", reserve.data?.id], queryFn: () => apiGet<{ invoice: { id:number; subtotal:number; taxRate:number; tax:number; total:number } }>(`/api/bookings/invoice/${reserve.data?.id}`), enabled: !!reserve.data?.id })
  useEffect(() => {
    if (reserve.isSuccess && holdUntil) {
      const end = new Date(holdUntil).getTime()
      const tick = () => setRemaining(Math.max(0, Math.floor((end - Date.now())/1000)))
      tick()
      const i = setInterval(tick, 1000)
      return () => clearInterval(i)
    }
  }, [reserve.isSuccess, holdUntil])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-8">
          {/* Hero Image Gallery */}
          {isLoading && <div>Loading...</div>}
          {isError && <div>Failed to load</div>}
          {!isLoading && !isError && hotel && (()=>{
            const resolve = (src?: string) => {
              const s = String(src||'')
              if (!s) return 'https://placehold.co/800x600?text=Hotel'
              if (s.startsWith('/uploads')) return `http://localhost:5000${s}`
              if (s.startsWith('uploads')) return `http://localhost:5000/${s}`
              return s
            }
            const imgs = (hotel.images||[])
            const gallery = imgs.length ? imgs : [hotel.image].filter(Boolean)
            const g0 = resolve(gallery[0])
            const g1 = resolve(gallery[1]||gallery[0])
            const g2 = resolve(gallery[2]||gallery[0])
            return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 rounded-2xl overflow-hidden">
              <div className="md:row-span-2">
                <img src={g0} alt="Hotel" className="w-full h-full object-cover" onError={(e)=>{ e.currentTarget.src='https://placehold.co/800x600?text=Hotel' }} />
              </div>
              <img src={g1} alt="Hotel" className="w-full h-64 object-cover" onError={(e)=>{ e.currentTarget.src='https://placehold.co/800x600?text=Hotel' }} />
              <img src={g2} alt="Hotel" className="w-full h-64 object-cover" onError={(e)=>{ e.currentTarget.src='https://placehold.co/800x600?text=Hotel' }} />
            </div>
            )
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-4xl font-bold">{hotel?.name || "Hotel"}</h1>
                  
                </div>
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{hotel?.location || ""}</span>
                </div>
                
              </div>

              {/* Description */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Description</h2>
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

              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Rooms</h2>
                <div className="rounded-xl border overflow-hidden">
                  {availableRooms.map((r, idx) => {
                    const resolve = (src?: string) => {
                      const s = String(src||'')
                      if (!s) return 'https://placehold.co/160x120?text=Room'
                      if (s.startsWith('/uploads')) return `http://localhost:5000${s}`
                      if (s.startsWith('uploads')) return `http://localhost:5000/${s}`
                      return s
                    }
                    const p0 = resolve(r.photos?.[0])
                    return (
                      <div key={r.id} className={`grid grid-cols-12 gap-4 items-center p-4 ${idx>0?'border-t':''} bg-card`} onClick={()=>setRoomType(r.type)} style={{cursor:'pointer'}}>
                        <div className="col-span-2">
                          <div className="h-20 w-full rounded-lg overflow-hidden border">
                            <img src={p0} alt={r.type} className="w-full h-full object-cover" onError={(e)=>{ e.currentTarget.src='https://placehold.co/160x120?text=Room' }} />
                          </div>
                        </div>
                        <div className="col-span-6">
                          <div className="font-semibold">{r.type}</div>
                          <div className="text-xs text-muted-foreground">Members: {r.members}</div>
                          <div className="flex gap-2 mt-2">
                            {(r.amenities||[]).slice(0,4).map((a:string)=>(<span key={a} className="px-2 py-1 bg-muted rounded text-xs">{a}</span>))}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <span className={`px-2 py-1 rounded text-xs ${r.availability ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground'}`}>{r.availability ? 'Available' : 'Unavailable'}</span>
                            {r.blocked && <span className="px-2 py-1 rounded text-xs bg-accent/20">Blocked</span>}
                          </div>
                        </div>
                        <div className="col-span-4 text-right">
                          <div className="text-primary font-bold mb-2">₹{r.price}</div>
                          <Button variant={roomType===r.type?'default':'outline'} size="sm" onClick={()=>setRoomType(r.type)}>
                            {roomType===r.type ? 'Selected' : 'Show price'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {availableRooms.length===0 && (
                    <div className="p-4 text-sm text-muted-foreground">No rooms found for this hotel</div>
                  )}
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
                  <div className="text-3xl font-bold text-primary mb-1">₹{price}</div>
                  <p className="text-muted-foreground">per 24h</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Check-in</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg border bg-background"
                    value={checkIn}
                    min={todayIso}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                  <input
                    type="time"
                    className="w-full mt-2 px-4 py-2 rounded-lg border bg-background"
                    value={checkInTime}
                    min={(checkIn===todayIso) ? hmIST(new Date()) : undefined}
                    onChange={(e) => setCheckInTime(e.target.value)}
                  />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Check-out</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg border bg-background"
                    value={checkOut}
                    min={checkIn || todayIso}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                  <input
                    type="time"
                    className="w-full mt-2 px-4 py-2 rounded-lg border bg-background"
                    value={checkOutTime}
                    min={(checkOut===checkIn && checkInTime) ? checkInTime : undefined}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                  />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Room Type</label>
                    <select className="w-full px-4 py-2 rounded-lg border bg-background" value={roomType} onChange={(e)=>setRoomType(e.target.value)}>
                      {availableRooms.map(r=> (
                        <option key={r.id} value={r.type}>{r.type} • ₹{r.price}</option>
                      ))}
                    </select>
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
                    <span className="text-muted-foreground">₹{price} × {stayDays} days</span>
                    <span className="font-medium">₹{baseAmount}</span>
                  </div>
                  {extraHours>0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Extra hours {extraHours}h</span>
                      <span className="font-medium">₹{extraAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>₹{grandTotal}</span>
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
                    <div className="flex items-center justify-between p-3 rounded bg-muted">
                      <div className="text-sm">Hold expires in</div>
                      <div className="font-mono font-bold">
                        {String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}
                      </div>
                    </div>
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
                {invoice.data?.invoice && (
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">₹{invoice.data.invoice.subtotal}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({invoice.data.invoice.taxRate}%)</span><span className="font-medium">₹{invoice.data.invoice.tax}</span></div>
                    <div className="flex justify-between font-bold text-lg"><span>Total</span><span>₹{invoice.data.invoice.total}</span></div>
                  </div>
                )}
            <DialogFooter>
              <Button variant="secondary" onClick={()=>setOpen(false)}>Close</Button>
              <Button disabled={paymentMethod==='' || (paymentMethod==='upi' && !upiId) || remaining<=0} onClick={() => { setPaid(true); const bid = reserve.data?.id; if (bid) confirm.mutate(bid) }}>Pay Now</Button>
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
