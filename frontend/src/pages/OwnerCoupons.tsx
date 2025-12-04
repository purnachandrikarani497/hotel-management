import * as React from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Coupon = { id:number; code:string; discount:number; expiry:string|null; usageLimit:number; used:number; enabled:boolean; ownerId: number | null; hotelId: number | null }

const OwnerCoupons: React.FC = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  let ownerId = 0
  try { ownerId = Number(JSON.parse(localStorage.getItem("auth")||"{}")?.user?.id||0) } catch (_e) { ownerId = 0 }

  const hotels = useQuery({ queryKey: ["owner","hotels",ownerId], queryFn: () => apiGet<{ hotels: { id:number; name:string }[] }>(`/api/owner/hotels?ownerId=${ownerId}`), enabled: !!ownerId })
  const coupons = useQuery({ queryKey: ["owner","coupons",ownerId], queryFn: () => apiGet<{ coupons: Coupon[] }>("/api/admin/coupons") })

  const createCoupon = useMutation({ mutationFn: (p: { code:string; discount:number; expiry:string; usageLimit:number; enabled:boolean; hotelId:number; ownerId:number }) => apiPost<{ id:number }, { code:string; discount:number; expiry:string; usageLimit:number; enabled:boolean; hotelId:number; ownerId:number }>("/api/admin/coupons", p), onSuccess: (res, vars) => { qc.invalidateQueries({ queryKey: ["owner","coupons",ownerId] }); toast({ title: "Coupon created", description: vars.code }) }, onError: () => toast({ title: "Create failed", variant: "destructive" }) })
  const setCouponStatus = useMutation({ mutationFn: (p: { id:number; enabled:boolean }) => apiPost("/api/admin/coupons/"+p.id+"/status", { enabled: p.enabled }), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["owner","coupons",ownerId] }); toast({ title: vars.enabled ? "Enabled" : "Disabled", description: `#${vars.id}` }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })
  const deleteCoupon = useMutation({ mutationFn: (id:number) => apiDelete(`/api/admin/coupons/${id}`), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["owner","coupons",ownerId] }); toast({ title: "Coupon deleted", description: `#${vars}` }) }, onError: () => toast({ title: "Delete failed", variant: "destructive" }) })
  const deleteAll = useMutation({ mutationFn: () => apiDelete(`/api/admin/coupons`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["owner","coupons",ownerId] }); toast({ title: "All coupons deleted" }) }, onError: () => toast({ title: "Delete failed", variant: "destructive" }) })
  const updateCoupon = useMutation({ mutationFn: (p: { id:number; discount?: number; usageLimit?: number }) => apiPost(`/api/admin/coupons/${p.id}`, p), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["owner","coupons",ownerId] }); toast({ title: "Coupon updated", description: `#${vars.id}` }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })

  const [form, setForm] = React.useState({ code:"", discount:0, expiry:"", usageLimit:0, enabled:true })
  const [hotelId, setHotelId] = React.useState<number>(0)
  const [editing, setEditing] = React.useState<{ [id:number]: { discount?: number; usageLimit?: number } }>({})

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-14 relative overflow-hidden">
          <div className="container">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Coupon Management</h1>
              <p className="mt-3 text-lg opacity-90">Create, enable and track discounts</p>
              <div className="mt-4 flex justify-center">
                <div className="flex items-center space-x-1 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                  <span className="text-sm opacity-80">Coupons Portal</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        {(() => {
          const list = (coupons.data?.coupons || []).filter(c => c.ownerId === ownerId || (hotels.data?.hotels||[]).some(h=>h.id===c.hotelId))
          const enabled = list.filter(c=>c.enabled).length
          const soon = list.filter(c=>{ const s = String(c.expiry||''); if(!s) return false; const d = new Date(s); if(!(d instanceof Date) || isNaN(d.getTime())) return false; const now = new Date(); const diff = (d.getTime() - now.getTime())/(1000*60*60*24); return diff >= 0 && diff <= 10 }).length
          const used = list.reduce((sum, c)=> sum + Number(c.used||0), 0)
          return (
            <div className="container mt-8 grid gap-8 lg:grid-cols-4 md:grid-cols-2 sm:grid-cols-1">
              <Card className="group shadow-2xl hover:shadow-purple-500/30 bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm">
                <CardHeader className="pb-3 text-center"><CardTitle className="text-sm font-bold text-purple-700 uppercase tracking-wider">Total Coupons</CardTitle></CardHeader>
                <CardContent className="pt-0 text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg mb-2">{list.length}</div>
                  <div className="text-xs text-purple-600 opacity-70 uppercase tracking-wide">Count</div>
                </CardContent>
              </Card>
              <Card className="group shadow-2xl hover:shadow-green-500/30 bg-gradient-to-br from-white via-green-50 to-emerald-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm">
                <CardHeader className="pb-3 text-center"><CardTitle className="text-sm font-bold text-green-700 uppercase tracking-wider">Enabled</CardTitle></CardHeader>
                <CardContent className="pt-0 text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent drop-shadow-lg mb-2">{enabled}</div>
                  <div className="text-xs text-green-600 opacity-70 uppercase tracking-wide">Active</div>
                </CardContent>
              </Card>
              <Card className="group shadow-2xl hover:shadow-orange-500/30 bg-gradient-to-br from-white via-orange-50 to-yellow-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm">
                <CardHeader className="pb-3 text-center"><CardTitle className="text-sm font-bold text-orange-700 uppercase tracking-wider">Expiring Soon</CardTitle></CardHeader>
                <CardContent className="pt-0 text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent drop-shadow-lg mb-2">{soon}</div>
                  <div className="text-xs text-orange-600 opacity-70 uppercase tracking-wide">≤ 10 days</div>
                </CardContent>
              </Card>
              <Card className="group shadow-2xl hover:shadow-cyan-500/30 bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm">
                <CardHeader className="pb-3 text-center"><CardTitle className="text-sm font-bold text-cyan-700 uppercase tracking-wider">Total Used</CardTitle></CardHeader>
                <CardContent className="pt-0 text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent drop-shadow-lg mb-2">{used}</div>
                  <div className="text-xs text-cyan-600 opacity-70 uppercase tracking-wide">Redemptions</div>
                </CardContent>
              </Card>
            </div>
          )
        })()}
        <div className="container py-8">
          <Card className="group shadow-2xl hover:shadow-purple-500/30 bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0 hover:scale-[1.01] transition-all duration-500 ease-out backdrop-blur-sm">
            <CardHeader><CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent">Coupon Management</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3">Hotel</th>
                      <th className="p-3">Coupon Code</th>
                      <th className="p-3">Discount (%)</th>
                      <th className="p-3">Expiry</th>
                      <th className="p-3">Usage Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-3">
                        <select className="px-4 py-2 rounded-lg border bg-background" value={hotelId} onChange={e=>setHotelId(Number(e.target.value))}>
                          <option value={0}>Select Hotel</option>
                          {(hotels.data?.hotels||[]).map(h => (<option key={h.id} value={h.id}>{h.name}</option>))}
                        </select>
                      </td>
                      <td className="p-3"><Input placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></td>
                      <td className="p-3"><Input type="number" placeholder="%" value={form.discount} onChange={e => setForm({ ...form, discount: Number(e.target.value) })} /></td>
                      <td className="p-3"><Input type="date" min={new Date().toISOString().slice(0,10)} value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })} /></td>
                      <td className="p-3"><Input type="number" placeholder="0 = unlimited" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: Number(e.target.value) })} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => createCoupon.mutate({ ...form, hotelId, ownerId })} disabled={!hotelId || !form.code || form.discount<=0}>Create Coupon</Button>
                <Button variant="destructive" onClick={() => { if (window.confirm('Delete ALL coupons?')) deleteAll.mutate() }}>Delete All</Button>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Expiry</th><th className="p-3">Usage</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                  <tbody className="[&_tr:hover]:bg-muted/30">
                    {(coupons.data?.coupons || []).filter(c => c.ownerId === ownerId || (hotels.data?.hotels||[]).some(h=>h.id===c.hotelId)).map(c => (
                      <tr key={c.id} className="border-t">
                        <td className="p-3">{c.code}</td>
                        <td className="p-3">
                          {editing[c.id] ? (
                            <Input type="number" value={editing[c.id]?.discount ?? c.discount} onChange={e=> setEditing({ ...editing, [c.id]: { ...(editing[c.id]||{}), discount: Number(e.target.value) } })} />
                          ) : (
                            <>{c.discount}%</>
                          )}
                        </td>
                        <td className="p-3">{c.expiry ?? '—'}</td>
                        <td className="p-3">
                          {editing[c.id] ? (
                            <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{c.used}</span>/<Input type="number" value={editing[c.id]?.usageLimit ?? c.usageLimit} onChange={e=> setEditing({ ...editing, [c.id]: { ...(editing[c.id]||{}), usageLimit: Number(e.target.value) } })} /></div>
                          ) : (
                            <>{c.used}/{c.usageLimit}</>
                          )}
                        </td>
                        <td className="p-3"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${c.enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground'}`}>{c.enabled ? 'Enabled' : 'Disabled'}</span></td>
                        <td className="p-3 flex gap-2">
                          <Button size="sm" onClick={() => setCouponStatus.mutate({ id: c.id, enabled: !c.enabled })}>{c.enabled ? 'Disable' : 'Enable'}</Button>
                          {editing[c.id] ? (
                            <>
                              <Button size="sm" onClick={()=>{ const payload = { id: c.id, discount: editing[c.id]?.discount ?? c.discount, usageLimit: editing[c.id]?.usageLimit ?? c.usageLimit }; updateCoupon.mutate(payload); setEditing(prev => { const next = { ...prev }; delete next[c.id]; return next }) }}>Save</Button>
                              <Button size="sm" variant="outline" onClick={()=> setEditing(prev => { const next = { ...prev }; delete next[c.id]; return next })}>Cancel</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={()=> setEditing({ ...editing, [c.id]: { discount: c.discount, usageLimit: c.usageLimit } })}>Edit</Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => deleteCoupon.mutate(c.id)}>Delete</Button>
                        </td>
                      </tr>
                    ))}
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

export default OwnerCoupons
