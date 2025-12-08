import * as React from "react"
import { useParams } from "react-router-dom"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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
type Settings = { taxRate: number; commissionRate: number; ourStory?: string; ourMission?: string; contactName?: string; contactEmail?: string; contactPhone1?: string; contactPhone2?: string; cities?: string[] }

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
  const deleteUser = useMutation({ mutationFn: (id:number) => apiDelete("/api/admin/users/"+id), onSuccess: (_res, id) => { toast({ title: "User deleted", description: `#${id}` }); qc.invalidateQueries({ queryKey: ["admin","users"] }) }, onError: () => toast({ title: "Delete failed", variant: "destructive" }) })
  const setHotelStatus = useMutation({ mutationFn: (p: { id:number; status:Hotel["status"] }) => apiPost("/api/admin/hotels/"+p.id+"/status", { status: p.status }), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["admin","hotels"] }); toast({ title: "Hotel status updated", description: `#${vars.id} → ${vars.status}` }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })
  const setHotelFeatured = useMutation({ mutationFn: (p: { id:number; featured:boolean }) => apiPost("/api/admin/hotels/"+p.id+"/feature", { featured: p.featured }), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["admin","hotels"] }); toast({ title: vars.featured ? "Featured" : "Unfeatured", description: `#${vars.id}` }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })
  
  const adminCancelBooking = useMutation({
    mutationFn: (id: number) => apiPost(`/api/admin/bookings/${id}/cancel`, {}),
    onSuccess: (_res, vars) => { toast({ title: "Booking cancelled", description: `#${vars}` }); qc.invalidateQueries({ queryKey: ["admin","bookings"] }) }
  })
  const ownerCheckinBooking = useMutation({
    mutationFn: (id: number) => apiPost(`/api/owner/bookings/${id}/checkin`, {}),
    onSuccess: (_res, vars) => { toast({ title: "Checked in", description: `Booking #${vars}` }); qc.invalidateQueries({ queryKey: ["admin","bookings"] }) }
  })
  const ownerCheckoutBooking = useMutation({
    mutationFn: (id: number) => apiPost(`/api/owner/bookings/${id}/checkout`, {}),
    onSuccess: (_res, vars) => { toast({ title: "Checked out", description: `Booking #${vars}` }); qc.invalidateQueries({ queryKey: ["admin","bookings"] }) }
  })

  const [deletingHotelId, setDeletingHotelId] = React.useState<number|null>(null)
  const deleteHotelOwner = useMutation({
    mutationFn: (id:number) => apiDelete(`/api/owner/hotels/${id}`),
    onMutate: async (id:number) => {
      setDeletingHotelId(id)
      await qc.cancelQueries({ queryKey: ["admin","hotels"] })
      const prev = qc.getQueryData<{ hotels: Hotel[] }>(["admin","hotels"]) || { hotels: [] }
      qc.setQueryData(["admin","hotels"], (data?: { hotels: Hotel[] }) => ({ hotels: (data?.hotels || []).filter(h => h.id !== id) }))
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin","hotels"], ctx.prev)
      toast({ title: "Delete failed", variant: "destructive" })
    },
    onSuccess: (_res, vars) => {
      toast({ title: "Hotel deleted", description: `#${vars}` })
    },
    onSettled: () => {
      setDeletingHotelId(null)
      qc.invalidateQueries({ queryKey: ["admin","hotels"] })
    }
  })
  const createCoupon = useMutation({ mutationFn: (p: { code:string; discount:number; expiry:string; usageLimit:number; enabled:boolean }) => apiPost<{ id:number }, { code:string; discount:number; expiry:string; usageLimit:number; enabled:boolean }>("/api/admin/coupons", p), onSuccess: (res, vars) => { if (res?.id) addId("coupons", res.id); qc.invalidateQueries({ queryKey: ["admin","coupons"] }); toast({ title: "Coupon created", description: vars.code }) }, onError: () => toast({ title: "Create failed", variant: "destructive" }) })
  const setCouponStatus = useMutation({ mutationFn: (p: { id:number; enabled:boolean }) => apiPost("/api/admin/coupons/"+p.id+"/status", { enabled: p.enabled }), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["admin","coupons"] }); toast({ title: vars.enabled ? "Enabled" : "Disabled", description: `#${vars.id}` }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })
  const updateSettings = useMutation({ mutationFn: (p: Partial<Settings>) => apiPost("/api/admin/settings", p), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin","settings"] }); qc.invalidateQueries({ queryKey: ["about"] }); toast({ title: "Settings updated" }) }, onError: () => toast({ title: "Save failed", variant: "destructive" }) })
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
  const [storyInput, setStoryInput] = React.useState("")
  const [missionInput, setMissionInput] = React.useState("")
  const [storyEditing, setStoryEditing] = React.useState(false)
  const [missionEditing, setMissionEditing] = React.useState(false)
  
  const [ownerForm, setOwnerForm] = React.useState({ email:"", password:"", firstName:"", lastName:"", phone:"" })
  const [filterRole, setFilterRole] = React.useState<'all'|'user'|'owner'>('all')
  const [contactName, setContactName] = React.useState("")
  const [contactPhone1, setContactPhone1] = React.useState("")
  const [contactPhone2, setContactPhone2] = React.useState("")
  const [contactEmail, setContactEmail] = React.useState("")
  const [contactEditing, setContactEditing] = React.useState(false)
  React.useEffect(() => {
    const s = settings.data?.settings
    if (s) {
      setContactName(s.contactName || '')
      setContactEmail(s.contactEmail || '')
      setContactPhone1(s.contactPhone1 || '')
      setContactPhone2(s.contactPhone2 || '')
    }
  }, [settings.data])

  React.useEffect(() => {
    const s = settings.data?.settings
    if (s) {
      setStoryInput(s.ourStory || "")
      setMissionInput(s.ourMission || "")
    }
  }, [settings.data])

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
        {feature && (
          <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-12">
            <div className="container">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-8 w-8" />
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{(() => { const f = String(feature||''); if (f==='users') return 'User Management'; if (f==='hotels') return 'Hotel Management'; if (f==='bookings') return 'Booking Management'; if (f==='settings') return 'About Us'; if (f==='contact') return 'Contact'; return 'Admin'; })()}</h1>
              </div>
              <p className="opacity-90">{(() => { const f = String(feature||''); if (f==='users') return 'Add owners, manage roles and statuses'; if (f==='hotels') return 'Approve, feature, or remove hotels'; if (f==='bookings') return 'Review bookings and update statuses'; if (f==='settings') return 'Edit platform story, mission and contact'; if (f==='contact') return 'Manage public contact information'; return 'Administration controls'; })()}</p>
            </div>
          </section>
        )}
        <div className="container py-8 space-y-8">

        {feature === 'users' && (
        <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0">
          <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Input type="email" placeholder="Owner Email" value={ownerForm.email} onChange={e=>setOwnerForm({ ...ownerForm, email: e.target.value })} />
              <Input placeholder="Password" type="password" value={ownerForm.password} onChange={e=>setOwnerForm({ ...ownerForm, password: e.target.value })} />
              <Input placeholder="First Name" value={ownerForm.firstName} onChange={e=>setOwnerForm({ ...ownerForm, firstName: e.target.value })} />
              <Input placeholder="Last Name" value={ownerForm.lastName} onChange={e=>setOwnerForm({ ...ownerForm, lastName: e.target.value })} />
              <Input
                placeholder="Phone"
                value={ownerForm.phone}
                inputMode="numeric"
                maxLength={10}
                onChange={e=>{
                const  v = (e.target.value || '')
                           .replace(/\D/g, '')       // keep only numbers
                           .replace(/^[0-5]/, '')    // remove if starting digit is NOT 6-9
                           .slice(0, 10);            // allow max 10 digits
                  setOwnerForm({ ...ownerForm, phone: v })
                }}
              />
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
              <Button variant="destructive" onClick={()=>{ try { const raw = localStorage.getItem('deletedAdminUsers') || '{}'; const map = JSON.parse(raw) as { [id:number]: boolean }; const data = sortRecent((users.data?.users||[]).filter(u=> (filterRole==='all'?true:u.role===filterRole) && inPeriod(usersPeriod, u.createdAt))); data.forEach(u=>{ map[u.id] = true }); localStorage.setItem('deletedAdminUsers', JSON.stringify(map)); toast({ title: 'Deleted from view', description: `${data.length} user(s)` }) } catch { toast({ title: 'Delete failed', variant: 'destructive' }) } }}>Delete</Button>
            </div>
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">S.No</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                <tbody className="[&_tr:hover]:bg-muted/30">
                  {sortRecent((users.data?.users || []).filter(u => !('deleted' in u && (u as unknown as { deleted?: boolean }).deleted) && (filterRole==='all' ? true : u.role===filterRole) && inPeriod(usersPeriod, u.createdAt))).filter(u=>{ try { const raw = localStorage.getItem('deletedAdminUsers') || '{}'; const map = JSON.parse(raw) as { [id:number]: boolean }; return !map[u.id] } catch { return true } }).map((u, idx) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-3">{idx+1}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3"><span className="inline-flex items-center px-2 py-1 rounded-full bg-secondary text-xs">{u.role}</span></td>
                      <td className="p-3"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${u.blocked ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>{u.blocked ? 'Blocked' : 'Active'}</span></td>
                      <td className="p-3 flex gap-2">
                        <Button variant={u.blocked ? 'outline' : 'destructive'} size="sm" onClick={() => blockUser.mutate({ id: u.id, blocked: !u.blocked })}>{u.blocked ? 'Unblock' : 'Block'}</Button>
                        <Button variant="destructive" size="sm" onClick={() => { deleteUser.mutate(u.id) }}>Delete</Button>
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
        <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0">
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
              <Button variant="destructive" onClick={async ()=>{ const src = sortRecent((hotels.data?.hotels||[]).filter(h=> inPeriod(hotelsPeriod, h.createdAt as string | undefined))); if (src.length && window.confirm(`Delete ${src.length} hotel(s) in current filter?`)) { const ids = src.map(h=>h.id); await qc.cancelQueries({ queryKey: ["admin","hotels"] }); const prev = qc.getQueryData<{ hotels: Hotel[] }>(["admin","hotels"]) || { hotels: [] }; qc.setQueryData(["admin","hotels"], (data?: { hotels: Hotel[] }) => ({ hotels: (data?.hotels || []).filter(h => !ids.includes(h.id)) })); Promise.all(ids.map(id => deleteHotelOwner.mutateAsync(id))).finally(()=> qc.invalidateQueries({ queryKey: ["admin","hotels"] })) } }}>Delete</Button>
            </div>
            <div className="rounded-lg border overflow-x-auto">
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
                        <Button size="sm" variant="destructive" disabled={deletingHotelId===h.id || deleteHotelOwner.isPending} onClick={() => { if (window.confirm(`Delete hotel #${h.id}? This will remove bookings and reviews.`)) deleteHotelOwner.mutate(h.id) }}>{deletingHotelId===h.id || deleteHotelOwner.isPending ? 'Deleting…' : 'Delete'}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        )}

        {feature === 'settings' && (
        <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0">
          <CardHeader><CardTitle>About Us</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Our Story</div>
                <Textarea rows={6} placeholder="Enter our story" value={storyInput} onChange={e=>setStoryInput(e.target.value)} readOnly={!storyEditing} />
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" onClick={()=> setStoryEditing(!storyEditing)}>{storyEditing ? 'Stop Edit' : 'Edit'}</Button>
                  <Button onClick={() => updateSettings.mutate({ ourStory: storyInput })} disabled={updateSettings.isPending || !storyEditing}>Update</Button>
                  <Button variant="secondary" onClick={() => updateSettings.mutate({ ourStory: storyInput, ourMission: missionInput })} disabled={updateSettings.isPending}>Save</Button>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Our Mission</div>
                <Textarea rows={4} placeholder="Enter our mission" value={missionInput} onChange={e=>setMissionInput(e.target.value)} readOnly={!missionEditing} />
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" onClick={()=> setMissionEditing(!missionEditing)}>{missionEditing ? 'Stop Edit' : 'Edit'}</Button>
                  <Button onClick={() => updateSettings.mutate({ ourMission: missionInput })} disabled={updateSettings.isPending || !missionEditing}>Update</Button>
                  <Button variant="secondary" onClick={() => updateSettings.mutate({ ourStory: storyInput, ourMission: missionInput })} disabled={updateSettings.isPending}>Save</Button>
                </div>
              </div>
              
            </div>
          </CardContent>
        </Card>
        )}

        {feature === 'bookings' && (
        <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0">
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
              <Button variant="destructive" onClick={()=>{ try { const raw = localStorage.getItem('deletedAdminBookings') || '{}'; const map = JSON.parse(raw) as { [id:number]: boolean }; const src = bookings.data?.bookings || []; const data = sortRecent(src.filter(b=> inPeriod(bookingsPeriod, b.createdAt as string | undefined))); data.forEach(b=>{ map[b.id] = true }); localStorage.setItem('deletedAdminBookings', JSON.stringify(map)); toast({ title: 'Deleted from view', description: `${data.length} booking(s)` }) } catch { toast({ title: 'Delete failed', variant: 'destructive' }) } }}>Delete</Button>
              
            </div>
            <div className="rounded-2xl border overflow-x-auto shadow-md">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-purple-50 to-pink-50"><tr className="text-left"><th className="p-3 font-semibold">S.No</th><th className="p-3 font-semibold">Hotel</th><th className="p-3 font-semibold">Dates</th><th className="p-3 font-semibold">Guests</th><th className="p-3 font-semibold">Total</th><th className="p-3 font-semibold">Status</th></tr></thead>
                <tbody className="[&_tr:hover]:bg-muted/30 [&_tr:nth-child(even)]:bg-muted/10">
                  {(() => {
                    const hotelsArr = hotels.data?.hotels || []
                    const hmap: Record<number, Hotel> = {}
                    hotelsArr.forEach(h => { hmap[h.id] = h })
                    const src = bookings.data?.bookings || []
                    return sortRecent(src.filter(b=> inPeriod(bookingsPeriod, b.createdAt as string | undefined))).filter(b=>{ try { const raw = localStorage.getItem('deletedAdminBookings') || '{}'; const map = JSON.parse(raw) as { [id:number]: boolean }; return !map[b.id] } catch { return true } }).map((b, idx) => (
                    <tr key={b.id} className="border-t">
                      <td className="p-3">{idx+1}</td>
                      <td className="p-3">{b.hotel?.name || hmap[b.hotelId]?.name || `#${b.hotelId}`}</td>
                      <td className="p-3">{b.checkIn} → {b.checkOut}</td>
                      <td className="p-3">{b.guests}</td>
                      <td className="p-3">₹{b.total}</td>
                      <td className="p-3">{(() => {
                        const s = String(b.status||'').trim().toLowerCase()
                        const cls = s==='confirmed' ? 'bg-green-100 text-green-700' : (s==='checked_in' ? 'bg-blue-100 text-blue-700' : (s==='checked_out' ? 'bg-indigo-100 text-indigo-700' : (s==='cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-secondary')))
                        return (<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${cls}`}>{b.status}{b.refundIssued ? ' • Refunded' : ''}</span>)
                      })()}</td>
                    </tr>
                  ))
                })()}
              </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        )}


        {feature === 'contact' && (
          <Card className="shadow-2xl hover:shadow-orange-500/20 bg-gradient-to-br from-white via-orange-50 to-pink-50 border-0 scale-100 hover:scale-[1.01] transition-all duration-300 ease-out rounded-2xl p-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-700 to-pink-700 bg-clip-text text-transparent drop-shadow-sm">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Full Name" value={contactName} onChange={e=>setContactName(e.target.value)} disabled={!contactEditing} />
                <Input placeholder="Email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} disabled={!contactEditing} />
                <Input placeholder="Phone 1" value={contactPhone1} inputMode="numeric" maxLength={10} onChange={e=>{ const v = (e.target.value||'').replace(/\D/g,'').replace(/^[0-5]/,'').slice(0,10); setContactPhone1(v) }} disabled={!contactEditing} />
                <Input placeholder="Phone 2" value={contactPhone2} inputMode="numeric" maxLength={10} onChange={e=>{ const v = (e.target.value||'').replace(/\D/g,'').replace(/^[0-5]/,'').slice(0,10); setContactPhone2(v) }} disabled={!contactEditing} />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setContactEditing(!contactEditing)}>{contactEditing ? 'Stop Edit' : 'Edit'}</Button>
                <Button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-md" onClick={() => { if (!contactEditing) return; updateSettings.mutate({ contactName, contactEmail, contactPhone1, contactPhone2 }) }} disabled={!contactEditing || updateSettings.isPending || (!!contactPhone1 && !/^([6-9]\d{9})$/.test(contactPhone1)) || (!!contactPhone2 && !/^([6-9]\d{9})$/.test(contactPhone2))}>Save</Button>
                <Button variant="destructive" onClick={() => { setContactName(''); setContactPhone1(''); setContactPhone2(''); setContactEmail(''); updateSettings.mutate({ contactName: '', contactEmail: '', contactPhone1: '', contactPhone2: '' }) }}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        )}
        {feature === 'contact' && (
          <Card className="shadow-2xl hover:shadow-orange-500/20 bg-gradient-to-br from-white via-orange-50 to-pink-50 border-0 rounded-2xl p-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-700 to-pink-700 bg-clip-text text-transparent drop-shadow-sm">Admin Contact Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-white shadow-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3">Full Name</th>
                      <th className="p-3">Phone 1</th>
                      <th className="p-3">Phone 2</th>
                      <th className="p-3">Email</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:hover]:bg-muted/30">
                    <tr className="border-t">
                      <td className="p-3">{settings.data?.settings?.contactName || '-'}</td>
                      <td className="p-3">{settings.data?.settings?.contactPhone1 || '-'}</td>
                      <td className="p-3">{settings.data?.settings?.contactPhone2 || '-'}</td>
                      <td className="p-3">{settings.data?.settings?.contactEmail || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
        {feature === 'contact' && (
          <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0">
            <CardHeader><CardTitle>Support Inbox</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(inbox.data?.inbox || []).slice(0,5).map(i => (
                  <div key={i.id} className="p-3 rounded-lg border bg-card">
                    <div className="text-sm font-medium">{i.email} • {i.subject}</div>
                    <div className="text-sm text-muted-foreground">{i.message}</div>
                  </div>
                ))}
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
//dgk
//sara
