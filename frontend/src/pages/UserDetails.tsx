import * as React from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type User = { id:number; email:string; firstName?:string; lastName?:string; phone?:string; fullName?:string; dob?:string; address?:string; idType?:string; idNumber?:string; idIssueDate?:string; idExpiryDate?:string; idDocUrl?:string }

const UserDetails = () => {
  const raw = typeof window !== "undefined" ? localStorage.getItem("auth") : null
  const auth = raw ? JSON.parse(raw) as { user?: { id?: number } } : null
  const userId = auth?.user?.id || 0
  const { toast } = useToast()
  const qc = useQueryClient()

  const detailsQ = useQuery({ queryKey: ["user","details",userId], queryFn: () => apiGet<{ user: User }>(`/api/user/details?userId=${userId}`), enabled: !!userId })
  const u = detailsQ.data?.user

  const [form, setForm] = React.useState<User | null>(null)
  React.useEffect(() => { if (u) setForm(u) }, [u])

  type Payload = Partial<User> & { idDocImage?: string }
  const update = useMutation({ mutationFn: (p: Payload) => apiPost(`/api/user/details`, { userId, ...p }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["user","details",userId] }); toast({ title: "Details updated" }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })
  const [docPreview, setDocPreview] = React.useState<string>("")
  const resolve = (u?: string) => { if (!u) return ""; const s = String(u); if (s.startsWith("/uploads")) return `http://localhost:3015${s}`; if (s.startsWith("uploads")) return `http://localhost:3015/${s}`; return s }
  const [errors, setErrors] = React.useState<{ [k:string]: string }>({})
  const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
  const validateId = (type?: string, num?: string) => {
    const t = String(type||"")
    const n = String(num||"")
    if (!t || !n) return ""
    if (t === "Aadhaar Card" && !/^\d{12}$/.test(n)) return "Aadhaar must be 12 digits"
    if (t === "Passport" && !/^[A-Za-z][0-9]{7}$/.test(n)) return "Passport: 1 letter + 7 digits"
    if (t === "Driving Licence" && !/^[A-Za-z0-9-]{5,20}$/.test(n)) return "DL: 5-20 alphanumeric"
    if (t === "Voter ID" && !/^[A-Za-z]{3}[0-9]{7}$/.test(n)) return "Voter ID: 3 letters + 7 digits"
    if (t === "PAN card" && !/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(n)) return "PAN: 5 letters, 4 digits, 1 letter"
    return ""
  }
  const validate = (): boolean => {
    if (!form) return false
    const errs: { [k:string]: string } = {}
    const idErr = validateId(form.idType, form.idNumber)
    if (idErr) errs.idNumber = idErr
    if (form.dob && !isDate(form.dob)) errs.dob = "Use yyyy-mm-dd"
    if (form.idIssueDate && !isDate(form.idIssueDate)) errs.idIssueDate = "Use yyyy-mm-dd"
    if (form.idExpiryDate && !isDate(form.idExpiryDate)) errs.idExpiryDate = "Use yyyy-mm-dd"
    if (form.idIssueDate && form.idExpiryDate && new Date(form.idExpiryDate) < new Date(form.idIssueDate)) errs.idExpiryDate = "Expiry after issue"
    setErrors(errs)
    if (Object.keys(errs).length) { toast({ title: "Invalid details", description: Object.values(errs)[0], variant: "destructive" }); return false }
    return true
  }

  const blocked = detailsQ.isError

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-hero-gradient text-primary-foreground py-10">
          <div className="container">
            <h1 className="text-3xl md:text-4xl font-bold">User Details</h1>
            <p className="opacity-90">View and edit your profile details</p>
          </div>
        </section>
        <div className="container py-8">
          {blocked && (
            <Card className="shadow-card">
              <CardHeader><CardTitle>Not Available</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">Make at least one booking to access your details.</div>
              </CardContent>
            </Card>
          )}
          {!blocked && form && (
          <Card className="shadow-card hover:shadow-card-hover transition-all">
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <Label>Email</Label>
                  <Input placeholder="Email" value={form.email||""} readOnly />
                </div>
                <div className="col-span-1">
                  <Label>Phone Number</Label>
                  <Input placeholder="Phone" value={form.phone||""} onChange={e=>setForm({ ...(form as User), phone: e.target.value })} />
                </div>
                <div>
                  <Label>First Name</Label>
                  <Input placeholder="First Name" value={form.firstName||""} onChange={e=>setForm({ ...(form as User), firstName: e.target.value })} />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input placeholder="Last Name" value={form.lastName||""} onChange={e=>setForm({ ...(form as User), lastName: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Full Name</Label>
                  <Input placeholder="Full Name" value={form.fullName||""} onChange={e=>setForm({ ...(form as User), fullName: e.target.value })} />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.dob||""} onChange={e=>setForm({ ...(form as User), dob: e.target.value })} />
                  {errors.dob && <div className="text-xs text-destructive mt-1">{errors.dob}</div>}
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input className="col-span-2" placeholder="Address" value={form.address||""} onChange={e=>setForm({ ...(form as User), address: e.target.value })} />
                </div>
                <div>
                  <Label>ID Type</Label>
                  <Select value={form.idType||""} onValueChange={(v)=>setForm({ ...(form as User), idType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select ID Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aadhaar Card">Aadhaar Card</SelectItem>
                      <SelectItem value="Passport">Passport</SelectItem>
                      <SelectItem value="Driving Licence">Driving Licence</SelectItem>
                      <SelectItem value="Voter ID">Voter ID</SelectItem>
                      <SelectItem value="PAN card">PAN card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ID Number</Label>
                  <Input placeholder="ID Number" value={form.idNumber||""} onChange={e=>setForm({ ...(form as User), idNumber: e.target.value })} />
                  {errors.idNumber && <div className="text-xs text-destructive mt-1">{errors.idNumber}</div>}
                </div>
                <div>
                  <Label>Issue Date</Label>
                  <Input type="date" value={form.idIssueDate||""} onChange={e=>setForm({ ...(form as User), idIssueDate: e.target.value })} />
                  {errors.idIssueDate && <div className="text-xs text-destructive mt-1">{errors.idIssueDate}</div>}
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.idExpiryDate||""} onChange={e=>setForm({ ...(form as User), idExpiryDate: e.target.value })} />
                  {errors.idExpiryDate && <div className="text-xs text-destructive mt-1">{errors.idExpiryDate}</div>}
                </div>
                <div className="col-span-2">
                  <Label>Document Upload</Label>
                  <Input type="file" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if(!f) return; if(!f.type.startsWith('image/')){ toast({ title:'Invalid file type', variant:'destructive' }); return } const max=2*1024*1024; if(f.size>max){ toast({ title:'File too large', description:'Max 2MB', variant:'destructive' }); return } const r=new FileReader(); r.onload=()=>{ const s=String(r.result||""); if(!s.startsWith('data:image/')){ toast({ title:'Invalid file content', variant:'destructive' }); return } setDocPreview(s) }; r.readAsDataURL(f) }} />
                  <div className="mt-2">
                    {form.idDocUrl && !docPreview && <img src={resolve(form.idDocUrl)} alt="ID" className="h-24 border rounded" onError={(ev)=>{ ev.currentTarget.style.display='none' }} />}
                    {docPreview && <img src={docPreview} alt="Preview" className="h-24 border rounded" />}
                  </div>
                </div>
              </div>
              <Button onClick={()=>{ if(!validate()) return; update.mutate({ ...form!, idDocImage: docPreview && docPreview.startsWith('data:') ? docPreview : undefined }) }}>Save</Button>
            </CardContent>
          </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default UserDetails
