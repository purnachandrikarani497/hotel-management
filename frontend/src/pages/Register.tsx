import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate()
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
    // First Name
    if (!firstName.trim()) { toast({ title: "Please enter the first name", variant: "destructive" }); return false }
    if (!/^[a-zA-Z]+$/.test(firstName)) { toast({ title: "Invalid first name", description: "Only characters allowed", variant: "destructive" }); return false }
    if (firstName.length > 20) { toast({ title: "Maximum limit exceeded", description: "First name max 20 characters", variant: "destructive" }); return false }

    // Last Name
    if (!lastName.trim()) { toast({ title: "Please enter the lastname", variant: "destructive" }); return false }
    if (!/^[a-zA-Z]+$/.test(lastName)) { toast({ title: "Invalid last name", description: "Only characters allowed", variant: "destructive" }); return false }
    if (lastName.length > 20) { toast({ title: "Maximum limit exceeded", description: "Last name max 20 characters", variant: "destructive" }); return false }

    // Email
    if (!email.trim()) { toast({ title: "Please enter the Email", variant: "destructive" }); return false }
    if (!email.includes('@')) { toast({ title: "Invalid email", description: "Email must contain '@'", variant: "destructive" }); return false }
    // Basic email regex
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast({ title: "Invalid email", variant: "destructive" }); return false }
    if (email.length > 20) { toast({ title: "Maximum limit exceeded", description: "Email max 20 characters", variant: "destructive" }); return false }

    // Phone
    if (!phone) { toast({ title: "Please enter the Phone Number", variant: "destructive" }); return false }
    // User didn't specify phone rules in prompt but existing code has it. I'll keep existing check but maybe after others.
    if (!phoneRe.test(String(phone).trim())) { toast({ title: "Invalid phone", description: "Starts 6-9, exactly 10 digits", variant: "destructive" }); return false }

    // Password
    if (!password) { toast({ title: "Please enter the Password", variant: "destructive" }); return false }
    if (password.length < 6 || password.length > 12) { 
        if (password.length > 12) { toast({ title: "Maximum limit exceeded", description: "Password max 12 characters", variant: "destructive" }); }
        else { toast({ title: "Invalid Password", description: "Password min 6 to max 12 characters", variant: "destructive" }); }
        return false 
    }
    // Allow both char & numbers and also special char. "dont allow only empty spaces". 
    // Assuming this means it must contain valid characters.
    if (!/^[\w\W]+$/.test(password) || !password.trim()) { toast({ title: "Invalid Password", variant: "destructive" }); return false }

    // Confirm Password
    if (!confirm) { toast({ title: "Please enter the Confirm Password", variant: "destructive" }); return false }
    if (confirm !== password) { toast({ title: "Invalid Confirm Password", description: "Passwords do not match", variant: "destructive" }); return false }
    if (confirm.length > 12) { toast({ title: "Maximum limit exceeded", description: "Confirm Password max 12 characters", variant: "destructive" }); return false }

    // Full Name
    if (!fullName.trim()) { toast({ title: "Please enter the Full name", variant: "destructive" }); return false }
    if (!/^[a-zA-Z\s]+$/.test(fullName)) { toast({ title: "Invalid Full name", description: "Only characters allowed", variant: "destructive" }); return false }
    if (fullName.length > 50) { toast({ title: "Maximum limit exceeded", description: "Full name max 50 characters", variant: "destructive" }); return false }

    // Date of Birth
    if (!dob) { toast({ title: "Please enter the Date of Birth", variant: "destructive" }); return false }
    if (new Date(dob) > new Date()) { toast({ title: "Invalid Date of Birth", description: "Future dates not allowed", variant: "destructive" }); return false }

    // Address
    if (!address.trim()) { toast({ title: "Please enter the Address", variant: "destructive" }); return false }
    if (!/^[a-zA-Z0-9\s,.-]+$/.test(address)) { toast({ title: "Invalid Address", description: "Only characters, numbers, space, comma, dot, hyphen allowed", variant: "destructive" }); return false }
    // Length check already done via onChange toast but keeping double check
    if (address.length > 100) { toast({ title: "Maximum limit exceeded", description: "Address max 100 characters", variant: "destructive" }); return false }

    // ID Type & Number
    if (!idType) { toast({ title: "Please enter the ID Type", variant: "destructive" }); return false }
    if (!idNumber.trim()) { toast({ title: "Missing ID Number", variant: "destructive" }); return false }
    
    // ID Validation logic based on type
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

    // Document Upload
    if (!idDocImage) { toast({ title: "Document required", description: "Please upload your ID document", variant: "destructive" }); return false }

    // Issue & Expiry Date
    if (idIssueDate && idExpiryDate) {
        if (new Date(idIssueDate) >= new Date(idExpiryDate)) { toast({ title: "issue Date was must be early than the Expiry Date", variant: "destructive" }); return false }
    }

    if (!agree) { toast({ title: "Accept Terms & Conditions", variant: "destructive" }); return false }
    return true
  }
  const { toast } = useToast()
  const mutation = useMutation({
    mutationFn: () => apiPost("/api/auth/register", { firstName, lastName, email, phone, password, fullName, dob, address, idType, idNumber, idIssueDate, idExpiryDate, idDocImage }),
    onSuccess: () => { 
      toast({ title: "Account created", description: "Welcome! Redirecting to sign in..." });
      setTimeout(() => {
        navigate("/signin");
      }, 2000);
    },
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
                    <Input 
                      placeholder="John" 
                      value={firstName} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/^[a-zA-Z]*$/.test(val)) {
                          toast({ title: "Invalid input", description: "Only characters allowed", variant: "destructive" });
                          return;
                        }
                        if (val.length > 20) {
                          toast({ title: "Maximum limit exceeded", description: "First name max 20 characters", variant: "destructive" });
                          return;
                        }
                        setFirstName(val);
                      }} 
                    />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Last Name *</label>
                  <Input 
                    placeholder="Doe" 
                    value={lastName} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!/^[a-zA-Z]*$/.test(val)) {
                        toast({ title: "Invalid input", description: "Only characters allowed", variant: "destructive" });
                        return;
                      }
                      if (val.length > 20) {
                        toast({ title: "Maximum limit exceeded", description: "Last name max 20 characters", variant: "destructive" });
                        return;
                      }
                      setLastName(val);
                    }} 
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Email *</label>
                <Input 
                  type="email" 
                  placeholder="your@email.com" 
                  value={email} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length > 20) {
                      toast({ title: "Maximum limit exceeded", description: "Email max 20 characters", variant: "destructive" });
                      return;
                    }
                    setEmail(val);
                  }} 
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Phone Number *</label>
                <Input 
                  type="tel" 
                  placeholder="10 digits, starts 6-9" 
                  value={phone} 
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (/[^0-9]/.test(raw)) {
                      toast({ title: "Invalid input", description: "Only numbers allowed", variant: "destructive" });
                    }
                    const val = raw.replace(/\D/g,"");
                    if (val.length > 10) {
                      toast({ title: "Maximum limit exceeded", description: "Phone number max 10 digits", variant: "destructive" });
                      return;
                    }
                    setPhone(val);
                  }} 
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Password *</label>
                <div className="relative">
                  <Input 
                    type={showA?"text":"password"} 
                    placeholder="Create a strong password" 
                    value={password} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length > 12) {
                        toast({ title: "Maximum limit exceeded", description: "Password max 12 characters", variant: "destructive" });
                        return;
                      }
                      setPassword(val);
                    }} 
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={()=>setShowA(!showA)}>{showA? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Confirm Password *</label>
                <div className="relative">
                  <Input 
                    type={showB?"text":"password"} 
                    placeholder="Confirm your password" 
                    value={confirm} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length > 12) {
                        toast({ title: "Maximum limit exceeded", description: "Confirm Password max 12 characters", variant: "destructive" });
                        return;
                      }
                      setConfirm(val);
                    }} 
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={()=>setShowB(!showB)}>{showB? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
                </div>
              </div>
              {password && confirm && password !== confirm && (
                <div className="text-xs text-destructive">Passwords must match</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Full Name *</label>
                  <Input 
                    placeholder="As per ID" 
                    value={fullName} 
                    onChange={(e)=>{
                      const val = e.target.value;
                      if (!/^[a-zA-Z\s]*$/.test(val)) {
                         // Optionally show toast, but usually better to just block or show toast. User said "allow only char".
                         // If I just ignore it, they can't type numbers. If I show toast, it might spam.
                         // But for other fields user asked for popup.
                         // "fullname allow only char just add this"
                         // I will show toast if invalid char is attempted.
                         toast({ title: "Invalid input", description: "Only characters allowed", variant: "destructive" });
                         return;
                      }
                      if (val.length > 50) {
                        toast({ title: "Maximum limit exceeded", description: "Full name max 50 characters", variant: "destructive" });
                        return;
                      }
                      setFullName(val);
                    }} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Date of Birth *</label>
                  <Input type="date" value={dob} onChange={(e)=>setDob(e.target.value)} max={new Date().toISOString().split("T")[0]} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Address *</label>
                <Input 
                  placeholder="Residential address" 
                  value={address} 
                  onChange={(e)=>{
                    const val = e.target.value;
                    if (!/^[a-zA-Z0-9\s,.-]*$/.test(val)) {
                      toast({ title: "Invalid Address", description: "Only characters, numbers, space, comma, dot, hyphen allowed", variant: "destructive" });
                      return;
                    }
                    if (val.length > 100) {
                      toast({ title: "Maximum limit exceeded", description: "Address max 100 characters", variant: "destructive" });
                      return;
                    }
                    setAddress(val);
                  }} 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block whitespace-nowrap">ID Type *</label>
                  <select className="w-full border rounded h-10 px-3 bg-background" value={idType} onChange={(e)=>setIdType(e.target.value)}>
                    <option>Aadhaar Card</option>
                    <option>Passport</option>
                    <option>Driving Licence</option>
                    <option>Voter ID</option>
                    <option>PAN card (usually not accepted as primary ID)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block whitespace-nowrap">ID Number *</label>
                  <Input 
                    placeholder={idHints[idType]} 
                    value={idNumber} 
                    onChange={(e)=>{ 
                      let v = e.target.value;
                      if (idType === "Aadhaar Card") {
                        if (/[^0-9]/.test(v)) {
                           // optional: toast({ title: "Invalid input", description: "Only numbers allowed", variant: "destructive" });
                        }
                        v = v.replace(/\D/g, "").slice(0, 12);
                      } else if (idType === "Passport") {
                        v = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
                      } else if (idType.includes("PAN")) {
                        v = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
                      } else if (idType === "Driving Licence") {
                         v = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
                      } else if (idType === "Voter ID") {
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
                  <label className="text-sm font-medium mb-2 block whitespace-nowrap">Document Upload *</label>
                  <label 
                    htmlFor="id-doc-upload" 
                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-10 px-4 py-2 w-full"
                  >
                    {idDocImage ? "Change File" : "Choose File"}
                  </label>
                  <Input 
                    id="id-doc-upload"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ const d=r.result as string; setIdDocImage(d||"") }; r.readAsDataURL(f) }} 
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {idDocImage ? "File selected" : "No file chosen"}
                  </div>
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
