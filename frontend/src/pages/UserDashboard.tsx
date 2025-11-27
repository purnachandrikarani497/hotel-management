import * as React from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User } from "lucide-react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Booking = { id:number; hotelId:number; checkIn:string; checkOut:string; guests:number; total:number; status:string; createdAt:string }

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
  

  const bookingsAll = React.useMemo(() => bookingsQ.data?.bookings ?? [], [bookingsQ.data])
  
  const bookings = React.useMemo(() => bookingsAll, [bookingsAll])
  
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

  type HotelApi = { id:number; name:string; image:string; contactEmail?: string; contactPhone1?: string; contactPhone2?: string; ownerName?: string }
  const [hotelMap, setHotelMap] = React.useState<{ [id:number]: HotelApi }>({})
  const resolveImage = (src?: string) => { const s = String(src||''); if (!s) return 'https://placehold.co/160x120?text=Hotel'; const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>; const base = env?.VITE_API_URL || ''; if (s.startsWith('/uploads')) return `${base}${s}`; if (s.startsWith('uploads')) return `${base}/${s}`; return s }
  React.useEffect(() => {
    const ids = Array.from(new Set(bookings.map(b=>b.hotelId).filter(Boolean)))
    const need = ids.filter(id => !hotelMap[id])
    if (need.length===0) return
    Promise.all(need.map(id => apiGet<{ hotel: HotelApi }>(`/api/hotels/${id}`).catch(()=>({ hotel: { id, name: `Hotel ${id}`, image: '' } as HotelApi }))))
      .then((list: { hotel: HotelApi }[]) => {
        const next: { [id:number]: HotelApi } = { ...hotelMap }
        list.forEach(({ hotel }) => { next[hotel.id] = { id: hotel.id, name: hotel.name, image: hotel.image, contactEmail: hotel.contactEmail, contactPhone1: hotel.contactPhone1, contactPhone2: hotel.contactPhone2, ownerName: hotel.ownerName } })
        setHotelMap(next)
      })
      .catch(()=>{})
  }, [bookings, hotelMap])
  React.useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'hotelUpdated' && e.newValue) {
        try {
          const p = JSON.parse(e.newValue)
          const id = Number(p?.id || 0)
          if (!id) return
          apiGet<{ hotel: HotelApi }>(`/api/hotels/${id}`).then(({ hotel }) => {
            setHotelMap(prev => ({ ...prev, [id]: { id: hotel.id, name: hotel.name, image: hotel.image, contactEmail: hotel.contactEmail, contactPhone1: hotel.contactPhone1, contactPhone2: hotel.contactPhone2, ownerName: hotel.ownerName } }))
          }).catch(()=>{})
        } catch (_e) { void 0 }
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])
  const hotelInfo = (id:number) => hotelMap[id]

  type AdminUser = { id:number; email:string; firstName?:string; lastName?:string; role?:string; phone?:string }
  const adminsQ = useQuery({ queryKey: ["admin","users"], queryFn: () => apiGet<{ users: AdminUser[] }>(`/api/admin/users`), staleTime: 30_000 })
  const adminPrimary = React.useMemo(() => (adminsQ.data?.users || []).find(u => u.role === 'admin') || (adminsQ.data?.users || [])[0], [adminsQ.data])

  const cancelBooking = useMutation<{ status:string }, unknown, { id:number; reason:string }>({ mutationFn: (p:{ id:number; reason:string }) => apiPost(`/api/user/bookings/${p.id}/cancel`, { reason: p.reason }), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["user","bookings",userId] }); toast({ title: "Booking cancelled", description: `#${vars.id}` }) }, onError: () => toast({ title: "Cancellation failed", variant: "destructive" }) })
  const userCancelOptions = [
    "Change of Travel Plans",
    "Found a Better Price",
    "Health Issues / Illness",
    "Family Emergency",
    "Work/Business Schedule Change",
    "Flight Cancellation or Delay",
    "Visa/Travel Document Issues",
    "Weather Problems",
    "Financial Issues",
    "Hotel Location Not Suitable",
    "Booked Accidentally / Duplicate Booking",
    "Travel Companion Canceled",
    "Event/Conference Canceled",
    "Concern About Hotel Reviews / Safety",
    "Other"
  ]
  const [userCancelSel, setUserCancelSel] = React.useState<{ [id:number]: string }>({})
  const [userCancelOther, setUserCancelOther] = React.useState<{ [id:number]: string }>({})
  

  

  

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
                            <div className="flex items-center gap-2">
                              <select className="px-2 py-1 rounded border text-sm" value={userCancelSel[b.id] || ''} onChange={(e)=> setUserCancelSel({ ...userCancelSel, [b.id]: e.target.value })}>
                                <option value="">Select reason</option>
                                {userCancelOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                              </select>
                              {(userCancelSel[b.id] === 'Other') && (
                                <Input className="w-48" placeholder="Please specify" value={userCancelOther[b.id] || ''} onChange={(e)=> setUserCancelOther({ ...userCancelOther, [b.id]: e.target.value })} />
                              )}
                              {(() => { const chosen = userCancelSel[b.id] || ''; const extra = chosen === 'Other' ? (userCancelOther[b.id] || '') : ''; const reason = `${chosen}${extra ? (': ' + extra) : ''}`.trim(); const valid = !!chosen && reason.length >= 3; return (<Button size="sm" variant="destructive" disabled={!valid} onClick={()=> cancelBooking.mutate({ id: b.id, reason })}>Confirm</Button>) })()}
                            </div>
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

        
        
      </div>
      </main>
      <Footer />
    </div>
  )
}

export default UserDashboard
