import * as React from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Coupon = { id:number; code:string; discount:number; expiry:string|null; startDate:string|null; endDate:string|null; usageLimit:number; used:number; enabled:boolean; ownerId: number | null; hotelId: number | null }

const OwnerCoupons: React.FC = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  let ownerId = 0
  try { ownerId = Number(JSON.parse(localStorage.getItem("auth")||"{}")?.user?.id||0) } catch (_e) { ownerId = 0 }

  const hotels = useQuery({ queryKey: ["owner","hotels",ownerId], queryFn: () => apiGet<{ hotels: { id:number; name:string }[] }>(`/api/owner/hotels?ownerId=${ownerId}`), enabled: !!ownerId })
  const coupons = useQuery({ queryKey: ["owner","coupons",ownerId], queryFn: () => apiGet<{ coupons: Coupon[] }>("/api/admin/coupons") })

  const createCoupon = useMutation({ mutationFn: (p: { code:string; discount:number; startDate:string; endDate:string; usageLimit:number; enabled:boolean; hotelId:number; ownerId:number }) => apiPost<{ id:number }, { code:string; discount:number; startDate:string; endDate:string; usageLimit:number; enabled:boolean; hotelId:number; ownerId:number }>("/api/admin/coupons", p), onSuccess: (res, vars) => { qc.invalidateQueries({ queryKey: ["owner","coupons",ownerId] }); toast({ title: "Coupon created", description: vars.code }) }, onError: () => toast({ title: "Create failed", variant: "destructive" }) })
  const setCouponStatus = useMutation({ mutationFn: (p: { id:number; enabled:boolean }) => apiPost("/api/admin/coupons/"+p.id+"/status", { enabled: p.enabled }), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["owner","coupons",ownerId] }); toast({ title: vars.enabled ? "Enabled" : "Disabled", description: `#${vars.id}` }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })
  const deleteCoupon = useMutation({ mutationFn: (id:number) => apiDelete(`/api/admin/coupons/${id}`), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["owner","coupons",ownerId] }); toast({ title: "Coupon deleted", description: `#${vars}` }) }, onError: () => toast({ title: "Delete failed", variant: "destructive" }) })
  const deleteAll = useMutation({ mutationFn: () => apiDelete(`/api/admin/coupons`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["owner","coupons",ownerId] }); toast({ title: "All coupons deleted" }) }, onError: () => toast({ title: "Delete failed", variant: "destructive" }) })
  const updateCoupon = useMutation({ mutationFn: (p: { id:number; discount?: number; usageLimit?: number; startDate?: string|null; endDate?: string|null }) => apiPost(`/api/admin/coupons/${p.id}`, p), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["owner","coupons",ownerId] }); toast({ title: "Coupon updated", description: `#${vars.id}` }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })

  const [form, setForm] = React.useState({ code:"", discount:"", startDate:"", endDate:"", usageLimit:"", enabled:true })
  const [hotelId, setHotelId] = React.useState<number>(0)
  const [editing, setEditing] = React.useState<{ [id:number]: { discount?: number; usageLimit?: number; startDate?: string|null; endDate?: string|null } }>({})

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-14 relative overflow-hidden">
          <div className="container">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Coupon Management</h1>
              <p className="mt-3 text-lg opacity-90">Create, edit and control discount coupons</p>
              <div className="mt-4 flex justify-center">
                <div className="flex items-center space-x-1 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                  <span className="text-sm opacity-80">Coupons Portal</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <div className="container py-8">
          <Card className="shadow-card hover:shadow-card-hover transition-all">
            <CardHeader><CardTitle>Coupon Management</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-orange-50">
                <div className="rounded-xl border bg-white shadow-md overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3">Hotel</th>
                      <th className="p-3">Coupon Code</th>
                      <th className="p-3">Discount (%)</th>
                      <th className="p-3">Start Date</th>
                      <th className="p-3">End Date</th>
                      <th className="p-3">Usage Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-3">
                        <select className="px-3 py-2 rounded-md border bg-white shadow-sm" value={hotelId} onChange={e=>setHotelId(Number(e.target.value))}>
                          <option value={0}>Select Hotel</option>
                          {(hotels.data?.hotels||[]).map(h => (<option key={h.id} value={h.id}>{h.name}</option>))}
                        </select>
                      </td>
                      <td className="p-3">
                        <Input 
                          placeholder="Code" 
                          value={form.code} 
                          onChange={e => {
                            const val = e.target.value
                            if (val.length > 20) {
                              toast({ title: "Maximum limit exceeded", variant: "destructive" })
                              return
                            }
                            if (!/^[a-zA-Z0-9]*$/.test(val)) {
                               toast({ title: "Invalid coupon code", description: "Only alphanumeric allowed (no spaces)", variant: "destructive" })
                               return
                            }
                            setForm({ ...form, code: val })
                          }} 
                        />
                      </td>
                      <td className="p-3">
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="%" 
                          value={form.discount} 
                          onChange={e => {
                            const val = e.target.value
                            if (val !== "" && (Number(val) < 1 || Number(val) > 100)) {
                                toast({ title: "Invalid discount", description: "Must be 1-100", variant: "destructive" })
                                return
                            }
                            setForm({ ...form, discount: val })
                          }} 
                        />
                      </td>
                      <td className="p-3"><Input type="date" min={new Date().toISOString().slice(0,10)} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></td>
                      <td className="p-3"><Input type="date" min={form.startDate || new Date().toISOString().slice(0,10)} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></td>
                      <td className="p-3">
                        <Input 
                          type="text" 
                          placeholder="Limit" 
                          maxLength={4}
                          value={form.usageLimit} 
                          onChange={e => {
                             const val = e.target.value
                             if (val !== "" && !/^\d*$/.test(val)) {
                                 toast({ title: "Invalid usage limit", description: "Must be numeric", variant: "destructive" })
                                 return
                             }
                             setForm({ ...form, usageLimit: val })
                          }} 
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => {
                   if (!hotelId) { toast({ title: "Please select a hotel", variant: "destructive" }); return; }
                   if (!form.code.trim()) { toast({ title: "Please enter coupon code", variant: "destructive" }); return; }
                   if (!form.discount) { toast({ title: "Please enter discount", variant: "destructive" }); return; }
                   if (!form.startDate) { toast({ title: "Please enter start date", variant: "destructive" }); return; }
                   if (!form.endDate) { toast({ title: "Please enter end date", variant: "destructive" }); return; }
                   if (form.startDate >= form.endDate) { toast({ title: "Invalid dates", description: "Start date must be earlier than end date", variant: "destructive" }); return; }
                   if (!form.usageLimit) { toast({ title: "Please enter usage limit", variant: "destructive" }); return; }
                   
                   createCoupon.mutate({ ...form, discount: Number(form.discount), usageLimit: Number(form.usageLimit), hotelId, ownerId })
                }}>Create Coupon</Button>
                <Button variant="destructive" onClick={() => { 
                  const list = (coupons.data?.coupons || []).filter(c => c.ownerId === ownerId || (hotels.data?.hotels||[]).some(h=>h.id===c.hotelId));
                  if (list.length === 0) {
                    toast({ title: "No data found", variant: "destructive" });
                    return;
                  }
                  if (window.confirm('Delete ALL coupons?')) deleteAll.mutate() 
                }}>Delete All</Button>
              </div>
              <div className="rounded-2xl p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-orange-50">
                <div className="rounded-xl border bg-white shadow-md overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Valid From</th><th className="p-3">Valid Until</th><th className="p-3">Usage</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                  <tbody className="[&_tr:hover]:bg-muted/30">
                    {(() => {
                      const list = (coupons.data?.coupons || []).filter(c => c.ownerId === ownerId || (hotels.data?.hotels||[]).some(h=>h.id===c.hotelId));
                      if (list.length === 0) {
                        return <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No data found</td></tr>
                      }
                      return list.map(c => (
                      <tr key={c.id} className="border-t">
                        <td className="p-3">{c.code}</td>
                        <td className="p-3">
                          {editing[c.id] ? (
                            <Input type="number" min="0" value={editing[c.id]?.discount ?? c.discount} onChange={e=> setEditing({ ...editing, [c.id]: { ...(editing[c.id]||{}), discount: Math.max(0, Number(e.target.value)) } })} />
                          ) : (
                            <>{c.discount}%</>
                          )}
                        </td>
                        <td className="p-3">
                          {editing[c.id] ? (
                            <Input type="date" min={new Date().toISOString().slice(0,10)} value={(editing[c.id]?.startDate ?? c.startDate ?? '') || ''} onChange={e=> setEditing({ ...editing, [c.id]: { ...(editing[c.id]||{}), startDate: e.target.value || null } })} />
                          ) : (
                            <>{c.startDate ?? '—'}</>
                          )}
                        </td>
                        <td className="p-3">
                          {editing[c.id] ? (
                            <Input type="date" min={editing[c.id]?.startDate || c.startDate || new Date().toISOString().slice(0,10)} value={(editing[c.id]?.endDate ?? c.endDate ?? c.expiry ?? '') || ''} onChange={e=> setEditing({ ...editing, [c.id]: { ...(editing[c.id]||{}), endDate: e.target.value || null } })} />
                          ) : (
                            <>{c.endDate ?? c.expiry ?? '—'}</>
                          )}
                        </td>
                        <td className="p-3">
                          {editing[c.id] ? (
                            <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{c.used}</span>/<Input type="number" min="0" value={editing[c.id]?.usageLimit ?? c.usageLimit} onChange={e=> setEditing({ ...editing, [c.id]: { ...(editing[c.id]||{}), usageLimit: Math.max(0, Number(e.target.value)) } })} /></div>
                          ) : (
                            <>{c.used}/{c.usageLimit}</>
                          )}
                        </td>
                        <td className="p-3"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${c.enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground'}`}>{c.enabled ? 'Enabled' : 'Disabled'}</span></td>
                        <td className="p-3 flex gap-2">
                          <Button size="sm" onClick={() => setCouponStatus.mutate({ id: c.id, enabled: !c.enabled })}>{c.enabled ? 'Disable' : 'Enable'}</Button>
                          {editing[c.id] ? (
                            <>
                              <Button size="sm" onClick={()=>{ const payload = { id: c.id, discount: editing[c.id]?.discount ?? c.discount, usageLimit: editing[c.id]?.usageLimit ?? c.usageLimit, startDate: (editing[c.id]?.startDate ?? c.startDate ?? null), endDate: (editing[c.id]?.endDate ?? c.endDate ?? null) }; updateCoupon.mutate(payload); setEditing(prev => { const next = { ...prev }; delete next[c.id]; return next }) }}>Save</Button>
                              <Button size="sm" variant="outline" onClick={()=> setEditing(prev => { const next = { ...prev }; delete next[c.id]; return next })}>Cancel</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={()=> setEditing({ ...editing, [c.id]: { discount: c.discount, usageLimit: c.usageLimit, startDate: c.startDate ?? null, endDate: c.endDate ?? null } })}>Edit</Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => deleteCoupon.mutate(c.id)}>Delete</Button>
                        </td>
                      </tr>
                    ))
                    })()}
                  </tbody>
                </table>
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

export default OwnerCoupons
