import * as React from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Booking = { id:number; hotelId:number; checkIn:string; checkOut:string; guests:number; total:number; status:string; createdAt:string }
type Review = { id:number; hotelId:number; rating:number; comment:string; createdAt:string }

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
  

  const bookingsAll = React.useMemo(() => bookingsQ.data?.bookings ?? [], [bookingsQ.data])
  
  const bookings = React.useMemo(() => bookingsAll, [bookingsAll])
  const reviews = React.useMemo(() => reviewsQ.data?.reviews ?? [], [reviewsQ.data])
  
  const [dateFilterBookings, setDateFilterBookings] = React.useState<string>('all')
  const inRange = React.useCallback((iso?: string, kind: string = 'all') => {
    if (!iso || kind==='all') return true
    const d = new Date(iso)
    if (!(d instanceof Date) || isNaN(d.getTime())) return false
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (kind==='daily') {
      return d >= startOfDay && d < new Date(startOfDay.getTime() + 24*60*60*1000)
    }
    if (kind==='weekly') {
      return d >= new Date(now.getTime() - 7*24*60*60*1000)
    }
    if (kind==='monthly') {
      return d >= new Date(now.getTime() - 30*24*60*60*1000)
    }
    return true
  }, [])
  const bookingsTimeFiltered = React.useMemo(() => bookings.filter(b => inRange(b.checkIn || b.createdAt || '', dateFilterBookings)), [bookings, dateFilterBookings, inRange])
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
  const resolveImage = (src?: string) => { const s = String(src||''); if (!s) return 'https://placehold.co/160x120?text=Hotel'; const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>; const base = env?.VITE_API_URL || ''; if (s.startsWith('/uploads')) return `${base}${s}`; if (s.startsWith('uploads')) return `${base}/${s}`; return s }
  React.useEffect(() => {
    const ids = Array.from(new Set(bookings.map(b=>b.hotelId).filter(Boolean)))
    const need = ids.filter(id => !hotelMap[id])
    if (need.length===0) return
    Promise.all(need.map(id => apiGet<{ hotel: { id:number; name:string; image:string } }>(`/api/hotels/${id}`).catch(()=>({ hotel: { id, name: `Hotel ${id}`, image: '' } }))))
      .then(list => {
        const next = { ...hotelMap }
        list.forEach(({ hotel }) => { next[hotel.id] = { id: hotel.id, name: hotel.name, image: hotel.image } })
        setHotelMap(next)
      })
      .catch(()=>{})
  }, [bookings, hotelMap])
  const hotelInfo = (id:number) => hotelMap[id]

  const refHotelId = React.useMemo(()=>{
    const lastRev = [...reviews].sort((a,b)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime())[0]
    if (lastRev?.hotelId) return lastRev.hotelId
    const lastBook = [...bookings].sort((a,b)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime())[0]
    return Number(lastBook?.hotelId || 0) || 0
  }, [reviews, bookings])

  const contactQ = useQuery({ queryKey: ["hotel","contact", refHotelId], queryFn: () => apiGet<{ contact: { hotelName?: string; hotelEmail?: string; ownerName?: string; contact1?: string; contact2?: string }|null; owner?: { fullName?: string; email?: string; phone?: string } }>(`/api/hotels/${refHotelId}/contact`), enabled: !!refHotelId })

  const cancelBooking = useMutation({ mutationFn: (id:number) => apiPost(`/api/user/bookings/${id}/cancel`, {}), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["user","bookings",userId] }); toast({ title: "Booking cancelled", description: `#${vars}` }) }, onError: () => toast({ title: "Cancellation failed", variant: "destructive" }) })
  

  

  

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
            <div className="flex items-center gap-3">
              <p className="opacity-90">View and manage your bookings</p>
              <Link to="/dashboard/user/details" className="text-sm underline">User Details</Link>
            </div>
          </div>
        </section>
        <div className="container py-8 space-y-8">

        <Card className="shadow-card hover:shadow-card-hover transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bookings</CardTitle>
              <div className="flex items-center gap-2">
                {(() => {
                  const opts = [
                    { k:'all', v:'All time' },
                    { k:'daily', v:'Daily' },
                    { k:'weekly', v:'Weekly' },
                    { k:'monthly', v:'Monthly' },
                  ]
                  return (
                    <select className="px-2 py-1 rounded border bg-background text-sm" value={dateFilterBookings} onChange={e=>setDateFilterBookings(e.target.value)}>
                      {opts.map(o=> (<option key={o.k} value={o.k}>{o.v}</option>))}
                    </select>
                  )
                })()}
                <Button variant="outline" onClick={()=>{
                  const rows = bookingsTimeFiltered.map(b => [
                    `#${b.id}`,
                    String(b.hotelId||''),
                    String(b.checkIn||''),
                    String(b.checkOut||''),
                    String(b.guests||''),
                    String(b.total||''),
                    String(b.status||'')
                  ])
                  const header = ['Booking','Hotel','CheckIn','CheckOut','Guests','Total','Status']
                  const csv = [header].concat(rows).map(r => r.map(x => {
                    const s = String(x ?? '')
                    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"'+s.replace(/"/g,'""')+'"'
                    return s
                  }).join(',')).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `user-bookings-${dateFilterBookings}.csv`
                  a.click()
                  setTimeout(()=>URL.revokeObjectURL(url), 2000)
                }}>Download Excel</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Booking</th><th className="p-3">Hotel</th><th className="p-3">Dates</th><th className="p-3">Guests</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                <tbody className="[&_tr:hover]:bg-muted/30">
                  {(() => {
                    const ordered = [...bookingsTimeFiltered].sort((a,b)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime())
                    return ordered.map(b => (
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
                          {(['pending','confirmed'].includes(String(b.status||''))) && (
                            <Button size="sm" variant="destructive" onClick={() => cancelBooking.mutate(b.id)}>Cancel</Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => window.open(`/api/user/invoices/${b.id}`, '_blank')}>Invoice</Button>
                        </td>
                      </tr>
                    ))
                  })()}
                  {bookings.length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={7}>No bookings found</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-card-hover transition-all">
          <CardHeader>
            <CardTitle>Guest Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Hotel {r.hotelId} • {r.rating}/5</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{r.comment}</div>
                </div>
              ))}
              {reviews.length === 0 && (
                <div className="text-sm text-muted-foreground">No reviews yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        {refHotelId ? (
          <Card className="shadow-card hover:shadow-card-hover transition-all">
            <CardHeader>
              <CardTitle>Hotel Contact</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const c = contactQ.data?.contact || {}
                const owner = contactQ.data?.owner || {}
                const h = hotelInfo(refHotelId)
                const name = c.hotelName || h?.name || `Hotel ${refHotelId}`
                const email = c.hotelEmail || owner.email || ''
                const ownerName = c.ownerName || owner.fullName || ''
                const phone1 = c.contact1 || owner.phone || ''
                const phone2 = c.contact2 || ''
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Hotel Name</div>
                      <div className="text-sm font-medium">{name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Hotel Email</div>
                      <div className="text-sm font-medium">{email || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Owner Name</div>
                      <div className="text-sm font-medium">{ownerName || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Contact Numbers</div>
                      <div className="text-sm font-medium">{[phone1, phone2].filter(Boolean).join(', ') || '-'}</div>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        ) : null}

        
      </div>
      </main>
      <Footer />
    </div>
  )
}

export default UserDashboard
