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
    "Passport": /^[A-Za-z]{1}\d{7}$/,
    "Driving Licence": /^[A-Z0-9]{8,20}$/,
    "Voter ID": /^[A-Z]{3}\d{7}$/,
    "PAN card (usually not accepted as primary ID)": /^[A-Z]{5}\d{4}[A-Z]$/,
  }
  const idHints: { [k:string]: string } = {
    "Aadhaar Card": "12 digits",
    "Passport": "Letter + 7 digits",
    "Driving Licence": "8-20 alphanumeric",
    "Voter ID": "3 letters + 7 digits",
    "PAN card (usually not accepted as primary ID)": "AAAAA9999A",
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
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            {(() => {
              const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>
              const logo = env?.VITE_LOGO_URL || "/logo.svg";
              return <img src={logo} alt="Sana Stayz" className="h-12 w-12 mx-auto mb-4 rounded-full object-cover" onError={(e)=>{ e.currentTarget.src = "https://placehold.co/96x96?text=S" }} />
            })()}
            <h1 className="text-3xl font-bold mb-2">Create Account</h1>
            <p className="text-muted-foreground">
              Join Sana Stayz and start your journey
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-card p-8">
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
                  <Input placeholder={idHints[idType]} value={idNumber} onChange={(e)=>{ const v=e.target.value; const upperNeeded = idType.includes("PAN") || idType==="Voter ID" || idType==="Driving Licence" || idType==="Passport"; setIdNumber(upperNeeded ? v.toUpperCase() : v) }} />
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

              <Button className="w-full" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create Account"}</Button>
              {mutation.isError && <div className="text-red-600 text-sm">Registration failed</div>}
              {mutation.isSuccess && <div className="text-green-600 text-sm">Account created</div>}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign up with Google
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/signin" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Register;
