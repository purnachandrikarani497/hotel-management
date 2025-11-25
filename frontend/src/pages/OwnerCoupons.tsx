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

  const [form, setForm] = React.useState({ code:"", discount:0, expiry:"", usageLimit:0, enabled:true })
  const [hotelId, setHotelId] = React.useState<number>(0)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-8">
          <Card className="shadow-card hover:shadow-card-hover transition-all">
            <CardHeader><CardTitle>Coupon Management</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select className="px-4 py-2 rounded-lg border bg-background" value={hotelId} onChange={e=>setHotelId(Number(e.target.value))}>
                  <option value={0}>Select Hotel</option>
                  {(hotels.data?.hotels||[]).map(h => (<option key={h.id} value={h.id}>{h.name}</option>))}
                </select>
                <Input placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
                <Input type="number" placeholder="Discount" value={form.discount} onChange={e => setForm({ ...form, discount: Number(e.target.value) })} />
                <Input type="date" placeholder="Expiry" min={new Date().toISOString().slice(0,10)} value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })} />
                <Input type="number" placeholder="Usage Limit" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: Number(e.target.value) })} />
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
                        <td className="p-3">{c.discount}%</td>
                        <td className="p-3">{c.expiry ?? '—'}</td>
                        <td className="p-3">{c.used}/{c.usageLimit}</td>
                        <td className="p-3"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${c.enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground'}`}>{c.enabled ? 'Enabled' : 'Disabled'}</span></td>
                        <td className="p-3 flex gap-2">
                          <Button size="sm" onClick={() => setCouponStatus.mutate({ id: c.id, enabled: !c.enabled })}>{c.enabled ? 'Disable' : 'Enable'}</Button>
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
