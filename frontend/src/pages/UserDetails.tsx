import * as React from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"

type User = { id:number; email:string; firstName?:string; lastName?:string; phone?:string; fullName?:string; dob?:string; address?:string; idType?:string; idNumber?:string; idIssueDate?:string; idExpiryDate?:string; idDocUrl?:string }

const UserDetails = () => {
  const navigate = useNavigate()
  const raw = typeof window !== "undefined" ? localStorage.getItem("auth") : null
  const auth = raw ? JSON.parse(raw) as { user?: { id?: number } } : null
  const userId = auth?.user?.id || 0
  const { toast } = useToast()
  const qc = useQueryClient()

  const detailsQ = useQuery({ queryKey: ["user","details",userId], queryFn: () => apiGet<{ user: User }>(`/api/user/details?userId=${userId}`), enabled: !!userId })
  const u = detailsQ.data?.user

  const [form, setForm] = React.useState<User | null>(null)
  React.useEffect(() => { if (u) setForm(u) }, [u])

  const [docPreview, setDocPreview] = React.useState<string>("")
  const resolve = (u?: string) => { if (!u) return ""; const s = String(u); const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>; const base = env?.VITE_API_URL || env?.VITE_API_BASE || ''; if (s.startsWith("/uploads")) return base ? `${base}${s}` : s; if (s.startsWith("uploads")) return base ? `${base}/${s}` : `/${s}`; return s }
  
  const idHints: { [k:string]: string } = {
    "Aadhaar Card": "12 digits",
    "Passport": "Letter + 7 digits",
    "Driving Licence": "8-20 alphanumeric",
    "Voter ID": "3 letters + 7 digits",
    "PAN card (usually not accepted as primary ID)": "5 letters, 4 digits, 1 letter (ABCDE1234F)",
    "PAN card": "5 letters, 4 digits, 1 letter (ABCDE1234F)", // handle both key variants just in case
  }

  type Payload = Partial<User> & { idDocImage?: string }
  const update = useMutation({ mutationFn: (p: Payload) => apiPost(`/api/user/details`, { userId, ...p }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["user","details",userId] }); toast({ title: "Details updated" }) }, onError: () => toast({ title: "Update failed", variant: "destructive" }) })

  const validate = (): boolean => {
    if (!form) return false
    
    // First Name
    if (!form.firstName?.trim()) { toast({ title: "Please enter the first name", variant: "destructive" }); return false }
    if (!/^[a-zA-Z]+$/.test(form.firstName)) { toast({ title: "Invalid first name", description: "Only characters allowed", variant: "destructive" }); return false }
    if (form.firstName.length > 20) { toast({ title: "Maximum limit exceeded", description: "First name max 20 characters", variant: "destructive" }); return false }

    // Last Name
    if (!form.lastName?.trim()) { toast({ title: "Please enter the lastname", variant: "destructive" }); return false }
    if (!/^[a-zA-Z]+$/.test(form.lastName)) { toast({ title: "Invalid last name", description: "Only characters allowed", variant: "destructive" }); return false }
    if (form.lastName.length > 20) { toast({ title: "Maximum limit exceeded", description: "Last name max 20 characters", variant: "destructive" }); return false }

    // Phone
    if (!form.phone) { toast({ title: "Please enter the Phone number", variant: "destructive" }); return false }
    if (!/^[6-9]\d{9}$/.test(form.phone)) { toast({ title: "Invalid phone", description: "Starts 6-9, exactly 10 digits", variant: "destructive" }); return false }

    // Full Name
    if (!form.fullName?.trim()) { toast({ title: "Please enter the Full name", variant: "destructive" }); return false }
    if (!/^[a-zA-Z\s]+$/.test(form.fullName)) { toast({ title: "Invalid Full name", description: "Only characters allowed", variant: "destructive" }); return false }
    if (form.fullName.length > 50) { toast({ title: "Maximum limit exceeded", description: "Full name max 50 characters", variant: "destructive" }); return false }

    // DOB
    if (!form.dob) { toast({ title: "Fill all mandatory fields", variant: "destructive" }); return false }
    if (new Date(form.dob) > new Date()) { toast({ title: "Invalid Date of Birth", description: "Future dates not allowed", variant: "destructive" }); return false }

    // Address
    if (!form.address?.trim()) { toast({ title: "Please enter the Address", variant: "destructive" }); return false }
    if (!/^[a-zA-Z0-9\s,.-]+$/.test(form.address)) { toast({ title: "Invalid Address", description: "Only characters & numbers allowed", variant: "destructive" }); return false }
    if (form.address.length > 100) { toast({ title: "Maximum limit exceeded", description: "Address max 100 characters", variant: "destructive" }); return false }

    // ID Type & Number
    if (!form.idType) { toast({ title: "Please enter the ID Type", variant: "destructive" }); return false }
    if (!form.idNumber?.trim()) { toast({ title: "Missing ID Number", variant: "destructive" }); return false }

    const idType = form.idType
    const idNumber = form.idNumber
    if (idType === "Aadhaar Card") {
        if (!/^\d{12}$/.test(idNumber)) { toast({ title: "Invalid ID Type", description: "Aadhaar must be 12 digits number", variant: "destructive" }); return false }
    } else if (idType === "Passport") {
        if (!/^[A-Za-z]\d{7}$/.test(idNumber)) { toast({ title: "Invalid ID Type", description: "Passport: 1st alphabet & 7 numbers", variant: "destructive" }); return false }
        if (idNumber.length > 8) { toast({ title: "Maximum limit exceeded", description: "Passport max 8 characters", variant: "destructive" }); return false }
    } else if (idType === "Driving Licence") {
        if (!/^[A-Za-z0-9]+$/.test(idNumber)) { toast({ title: "Invalid ID Type", description: "Driving Licence must be alphanumeric", variant: "destructive" }); return false }
        if (idNumber.length > 20) { toast({ title: "Maximum limit exceeded", description: "Driving Licence max 20 characters", variant: "destructive" }); return false }
    } else if (idType === "Voter ID") {
        if (!/^[A-Za-z]{3}\d{7}$/.test(idNumber)) { toast({ title: "Invalid ID Type", description: "Voter ID: 3 letters & 7 numbers", variant: "destructive" }); return false }
        if (idNumber.length > 10) { toast({ title: "Maximum limit exceeded", description: "Voter ID max 10 characters", variant: "destructive" }); return false }
    }

    // Dates
    if (form.idIssueDate && form.idExpiryDate) {
        if (new Date(form.idIssueDate) >= new Date(form.idExpiryDate)) { toast({ title: "issue Date was must be early than the Expiry Date", variant: "destructive" }); return false }
    }

    return true
  }

  const blocked = detailsQ.isError

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-12">
          <div className="container">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">User Details</h1>
                <p className="opacity-90">View and edit your profile details</p>
              </div>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white gap-2 self-start md:self-center"
                onClick={() => navigate('/dashboard/user')}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </section>
        <div className="container py-8">
          {/* {blocked && (
            <Card className="rounded-2xl bg-gradient-to-br from-white via-blue-50 to-cyan-100 shadow-2xl border-0">
              <CardHeader><CardTitle>Not Available</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">Make at least one booking to access your details.</div>
              </CardContent>
            </Card>
          )} */}
          {form && (
          <Card className="rounded-2xl bg-gradient-to-br from-white via-purple-50 to-pink-50 shadow-2xl border-0">
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">First Name</Label>
                  <Input 
                    placeholder="First Name" 
                    value={form.firstName||""} 
                    onChange={e=>{
                      const val = e.target.value;
                      if (val.length > 20) { toast({ title: "Maximum limit exceeded", description: "First name max 20 characters", variant: "destructive" }); return; }
                      setForm({ ...(form as User), firstName: val })
                    }} 
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Last Name</Label>
                  <Input 
                    placeholder="Last Name" 
                    value={form.lastName||""} 
                    onChange={e=>{
                        const val = e.target.value;
                        if (val.length > 20) { toast({ title: "Maximum limit exceeded", description: "Last name max 20 characters", variant: "destructive" }); return; }
                        setForm({ ...(form as User), lastName: val })
                    }} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Email</Label>
                  <Input placeholder="Email" value={form.email||""} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label className="mb-2 block">Phone Number</Label>
                  <Input 
                    placeholder="Phone" 
                    value={form.phone||""} 
                    onChange={e=>{ 
                        const v=(e.target.value||'').replace(/\D/g,''); 
                        if (v.length > 10) { toast({ title: "Maximum limit exceeded", description: "Phone number max 10 digits", variant: "destructive" }); return; }
                        setForm({ ...(form as User), phone: v }) 
                    }} 
                  />
                </div>
              </div>

              <div>
                  <Label className="mb-2 block">Full Name</Label>
                  <Input 
                    placeholder="Full Name" 
                    value={form.fullName||""} 
                    onChange={e=>{
                        const val = e.target.value;
                        if (!/^[a-zA-Z\s]*$/.test(val)) { toast({ title: "Invalid input", description: "Only characters allowed", variant: "destructive" }); return; }
                        if (val.length > 50) { toast({ title: "Maximum limit exceeded", description: "Full name max 50 characters", variant: "destructive" }); return; }
                        setForm({ ...(form as User), fullName: val })
                    }} 
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Date of Birth</Label>
                  <Input type="date" value={form.dob||""} onChange={e=>setForm({ ...(form as User), dob: e.target.value })} max={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <Label className="mb-2 block">Address</Label>
                  <Input 
                    placeholder="Address" 
                    value={form.address||""} 
                    onChange={e=>{
                        const val = e.target.value;
                        if (val.length > 100) { toast({ title: "Maximum limit exceeded", description: "Address max 100 characters", variant: "destructive" }); return; }
                        setForm({ ...(form as User), address: val })
                    }} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-2 block">ID Type</Label>
                  <Select value={form.idType||""} onValueChange={(v)=>setForm({ ...(form as User), idType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select ID Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aadhaar Card">Aadhaar Card</SelectItem>
                      <SelectItem value="Passport">Passport</SelectItem>
                      <SelectItem value="Driving Licence">Driving Licence</SelectItem>
                      <SelectItem value="Voter ID">Voter ID</SelectItem>
                      <SelectItem value="PAN card (usually not accepted as primary ID)">PAN card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">ID Number</Label>
                  <Input 
                    placeholder="ID Number" 
                    value={form.idNumber||""} 
                    onChange={e=>{ 
                      let v = e.target.value;
                      const type = form.idType || "";
                      if (type === "Aadhaar Card") {
                        v = v.replace(/\D/g, "").slice(0, 12);
                      } else if (type === "Passport") {
                        v = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
                      } else if (type.includes("PAN")) {
                        v = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
                      } else {
                        v = v.toUpperCase();
                      }
                      setForm({ ...(form as User), idNumber: v }) 
                    }} 
                  />
                  <div className="text-xs text-muted-foreground mt-1">Format: {idHints[form.idType||""] || ""}</div>
                </div>
                <div>
                  <Label className="mb-2 block">Document Upload</Label>
                  <Label 
                    htmlFor="id-doc-upload-edit" 
                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-10 px-4 py-2 w-full"
                  >
                    Choose File
                  </Label>
                  <Input 
                    id="id-doc-upload-edit"
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={e=>{ const f=e.target.files?.[0]; if(!f) return; if(!f.type.startsWith('image/')){ toast({ title:'Invalid file type', variant:'destructive' }); return } const max=2*1024*1024; if(f.size>max){ toast({ title:'File too large', description:'Max 2MB', variant:'destructive' }); return } const r=new FileReader(); r.onload=()=>{ const s=String(r.result||""); if(!s.startsWith('data:image/')){ toast({ title:'Invalid file content', variant:'destructive' }); return } setDocPreview(s); toast({ title: 'Updated' }) }; r.readAsDataURL(f) }} 
                  />
                  <div className="mt-2">
                    {form.idDocUrl && !docPreview && <img src={resolve(form.idDocUrl)} alt="ID" className="h-24 border rounded" onError={(ev)=>{ ev.currentTarget.style.display='none' }} />}
                    {docPreview && <img src={docPreview} alt="Preview" className="h-24 border rounded" />}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Issue Date</Label>
                  <Input type="date" value={form.idIssueDate||""} onChange={e=>setForm({ ...(form as User), idIssueDate: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-2 block">Expiry Date</Label>
                  <Input type="date" value={form.idExpiryDate||""} onChange={e=>setForm({ ...(form as User), idExpiryDate: e.target.value })} />
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white" onClick={()=>{ if(!validate()) return; update.mutate({ ...form!, idDocImage: docPreview && docPreview.startsWith('data:') ? docPreview : undefined }) }}>Save Changes</Button>
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
