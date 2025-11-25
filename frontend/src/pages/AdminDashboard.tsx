import * as React from "react"
import { useParams } from "react-router-dom"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Shield, BarChart3, Building2 } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import AdminOverview from "@/components/admin/AdminOverview"

type Stats = { totalHotels: number; totalBookings: number; totalRevenue: number; monthlySales: Record<string, number>; cityGrowth: Record<string, number> }
type User = { id: number; email: string; role: "admin"|"user"|"owner"; isApproved?: boolean; blocked?: boolean; createdAt?: string }
type Hotel = { id: number; name: string; location: string; ownerId?: number|null; status?: "approved"|"rejected"|"suspended"|"pending"; featured?: boolean; price?: number; createdAt?: string }
type Booking = { id: number; hotelId: number; checkIn: string; checkOut: string; guests: number; total: number; status: string; refundIssued: boolean; hotel?: Hotel; createdAt?: string }
type Coupon = { id: number; code: string; discount: number; expiry: string|null; usageLimit: number; used: number; enabled: boolean }
type Settings = { taxRate: number; commissionRate: number }

const AdminDashboard = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { feature } = useParams<{ feature?: string }>()
  const abKey = "addedByDashboard"
  type AddedStore = { hotels?: number[]; rooms?: number[]; reviews?: number[]; coupons?: number[]; wishlist?: number[]; bookings?: number[] }
  const readAB = (): AddedStore => {
    try { return JSON.parse(localStorage.getItem(abKey) || "{}") as AddedStore } catch { return {} }
  }
  const writeAB = (obj: AddedStore) => { try { localStorage.setItem(abKey, JSON.stringify(obj)); return true } catch (e) { return false } }
  const addId = (type: keyof AddedStore, id: number) => { const cur = readAB(); const list = new Set(cur[type] || []); list.add(id); cur[type] = Array.from(list); writeAB(cur) }
  const getSet = (type: keyof AddedStore) => new Set<number>((readAB()[type] || []) as number[])

  const stats = useQuery({ queryKey: ["admin","stats"], queryFn: () => apiGet<{ totalHotels: number; totalBookings: number; totalRevenue: number; monthlySales: Record<string, number>; cityGrowth: Record<string, number> }>("/api/admin/stats") })
  const users = useQuery({ queryKey: ["admin","users"], queryFn: () => apiGet<{ users: User[] }>("/api/admin/users") })
  const hotels = useQuery({ queryKey: ["admin","hotels"], queryFn: () => apiGet<{ hotels: Hotel[] }>("/api/admin/hotels") })
  const bookings = useQuery({ queryKey: ["admin","bookings"], queryFn: () => apiGet<{ bookings: Booking[] }>("/api/admin/bookings"), refetchOnWindowFocus: true, refetchInterval: 5000 })
  const coupons = useQuery({ queryKey: ["admin","coupons"], queryFn: () => apiGet<{ coupons: Coupon[] }>("/api/admin/coupons") })
  const settings = useQuery({ queryKey: ["admin","settings"], queryFn: () => apiGet<{ settings: Settings }>("/api/admin/settings") })
  const inbox = useQuery({ queryKey: ["admin","support"], queryFn: () => apiGet<{ inbox: { id:number; email:string; subject:string; message:string; createdAt:string }[] }>("/api/admin/support") })

  const hasDashboardData = ((hotels.data?.hotels || []).length > 0)
    || ((coupons.data?.coupons || []).length > 0)
    || ((bookings.data?.bookings || []).length > 0)

  const blockUser = useMutation({ mutationFn: (p: { id:number; blocked:boolean }) => apiPost("/api/admin/users/"+p.id+"/block", { blocked: p.blocked }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin","users"] }) })
  const setHotelStatus = useMutation({ mutationFn: (p: { id:number; status:Hotel["status"] }) => apiPost("/api/admin/hotels/"+p.id+"/status", { status: p.status }), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["admin","hotels"] }); toast({ title: "Hotel status updated", description: `#${vars.id} → ${vars.status}` }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })
  const setHotelFeatured = useMutation({ mutationFn: (p: { id:number; featured:boolean }) => apiPost("/api/admin/hotels/"+p.id+"/feature", { featured: p.featured }), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["admin","hotels"] }); toast({ title: vars.featured ? "Featured" : "Unfeatured", description: `#${vars.id}` }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })
  
  const deleteHotelOwner = useMutation({ mutationFn: (id:number) => apiDelete(`/api/owner/hotels/${id}`), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["admin","hotels"] }); toast({ title: "Hotel deleted", description: `#${vars}` }) }, onError: () => toast({ title: "Delete failed", variant: "destructive" }) })
  const createCoupon = useMutation({ mutationFn: (p: { code:string; discount:number; expiry:string; usageLimit:number; enabled:boolean }) => apiPost<{ id:number }, { code:string; discount:number; expiry:string; usageLimit:number; enabled:boolean }>("/api/admin/coupons", p), onSuccess: (res, vars) => { if (res?.id) addId("coupons", res.id); qc.invalidateQueries({ queryKey: ["admin","coupons"] }); toast({ title: "Coupon created", description: vars.code }) }, onError: () => toast({ title: "Create failed", variant: "destructive" }) })
  const setCouponStatus = useMutation({ mutationFn: (p: { id:number; enabled:boolean }) => apiPost("/api/admin/coupons/"+p.id+"/status", { enabled: p.enabled }), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["admin","coupons"] }); toast({ title: vars.enabled ? "Enabled" : "Disabled", description: `#${vars.id}` }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })
  const updateSettings = useMutation({ mutationFn: (p: Partial<Settings>) => apiPost("/api/admin/settings", p), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin","settings"] }); toast({ title: "Settings updated" }) }, onError: () => toast({ title: "Save failed", variant: "destructive" }) })
  const createOwner = useMutation({
    mutationFn: (p: { email:string; password:string; firstName:string; lastName:string; phone:string }) =>
      apiPost<{ id:number }, { email:string; password:string; firstName:string; lastName:string; phone:string }>("/api/admin/owners", p),
    onSuccess: (_res, vars) => {
      toast({ title: "Owner created", description: vars.email })
      setOwnerForm({ email:"", password:"", firstName:"", lastName:"", phone:"" })
      qc.invalidateQueries({ queryKey: ["admin","users"] })
    },
    onError: (err: unknown) => {
      const msg = (err as Error)?.message || "Failed to create owner"
      toast({ title: "Create failed", description: msg.includes("409") ? "Email already exists" : msg, variant: "destructive" })
    }
  })

  const [couponForm, setCouponForm] = React.useState({ code:"", discount:0, expiry:"", usageLimit:0, enabled:true })
  const [usersPeriod, setUsersPeriod] = React.useState<'all'|'yearly'|'monthly'|'weekly'|'daily'>('all')
  const [hotelsPeriod, setHotelsPeriod] = React.useState<'all'|'yearly'|'monthly'|'weekly'|'daily'>('all')
  const [bookingsPeriod, setBookingsPeriod] = React.useState<'all'|'yearly'|'monthly'|'weekly'|'daily'>('all')
  
  const [taxInput, setTaxInput] = React.useState("")
  const [commInput, setCommInput] = React.useState("")
  const [ownerForm, setOwnerForm] = React.useState({ email:"", password:"", firstName:"", lastName:"", phone:"" })
  const [filterRole, setFilterRole] = React.useState<'all'|'user'|'owner'>('all')

  const periodStart = (p: 'all'|'yearly'|'monthly'|'weekly'|'daily') => {
    const now = new Date()
    if (p==='daily') return new Date(now.getTime() - 24*60*60*1000)
    if (p==='weekly') return new Date(now.getTime() - 7*24*60*60*1000)
    if (p==='monthly') return new Date(now.getTime() - 30*24*60*60*1000)
    if (p==='yearly') return new Date(now.getTime() - 365*24*60*60*1000)
    return null
  }
  const inPeriod = (p: 'all'|'yearly'|'monthly'|'weekly'|'daily', dt?: string) => {
    const start = periodStart(p)
    if (!start) return true
    if (!dt) return false
    const d = new Date(dt)
    return d >= start
  }
  const sortRecent = <T extends { createdAt?: string; id?: number }>(arr: T[]): T[] => {
    return [...arr].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (tb !== ta) return tb - ta
      return (Number(b.id) || 0) - (Number(a.id) || 0)
    })
  }
  type Row = Record<string, string | number | boolean | null | undefined>
  const downloadCsv = (name: string, rows: Row[]) => {
    if (!rows.length) return
    const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
    const escape = (v: string | number | boolean | null | undefined) => {
      if (v === null || v === undefined) return ''
      const s = String(v)
      const needs = s.includes(',') || s.includes('\n') || s.includes('"')
      return needs ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => escape(r[h])).join(','))).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name.endsWith('.csv') ? name : `${name}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {!feature && (
          <AdminOverview stats={stats.data} bookings={(bookings.data?.bookings || [])} />
        )}
        <div className="container py-8 space-y-8">

        {feature === 'users' && (
        <Card className="shadow-card hover:shadow-card-hover transition-all">
          <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Input type="email" placeholder="Owner Email" value={ownerForm.email} onChange={e=>setOwnerForm({ ...ownerForm, email: e.target.value })} />
              <Input placeholder="Password" type="password" value={ownerForm.password} onChange={e=>setOwnerForm({ ...ownerForm, password: e.target.value })} />
              <Input placeholder="First Name" value={ownerForm.firstName} onChange={e=>setOwnerForm({ ...ownerForm, firstName: e.target.value })} />
              <Input placeholder="Last Name" value={ownerForm.lastName} onChange={e=>setOwnerForm({ ...ownerForm, lastName: e.target.value })} />
              <Input placeholder="Phone" value={ownerForm.phone} onChange={e=>setOwnerForm({ ...ownerForm, phone: e.target.value })} />
              <Button onClick={() => { if (!ownerForm.email || !ownerForm.password) return; createOwner.mutate(ownerForm) }} disabled={createOwner.isPending || !ownerForm.email || !ownerForm.password}>{createOwner.isPending ? "Adding..." : "Add Hotel Owner"}</Button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-muted-foreground">Show</span>
              <select className="px-3 py-2 rounded border bg-background text-sm" value={filterRole} onChange={e=>setFilterRole(e.target.value as 'all'|'user'|'owner')}>
                <option value="all">All</option>
                <option value="user">Users</option>
                <option value="owner">Hotel Owners</option>
              </select>
              <select className="px-3 py-2 rounded border bg-background text-sm" value={usersPeriod} onChange={e=>setUsersPeriod(e.target.value as typeof usersPeriod)}>
                <option value="all">All</option>
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
              <Button variant="outline" onClick={()=>{
                const data = sortRecent((users.data?.users||[]).filter(u=> (filterRole==='all'?true:u.role===filterRole) && inPeriod(usersPeriod, u.createdAt)))
                const rows = data.map(u=>({ id:u.id, email:u.email, role:u.role, blocked:u.blocked, createdAt:u.createdAt }))
                downloadCsv(`users-${usersPeriod}`, rows)
              }}>Download</Button>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">S.No</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                <tbody className="[&_tr:hover]:bg-muted/30">
                  {sortRecent((users.data?.users || []).filter(u => (filterRole==='all' ? true : u.role===filterRole) && inPeriod(usersPeriod, u.createdAt))).map((u, idx) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-3">{idx+1}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3"><span className="inline-flex items-center px-2 py-1 rounded-full bg-secondary text-xs">{u.role}</span></td>
                      <td className="p-3"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${u.blocked ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>{u.blocked ? 'Blocked' : 'Active'}</span></td>
                      <td className="p-3 flex gap-2">
                        <Button variant={u.blocked ? 'outline' : 'destructive'} size="sm" onClick={() => blockUser.mutate({ id: u.id, blocked: !u.blocked })}>{u.blocked ? 'Unblock' : 'Block'}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        )}

        {feature === 'hotels' && (
        <Card className="shadow-card hover:shadow-card-hover transition-all">
          <CardHeader><CardTitle>Hotel Management</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <select className="px-3 py-2 rounded border bg-background text-sm" value={hotelsPeriod} onChange={e=>setHotelsPeriod(e.target.value as typeof hotelsPeriod)}>
                <option value="all">All</option>
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
              <Button variant="outline" onClick={()=>{
                const data = sortRecent((hotels.data?.hotels||[]).filter(h=> inPeriod(hotelsPeriod, h.createdAt as string | undefined)))
                const rows = data.map(h=>({ id:h.id, name:h.name, location:h.location, status:h.status, featured:h.featured, createdAt:h.createdAt }))
                downloadCsv(`hotels-${hotelsPeriod}`, rows)
              }}>Download</Button>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">S.No</th><th className="p-3">Name</th><th className="p-3">Location</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                <tbody className="[&_tr:hover]:bg-muted/30">
                  {sortRecent((hotels.data?.hotels || []).filter(h=> inPeriod(hotelsPeriod, h.createdAt as string | undefined))).map((h, idx) => (
                    <tr key={h.id} className="border-t">
                      <td className="p-3">{idx+1}</td>
                      <td className="p-3">{h.name}</td>
                      <td className="p-3">{h.location}</td>
                      <td className="p-3"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${h.status === 'approved' ? 'bg-primary/15 text-primary' : h.status === 'rejected' ? 'bg-destructive/15 text-destructive' : h.status === 'suspended' ? 'bg-accent/15 text-foreground' : 'bg-muted text-foreground'}`}>{h.status}</span></td>
                      <td className="p-3 flex gap-2 flex-wrap">
                        <Button size="sm" variant={h.status === 'suspended' ? 'outline' : 'destructive'} onClick={() => setHotelStatus.mutate({ id: h.id, status: h.status === 'suspended' ? 'approved' : 'suspended' })}>{h.status === 'suspended' ? 'Unblock' : 'Block'}</Button>
                        <Button size="sm" variant="outline" onClick={() => setHotelFeatured.mutate({ id: h.id, featured: !h.featured })}>{h.featured ? 'Unfeature' : 'Feature'}</Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (window.confirm(`Delete hotel #${h.id}? This will remove bookings and reviews.`)) deleteHotelOwner.mutate(h.id) }}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        )}

        {feature === 'bookings' && (
        <Card className="shadow-card hover:shadow-card-hover transition-all">
          <CardHeader><CardTitle>Booking Management</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <select className="px-3 py-2 rounded border bg-background text-sm" value={bookingsPeriod} onChange={e=>setBookingsPeriod(e.target.value as typeof bookingsPeriod)}>
                <option value="all">All</option>
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
              <Button variant="outline" onClick={()=>{
                const src = bookings.data?.bookings || []
                const data = sortRecent(src.filter(b=> inPeriod(bookingsPeriod, b.createdAt as string | undefined)))
                const rows = data.map(b=>({ id:b.id, hotelId:b.hotelId, hotelName:b.hotel?.name, checkIn:b.checkIn, checkOut:b.checkOut, guests:b.guests, total:b.total, status:b.status, refundIssued:b.refundIssued, createdAt:b.createdAt }))
                downloadCsv(`bookings-${bookingsPeriod}`, rows)
              }}>Download</Button>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">S.No</th><th className="p-3">Hotel</th><th className="p-3">Dates</th><th className="p-3">Guests</th><th className="p-3">Total</th><th className="p-3">Status</th></tr></thead>
                <tbody className="[&_tr:hover]:bg-muted/30">
                  {(() => {
                    const hotelsArr = hotels.data?.hotels || []
                    const hmap: Record<number, Hotel> = {}
                    hotelsArr.forEach(h => { hmap[h.id] = h })
                    const src = bookings.data?.bookings || []
                    return sortRecent(src.filter(b=> inPeriod(bookingsPeriod, b.createdAt as string | undefined))).map((b, idx) => (
                    <tr key={b.id} className="border-t">
                      <td className="p-3">{idx+1}</td>
                      <td className="p-3">{b.hotel?.name || hmap[b.hotelId]?.name || `#${b.hotelId}`}</td>
                      <td className="p-3">{b.checkIn} → {b.checkOut}</td>
                      <td className="p-3">{b.guests}</td>
                      <td className="p-3">₹{b.total}</td>
                      <td className="p-3"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary">{b.status}{b.refundIssued ? ' • Refunded' : ''}</span></td>
                    </tr>
                  ))
                })()}
              </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        )}


        {feature === 'settings' && (
          <Card className="shadow-card hover:shadow-card-hover transition-all">
            <CardHeader><CardTitle>System Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Tax Rate %" value={taxInput || String(settings.data?.settings.taxRate ?? '')} onChange={e => setTaxInput(e.target.value)} />
                <Input placeholder="Commission %" value={commInput || String(settings.data?.settings.commissionRate ?? '')} onChange={e => setCommInput(e.target.value)} />
              </div>
              <Button onClick={() => updateSettings.mutate({ taxRate: Number(taxInput || settings.data?.settings.taxRate || 0), commissionRate: Number(commInput || settings.data?.settings.commissionRate || 0) })}>Save Settings</Button>
              <div>
                <h3 className="text-lg font-semibold mb-2">Support Inbox</h3>
                <div className="space-y-2">
                  {(inbox.data?.inbox || []).slice(0,5).map(i => (
                    <div key={i.id} className="p-3 rounded-lg border bg-card">
                      <div className="text-sm font-medium">{i.email} • {i.subject}</div>
                      <div className="text-sm text-muted-foreground">{i.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </main>
      <Footer />
    </div>
  )
}

export default AdminDashboard
