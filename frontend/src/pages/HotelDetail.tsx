// src/pages/HotelDetail.tsx

import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Wifi } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import * as React from "react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type Hotel = {
  id: number;
  name: string;
  location: string;
  ownerId?: number;
  rating: number;
  reviews: number;
  price: number;
  image: string;
  images?: string[];
  amenities?: string[];
  description?: string;
  contactEmail?: string;
  contactPhone1?: string;
  contactPhone2?: string;
  ownerName?: string;
  pricing?: {
    normalPrice?: number;
    weekendPrice?: number;
    extraHourRate?: number;
    cancellationHourRate?: number;
    seasonal?: { start: string; end: string; price: number }[];
    specials?: { date: string; price: number }[];
  };
};

type RoomInfo = {
  id: number;
  hotelId: number;
  type: string;
  price: number;
  members: number;
  availability: boolean;
  blocked: boolean;
  amenities?: string[];
  photos?: string[];
  total?: number;
  used?: number;
  available?: number;
};

type Coupon = {
  id: number;
  code: string;
  discount: number;
  expiry: string | null;
  usageLimit: number;
  used: number;
  enabled: boolean;
  hotelId?: number;
};

const HotelDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // fetch hotel detail
  const { data, isLoading, isError } = useQuery({
    queryKey: ["hotel", id],
    queryFn: () => apiGet<{ hotel: Hotel }>(`/api/hotels/${id}`),
    enabled: !!id,
    refetchInterval: 3000,
  });

  // date/time logic
  const istTZ = "Asia/Kolkata";
  const parts = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: istTZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(d);
  const ymdIST = (d: Date) => {
    const p = parts(d);
    const y = p.find((x) => x.type === "year")?.value || "0000";
    const m = p.find((x) => x.type === "month")?.value || "01";
    const da = p.find((x) => x.type === "day")?.value || "01";
    return `${y}-${m}-${da}`;
  };
  const hmIST = (d: Date) => {
    const p = parts(d);
    const h = p.find((x) => x.type === "hour")?.value || "00";
    const mi = p.find((x) => x.type === "minute")?.value || "00";
    return `${h}:${mi}`;
  };

  const nowInit = new Date();
  const todayStrInit = ymdIST(nowInit);
  const tomorrowStrInit = ymdIST(new Date(nowInit.getTime() + 24 * 60 * 60 * 1000));
  const curHMInit = hmIST(nowInit);

  const [checkIn, setCheckIn] = useState<string>(todayStrInit);
  const [checkOut, setCheckOut] = useState<string>(tomorrowStrInit);
  const [checkInTime, setCheckInTime] = useState<string>(curHMInit);
  const [checkOutTime, setCheckOutTime] = useState<string>(curHMInit);
  const [guests, setGuests] = useState<number>(1);

  // fetch rooms
  const roomsQuery = useQuery({
    queryKey: ["hotel", "rooms", id, checkIn],
    queryFn: () => apiGet<{ rooms: RoomInfo[] }>(`/api/hotels/${id}/rooms?date=${checkIn}`),
    enabled: !!id && !!checkIn,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // fetch reviews
  const reviewsQuery = useQuery({
    queryKey: ["hotel", "reviews", id],
    queryFn: () =>
      apiGet<{
        reviews: {
          id: number;
          userId: number;
          hotelId: number;
          rating: number;
          comment: string;
          createdAt: string;
          response?: string;
          user?: { id: number; email?: string; firstName?: string; lastName?: string; fullName?: string } | null;
        }[];
      }>(`/api/hotels/${id}/reviews`),
    enabled: !!id,
    staleTime: 60_000,
  });

  const hotel: Hotel | undefined = data?.hotel;
  const availableRooms = React.useMemo(() => roomsQuery.data?.rooms || [], [roomsQuery.data?.rooms]);
  const adminHotelsQ = useQuery({
    queryKey: ["admin","hotels"],
    queryFn: () => apiGet<{ hotels: { id:number; contactEmail?:string; contactPhone1?:string; contactPhone2?:string; ownerName?:string }[] }>(`/api/admin/hotels`),
    enabled: true,
    staleTime: 60_000,
  });
  const contactInfo = (() => {
    const h = hotel
    const list = adminHotelsQ.data?.hotels || []
    const fromOwner = list.find(x => x.id === Number(id))
    return {
      email: h?.contactEmail || fromOwner?.contactEmail || '',
      phone1: h?.contactPhone1 || fromOwner?.contactPhone1 || '',
      phone2: h?.contactPhone2 || fromOwner?.contactPhone2 || '',
      ownerName: h?.ownerName || fromOwner?.ownerName || ''
    }
  })()

  const [contactOverride, setContactOverride] = useState<{ email?: string; phone1?: string; phone2?: string; ownerName?: string } | null>(null)
  useEffect(()=>{
    try {
      const key = `hotelContact:${String(id)}`
      const raw = localStorage.getItem(key)
      if (raw) {
        const p = JSON.parse(raw)
        setContactOverride({ email: p.contactEmail, phone1: p.contactPhone1, phone2: p.contactPhone2, ownerName: p.ownerName })
      }
    } catch (_e) { void 0 }
  }, [id])
  const finalContact = {
    email: contactOverride?.email ?? contactInfo.email,
    phone1: contactOverride?.phone1 ?? contactInfo.phone1,
    phone2: contactOverride?.phone2 ?? contactInfo.phone2,
    ownerName: contactOverride?.ownerName ?? contactInfo.ownerName
  }

  useEffect(() => {
    const key = 'hotelUpdated'
    const handler = (e: StorageEvent) => {
      try {
        if (e.key !== key || !e.newValue) return
        const payload = JSON.parse(e.newValue)
        if (String(payload?.id || '') === String(id)) {
          qc.invalidateQueries({ queryKey: ["hotel", id] })
          qc.invalidateQueries({ queryKey: ["admin","hotels"] })
        }
      } catch (_e) { void 0 }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [qc, id])

  const [roomType, setRoomType] = useState<string>(availableRooms[0]?.type || "Standard");
  useEffect(() => {
    const rs = availableRooms;
    if (rs.length && !rs.find((r) => r.type === roomType)) {
      setRoomType(rs[0].type);
    }
  }, [availableRooms, roomType]);

 
  const selectedRoom = availableRooms.find((r) => r.type === roomType) || availableRooms[0];
  const maxGuests = Math.max(1, Number(selectedRoom?.members || 1));
  useEffect(() => {
    if (guests > maxGuests) setGuests(maxGuests);
  }, [maxGuests, guests]);
  const price = Number(selectedRoom?.price ?? hotel?.price ?? 0);

  const dynPricing = hotel?.pricing || {};
  const isWeekend = (() => {
    const d = new Date(`${checkIn}T00:00:00+05:30`);
    const day = d.getDay();
    return day === 0 || day === 6;
  })();
  const seasonalPrice = (() => {
    const list = Array.isArray(dynPricing.seasonal) ? dynPricing.seasonal : [];
    const di = new Date(`${checkIn}T00:00:00+05:30`).getTime();
    const f = list.find((x) => {
      const st = new Date(`${x.start}T00:00:00+05:30`).getTime();
      const en = new Date(`${x.end}T00:00:00+05:30`).getTime();
      return di >= st && di <= en;
    });
    return f?.price;
  })();
  const specialPrice = (() => {
    const list = Array.isArray(dynPricing.specials) ? dynPricing.specials : [];
    const f = list.find((x) => String(x.date) === String(checkIn));
    return f?.price;
  })();
  const weekendExtra = isWeekend ? Number(dynPricing.weekendPrice || 0) : 0
  const seasonalExtra = Number(seasonalPrice || 0)
  const specialExtra = Number(specialPrice || 0)
  const appliedRate = Math.max(0, Number(price || 0) + weekendExtra + seasonalExtra + specialExtra)


  // auth
  const raw = typeof window !== "undefined" ? localStorage.getItem("auth") : null;
  const auth = raw ? (JSON.parse(raw) as { token?: string; user?: { id?: number } }) : null;
  const isAuthed = !!(auth?.token);

  const todayIso = ymdIST(new Date());
  const hasDateTime =
    !!checkIn &&
    !!checkOut &&
    !!checkInTime &&
    !!checkOutTime &&
    (() => {
      const ci2 = new Date(`${checkIn}T${checkInTime}:00+05:30`);
      const co2 = new Date(`${checkOut}T${checkOutTime}:00+05:30`);
      const startOfToday = new Date(`${todayIso}T00:00:00+05:30`);
      const notBeforeToday = ci2 >= startOfToday;
      const notAfter = co2 > ci2;
      const nowHM = hmIST(new Date());
      const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return (h || 0) * 60 + (m || 0) };
      const ciBeforeNow = checkIn === todayIso && toMin(checkInTime) < toMin(nowHM);
      const sameDayMinOk = checkIn !== checkOut ? true : (toMin(checkOutTime) - toMin(checkInTime)) >= 1;
      return notBeforeToday && notAfter && !ciBeforeNow && sameDayMinOk;
    })();

  const ci = hasDateTime ? new Date(`${checkIn}T${checkInTime}:00+05:30`) : null;
  const co = hasDateTime ? new Date(`${checkOut}T${checkOutTime}:00+05:30`) : null;
  const diffMs = ci && co ? Math.max(0, co.getTime() - ci.getTime()) : 0;
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const stayDays = diffHours > 0 && diffHours <= 24 ? 1 : Math.floor(diffHours / 24);
  const extraHours = diffHours > 24 ? diffHours - stayDays * 24 : 0;
  const baseAmount = stayDays * appliedRate
  const extraAmount = Math.round((appliedRate / 24) * extraHours)
  const subtotal = baseAmount + extraAmount

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const discountAmount = Math.max(0, Math.round((appliedCoupon?.discount || 0) * subtotal / 100));
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // fetch coupons
  const couponsQ = useQuery({
    queryKey: ["hotel", "coupons", id, checkIn],
    queryFn: () => apiGet<{ coupons: Coupon[] }>(`/api/hotels/${id}/coupons?date=${checkIn}`),
    enabled: !!id && !!checkIn,
    staleTime: 60_000,
  });

  // reservation mutation
  type ReserveResp = { status: string; id: number; roomId: number; roomNumber?: string };
  const reserve = useMutation({
    mutationFn: (body: {
      userId: number;
      hotelId: number;
      checkIn: string;
      checkOut: string;
      guests: number;
      roomType: string;
      couponCode?: string;
    }) => apiPost<ReserveResp, typeof body>("/api/bookings", body),

    onSuccess: (res) => {
      toast({ title: "Booking created", description: `Booking #${res.id}` });
      qc.invalidateQueries({ queryKey: ["hotel", "rooms", id, checkIn] });
    },
    onError: () => {
      toast({ title: "Reservation failed", variant: "destructive" });
    },
  });

  // payment dialog logic
  const [open, setOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cod" | "">("");
  const [upiId, setUpiId] = useState<string>("");
  const [paid, setPaid] = useState<boolean>(false);

  const confirm = useMutation({
    mutationFn: (id: number) => apiPost(`/api/bookings/confirm/${id}`, {}),
    onSuccess: (_res, vars) => {
      setPaid(true);
      toast({ title: "Payment confirmed", description: `Booking #${vars}` });
      qc.invalidateQueries({ queryKey: ["hotel", "rooms", id, checkIn] });
    },
    onError: () => {
      toast({ title: "Payment failed", variant: "destructive" });
    },
  });

  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const invoice = useQuery({
    queryKey: ["booking", "invoice", reserve.data?.id],
    queryFn: () => apiGet<{ invoice: { id: number; subtotal: number; taxRate: number; tax: number; total: number } }>(`/api/bookings/invoice/${reserve.data?.id}`),
    enabled: !!reserve.data?.id,
  });

  useEffect(() => {
    if (reserve.isSuccess && reserve.data?.id) {
      const canvas = document.createElement("canvas");
      canvas.width = 720; canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "#000000"; ctx.font = "bold 24px Arial";
        ctx.fillText("Booking Receipt", 24, 40);
        ctx.font = "16px Arial";
        ctx.fillText(`Booking #${reserve.data.id}`, 24, 80);
        ctx.fillText(`Hotel: ${hotel?.name || ''} (#${id})`, 24, 110);
        ctx.fillText(`Room: ${reserve.data.roomNumber || ('#'+reserve.data.roomId)}`, 24, 140);
        ctx.fillText(`Check-in: ${checkIn} ${checkInTime}`, 24, 170);
        ctx.fillText(`Check-out: ${checkOut} ${checkOutTime}`, 24, 200);
        ctx.fillText(`Guests: ${guests}`, 24, 230);
        ctx.fillText(`Amount: ₹${grandTotal}`, 24, 260);
        ctx.fillText(`Date: ${new Date().toLocaleString()}`, 24, 290);
        ctx.strokeStyle = "#cccccc"; ctx.strokeRect(12, 12, canvas.width-24, canvas.height-24);
        setReceiptUrl(canvas.toDataURL("image/png"));
      }
    }
  }, [reserve.isSuccess, reserve.data?.id, reserve.data?.roomNumber, reserve.data?.roomId, hotel?.name, id, checkIn, checkInTime, checkOut, checkOutTime, guests, grandTotal]);

  const resolveImage = (src?: string) => {
    const s = String(src || "");
    if (!s) return "https://placehold.co/800x600?text=Hotel";
    const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>
    let base = env?.VITE_API_URL || 'http://localhost:5000'
    if (/localhost:\d+/i.test(base) && !/localhost:5000/i.test(base)) base = base.replace(/localhost:\d+/i, 'localhost:5000')
    if (/^https?:\/\/localhost:\d+\/uploads\//i.test(s)) return s.replace(/localhost:\d+/i,'localhost:5000')
    if (s.startsWith("/uploads")) return `${base}${s}`;
    if (s.startsWith("uploads")) return `${base}/${s}`;
    return s;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-12 relative overflow-hidden">
          <div className="container">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">{hotel?.name || 'Hotel Details'}</h1>
                <div className="mt-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{hotel?.location || ''}</span>
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-1 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                <span className="text-sm opacity-80">Booking Portal</span>
              </div>
            </div>
          </div>
        </section>
        <div className="container py-8">
          {isLoading && <div>Loading…</div>}
          {isError && <div>Failed to load</div>}
          {!isLoading && !isError && hotel && (
            <>
              {/* Image gallery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 rounded-2xl overflow-hidden">
                {(() => {
                  const imgs = hotel.images || [];
                  const gallery = imgs.length ? imgs : [hotel.image].filter(Boolean);
                  const g0 = resolveImage(gallery[0]);
                  const g1 = resolveImage(gallery[1] || gallery[0]);
                  const g2 = resolveImage(gallery[2] || gallery[0]);
                  return (
                    <>
                      <div className="md:row-span-2">
                        <img
                          src={g0}
                          alt="Hotel"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/800x600?text=Hotel";
                          }}
                        />
                      </div>
                      <img
                        src={g1}
                        alt="Hotel"
                        className="w-full h-64 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/800x600?text=Hotel";
                        }}
                      />
                      <img
                        src={g2}
                        alt="Hotel"
                        className="w-full h-64 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/800x600?text=Hotel";
                        }}
                      />
                    </>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main content */}
                <div className="lg:col-span-2">
                  <div className="mb-6">
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">{hotel.name}</h1>
                    <div className="flex items-center text-muted-foreground mb-4">
                      <MapPin className="h-5 w-5 mr-2" />
                      <span>{hotel.location}</span>
                    </div>
                  </div>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">Description</h2>
                    <p className="text-muted-foreground leading-relaxed">{hotel.description}</p>
                  </div>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">Rooms</h2>
                    <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-white via-purple-50 to-pink-50 shadow-2xl border-0">
                      {availableRooms.map((r, idx) => {
                        const p0 = resolveImage(r.photos?.[0]);
                        return (
                          <div
                            key={r.id}
                            className={`grid grid-cols-12 gap-4 items-center p-4 ${idx > 0 ? "border-t" : ""} bg-white/70`}
                            onClick={() => setRoomType(r.type)}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="col-span-2">
                              <div className="h-20 w-full rounded-lg overflow-hidden border">
                                <img
                                  src={p0}
                                  alt={r.type}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = "https://placehold.co/160x120?text=Room";
                                  }}
                                />
                              </div>
                            </div>
                            <div className="col-span-6">
                              <div className="font-semibold">{r.type}</div>
                              <div className="text-xs text-muted-foreground">Members: {r.members}</div>
                              <div className="flex gap-2 mt-2">
                                {(r.amenities || []).slice(0, 4).map((a) => (
                                  <span key={a} className="px-2 py-1 bg-muted rounded text-xs">
                                    {a}
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-2 mt-2 items-center">
                                {Number(r?.available || 0) > 0 ? (
                                  <span className="px-2 py-1 rounded text-xs bg-primary/15 text-primary">
                                    {`${Number(r?.available || 0)}/${Number(r?.total || 0)} left`}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded text-xs bg-muted text-foreground">Unavailable on {checkIn}</span>
                                )}
                                {typeof r?.used === 'number' && Number(r?.available || 0) > 0 ? (
                                  <span className="px-2 py-1 rounded text-xs bg-muted text-foreground">Booked {Number(r?.used || 0)}</span>
                                ) : null}
                                {r.blocked && <span className="px-2 py-1 rounded text-xs bg-accent/20">Blocked</span>}
                              </div>
                            </div>
                            <div className="col-span-4 text-right">
                              <div className="font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">₹{r.price}</div>
                              <Button variant={roomType === r.type ? "default" : "outline"} size="sm" onClick={() => setRoomType(r.type)}>
                                {roomType === r.type ? "Selected" : "Show price"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {availableRooms.length === 0 && (
                        <div className="p-4 text-sm text-muted-foreground">No rooms found for this hotel</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Guest Reviews</h2>
                    <div className="space-y-4">
                      {(reviewsQuery.data?.reviews || []).map((r) => (
                        <div key={r.id} className="p-6 rounded-lg bg-card border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div>
                                <p className="font-semibold">
                                  {r.user?.fullName ||
                                    `${r.user?.firstName || ""} ${r.user?.lastName || ""}`.trim() ||
                                    r.user?.email ||
                                    `Guest #${r.userId}`}
                                </p>
                                <p className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 text-accent">
                              <Star className="h-4 w-4 fill-current" />
                              <span className="font-bold">{r.rating.toFixed(1)}</span>
                            </div>
                          </div>
                          <p className="text-muted-foreground break-all">{r.comment}</p>
                          {r.response && (
                            <div className="mt-3 p-3 rounded bg-muted">
                              <div className="text-xs text-muted-foreground mb-1">Owner Response</div>
                              <div className="text-sm break-all">{r.response}</div>
                            </div>
                          )}
                        </div>
                      ))}
                      {(!reviewsQuery.data?.reviews || reviewsQuery.data.reviews.length === 0) && (
                        <div className="text-sm text-muted-foreground">No reviews yet</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <h2 className="text-2xl font-bold mb-4">Owner Contact</h2>
                    <div className="rounded-2xl p-6 bg-gradient-to-br from-white via-blue-50 to-cyan-100 shadow-2xl border-0">
                      <div className="text-sm mb-1">{hotel?.name}</div>
                      <div className="text-sm">Email: {finalContact.email || '-'}</div>
                      <div className="text-sm">Phone 1: {finalContact.phone1 || '-'}</div>
                      <div className="text-sm">Phone 2: {finalContact.phone2 || '-'}</div>
                      <div className="text-sm">Owner: {finalContact.ownerName || '-'}</div>
                    </div>
                  </div>
                </div>

                

                {/* Booking card */}
                <div className="lg:col-span-1">
                  <div className="sticky top-24 p-6 rounded-2xl bg-gradient-to-br from-white via-purple-50 to-pink-50 shadow-2xl border-0">
                    <div className="mb-6">
                      <div className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">₹{price}</div>
                      <p className="text-muted-foreground">per 24h</p>
                    </div>

                    <div className="rounded-lg border p-3 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Rates for {checkIn}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">Auto</Badge>
                        </div>
                      </div>

                      {couponsQ.isLoading && <div className="text-xs text-muted-foreground mt-2">Checking coupons…</div>}
                      {couponsQ.isError && <div className="text-xs text-muted-foreground mt-2">Failed to load coupons</div>}
                      {!couponsQ.isLoading && !couponsQ.isError && (
                        <div className="mt-3 space-y-2">
                          <div className="grid grid-cols-3 items-center gap-2 rounded border px-3 py-2 bg-card">
                            <div className="text-sm">Base</div>
                            <div className="text-sm">₹{price}</div>
                            <div></div>
                          </div>
                          <div className={`grid grid-cols-3 items-center gap-2 rounded border px-3 py-2 ${weekendExtra>0 ? 'bg-secondary' : 'bg-card'}`}>
                            <div className="text-sm">Weekend</div>
                            <div className="text-sm">₹{weekendExtra}</div>
                            <div></div>
                          </div>
                          <div className={`grid grid-cols-3 items-center gap-2 rounded border px-3 py-2 ${seasonalExtra>0 ? 'bg-secondary' : 'bg-card'}`}>
                            <div className="text-sm">Seasonal</div>
                            <div className="text-sm">₹{seasonalExtra}</div>
                            <div></div>
                          </div>
                          <div className={`grid grid-cols-3 items-center gap-2 rounded border px-3 py-2 ${specialExtra>0 ? 'bg-secondary' : 'bg-card'}`}>
                            <div className="text-sm">Special Day</div>
                            <div className="text-sm">₹{specialExtra}</div>
                            <div></div>
                          </div>
                          <div className="mt-4 text-xs text-muted-foreground">Coupons</div>
                          {(couponsQ.data?.coupons || []).length ? (
                            <div className="space-y-2">
                              {(couponsQ.data?.coupons || []).map((c) => (
                                <div key={c.id} className="grid grid-cols-3 items-center gap-2 rounded border px-3 py-2 bg-card">
                                  <div className="text-sm">{c.code}</div>
                                  <div className="text-sm">{c.discount}%</div>
                                  <div className="text-right">
                                    <Button size="sm" variant={appliedCoupon?.id === c.id ? "default" : "outline"} onClick={() => setAppliedCoupon(appliedCoupon?.id === c.id ? null : c)}>
                                      {appliedCoupon?.id === c.id ? "Remove" : "Apply"}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No coupons</div>
                          )}
                        </div>
                      )}

                      {/* manual rate toggles removed; rates apply automatically */}
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
                          min={checkIn === todayIso ? hmIST(new Date()) : undefined}
                          onChange={(e) => setCheckInTime(e.target.value)}
                        />
                        {(() => { const nowHM = hmIST(new Date()); const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return (h || 0) * 60 + (m || 0) }; const invalid = checkIn === todayIso && toMin(checkInTime) < toMin(nowHM); return invalid ? (<div className="text-xs text-destructive mt-1">Check-in time must be later than now</div>) : null })()}
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
                          min={checkOut === checkIn && checkInTime ? (()=>{ const [h,m] = checkInTime.split(':').map(Number); const mins=(h||0)*60+(m||0)+1; const hh=String(Math.floor(mins/60)).padStart(2,'0'); const mm=String(mins%60).padStart(2,'0'); return `${hh}:${mm}` })() : undefined}
                          onChange={(e) => setCheckOutTime(e.target.value)}
                        />
                        {(() => { const toMin = (s: string) => { const [h,m]=s.split(':').map(Number); return (h||0)*60+(m||0) }; const invalid = checkOut === checkIn && toMin(checkOutTime) <= toMin(checkInTime); return invalid ? (<div className="text-xs text-destructive mt-1">Check-out must be at least 1 minute after check-in</div>) : null })()}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Selected Room</label>
                        <div className="w-full px-4 py-2 rounded-lg border bg-background text-sm">
                          {selectedRoom ? `${selectedRoom.type} • ₹${selectedRoom.price} (${Number(selectedRoom?.available || 0)}/${Number(selectedRoom?.total || 0)} left)` : 'Tap a room above to select'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Guests</label>
                        <select
                          className="w-full px-4 py-2 rounded-lg border bg-background"
                          value={guests}
                          onChange={(e) => setGuests(Number(e.target.value))}
                        >
                          {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n} {n===1? 'Guest':'Guests'}</option>
                          ))}
                        </select>
                        <div className="text-xs text-muted-foreground mt-1">Max {maxGuests} guests for {selectedRoom?.type || 'room'}.</div>
                      </div>
                    </div>

                    <Button
                      className="w-full h-12 mb-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                      disabled={reserve.isPending || !hasDateTime || Number(selectedRoom?.available || 0) === 0 || guests > maxGuests}
                      onClick={() => {
                        if (!isAuthed) {
                          toast({ title: "Sign in required", description: "Please sign in to book a room" })
                          try { localStorage.setItem('postLoginRedirect', `/hotel/${id}`) } catch (_e) { void 0 }
                          navigate('/signin')
                          return
                        }
                        const nowHM = hmIST(new Date());
                        const toMin = (s: string) => {
                          const [h, m] = s.split(":").map(Number);
                          return (h || 0) * 60 + (m || 0);
                        };
                        let ciTime = checkInTime;
                        if (checkIn === todayIso) {
                          if (toMin(ciTime) < toMin(nowHM)) ciTime = nowHM.toString();
                        }
                        const ciStr = `${checkIn}T${ciTime}:00+05:30`;
                        const coStr = `${checkOut}T${checkOutTime}:00+05:30`;
                        setPaid(false);
                        setPaymentMethod("");
                        setUpiId("");
                        setOpen(true);
                        reserve.mutate({
                          userId: auth?.user?.id || 0,
                          hotelId: Number(id),
                          checkIn: ciStr,
                          checkOut: coStr,
                          guests,
                          roomType,
                          couponCode: appliedCoupon?.code || undefined,
                        });
                      }}
                    >
                      {reserve.isPending ? "Reserving…" : "Reserve Now"}
                    </Button>
                    {Number(selectedRoom?.available || 0) === 0 && (
                      <div className="text-sm text-muted-foreground mb-4">Selected room type is unavailable for the chosen date.</div>
                    )}
                    {reserve.isError && <div className="text-red-600 text-sm">Reservation failed</div>}

                      <div className="space-y-2 pt-4 border-t">
                        <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">₹{price} × {stayDays} days</span>
                        <span className="font-medium">₹{baseAmount}</span>
                        </div>
                        {extraHours > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Extra hours {extraHours}h</span>
                            <span className="font-medium">₹{extraAmount}</span>
                          </div>
                        )}
                      {/* manual rate discount removed; additive pricing applied above */}
                        {appliedCoupon?.discount ? (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Coupon {appliedCoupon.code} ({appliedCoupon.discount}%)</span>
                            <span className="font-medium">-₹{discountAmount}</span>
                          </div>
                        ) : null}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total</span>
                        <span>₹{grandTotal}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Payment / Confirmation Dialog */}
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setPaymentMethod("");
                setUpiId("");
                setPaid(false);
              }
            }}
          >
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {reserve.isPending
                    ? "Processing reservation"
                    : reserve.isSuccess
                    ? "Reservation successful"
                    : reserve.isError
                    ? "Reservation failed"
                    : "Reserve"}
                </DialogTitle>
                <DialogDescription>
                  {reserve.isSuccess
                    ? "Choose a payment method to complete your booking."
                    : reserve.isPending
                    ? "Please wait while we reserve your room."
                    : reserve.isError
                    ? "Please try again."
                    : ""}
                </DialogDescription>
              </DialogHeader>

              {reserve.isSuccess && !paid && (
                <div className="space-y-4">
                  <div className="p-3 rounded bg-muted text-sm">Room reserved: {reserve.data?.roomNumber || ('#'+(reserve.data?.roomId||''))}</div>

                  <div className="space-y-2">
                    <Label>Payment method</Label>
                    <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "upi" | "cod")}>
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

                  {paymentMethod === "upi" && (
                    <div className="space-y-2">
                      <Label htmlFor="upi-id">UPI ID</Label>
                      <Input id="upi-id" placeholder="name@bank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                    </div>
                  )}

                  {invoice.data?.invoice && (
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">₹{invoice.data.invoice.subtotal}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax ({invoice.data.invoice.taxRate}%)</span>
                        <span className="font-medium">₹{invoice.data.invoice.tax}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>₹{invoice.data.invoice.total}</span>
                      </div>
                    </div>
                  )}

                  {receiptUrl && (
                    <div className="space-y-2 border-t pt-3">
                      <div className="text-sm font-medium">Receipt</div>
                      <img src={receiptUrl} alt="Receipt" className="w-full max-w-[540px] border rounded" />
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { const a = document.createElement('a'); a.href = receiptUrl; a.download = `receipt-${reserve.data?.id}.png`; a.click(); }}>Download</Button>
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    <Button variant="secondary" onClick={() => setOpen(false)}>
                      Close
                    </Button>
                    <Button
                      disabled={
                        paymentMethod === "" ||
                        (paymentMethod === "upi" && !upiId)
                      }
                      onClick={() => {
                        const bid = reserve.data?.id;
                        if (bid) confirm.mutate(bid);
                      }}
                    >
                      Pay Now
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {reserve.isSuccess && paid && (
                <div className="space-y-4">
                  <div className="text-green-600 font-medium">Payment confirmed</div>
                  <div className="text-sm text-muted-foreground">Booking completed. Thank you!</div>
                  {receiptUrl && (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { const a = document.createElement('a'); a.href = receiptUrl; a.download = `receipt-${reserve.data?.id}.png`; a.click(); }}>Download Image</Button>
                      <Button variant="secondary" onClick={() => { const w = window.open('', '_blank'); if (!w) return; const html = `<!doctype html><html><head><title>Receipt #${reserve.data?.id}</title><style>body{font-family:Arial,sans-serif;padding:24px;} .img{max-width:720px;border:1px solid #ddd;border-radius:8px}</style></head><body><h2>Booking Receipt</h2><img class="img" src="${receiptUrl}"/><script>window.onload=()=>window.print();</script></body></html>`; w.document.write(html); w.document.close(); }}>Download PDF</Button>
                    </div>
                  )}
                  <DialogFooter>
                    <Button onClick={() => setOpen(false)}>Done</Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HotelDetail;
