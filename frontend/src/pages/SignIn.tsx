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
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type SignInResponse = {
  token: string;
  user: {
    id: number;
    email: string;
    role: "admin" | "user" | "owner";
    isApproved?: boolean;
    blocked?: boolean;
  };
};

const SignIn = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()
  const { toast } = useToast()
  const [show, setShow] = useState(false)
  const mutation = useMutation({ mutationFn: () => apiPost<SignInResponse, { email: string; password: string }>("/api/auth/signin", { email, password }) ,
    onSuccess: (data) => {
      localStorage.setItem("auth", JSON.stringify(data))
      const role = data.user.role
      toast({ title: "Signed in", description: role })
      if (role === "admin") {
        navigate("/dashboard/admin")
        return
      }
      if (role === "owner") {
        navigate("/dashboard/owner")
        return
      }
      try {
        const r = localStorage.getItem('postLoginRedirect') || ''
        if (r) {
          localStorage.removeItem('postLoginRedirect')
          navigate(r)
          return
        }
      } catch (_e) { void 0 }
      navigate("/dashboard/user")
    },
    onError: (err) => {
      const msg = err instanceof Error ? String(err.message || '') : ''
      try { localStorage.removeItem('auth') } catch { /* ignore */ }
      const lower = msg.toLowerCase()
      if (lower.includes('account deleted') || lower.includes('deleted')) {
        toast({ title: "Sign in failed", description: "Your account has been deleted", variant: "destructive" })
      } else if (lower.includes('blocked')) {
        toast({ title: "Sign in failed", description: "Your account is blocked", variant: "destructive" })
      } else if (lower.includes('email not registered') || lower.includes('not registered')) {
        toast({ title: "Sign in failed", description: "Account not registered. Please sign up and then sign in", variant: "destructive" })
      } else if (lower.includes('invalid credentials') || lower.includes('invalid')) {
        toast({ title: "Sign in failed", description: "Invalid credentials", variant: "destructive" })
      } else {
        toast({ title: "Sign in failed", description: msg || "Try again later", variant: "destructive" })
      }
    }
  })
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 relative">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-14 relative overflow-hidden">
          <div className="container">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Welcome Back</h1>
              <p className="mt-3 text-lg opacity-90">Sign in to access your bookings and more</p>
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
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

              <div className="relative">
                <label className="text-sm font-medium mb-2 block">Password</label>
                <Input type={show?"text":"password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="absolute right-3 top-[52px] text-muted-foreground" onClick={()=>setShow(!show)}>{show? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <label htmlFor="remember" className="text-sm cursor-pointer">
                    Remember me
                  </label>
                </div>
                <Link to={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white" disabled={mutation.isPending}>{mutation.isPending ? "Signing in..." : "Sign In"}</Button>
              {mutation.isError && (()=>{ const m = mutation.error instanceof Error ? String(mutation.error.message||'') : ''; const lower = m.toLowerCase(); const txt = lower.includes('deleted') ? 'Sign in failed: your account has been deleted' : (lower.includes('blocked') ? 'Sign in failed: your account is blocked' : (lower.includes('email not registered') || lower.includes('not registered') ? 'Sign in failed: account not registered — please sign up and then sign in' : (lower.includes('invalid credentials') || lower.includes('invalid') ? 'Sign in failed: invalid credentials' : 'Sign in failed'))); return (<div className="text-red-600 text-sm">{txt}</div>) })()}
              {mutation.isSuccess && <div className="text-green-600 text-sm">Signed in</div>}

              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Don't have an account?{" "}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  Sign up
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

export default SignIn;
