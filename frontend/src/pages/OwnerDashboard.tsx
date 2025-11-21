import * as React from "react"
import { useParams } from "react-router-dom"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, CalendarCheck2, DollarSign } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiDelete } from "@/lib/api"

type OwnerStats = { totalBookings:number; totalRevenue:number; dailyStats:number; roomOccupancy:number; upcomingArrivals: { id:number; hotelId:number; checkIn:string; guests:number }[] }
  type Hotel = { id:number; name:string; location:string; status:string; price:number; amenities:string[]; images:string[]; docs:string[]; description?: string; pricing?: { normalPrice?: number; weekendPrice?: number; seasonal?: { start:string; end:string; price:number }[]; specials?: { date:string; price:number }[] } }
type Room = { id:number; hotelId:number; type:string; price:number; members:number; availability:boolean; blocked:boolean; amenities:string[]; photos:string[] }
type Booking = { id:number; hotelId:number; roomId?:number; checkIn:string; checkOut:string; guests:number; total:number; status:string }
type Review = { id:number; hotelId:number; rating:number; comment:string; createdAt:string; response?:string }

const OwnerDashboard = () => {
  const raw = typeof window !== "undefined" ? localStorage.getItem("auth") : null
  const auth = raw ? JSON.parse(raw) as { user?: { id?: number } } : null
  const ownerId = auth?.user?.id || 0
  const { feature } = useParams<{ feature?: string }>()
  const qc = useQueryClient()
  const abKey = "addedByDashboard"
  type AddedStore = { hotels?: number[]; rooms?: number[]; reviews?: number[]; coupons?: number[]; wishlist?: number[] }
  const readAB = (): AddedStore => {
    try { return JSON.parse(localStorage.getItem(abKey) || "{}") as AddedStore } catch { return {} }
  }
  const writeAB = (obj: AddedStore) => { try { localStorage.setItem(abKey, JSON.stringify(obj)); return true } catch (e) { return false } }
  const addId = (type: keyof AddedStore, id: number) => {
    const cur = readAB();
    const list = new Set(cur[type] || []);
    list.add(id);
    cur[type] = Array.from(list);
    writeAB(cur);
  }
  const getSet = (type: keyof AddedStore) => new Set<number>((readAB()[type] || []) as number[])

  const stats = useQuery({ queryKey: ["owner","stats",ownerId], queryFn: () => apiGet<OwnerStats>(`/api/owner/stats?ownerId=${ownerId}`), enabled: !!ownerId })
  const hotelsQ = useQuery({ queryKey: ["owner","hotels",ownerId], queryFn: () => apiGet<{ hotels: Hotel[] }>(`/api/owner/hotels?ownerId=${ownerId}`), enabled: !!ownerId })
  const roomsQ = useQuery({ queryKey: ["owner","rooms",ownerId], queryFn: () => apiGet<{ rooms: Room[] }>(`/api/owner/rooms?ownerId=${ownerId}`), enabled: !!ownerId })
  const bookingsQ = useQuery({ queryKey: ["owner","bookings",ownerId], queryFn: () => apiGet<{ bookings: Booking[] }>(`/api/owner/bookings?ownerId=${ownerId}`), enabled: !!ownerId })
  const reviewsQ = useQuery({ queryKey: ["owner","reviews",ownerId], queryFn: () => apiGet<{ reviews: Review[] }>(`/api/owner/reviews?ownerId=${ownerId}`), enabled: !!ownerId })

  const hotels = (hotelsQ.data?.hotels || []).filter(h => getSet("hotels").has(h.id))
  const roomsRaw = roomsQ.data?.rooms || []
  const rooms = React.useMemo(() => (roomsRaw || []).filter(r => getSet("rooms").has(r.id)), [roomsRaw, getSet])
  const bookings = bookingsQ.data?.bookings || []
  const reviews = (reviewsQ.data?.reviews || []).filter(r => getSet("reviews").has(r.id))

  const submitHotel = useMutation({ mutationFn: (p: { name:string; location:string; price:number; amenities:string[]; description?:string }) => apiPost<{ id:number }, { ownerId:number; name:string; location:string; price:number; amenities:string[]; description?:string }>(`/api/owner/hotels/submit`, { ownerId, ...p }), onSuccess: (res) => { if (res?.id) addId("hotels", res.id); qc.invalidateQueries({ queryKey: ["owner","hotels",ownerId] }) } })
  const updateAmenities = useMutation({ mutationFn: (p: { id:number; amenities:string[] }) => apiPost(`/api/owner/hotels/${p.id}/amenities`, { amenities: p.amenities }), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","hotels",ownerId] }) })
  const updateDescription = useMutation({ mutationFn: (p: { id:number; description:string }) => apiPost(`/api/owner/hotels/${p.id}/description`, { description: p.description }), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","hotels",ownerId] }) })
  const updateImages = useMutation({ mutationFn: (p: { id:number; images:string[] }) => apiPost(`/api/owner/hotels/${p.id}/images`, { images: p.images }), onSuccess: (_res, vars) => { setImageUploaded(prev => ({ ...prev, [vars.id]: true })); qc.invalidateQueries({ queryKey: ["owner","hotels",ownerId] }) } })
  const updateDocs = useMutation({ mutationFn: (p: { id:number; docs:string[] }) => apiPost(`/api/owner/hotels/${p.id}/docs`, { docs: p.docs }), onSuccess: (_res, vars) => { setDocUploaded(prev => ({ ...prev, [vars.id]: true })); qc.invalidateQueries({ queryKey: ["owner","hotels",ownerId] }) } })
  const updateInfo = useMutation({ mutationFn: (p: { id:number; name?:string; location?:string; price?:number; description?:string; status?:string; featured?:boolean }) => apiPost(`/api/owner/hotels/${p.id}/info`, p), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","hotels",ownerId] }) })
  const deleteHotel = useMutation({ mutationFn: (id:number) => apiDelete(`/api/owner/hotels/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","hotels",ownerId] }) })
  const createRoom = useMutation({ mutationFn: (p: { hotelId:number; type:string; price:number; members:number; amenities:string[]; photos:string[]; availability:boolean }) => apiPost<{ id:number }, { ownerId:number; hotelId:number; type:string; price:number; members:number; amenities:string[]; photos:string[]; availability:boolean }>(`/api/owner/rooms`, { ownerId, ...p }), onSuccess: (res) => { if (res?.id) { addId("rooms", res.id); setLastRoomId(res.id) } qc.invalidateQueries({ queryKey: ["owner","rooms",ownerId] }) } })
  const updateRoom = useMutation({ mutationFn: (p: { id:number; price?:number; members?:number; availability?:boolean; amenities?:string[]; photos?:string[] }) => apiPost(`/api/owner/rooms/${p.id}`, p), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","rooms",ownerId] }) })
  const blockRoom = useMutation({ mutationFn: (p: { id:number; blocked:boolean }) => apiPost(`/api/owner/rooms/${p.id}/block`, { blocked: p.blocked }), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","rooms",ownerId] }) })
  const approveBooking = useMutation({ mutationFn: (id:number) => apiPost(`/api/owner/bookings/${id}/approve`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","bookings",ownerId] }) })
  const cancelBooking = useMutation({ mutationFn: (id:number) => apiPost(`/api/owner/bookings/${id}/cancel`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","bookings",ownerId] }) })
  const checkinBooking = useMutation({ mutationFn: (id:number) => apiPost(`/api/owner/bookings/${id}/checkin`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","bookings",ownerId] }) })
  const checkoutBooking = useMutation({ mutationFn: (id:number) => apiPost(`/api/owner/bookings/${id}/checkout`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","bookings",ownerId] }) })
  const updatePricing = useMutation({ mutationFn: (p: { hotelId:number; normalPrice?:number; weekendPrice?:number; seasonal?:{start:string;end:string;price:number}[]; specials?:{date:string;price:number}[] }) => apiPost(`/api/owner/pricing/${p.hotelId}`, p), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","hotels",ownerId] }) })
  const deletePricing = useMutation({ mutationFn: (hotelId:number) => apiDelete(`/api/owner/pricing/${hotelId}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","hotels",ownerId] }) })
  const respondReview = useMutation({ mutationFn: (p: { id:number; response:string }) => apiPost(`/api/owner/reviews/${p.id}/respond`, { response: p.response }), onSuccess: () => qc.invalidateQueries({ queryKey: ["owner","reviews",ownerId] }) })

  const [hotelForm, setHotelForm] = React.useState({ name:"", location:"", price:0, amenities:"", description:"" })
  const [amenitiesEdit, setAmenitiesEdit] = React.useState<{ [id:number]: string }>({})
  const [descriptionEdit, setDescriptionEdit] = React.useState<{ [id:number]: string }>({})
  const [nameEdit, setNameEdit] = React.useState<{ [id:number]: string }>({})
  const [locationEdit, setLocationEdit] = React.useState<{ [id:number]: string }>({})
  const [priceEdit, setPriceEdit] = React.useState<{ [id:number]: string }>({})
  const [statusEdit, setStatusEdit] = React.useState<{ [id:number]: string }>({})
  const [editing, setEditing] = React.useState<{ [id:number]: boolean }>({})
  const [imageFiles, setImageFiles] = React.useState<{ [id:number]: File[] }>({})
  const [docFiles, setDocFiles] = React.useState<{ [id:number]: File[] }>({})
  const [imageUploaded, setImageUploaded] = React.useState<{ [id:number]: boolean }>({})
  const [docUploaded, setDocUploaded] = React.useState<{ [id:number]: boolean }>({})
  const [roomForm, setRoomForm] = React.useState({ hotelId:0, type:"Standard", price:0, members:1, amenities:"", availability:true })
  const [lastRoomId, setLastRoomId] = React.useState<number | null>(null)
  const [roomPhotoFiles, setRoomPhotoFiles] = React.useState<File[]>([])
  const [uploadInfo, setUploadInfo] = React.useState<{ type: 'images' | 'documents' | 'photos' | null; names: string[] }>({ type: null, names: [] })
  const [pricingForm, setPricingForm] = React.useState<{ [id:number]: { normalPrice:string; weekendPrice:string; seasonal:{ start:string; end:string; price:string }[]; specials:{ date:string; price:string }[] } }>({})
  const [pricingType, setPricingType] = React.useState<{ [id:number]: string }>({})
  const [pricingEditing, setPricingEditing] = React.useState<{ [id:number]: boolean }>({})
  const ROOM_TYPES = React.useMemo(() => ['Standard','Deluxe','Suite','Family'], [])
  const [reviewReply, setReviewReply] = React.useState<{ [id:number]: string }>({})
  const [roomEdit, setRoomEdit] = React.useState<{ [id:number]: { price?: string; members?: string; amenities?: string; availability?: boolean; blocked?: boolean; type?: string } }>({})
  const [roomEditing, setRoomEditing] = React.useState<{ [id:number]: boolean }>({})
  const [roomPhotosById, setRoomPhotosById] = React.useState<{ [id:number]: File[] }>({})

  React.useEffect(() => {
    const hs = hotelsQ.data?.hotels || []
    const next: { [id:number]: { normalPrice:string; weekendPrice:string; seasonal:{ start:string; end:string; price:string }[]; specials:{ date:string; price:string }[] } } = {}
    const typesNext: { [id:number]: string } = {}
    hs.forEach((h: Hotel) => {
      const p = h?.pricing || {}
      const normalPrice = String(p?.normalPrice ?? '')
      const weekendPrice = String(p?.weekendPrice ?? '')
      const seasonal = Array.isArray(p?.seasonal) ? p.seasonal.map(s=>({ start:String(s.start||''), end:String(s.end||''), price:String(s.price??'') })) : []
      const specials = Array.isArray(p?.specials) ? p.specials.map(sp=>({ date:String(sp.date||''), price:String(sp.price??'') })) : []
      let np = normalPrice || ''
      if (!np) {
        const rs = rooms.filter(r=>r.hotelId===h.id)
        if (rs.length) {
          np = String(rs[0].price)
          typesNext[h.id] = rs[0].type
        }
      }
      next[h.id] = { normalPrice: np, weekendPrice: weekendPrice || '', seasonal, specials }
    })
    setPricingForm(next)
    setPricingType(typesNext)
  }, [hotelsQ.data, roomsQ.data])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {!feature && (
        <section className="bg-hero-gradient text-primary-foreground py-10">
          <div className="container">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-8 w-8" />
              <h1 className="text-3xl md:text-4xl font-bold">Hotel Owner Dashboard</h1>
            </div>
            <p className="opacity-90">Manage your properties and reservations</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              <Card className="shadow-card hover:shadow-card-hover transition-all"><CardHeader className="pb-2"><CardTitle className="text-sm">Total Bookings</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.data?.totalBookings ?? 0}</div></CardContent></Card>
              <Card className="shadow-card hover:shadow-card-hover transition-all"><CardHeader className="pb-2"><CardTitle className="text-sm">Total Revenue</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">₹{stats.data?.totalRevenue ?? 0}</div></CardContent></Card>
              <Card className="shadow-card hover:shadow-card-hover transition-all"><CardHeader className="pb-2"><CardTitle className="text-sm">Daily Stats</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.data?.dailyStats ?? 0}</div></CardContent></Card>
              <Card className="shadow-card hover:shadow-card-hover transition-all"><CardHeader className="pb-2"><CardTitle className="text-sm">Room Occupancy</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.data?.roomOccupancy ?? 0}%</div></CardContent></Card>
              <Card className="shadow-card hover:shadow-card-hover transition-all"><CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming Arrivals</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.data?.upcomingArrivals?.length ?? 0}</div></CardContent></Card>
            </div>
          </div>
        </section>
        )}
        <div className="container py-8 space-y-8">

        

        {feature === 'register' && (
        <Card className="shadow-card hover:shadow-card-hover transition-all">
          <CardHeader><CardTitle>Hotel Registration</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="Hotel Name" value={hotelForm.name} onChange={e=>setHotelForm({...hotelForm,name:e.target.value})} />
              <Input placeholder="Location" value={hotelForm.location} onChange={e=>setHotelForm({...hotelForm,location:e.target.value})} />
              <Input type="number" placeholder="Base Price" value={hotelForm.price} onChange={e=>setHotelForm({...hotelForm,price:Number(e.target.value)})} />
              <Input className="col-span-3" placeholder="Amenities (comma-separated)" value={hotelForm.amenities} onChange={e=>setHotelForm({...hotelForm,amenities:e.target.value})} />
              <Input className="col-span-3" placeholder="Description" value={hotelForm.description} onChange={e=>setHotelForm({...hotelForm,description:e.target.value})} />
            </div>
            <Button onClick={()=>submitHotel.mutate({ name:hotelForm.name, location:hotelForm.location, price:hotelForm.price, amenities: hotelForm.amenities.split(',').map(s=>s.trim()).filter(Boolean), description: hotelForm.description })} disabled={!hotelForm.name || !hotelForm.location}>Submit Hotel</Button>
            <div className="rounded-lg border overflow-hidden mt-4">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Name</th><th className="p-3">Location</th><th className="p-3">Status</th><th className="p-3">Amenities</th><th className="p-3">Images</th><th className="p-3">Documents</th><th className="p-3">Actions</th></tr></thead>
                <tbody className="[&_tr:hover]:bg-muted/30">
                  {hotels.map(h=>(
                    <tr key={h.id} className="border-t align-top">
                      <td className="p-3">
                        <div className="font-medium mb-2">{h.name}</div>
                        <div className="flex gap-2">
                          <Input placeholder="Name" value={(nameEdit[h.id] ?? h.name ?? "")} onChange={e=>setNameEdit({ ...nameEdit, [h.id]: e.target.value })} disabled={!editing[h.id]} />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-muted-foreground mb-2">{h.location}</div>
                        <div className="flex gap-2">
                          <Input placeholder="Location" value={(locationEdit[h.id] ?? h.location ?? "")} onChange={e=>setLocationEdit({ ...locationEdit, [h.id]: e.target.value })} disabled={!editing[h.id]} />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${h.status === 'approved' ? 'bg-primary/15 text-primary' : h.status === 'rejected' ? 'bg-destructive/15 text-destructive' : h.status === 'suspended' ? 'bg-accent/15 text-foreground' : 'bg-muted text-foreground'}`}>{h.status}</span>
                          <select className="px-2 py-1 rounded border bg-background text-xs" value={(statusEdit[h.id] ?? h.status ?? '')} onChange={e=>setStatusEdit({ ...statusEdit, [h.id]: e.target.value })} disabled={!editing[h.id]}>
                            <option value="approved">approved</option>
                            <option value="rejected">rejected</option>
                            <option value="suspended">suspended</option>
                            <option value="pending">pending</option>
                          </select>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input type="number" placeholder="Base Price" value={(priceEdit[h.id] ?? String(h.price ?? ''))} onChange={e=>setPriceEdit({ ...priceEdit, [h.id]: e.target.value })} disabled={!editing[h.id]} />
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2 flex-wrap">{h.amenities?.map(a=>(<span key={a} className="px-2 py-1 bg-secondary rounded text-xs">{a}</span>))}</div>
                        <div className="flex gap-2 mt-2">
                          <Input placeholder="Amenities" value={amenitiesEdit[h.id]||""} onChange={e=>setAmenitiesEdit({...amenitiesEdit,[h.id]:e.target.value})} disabled={!editing[h.id]} />
                        </div>
                        <div className="mt-4">
                          <label className="text-sm font-medium mb-2 block">Description</label>
                          <Input placeholder="Description" value={descriptionEdit[h.id] ?? (h.description || "")} onChange={e=>setDescriptionEdit({...descriptionEdit,[h.id]:e.target.value})} disabled={!editing[h.id]} />
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2 flex-wrap">{h.images?.map(url=>(<span key={url} className="px-2 py-1 bg-secondary rounded text-xs">{url}</span>))}</div>
                        <div className="flex gap-2 mt-2 items-center">
                          <input type="file" multiple accept="image/*" onChange={e=>setImageFiles({ ...imageFiles, [h.id]: Array.from(e.target.files || []) })} />
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2 flex-wrap">{h.docs?.map(url=>(<span key={url} className="px-2 py-1 bg-secondary rounded text-xs">{url}</span>))}</div>
                        <div className="flex gap-2 mt-2 items-center">
                          <input type="file" multiple onChange={e=>setDocFiles({ ...docFiles, [h.id]: Array.from(e.target.files || []) })} />
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={()=>setEditing({ ...editing, [h.id]: !editing[h.id] })}>{editing[h.id] ? 'Stop Edit' : 'Edit'}</Button>
                          <Button onClick={async ()=>{
                            const name = (nameEdit[h.id] ?? h.name ?? '')
                            const location = (locationEdit[h.id] ?? h.location ?? '')
                            const price = Number(priceEdit[h.id] ?? h.price ?? 0)
                            const description = (descriptionEdit[h.id] ?? h.description ?? '')
                            const amenities = (amenitiesEdit[h.id]||'').split(',').map(s=>s.trim()).filter(Boolean)
                            const status = (statusEdit[h.id] ?? h.status ?? '')
                            if (name || location || price || description || status) updateInfo.mutate({ id:h.id, name, location, price, description, status })
                            updateAmenities.mutate({ id:h.id, amenities })
                          }}>Update</Button>
                          <Button variant="secondary" onClick={async ()=>{
                            const imgFiles = (imageFiles[h.id]||[]).slice(0,10)
                            if (imgFiles.length) {
                              const toDataUrl = (f: File) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result||'')); r.onerror = reject; r.readAsDataURL(f) })
                              const dataUrls = await Promise.all(imgFiles.map(toDataUrl))
                              updateImages.mutate({ id:h.id, images: dataUrls })
                              setUploadInfo({ type:'images', names: imgFiles.map(f=>f.name) })
                            }
                            const docNames = Array.from(new Set((docFiles[h.id]||[]).map(f=>f.name))).slice(0,10)
                            if (docNames.length) { updateDocs.mutate({ id:h.id, docs: docNames }); setUploadInfo({ type:'documents', names: docNames }) }
                          }}>Add</Button>
                          <Button variant="destructive" onClick={()=>deleteHotel.mutate(h.id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        )}

        {feature === 'rooms' && (
        <Card className="shadow-card hover:shadow-card-hover transition-all">
          <CardHeader><CardTitle>Manage Rooms</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-6 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Hotel ID</label>
                <Input type="number" value={roomForm.hotelId} onChange={e=>setRoomForm({...roomForm,hotelId:Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <select className="w-full px-4 py-2 rounded-lg border bg-background" value={roomForm.type} onChange={e=>setRoomForm({...roomForm,type:e.target.value})}>
                  {ROOM_TYPES.map(t => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Price</label>
                <Input type="number" value={roomForm.price} onChange={e=>setRoomForm({...roomForm,price:Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Members</label>
                <Input type="number" value={roomForm.members} onChange={e=>setRoomForm({...roomForm,members:Number(e.target.value)})} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-2 block">Amenities (comma-separated)</label>
                <Input value={roomForm.amenities} onChange={e=>setRoomForm({...roomForm,amenities:e.target.value})} />
              </div>
              <div className="col-span-3 flex items-center gap-3">
                <input type="file" multiple accept="image/*" onChange={e=>setRoomPhotoFiles(Array.from(e.target.files || []).slice(0,10))} />
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={roomForm.availability} onChange={e=>setRoomForm({...roomForm,availability:e.target.checked})} />
                  <span className="text-sm">Available</span>
                </div>
              </div>
              <div className="col-span-3 flex items-end">
                <Button onClick={async ()=>{
                  const files = roomPhotoFiles.slice(0,10)
                  const toDataUrl = (f: File) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result||'')); r.onerror = reject; r.readAsDataURL(f) })
                  const photos = files.length ? await Promise.all(files.map(toDataUrl)) : []
                  createRoom.mutate({ hotelId:roomForm.hotelId, type:roomForm.type, price:roomForm.price, members:roomForm.members, amenities: roomForm.amenities.split(',').map(s=>s.trim()).filter(Boolean), photos, availability: roomForm.availability })
                  setUploadInfo({ type:'photos', names: files.map(f=>f.name) })
                }} disabled={!roomForm.hotelId || !roomForm.type}>Add Room</Button>
              </div>
            </div>
            <div className="rounded-lg border overflow-hidden mt-4">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Hotel</th><th className="p-3">Type</th><th className="p-3">Price</th><th className="p-3">Members</th><th className="p-3">Amenities</th><th className="p-3">Photos</th><th className="p-3">Availability</th><th className="p-3">Blocked</th><th className="p-3">Actions</th></tr></thead>
                <tbody className="[&_tr:hover]:bg-muted/30">
                  {rooms.map(r=>(
                    <tr key={r.id} className="border-t">
                      <td className="p-3">{r.hotelId}</td>
                      <td className="p-3">
                        <select className="px-2 py-1 rounded border bg-background text-sm" value={roomEdit[r.id]?.type ?? r.type} onChange={e=>setRoomEdit({ ...roomEdit, [r.id]: { ...(roomEdit[r.id]||{}), type: e.target.value } })} disabled={!roomEditing[r.id]}>
                          {ROOM_TYPES.map(t => (<option key={t} value={t}>{t}</option>))}
                          {(!['Standard','Deluxe','Suite','Family'].includes(r.type)) && <option value={r.type}>{r.type}</option>}
                        </select>
                      </td>
                      <td className="p-3">
                        <Input type="number" className="w-24" placeholder="₹" value={(roomEdit[r.id]?.price ?? String(r.price))} onChange={e=>setRoomEdit({ ...roomEdit, [r.id]: { ...(roomEdit[r.id]||{}), price:e.target.value } })} disabled={!roomEditing[r.id]} />
                      </td>
                      <td className="p-3">
                        <Input type="number" className="w-20" placeholder="#" value={(roomEdit[r.id]?.members ?? String(r.members))} onChange={e=>setRoomEdit({ ...roomEdit, [r.id]: { ...(roomEdit[r.id]||{}), members:e.target.value } })} disabled={!roomEditing[r.id]} />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap mb-2">{r.amenities?.map(a=>(<span key={a} className="px-2 py-1 bg-secondary rounded text-xs">{a}</span>))}</div>
                        <Input placeholder="amenities" value={(roomEdit[r.id]?.amenities ?? '')} onChange={e=>setRoomEdit({ ...roomEdit, [r.id]: { ...(roomEdit[r.id]||{}), amenities:e.target.value } })} disabled={!roomEditing[r.id]} />
                      </td>
                      <td className="p-3">
                        {(r.photos?.length||0)}
                        <div className="mt-2">
                          <input type="file" multiple accept="image/*" onChange={e=>setRoomPhotosById({ ...roomPhotosById, [r.id]: Array.from(e.target.files||[]).slice(0,10) })} disabled={!roomEditing[r.id]} />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${r.availability ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground'}`}>{r.availability ? 'Available' : 'Unavailable'}</span>
                          <input type="checkbox" checked={(roomEdit[r.id]?.availability ?? r.availability)} onChange={e=>setRoomEdit({ ...roomEdit, [r.id]: { ...(roomEdit[r.id]||{}), availability:e.target.checked } })} disabled={!roomEditing[r.id]} />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${r.blocked ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>{r.blocked ? 'Blocked' : 'Free'}</span>
                          <input type="checkbox" checked={(roomEdit[r.id]?.blocked ?? r.blocked)} onChange={e=>setRoomEdit({ ...roomEdit, [r.id]: { ...(roomEdit[r.id]||{}), blocked:e.target.checked } })} disabled={!roomEditing[r.id]} />
                        </div>
                      </td>
                      <td className="p-3 flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={()=>setRoomEditing({ ...roomEditing, [r.id]: !roomEditing[r.id] })}>{roomEditing[r.id]?'Stop Edit':'Edit'}</Button>
                        <Button size="sm" onClick={async ()=>{
                          const edits = roomEdit[r.id]||{}
                          const payload: { price?:number; members?:number; amenities?:string[]; availability?:boolean; photos?:string[]; type?:string } = {}
                          if (edits.price!==undefined) payload.price = Number(edits.price)
                          if (edits.members!==undefined) payload.members = Number(edits.members)
                          if (edits.amenities!==undefined) payload.amenities = (edits.amenities||'').split(',').map(s=>s.trim()).filter(Boolean)
                          if (edits.availability!==undefined) payload.availability = !!edits.availability
                          if (edits.type!==undefined) payload.type = String(edits.type)
                          updateRoom.mutate({ id:r.id, ...payload })
                          if (edits.blocked!==undefined) blockRoom.mutate({ id:r.id, blocked: !!edits.blocked })
                        }}>Update</Button>
                        <Button size="sm" variant="secondary" onClick={async ()=>{
                          const files = (roomPhotosById[r.id]||[])
                          if (files.length) {
                            const toDataUrl = (f: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result||'')); reader.onerror = reject; reader.readAsDataURL(f) })
                            const dataUrls = await Promise.all(files.map(toDataUrl))
                            updateRoom.mutate({ id:r.id, photos: dataUrls })
                            setUploadInfo({ type:'photos', names: files.map(f=>f.name) })
                          }
                        }}>Add</Button>
                        <Button size="sm" variant="destructive" onClick={()=>apiDelete(`/api/owner/rooms/${r.id}`).then(()=>qc.invalidateQueries({ queryKey:["owner","rooms",ownerId] }))}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Upload result popup */}
        {uploadInfo.type && (
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="bg-card border rounded-lg shadow-card p-6 w-[400px]">
              <div className="text-lg font-semibold mb-2">{uploadInfo.type === 'images' ? 'Images uploaded' : uploadInfo.type === 'documents' ? 'Documents uploaded' : 'Room photos added'}</div>
              <div className="text-sm text-muted-foreground mb-4">Files:</div>
              <div className="space-y-1 max-h-40 overflow-auto">
                {uploadInfo.names.map(n => (<div key={n} className="text-sm">{n}</div>))}
              </div>
              <div className="mt-4 flex justify-end"><Button onClick={()=>setUploadInfo({ type:null, names:[] })}>Close</Button></div>
            </div>
          </div>
        )}
        {uploadInfo.type && lastRoomId && feature==='rooms' && (()=>{ const lr = rooms.find(x=>x.id===lastRoomId); return lr ? (
            <div className="rounded-lg border p-4 mt-4">
              <div className="text-lg font-bold mb-2">Room Details</div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-sm text-muted-foreground">ID</span><div>{lr.id}</div></div>
                <div><span className="text-sm text-muted-foreground">Hotel</span><div>{lr.hotelId}</div></div>
                <div><span className="text-sm text-muted-foreground">Type</span><div>{lr.type}</div></div>
                <div><span className="text-sm text-muted-foreground">Members</span><div>{lr.members}</div></div>
                <div><span className="text-sm text-muted-foreground">Price</span><div>₹{lr.price}</div></div>
                <div><span className="text-sm text-muted-foreground">Availability</span><div>{lr.availability ? 'Available' : 'Unavailable'}</div></div>
                <div><span className="text-sm text-muted-foreground">Blocked</span><div>{lr.blocked ? 'Blocked' : 'Free'}</div></div>
                <div><span className="text-sm text-muted-foreground">Amenities</span><div className="flex gap-1 flex-wrap">{lr.amenities?.map(a=>(<span key={a} className="px-2 py-1 bg-secondary rounded text-xs">{a}</span>))}</div></div>
                <div><span className="text-sm text-muted-foreground">Photos</span><div className="flex gap-2 flex-wrap">{(lr.photos||[]).map(p=>(<span key={p} className="px-2 py-1 bg-secondary rounded text-xs">{p}</span>))}</div></div>
              </div>
            </div>
          ) : null })()}

        {feature === 'bookings' && (
        <Card className="shadow-card hover:shadow-card-hover transition-all">
          <CardHeader><CardTitle>Manage Bookings</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Booking</th><th className="p-3">Hotel</th><th className="p-3">Room</th><th className="p-3">Dates</th><th className="p-3">Guests</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                <tbody className="[&_tr:hover]:bg-muted/30">
                  {bookings.map(b=>(
                    <tr key={b.id} className="border-t">
                      <td className="p-3">#{b.id}</td>
                      <td className="p-3">{b.hotelId}</td>
                      <td className="p-3">{b.roomId ?? '-'}</td>
                      <td className="p-3">{b.checkIn} → {b.checkOut}</td>
                      <td className="p-3">{b.guests}</td>
                      <td className="p-3">₹{b.total}</td>
                      <td className="p-3"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary">{b.status}</span></td>
                      <td className="p-3 flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={()=>approveBooking.mutate(b.id)}>Approve</Button>
                        <Button size="sm" onClick={()=>checkinBooking.mutate(b.id)}>Check-in</Button>
                        <Button size="sm" variant="outline" onClick={()=>checkoutBooking.mutate(b.id)}>Check-out</Button>
                        {b.status!=='checked_in' && <Button size="sm" variant="destructive" onClick={()=>cancelBooking.mutate(b.id)}>Cancel</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        )}

        {feature === 'pricing' && (
        <Card className="shadow-card hover:shadow-card-hover transition-all">
          <CardHeader><CardTitle>Dynamic Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left"><th className="p-2">Hotel</th><th className="p-2">Normal ₹</th><th className="p-2">Weekend ₹</th><th className="p-2">Seasonal</th><th className="p-2">Special Days</th><th className="p-2">Actions</th></tr></thead>
                <tbody>
                  {hotels.map(h=>{
                    const pf = pricingForm[h.id]||{ normalPrice:"", weekendPrice:"", seasonal:[], specials:[] }
                    return (
                      <tr key={h.id} className="border-t">
                        <td className="p-2">
                          {h.id} • {h.name}
                          <div className="mt-2">
                            <select className="px-2 py-1 rounded border bg-background text-xs" value={pricingType[h.id]||''} onChange={e=>{
                              const sel = e.target.value
                              setPricingType({ ...pricingType, [h.id]: sel })
                              const rr = rooms.find(r=>r.hotelId===h.id && r.type===sel)
                              const fallback = String(h.price ?? '')
                              setPricingForm({ ...pricingForm, [h.id]: { ...pf, normalPrice: String(rr?.price ?? fallback) } })
                            }} disabled={!pricingEditing[h.id]}>
                              <option value="">Select room type</option>
                              {Array.from(new Set([...
                                ROOM_TYPES,
                                ...rooms.filter(r=>r.hotelId===h.id).map(r=>r.type)
                              ])).map(t => (<option key={`${h.id}-${t}`} value={t}>{t}</option>))}
                            </select>
                          </div>
                        </td>
                        <td className="p-2"><Input placeholder="₹" value={pf.normalPrice} onChange={e=>setPricingForm({ ...pricingForm, [h.id]: { ...pf, normalPrice: e.target.value } })} disabled={!pricingEditing[h.id]} /></td>
                        <td className="p-2"><Input placeholder="₹" value={pf.weekendPrice} onChange={e=>setPricingForm({ ...pricingForm, [h.id]: { ...pf, weekendPrice: e.target.value } })} disabled={!pricingEditing[h.id]} /></td>
                        <td className="p-2">
                          <div className="space-y-2">
                            {(pf.seasonal||[]).map((row,idx)=> (
                              <div key={idx} className="grid grid-cols-4 gap-2">
                                <Input placeholder="Start" value={row.start} onChange={e=>{
                                  const next = (pf.seasonal||[]).slice(); next[idx] = { ...row, start: e.target.value }; setPricingForm({ ...pricingForm, [h.id]: { ...pf, seasonal: next } })
                                }} disabled={!pricingEditing[h.id]} />
                                <Input placeholder="End" value={row.end} onChange={e=>{
                                  const next = (pf.seasonal||[]).slice(); next[idx] = { ...row, end: e.target.value }; setPricingForm({ ...pricingForm, [h.id]: { ...pf, seasonal: next } })
                                }} disabled={!pricingEditing[h.id]} />
                                <Input placeholder="₹" value={row.price} onChange={e=>{
                                  const next = (pf.seasonal||[]).slice(); next[idx] = { ...row, price: e.target.value }; setPricingForm({ ...pricingForm, [h.id]: { ...pf, seasonal: next } })
                                }} disabled={!pricingEditing[h.id]} />
                                <Button variant="outline" onClick={()=>{
                                  const next = (pf.seasonal||[]).filter((_,i)=>i!==idx); setPricingForm({ ...pricingForm, [h.id]: { ...pf, seasonal: next } })
                                }} disabled={!pricingEditing[h.id]}>Remove</Button>
                              </div>
                            ))}
                            <Button size="sm" variant="secondary" onClick={()=>{
                              const next = (pf.seasonal||[]).concat({ start:"", end:"", price:"" }); setPricingForm({ ...pricingForm, [h.id]: { ...pf, seasonal: next } })
                            }} disabled={!pricingEditing[h.id]}>Add Seasonal</Button>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="space-y-2">
                            {(pf.specials||[]).map((row,idx)=> (
                              <div key={idx} className="grid grid-cols-3 gap-2">
                                <Input placeholder="Date" value={row.date} onChange={e=>{
                                  const next = (pf.specials||[]).slice(); next[idx] = { ...row, date: e.target.value }; setPricingForm({ ...pricingForm, [h.id]: { ...pf, specials: next } })
                                }} disabled={!pricingEditing[h.id]} />
                                <Input placeholder="₹" value={row.price} onChange={e=>{
                                  const next = (pf.specials||[]).slice(); next[idx] = { ...row, price: e.target.value }; setPricingForm({ ...pricingForm, [h.id]: { ...pf, specials: next } })
                                }} disabled={!pricingEditing[h.id]} />
                                <Button variant="outline" onClick={()=>{
                                  const next = (pf.specials||[]).filter((_,i)=>i!==idx); setPricingForm({ ...pricingForm, [h.id]: { ...pf, specials: next } })
                                }} disabled={!pricingEditing[h.id]}>Remove</Button>
                              </div>
                            ))}
                            <Button size="sm" variant="secondary" onClick={()=>{
                              const next = (pf.specials||[]).concat({ date:"", price:"" }); setPricingForm({ ...pricingForm, [h.id]: { ...pf, specials: next } })
                            }} disabled={!pricingEditing[h.id]}>Add Special Day</Button>
                          </div>
                        </td>
                        <td className="p-2 flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" onClick={()=>setPricingEditing({ ...pricingEditing, [h.id]: !pricingEditing[h.id] })}>{pricingEditing[h.id] ? 'Stop Edit' : 'Edit'}</Button>
                          <Button size="sm" onClick={()=>updatePricing.mutate({ hotelId: h.id, normalPrice: pf.normalPrice ? Number(pf.normalPrice) : undefined, weekendPrice: pf.weekendPrice ? Number(pf.weekendPrice) : undefined, seasonal: (pf.seasonal||[]).filter(s=>s.start&&s.end&&s.price).map(s=>({ start:s.start, end:s.end, price:Number(s.price) })), specials: (pf.specials||[]).filter(sp=>sp.date&&sp.price).map(sp=>({ date:sp.date, price:Number(sp.price) })) })} disabled={!pricingEditing[h.id]}>Update</Button>
                          <Button size="sm" variant="destructive" onClick={()=>deletePricing.mutate(h.id)}>Delete</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        )}

        {feature === 'reviews' && (
        <Card className="shadow-card hover:shadow-card-hover transition-all">
          <CardHeader><CardTitle>Review Management</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reviews.map(r=>(
                <div key={r.id} className="border rounded-lg p-3 bg-card">
                  <div className="text-sm font-medium">Hotel {r.hotelId} • {r.rating}/5</div>
                  <div className="text-sm text-muted-foreground">{r.comment}</div>
                  <div className="flex gap-2 mt-2">
                    <Input placeholder="Response" value={reviewReply[r.id]||""} onChange={e=>setReviewReply({ ...reviewReply, [r.id]: e.target.value })} />
                    <Button onClick={()=>respondReview.mutate({ id:r.id, response: reviewReply[r.id]||"" })}>Respond</Button>
                  </div>
                </div>
              ))}
              {reviews.length===0 && <div className="text-sm text-muted-foreground">No reviews yet</div>}
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

export default OwnerDashboard