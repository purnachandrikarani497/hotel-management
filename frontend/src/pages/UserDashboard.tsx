import * as React from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User, CalendarDays, Heart } from "lucide-react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Booking = { id:number; hotelId:number; checkIn:string; checkOut:string; guests:number; total:number; status:string; createdAt:string }
type Review = { id:number; hotelId:number; rating:number; comment:string; createdAt:string }
type WishlistItem = { userId:number; hotelId:number; createdAt:string }

const UserDashboard = () => {
  const raw = typeof window !== "undefined" ? localStorage.getItem("auth") : null
  const auth = raw ? JSON.parse(raw) as { user?: { id?: number } } : null
  const userId = auth?.user?.id || 0
  const qc = useQueryClient()
  const { toast } = useToast()
  const abKey = "addedByDashboard"
  type AddedStore = { hotels?: number[]; rooms?: number[]; reviews?: number[]; coupons?: number[]; wishlist?: number[]; bookings?: number[] }
  const readAB = React.useCallback((): AddedStore => { try { return JSON.parse(localStorage.getItem(abKey) || "{}") as AddedStore } catch { return {} } }, [])
  const writeAB = (obj: AddedStore) => { try { localStorage.setItem(abKey, JSON.stringify(obj)); return true } catch (e) { return false } }
  const addId = (type: keyof AddedStore, id: number) => { const cur = readAB(); const list = new Set(cur[type] || []); list.add(id); cur[type] = Array.from(list); writeAB(cur) }
  const getSet = React.useCallback((type: keyof AddedStore) => new Set<number>((readAB()[type] || []) as number[]), [readAB])

  const bookingsQ = useQuery({ queryKey: ["user","bookings",userId], queryFn: () => apiGet<{ bookings: Booking[] }>(`/api/user/bookings?userId=${userId}`), enabled: !!userId, refetchInterval: 8000 })
  const reviewsQ = useQuery({ queryKey: ["user","reviews",userId], queryFn: () => apiGet<{ reviews: Review[] }>(`/api/user/reviews?userId=${userId}`), enabled: !!userId })
  const wishlistQ = useQuery({ queryKey: ["user","wishlist",userId], queryFn: () => apiGet<{ wishlist: WishlistItem[] }>(`/api/user/wishlist?userId=${userId}`), enabled: !!userId })

  const bookingsAll = React.useMemo(() => bookingsQ.data?.bookings ?? [], [bookingsQ.data])
  const reviewsAll = React.useMemo(() => reviewsQ.data?.reviews ?? [], [reviewsQ.data])
  const wishlistAll = React.useMemo(() => wishlistQ.data?.wishlist ?? [], [wishlistQ.data])
  const bookings = React.useMemo(() => bookingsAll.filter(b => getSet("bookings").has(b.id)), [bookingsAll, getSet])
  const reviews = React.useMemo(() => reviewsAll.filter(r => getSet("reviews").has(r.id)), [reviewsAll, getSet])
  const wishlist = React.useMemo(() => wishlistAll.filter(w => getSet("wishlist").has(w.hotelId)), [wishlistAll, getSet])
  const statusPrevRef = React.useRef<{ [id:number]: string }>({})
  React.useEffect(() => {
    const list = bookingsQ.data?.bookings || []
    const prev = statusPrevRef.current
    list.forEach(b => {
      const cur = String(b.status || '')
      const prevStatus = prev[b.id]
      if (prevStatus && prevStatus !== cur) {
        if (cur === 'cancelled') {
          toast({ title: `Booking #${b.id} cancelled`, description: `Your reservation for hotel ${b.hotelId} was cancelled.` })
        } else if (cur === 'confirmed') {
          toast({ title: `Booking #${b.id} approved`, description: `Your reservation for hotel ${b.hotelId} was approved.` })
        }
      }
    })
    statusPrevRef.current = Object.fromEntries(list.map(b => [b.id, String(b.status || '')]))
  }, [bookingsQ.data, toast])

  const [hotelMap, setHotelMap] = React.useState<{ [id:number]: { id:number; name:string; image:string } }>({})
  const resolveImage = (src?: string) => { const s = String(src||''); if (!s) return 'https://placehold.co/160x120?text=Hotel'; if (s.startsWith('/uploads')) return `http://localhost:5000${s}`; if (s.startsWith('uploads')) return `http://localhost:5000/${s}`; return s }
  React.useEffect(() => {
    const ids = Array.from(new Set([
      ...bookings.map(b=>b.hotelId),
      ...wishlist.map(w=>w.hotelId),
      ...reviews.map(r=>r.hotelId)
    ].filter(Boolean)))
    const need = ids.filter(id => !hotelMap[id])
    if (need.length===0) return
    Promise.all(need.map(id => apiGet<{ hotel: { id:number; name:string; image:string } }>(`/api/hotels/${id}`).catch(()=>({ hotel: { id, name: `Hotel ${id}`, image: '' } }))))
      .then(list => {
        const next = { ...hotelMap }
        list.forEach(({ hotel }) => { next[hotel.id] = { id: hotel.id, name: hotel.name, image: hotel.image } })
        setHotelMap(next)
      })
      .catch(()=>{})
  }, [bookings, wishlist, reviews, hotelMap])
  const hotelInfo = (id:number) => hotelMap[id]

  const cancelBooking = useMutation({ mutationFn: (id:number) => apiPost(`/api/user/bookings/${id}/cancel`, {}), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["user","bookings",userId] }); toast({ title: "Booking cancelled", description: `#${vars}` }) }, onError: () => toast({ title: "Cancellation failed", variant: "destructive" }) })
  const addReview = useMutation({ mutationFn: (p:{ hotelId:number; rating:number; comment:string }) => apiPost<{ id:number }, { userId:number; hotelId:number; rating:number; comment:string }>(`/api/user/reviews`, { userId, ...p }), onSuccess: (res, vars) => { if (res?.id) addId("reviews", res.id); qc.invalidateQueries({ queryKey: ["user","reviews",userId] }); toast({ title: "Review added", description: `Hotel ${vars.hotelId} • ${vars.rating}/5` }) }, onError: () => toast({ title: "Add failed", variant: "destructive" }) })
  const updateReview = useMutation({ mutationFn: (p:{ id:number; rating?:number; comment?:string }) => apiPost(`/api/user/reviews/${p.id}`, p), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["user","reviews",userId] }); toast({ title: "Review updated", description: `#${vars.id}` }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })
  const deleteReview = useMutation({ mutationFn: (id:number) => apiDelete(`/api/user/reviews/${id}`), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["user","reviews",userId] }); toast({ title: "Review deleted", description: `#${vars}` }) }, onError: () => toast({ title: "Delete failed", variant: "destructive" }) })
  const addWishlist = useMutation({ mutationFn: (hotelId:number) => apiPost(`/api/user/wishlist`, { userId, hotelId }), onSuccess: (_res, vars) => { addId("wishlist", Number(wishlistAdd || 0)); qc.invalidateQueries({ queryKey: ["user","wishlist",userId] }); toast({ title: "Added to wishlist", description: `Hotel #${vars}` }) } })
  const removeWishlist = useMutation({ mutationFn: (hotelId:number) => apiDelete(`/api/user/wishlist/${hotelId}?userId=${userId}`), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["user","wishlist",userId] }); toast({ title: "Removed from wishlist", description: `Hotel #${vars}` }) } })

  const [reviewForm, setReviewForm] = React.useState({ hotelId: 0, rating: 5, comment: "" })
  const [wishlistAdd, setWishlistAdd] = React.useState(0)

  

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-hero-gradient text-primary-foreground py-10">
          <div className="container">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-8 w-8" />
              <h1 className="text-3xl md:text-4xl font-bold">User Dashboard</h1>
            </div>
            <p className="opacity-90">View and manage your bookings</p>
          </div>
        </section>
        <div className="container py-8 space-y-8">

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-card hover:shadow-card-hover transition-all">
            <CardHeader><CardTitle>Upcoming Bookings</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Booking</th><th className="p-3">Hotel</th><th className="p-3">Dates</th><th className="p-3">Guests</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                  <tbody className="[&_tr:hover]:bg-muted/30">
                    {bookings.filter(b => new Date(b.checkIn) >= new Date() && b.status !== 'cancelled').map(b => (
                      <tr key={b.id} className="border-t">
                        <td className="p-3">#{b.id}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <img src={resolveImage(hotelInfo(b.hotelId)?.image)} alt={hotelInfo(b.hotelId)?.name||`Hotel ${b.hotelId}`} className="h-10 w-10 rounded object-cover border" onError={(e)=>{ e.currentTarget.src='https://placehold.co/160x120?text=Hotel' }} />
                            <div className="flex flex-col">
                              <Link to={`/hotel/${b.hotelId}`} className="font-medium hover:underline">{hotelInfo(b.hotelId)?.name || `Hotel ${b.hotelId}`}</Link>
                              <span className="text-xs text-muted-foreground">#{b.hotelId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">{b.checkIn} → {b.checkOut}</td>
                        <td className="p-3">{b.guests}</td>
                      <td className="p-3">₹{b.total}</td>
                        <td className="p-3"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary">{b.status}</span></td>
                        <td className="p-3 flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => cancelBooking.mutate(b.id)}>Cancel</Button>
                          <Button size="sm" variant="outline" onClick={() => window.open(`/api/user/invoices/${b.id}`, '_blank')}>Invoice</Button>
                        </td>
                      </tr>
                    ))}
                    {bookings.filter(b => new Date(b.checkIn) >= new Date() && b.status !== 'cancelled').length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={7}>No upcoming bookings</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-card-hover transition-all">
            <CardHeader><CardTitle>Past Bookings</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Booking</th><th className="p-3">Hotel</th><th className="p-3">Dates</th><th className="p-3">Guests</th><th className="p-3">Total</th><th className="p-3">Status</th></tr></thead>
                  <tbody className="[&_tr:hover]:bg-muted/30">
                    {bookings.filter(b => new Date(b.checkOut) < new Date()).map(b => (
                      <tr key={b.id} className="border-t">
                        <td className="p-3">#{b.id}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <img src={resolveImage(hotelInfo(b.hotelId)?.image)} alt={hotelInfo(b.hotelId)?.name||`Hotel ${b.hotelId}`} className="h-10 w-10 rounded object-cover border" onError={(e)=>{ e.currentTarget.src='https://placehold.co/160x120?text=Hotel' }} />
                            <div className="flex flex-col">
                              <Link to={`/hotel/${b.hotelId}`} className="font-medium hover:underline">{hotelInfo(b.hotelId)?.name || `Hotel ${b.hotelId}`}</Link>
                              <span className="text-xs text-muted-foreground">#{b.hotelId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">{b.checkIn} → {b.checkOut}</td>
                        <td className="p-3">{b.guests}</td>
                        <td className="p-3">₹{b.total}</td>
                        <td className="p-3"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary">{b.status}</span></td>
                      </tr>
                    ))}
                    {bookings.filter(b => new Date(b.checkOut) < new Date()).length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={6}>No past bookings</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card hover:shadow-card-hover transition-all">
          <CardHeader><CardTitle>Reviews</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-5 gap-3">
              <Input type="number" placeholder="Hotel ID" value={reviewForm.hotelId} onChange={e=>setReviewForm({ ...reviewForm, hotelId: Number(e.target.value) })} />
              <Input type="number" placeholder="Rating 1-5" value={reviewForm.rating} onChange={e=>setReviewForm({ ...reviewForm, rating: Number(e.target.value) })} />
              <Input className="col-span-3" placeholder="Comment" value={reviewForm.comment} onChange={e=>setReviewForm({ ...reviewForm, comment: e.target.value })} />
            </div>
            <Button onClick={()=>addReview.mutate({ hotelId: reviewForm.hotelId, rating: reviewForm.rating, comment: reviewForm.comment })} disabled={!reviewForm.hotelId || !reviewForm.rating}>Add Review</Button>

            <div className="space-y-3 mt-4">
              {reviews.map(r => (
                <div key={r.id} className="border rounded-lg p-3 bg-card">
                  <div className="text-sm font-medium">Hotel {r.hotelId} • {r.rating}/5</div>
                  <div className="text-sm text-muted-foreground">{r.comment}</div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={()=>updateReview.mutate({ id:r.id, rating:r.rating })}>Update</Button>
                    <Button size="sm" variant="destructive" onClick={()=>deleteReview.mutate(r.id)}>Delete</Button>
                  </div>
                </div>
              ))}
              {reviews.length===0 && <div className="text-sm text-muted-foreground">No reviews</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-card-hover transition-all">
          <CardHeader><CardTitle>Wishlist</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input type="number" placeholder="Hotel ID" value={wishlistAdd} onChange={e=>setWishlistAdd(Number(e.target.value))} />
              <Button onClick={()=>addWishlist.mutate(wishlistAdd)} disabled={!wishlistAdd}>Add to Wishlist</Button>
            </div>
            <div className="rounded-lg border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Hotel</th><th className="p-3">Added</th><th className="p-3">Actions</th></tr></thead>
                <tbody className="[&_tr:hover]:bg-muted/30">
                  {wishlist.map(w => (
                    <tr key={`${w.userId}-${w.hotelId}`} className="border-t">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img src={resolveImage(hotelInfo(w.hotelId)?.image)} alt={hotelInfo(w.hotelId)?.name||`Hotel ${w.hotelId}`} className="h-10 w-10 rounded object-cover border" onError={(e)=>{ e.currentTarget.src='https://placehold.co/160x120?text=Hotel' }} />
                          <div className="flex flex-col">
                            <Link to={`/hotel/${w.hotelId}`} className="font-medium hover:underline">{hotelInfo(w.hotelId)?.name || `Hotel ${w.hotelId}`}</Link>
                            <span className="text-xs text-muted-foreground">#{w.hotelId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{new Date(w.createdAt).toLocaleString()}</td>
                      <td className="p-3"><Button size="sm" variant="destructive" onClick={()=>removeWishlist.mutate(w.hotelId)}>Remove</Button></td>
                    </tr>
                  ))}
                  {wishlist.length===0 && <tr><td className="p-3 text-muted-foreground" colSpan={3}>No items</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      </main>
      <Footer />
    </div>
  )
}

export default UserDashboard
