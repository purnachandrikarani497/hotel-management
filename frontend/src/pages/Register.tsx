import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [fullName, setFullName] = useState("")
  const [dob, setDob] = useState("")
  const [address, setAddress] = useState("")
  const [idType, setIdType] = useState("Aadhaar Card")
  const [idNumber, setIdNumber] = useState("")
  const [idIssueDate, setIdIssueDate] = useState("")
  const [idExpiryDate, setIdExpiryDate] = useState("")
  const [idDocImage, setIdDocImage] = useState<string>("")
  const [agree, setAgree] = useState(false)
  const [showA, setShowA] = useState(false)
  const [showB, setShowB] = useState(false)
  const idPatterns: { [k:string]: RegExp } = {
    "Aadhaar Card": /^\d{12}$/,
    "Passport": /^[A-Z]\d{7}$/,
    "Driving Licence": /^[A-Z0-9]{8,20}$/,
    "Voter ID": /^[A-Z]{3}\d{7}$/,
    "PAN card (usually not accepted as primary ID)": /^[A-Z0-9]{10}$/,
  }
  const idHints: { [k:string]: string } = {
    "Aadhaar Card": "12 digits",
    "Passport": "Letter + 7 digits",
    "Driving Licence": "8-20 alphanumeric",
    "Voter ID": "3 letters + 7 digits",
    "PAN card (usually not accepted as primary ID)": "5 letters, 4 digits, 1 letter (ABCDE1234F)",
  }
  const phoneRe = /^[6-9]\d{9}$/
  const validate = (): boolean => {
    if (!firstName || !lastName || !email || !phone || !password || !confirm || !fullName || !dob || !address || !idType || !idNumber) { toast({ title: "Fill all mandatory fields", variant: "destructive" }); return false }
    if (!idDocImage) { toast({ title: "Document required", description: "Please upload your ID document", variant: "destructive" }); return false }
    if (!phoneRe.test(String(phone).trim())) { toast({ title: "Invalid phone", description: "Starts 6-9, exactly 10 digits", variant: "destructive" }); return false }
    if (password !== confirm) { toast({ title: "Passwords do not match", variant: "destructive" }); return false }
    const pat = idPatterns[idType]
    if (pat && !pat.test(String(idNumber).trim())) { toast({ title: "Invalid ID number", description: idHints[idType], variant: "destructive" }); return false }
    if (!agree) { toast({ title: "Accept Terms & Conditions", variant: "destructive" }); return false }
    return true
  }
  const { toast } = useToast()
  const mutation = useMutation({
    mutationFn: () => apiPost("/api/auth/register", { firstName, lastName, email, phone, password, fullName, dob, address, idType, idNumber, idIssueDate, idExpiryDate, idDocImage }),
    onSuccess: () => { toast({ title: "Account created", description: "Welcome!" }) },
    onError: (err: unknown) => {
      const msg = (() => {
        if (err instanceof Error) return String(err.message || '')
        const r = err as { response?: { status?: number; data?: { error?: string } } }
        const status = r?.response?.status || 0
        const e = String(r?.response?.data?.error || '')
        if (status === 409 || /exists/i.test(e)) return 'Email already exists — try another email'
        if (/Missing fields/i.test(e)) return 'Missing required fields'
        return 'Registration failed'
      })()
      toast({ title: msg.includes('Registration failed') ? 'Registration failed' : 'Registration error', description: msg, variant: 'destructive' })
    }
  })
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 relative">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-14 relative overflow-hidden">
          <div className="container">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Create Account</h1>
              <p className="mt-3 text-lg opacity-90">Join Sana Stayz and start your journey</p>
            </div>
          </div>
        </section>
        <div className="container -mt-8 px-4 flex items-start justify-center">
          <div className="w-full max-w-md">
            <div className="relative rounded-lg p-8 pt-12 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0 backdrop-blur-sm transition-all">
              {(() => {
                const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>
                const logo = env?.VITE_LOGO_URL || "/logo.svg";
                return (
                  <img
                    src={logo}
                    alt="Sana Stayz"
                    className="absolute -top-7 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full object-cover border border-white shadow-md bg-white"
                    onError={(e)=>{ e.currentTarget.src = "https://placehold.co/96x96?text=S" }}
                  />
                )
              })()}
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!validate()) return; mutation.mutate(); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">First Name *</label>
                    <Input placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Last Name *</label>
                  <Input placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Email *</label>
                <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Phone Number *</label>
                <Input type="tel" placeholder="10 digits, starts 6-9" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g,""))} maxLength={10} />
              </div>

              <div className="relative">
                <label className="text-sm font-medium mb-2 block">Password *</label>
                <Input type={showA?"text":"password"} placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="absolute right-3 top-[52px] text-muted-foreground" onClick={()=>setShowA(!showA)}>{showA? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
              </div>

              <div className="relative">
                <label className="text-sm font-medium mb-2 block">Confirm Password *</label>
                <Input type={showB?"text":"password"} placeholder="Confirm your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                <button type="button" className="absolute right-3 top-[52px] text-muted-foreground" onClick={()=>setShowB(!showB)}>{showB? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
              </div>
              {password && confirm && password !== confirm && (
                <div className="text-xs text-destructive">Passwords must match</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Full Name *</label>
                  <Input placeholder="As per ID" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Date of Birth *</label>
                  <Input type="date" value={dob} onChange={(e)=>setDob(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Address *</label>
                <Input placeholder="Residential address" value={address} onChange={(e)=>setAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">ID Type *</label>
                  <select className="w-full border rounded h-10 px-3 bg-background" value={idType} onChange={(e)=>setIdType(e.target.value)}>
                    <option>Aadhaar Card</option>
                    <option>Passport</option>
                    <option>Driving Licence</option>
                    <option>Voter ID</option>
                    <option>PAN card (usually not accepted as primary ID)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">ID Number *</label>
                  <Input 
                    placeholder={idHints[idType]} 
                    value={idNumber} 
                    onChange={(e)=>{ 
                      let v = e.target.value;
                      if (idType === "Aadhaar Card") {
                        v = v.replace(/\D/g, "").slice(0, 12);
                      } else if (idType === "Passport") {
                        v = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
                      } else if (idType.includes("PAN")) {
                        v = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
                      } else {
                        v = v.toUpperCase();
                      }
                      setIdNumber(v)
                    }} 
                  />
                  <div className="text-xs text-muted-foreground mt-1">Format: {idHints[idType]}</div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Document Upload *</label>
                  <Input type="file" accept="image/*" onChange={(e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ const d=r.result as string; setIdDocImage(d||"") }; r.readAsDataURL(f) }} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Issue Date</label>
                  <Input type="date" value={idIssueDate} onChange={(e)=>setIdIssueDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Expiry Date</label>
                  <Input type="date" value={idExpiryDate} onChange={(e)=>setIdExpiryDate(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="terms" checked={agree} onCheckedChange={(v)=>setAgree(!!v)} />
                <label htmlFor="terms" className="text-sm cursor-pointer">
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms & Conditions
                  </Link>
                  {" "}*
                </label>
              </div>

              <Button className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create Account"}</Button>
              {mutation.isError && <div className="text-red-600 text-sm">Registration failed</div>}
              {mutation.isSuccess && <div className="text-green-600 text-sm">Account created</div>}
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/signin" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Register;
