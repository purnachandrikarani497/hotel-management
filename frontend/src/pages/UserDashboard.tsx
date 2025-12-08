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

type Booking = { id:number; hotelId:number; roomId?:number; roomNumber?:string; checkIn:string; checkOut:string; guests:number; total:number; status:string; createdAt:string; extraHours?: number; extraCharges?: number; cancellationFee?: number }

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
  const bookingsTimeFilteredVisible = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('deletedUserBookings') || '{}'
      const map = JSON.parse(raw) as { [id:number]: boolean }
      return bookingsTimeFiltered.filter(b => !map[b.id])
    } catch {
      return bookingsTimeFiltered
    }
  }, [bookingsTimeFiltered])
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
  const resolveImage = (src?: string) => { const s = String(src||''); if (!s) return 'https://placehold.co/160x120?text=Hotel'; const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>; let base = env?.VITE_API_URL || 'http://localhost:5000'; if (/localhost:\d+/i.test(base) && !/localhost:5000/i.test(base)) base = base.replace(/localhost:\d+/i, 'localhost:5000'); if (/^https?:\/\/localhost:\d+\/uploads\//i.test(s)) return s.replace(/localhost:\d+/i,'localhost:5000'); if (s.startsWith('/uploads')) return `${base}${s}`; if (s.startsWith('uploads')) return `${base}/${s}`; return s }
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

  const statusTextClass = (s: string): string => {
    const v = String(s || '').toLowerCase()
    if (v === 'checked_in' || v === 'checkin') return 'text-green-600'
    if (v === 'checked_out' || v === 'checkout') return 'text-teal-600'
    if (v === 'confirmed') return 'text-green-800'
    if (v === 'cancelled') return 'text-red-600'
    return 'text-muted-foreground'
  }

  const cancelBooking = useMutation<{ status:string }, unknown, { id:number; reason:string }, { prev?: { bookings: Booking[] } | undefined }>({
    mutationFn: (p:{ id:number; reason:string }) => apiPost(`/api/user/bookings/${p.id}/cancel`, { reason: p.reason }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["user","bookings",userId] })
      const prev = qc.getQueryData<{ bookings: Booking[] }>(["user","bookings",userId])
      qc.setQueryData(["user","bookings",userId], (data?: { bookings: Booking[] }) => {
        const list = data?.bookings || []
        const next = list.map(b => b.id === vars.id ? { ...b, status: 'cancelled' } : b)
        return { bookings: next }
      })
      setUserCancelVisible(prevVis => ({ ...prevVis, [vars.id]: false }))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["user","bookings",userId], ctx.prev)
      toast({ title: "Cancellation failed", variant: "destructive" })
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["user","bookings",userId] })
      toast({ title: "Booking cancelled", description: `#${vars.id}` })
      setUserCancelSel(prev => { const next = { ...prev }; delete next[vars.id]; return next })
      setUserCancelOther(prev => { const next = { ...prev }; delete next[vars.id]; return next })
    },
  })
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
  const [userCancelVisible, setUserCancelVisible] = React.useState<{ [id:number]: boolean }>({})
  

  

  

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-14 relative overflow-hidden">
          <div className="container">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">User Dashboard</h1>
              <p className="mt-3 text-lg opacity-90">Welcome to Sana Stayz — track your trips and manage bookings with ease.</p>
            </div>
          </div>
        </section>
        <div className="container mt-8 grid gap-6 sm:gap-8 lg:grid-cols-5 md:grid-cols-2 sm:grid-cols-1">
          {(() => {
            const now = new Date()
            const totalBookings = bookings.length
            const upcomingBookings = bookings.filter(b => {
              const d = new Date(b.checkIn)
              return ["pending","confirmed"].includes(String(b.status||'').toLowerCase()) && d >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
            }).length
            const pendingBookings = bookings.filter(b => String(b.status||'').toLowerCase()==='pending').length
            const totalSpend = bookings
              .filter(b => {
                const s = String(b.status||'').toLowerCase()
                return s === 'checked_out' || s === 'checkout'
              })
              .reduce((sum, b) => sum + Number(b.total||0), 0)
            const accountStatus = 'Active'
            return (
              <>
              <Card className="group shadow-2xl hover:shadow-purple-500/30 bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm">
                <CardHeader className="pb-3 text-center"><CardTitle className="text-sm font-bold text-purple-700 uppercase tracking-wider">Total Bookings</CardTitle></CardHeader>
                <CardContent className="pt-0 text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg mb-2">{totalBookings}</div>
                  <div className="text-xs text-purple-600 opacity-70 uppercase tracking-wide">Reservations</div>
                </CardContent>
              </Card>

              <Card className="group shadow-2xl hover:shadow-cyan-500/30 bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm">
                <CardHeader className="pb-3 text-center"><CardTitle className="text-sm font-bold text-cyan-700 uppercase tracking-wider">Upcoming</CardTitle></CardHeader>
                <CardContent className="pt-0 text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent drop-shadow-lg mb-2">{upcomingBookings}</div>
                  <div className="text-xs text-cyan-600 opacity-70 uppercase tracking-wide">Trips</div>
                </CardContent>
              </Card>

              <Card className="group shadow-2xl hover:shadow-green-500/30 bg-gradient-to-br from-white via-green-50 to-emerald-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm">
                <CardHeader className="pb-3 text-center"><CardTitle className="text-sm font-bold text-green-700 uppercase tracking-wider">Total Spend</CardTitle></CardHeader>
                <CardContent className="pt-0 text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent drop-shadow-lg mb-2">₹{totalSpend}</div>
                  <div className="text-xs text-green-600 opacity-70 uppercase tracking-wide">Payments</div>
                </CardContent>
              </Card>

              <Card className="group shadow-2xl hover:shadow-orange-500/30 bg-gradient-to-br from-white via-orange-50 to-yellow-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm">
                <CardHeader className="pb-3 text-center"><CardTitle className="text-sm font-bold text-orange-700 uppercase tracking-wider">Pending</CardTitle></CardHeader>
                <CardContent className="pt-0 text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent drop-shadow-lg mb-2">{pendingBookings}</div>
                  <div className="text-xs text-orange-600 opacity-70 uppercase tracking-wide">Awaiting</div>
                </CardContent>
              </Card>

              <Card className="group shadow-2xl hover:shadow-red-500/30 bg-gradient-to-br from-white via-red-50 to-rose-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm min-w-0">
                <CardHeader className="pb-2 text-center"><CardTitle className="text-sm font-bold text-red-700 uppercase tracking-wider">Status</CardTitle></CardHeader>
                <CardContent className="pt-0 pb-3 text-center px-2">
                  <div className="text-2xl md:text-3xl font-black bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent drop-shadow-lg mb-1 capitalize break-words leading-tight">{accountStatus}</div>
                  <div className="text-xs text-red-600 opacity-80 uppercase font-semibold leading-relaxed">Account</div>
                </CardContent>
              </Card>
              </>
            )
          })()}
        </div>
        <div className="container py-8 space-y-8">

        <Card className="group shadow-2xl hover:shadow-cyan-500/30 bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0 hover:scale-[1.01] transition-all duration-500 ease-out backdrop-blur-sm">
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
                <Button variant="destructive" onClick={() => { try { const raw = localStorage.getItem('deletedUserBookings') || '{}'; const map = JSON.parse(raw) as { [id:number]: boolean }; bookingsTimeFiltered.forEach(b => { map[b.id] = true }); localStorage.setItem('deletedUserBookings', JSON.stringify(map)); toast({ title: 'Deleted from view', description: `${bookingsTimeFiltered.length} item(s)` }) } catch { toast({ title: 'Delete failed', variant: 'destructive' }) } }}>Delete</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl bg-white/80 border-0 shadow-md overflow-x-auto backdrop-blur-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">S.No</th><th className="p-3">Booking</th><th className="p-3">Hotel</th><th className="p-3">Room</th><th className="p-3">Dates</th><th className="p-3">Guests</th><th className="p-3">Extra Time</th><th className="p-3">Extra Charges</th><th className="p-3">Cancellation Fee</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3 min-w-[300px]">Actions</th></tr></thead>
                <tbody className="[&_tr:hover]:bg-muted/30">
                  {(() => {
                    const ordered = [...bookingsTimeFiltered].sort((a,b)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime())
                    return ordered.filter(b => {
                      try { const raw = localStorage.getItem('deletedUserBookings') || '{}'; const map = JSON.parse(raw) as { [id:number]: boolean }; return !map[b.id] } catch { return true }
                    }).map((b, idx) => (
                      <tr key={b.id} className="border-t">
                        <td className="p-3">{idx + 1}</td>
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
                        <td className="p-3">{b.roomNumber ? b.roomNumber : (b.roomId ? `#${b.roomId}` : '-')}</td>
                        <td className="p-3">{b.checkIn} → {b.checkOut}</td>
                        <td className="p-3">{b.guests}</td>
                        <td className="p-3">{Number(b.extraHours||0) > 0 ? `${Number(b.extraHours||0)}h` : '-'}</td>
                        <td className="p-3">{Number(b.extraCharges||0) > 0 ? `₹${Number(b.extraCharges||0)}` : '-'}</td>
                        <td className="p-3">{String(b.status).toLowerCase()==='cancelled' && Number(b.cancellationFee||0) > 0 ? `₹${Number(b.cancellationFee||0)}` : '-'}</td>
                        <td className="p-3">₹{b.total}</td>
                        <td className="p-3"><span className={`text-xs font-semibold ${statusTextClass(String(b.status||''))}`}>{b.status}</span></td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(['pending','confirmed'].includes(String(b.status||''))) && (
                              <Button size="sm" variant="outline" className="shrink-0" onClick={() => setUserCancelVisible({ ...userCancelVisible, [b.id]: !(userCancelVisible[b.id] || false) })}>Cancel</Button>
                            )}
                            {userCancelVisible[b.id] ? (
                              <>
                                <select className="px-2 py-1 rounded border text-sm min-w-40" value={userCancelSel[b.id] || ''} onChange={(e)=> setUserCancelSel({ ...userCancelSel, [b.id]: e.target.value })}>
                                  <option value="">Select reason</option>
                                  {userCancelOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                                </select>
                                {(userCancelSel[b.id] === 'Other') && (
                                  <Input className="w-48" placeholder="Please specify" value={userCancelOther[b.id] || ''} onChange={(e)=> setUserCancelOther({ ...userCancelOther, [b.id]: e.target.value })} />
                                )}
                                {(() => { const chosen = userCancelSel[b.id] || ''; const extra = chosen === 'Other' ? (userCancelOther[b.id] || '') : ''; const reason = `${chosen}${extra ? (': ' + extra) : ''}`.trim(); return (<Button size="sm" variant="destructive" className="shrink-0" disabled={cancelBooking.isPending} onClick={()=> cancelBooking.mutate({ id: b.id, reason })}>Confirm</Button>) })()}
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  })()}
                  {bookings.length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={12}>No bookings found</td></tr>}
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
