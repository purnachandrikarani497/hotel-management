import * as React from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost } from "@/lib/api"

type Stats = { totalHotels: number; totalBookings: number; totalRevenue: number; monthlySales: Record<string, number>; cityGrowth: Record<string, number> }
type User = { id: number; email: string; role: "admin"|"user"|"owner"; isApproved?: boolean; blocked?: boolean }
type Hotel = { id: number; name: string; location: string; status?: "approved"|"rejected"|"suspended"|"pending"; featured?: boolean; rating?: number; price?: number }
type Booking = { id: number; hotelId: number; checkIn: string; checkOut: string; guests: number; total: number; status: string; refundIssued: boolean; hotel?: Hotel }
type Coupon = { id: number; code: string; discount: number; expiry: string|null; usageLimit: number; used: number; enabled: boolean }
type Settings = { taxRate: number; commissionRate: number }

const AdminDashboard = () => {
  const qc = useQueryClient()

  const stats = useQuery({ queryKey: ["admin","stats"], queryFn: () => apiGet<{ totalHotels: number; totalBookings: number; totalRevenue: number; monthlySales: Record<string, number>; cityGrowth: Record<string, number> }>("/api/admin/stats") })
  const users = useQuery({ queryKey: ["admin","users"], queryFn: () => apiGet<{ users: User[] }>("/api/admin/users") })
  const hotels = useQuery({ queryKey: ["admin","hotels"], queryFn: () => apiGet<{ hotels: Hotel[] }>("/api/admin/hotels") })
  const bookings = useQuery({ queryKey: ["admin","bookings"], queryFn: () => apiGet<{ bookings: Booking[] }>("/api/admin/bookings") })
  const coupons = useQuery({ queryKey: ["admin","coupons"], queryFn: () => apiGet<{ coupons: Coupon[] }>("/api/admin/coupons") })
  const settings = useQuery({ queryKey: ["admin","settings"], queryFn: () => apiGet<{ settings: Settings }>("/api/admin/settings") })
  const inbox = useQuery({ queryKey: ["admin","support"], queryFn: () => apiGet<{ inbox: { id:number; email:string; subject:string; message:string; createdAt:string }[] }>("/api/admin/support") })

  const blockUser = useMutation({ mutationFn: (p: { id:number; blocked:boolean }) => apiPost("/api/admin/users/"+p.id+"/block", { blocked: p.blocked }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin","users"] }) })
  const setHotelStatus = useMutation({ mutationFn: (p: { id:number; status:Hotel["status"] }) => apiPost("/api/admin/hotels/"+p.id+"/status", { status: p.status }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin","hotels"] }) })
  const setHotelFeatured = useMutation({ mutationFn: (p: { id:number; featured:boolean }) => apiPost("/api/admin/hotels/"+p.id+"/feature", { featured: p.featured }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin","hotels"] }) })
  const cancelBooking = useMutation({ mutationFn: (id:number) => apiPost("/api/admin/bookings/"+id+"/cancel", {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin","bookings"] }) })
  const refundBooking = useMutation({ mutationFn: (id:number) => apiPost("/api/admin/bookings/"+id+"/refund", {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin","bookings"] }) })
  const createCoupon = useMutation({ mutationFn: (p: { code:string; discount:number; expiry:string; usageLimit:number; enabled:boolean }) => apiPost("/api/admin/coupons", p), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin","coupons"] }) } })
  const setCouponStatus = useMutation({ mutationFn: (p: { id:number; enabled:boolean }) => apiPost("/api/admin/coupons/"+p.id+"/status", { enabled: p.enabled }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin","coupons"] }) })
  const updateSettings = useMutation({ mutationFn: (p: Partial<Settings>) => apiPost("/api/admin/settings", p), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin","settings"] }) })
  const approveOwner = useMutation({ mutationFn: (id:number) => apiPost("/api/admin/owners/"+id+"/approve", {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin","users"] }) })

  const [couponForm, setCouponForm] = React.useState({ code:"", discount:0, expiry:"", usageLimit:0, enabled:true })
  const [taxInput, setTaxInput] = React.useState("")
  const [commInput, setCommInput] = React.useState("")

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Super Admin controls for the platform</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader><CardTitle>Total Hotels</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.data?.totalHotels ?? 0}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Total Bookings</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.data?.totalBookings ?? 0}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${stats.data?.totalRevenue ?? 0}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Cities</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{Object.keys(stats.data?.cityGrowth || {}).length}</div></CardContent></Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Monthly Sales</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {Object.entries(stats.data?.monthlySales || {}).map(([m,v]) => (
                  <div key={m} className="flex-1">
                    <div className="bg-primary/80 w-full" style={{ height: Math.max(8, Math.min(160, v/10)) }} />
                    <div className="text-xs mt-1 text-muted-foreground">{m}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>City-wise Growth</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.data?.cityGrowth || {}).map(([c,v]) => (
                  <div key={c} className="flex items-center gap-2">
                    <div className="w-32 text-sm">{c}</div>
                    <div className="flex-1 bg-secondary h-2 rounded">
                      <div className="bg-primary h-2 rounded" style={{ width: `${Math.min(100, v*10)}%` }} />
                    </div>
                    <div className="text-xs w-8 text-right">{v}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left"><th className="p-2">Email</th><th className="p-2">Role</th><th className="p-2">Approved</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
                <tbody>
                  {(users.data?.users || []).map(u => (
                    <tr key={u.id} className="border-t">
                      <td className="p-2">{u.email}</td>
                      <td className="p-2">{u.role}</td>
                      <td className="p-2">{u.role === 'owner' ? (u.isApproved ? 'Approved' : 'Pending') : '—'}</td>
                      <td className="p-2">{u.blocked ? 'Blocked' : 'Active'}</td>
                      <td className="p-2 flex gap-2">
                        {u.role === 'owner' && !u.isApproved && <Button size="sm" onClick={() => approveOwner.mutate(u.id)}>Approve</Button>}
                        <Button variant={u.blocked ? 'outline' : 'destructive'} size="sm" onClick={() => blockUser.mutate({ id: u.id, blocked: !u.blocked })}>{u.blocked ? 'Unblock' : 'Block'}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Hotel Management</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left"><th className="p-2">Name</th><th className="p-2">Location</th><th className="p-2">Status</th><th className="p-2">Featured</th><th className="p-2">Actions</th></tr></thead>
                <tbody>
                  {(hotels.data?.hotels || []).map(h => (
                    <tr key={h.id} className="border-t">
                      <td className="p-2">{h.name}</td>
                      <td className="p-2">{h.location}</td>
                      <td className="p-2">{h.status}</td>
                      <td className="p-2">{h.featured ? 'Yes' : 'No'}</td>
                      <td className="p-2 flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setHotelStatus.mutate({ id: h.id, status: 'approved' })}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => setHotelStatus.mutate({ id: h.id, status: 'rejected' })}>Reject</Button>
                        <Button size="sm" variant="outline" onClick={() => setHotelStatus.mutate({ id: h.id, status: 'suspended' })}>Suspend</Button>
                        <Button size="sm" onClick={() => setHotelFeatured.mutate({ id: h.id, featured: !h.featured })}>{h.featured ? 'Unfeature' : 'Feature'}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Booking Management</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left"><th className="p-2">Hotel</th><th className="p-2">Dates</th><th className="p-2">Guests</th><th className="p-2">Total</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
                <tbody>
                  {(bookings.data?.bookings || []).map(b => (
                    <tr key={b.id} className="border-t">
                      <td className="p-2">{b.hotel?.name}</td>
                      <td className="p-2">{b.checkIn} → {b.checkOut}</td>
                      <td className="p-2">{b.guests}</td>
                      <td className="p-2">${b.total}</td>
                      <td className="p-2">{b.status}{b.refundIssued ? ' • Refunded' : ''}</td>
                      <td className="p-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => cancelBooking.mutate(b.id)}>Cancel</Button>
                        <Button size="sm" onClick={() => refundBooking.mutate(b.id)} disabled={b.refundIssued}>Issue Refund</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Coupon Management</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Code" value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value })} />
                <Input type="number" placeholder="Discount" value={couponForm.discount} onChange={e => setCouponForm({ ...couponForm, discount: Number(e.target.value) })} />
                <Input placeholder="Expiry (YYYY-MM-DD)" value={couponForm.expiry} onChange={e => setCouponForm({ ...couponForm, expiry: e.target.value })} />
                <Input type="number" placeholder="Usage Limit" value={couponForm.usageLimit} onChange={e => setCouponForm({ ...couponForm, usageLimit: Number(e.target.value) })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => createCoupon.mutate({ ...couponForm })} disabled={!couponForm.code || couponForm.discount<=0}>Create Coupon</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left"><th className="p-2">Code</th><th className="p-2">Discount</th><th className="p-2">Expiry</th><th className="p-2">Usage</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
                  <tbody>
                    {(coupons.data?.coupons || []).map(c => (
                      <tr key={c.id} className="border-t">
                        <td className="p-2">{c.code}</td>
                        <td className="p-2">{c.discount}%</td>
                        <td className="p-2">{c.expiry ?? '—'}</td>
                        <td className="p-2">{c.used}/{c.usageLimit}</td>
                        <td className="p-2">{c.enabled ? 'Enabled' : 'Disabled'}</td>
                        <td className="p-2"><Button size="sm" onClick={() => setCouponStatus.mutate({ id: c.id, enabled: !c.enabled })}>{c.enabled ? 'Disable' : 'Enable'}</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
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
                    <div key={i.id} className="p-3 rounded border">
                      <div className="text-sm font-medium">{i.email} • {i.subject}</div>
                      <div className="text-sm text-muted-foreground">{i.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default AdminDashboard