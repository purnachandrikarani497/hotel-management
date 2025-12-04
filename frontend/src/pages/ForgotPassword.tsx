import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const initialEmail = params.get('email') || ""
  const [email, setEmail] = useState(initialEmail);
  const { toast } = useToast();
  const m = useMutation({
    mutationFn: () => apiPost<{ status: string; link?: string }, { email: string }>("/api/auth/forgot", { email }),
    onSuccess: (_data) => {
      toast({ title: "Email sent", description: "Check your inbox for the reset link" })
    },
    onError: (err) => {
      const msg = err instanceof Error ? String(err.message || '') : ''
      const lower = msg.toLowerCase()
      if (lower.includes('not registered')) {
        toast({ title: "Email not registered", description: "Please sign up first", variant: "destructive" })
      } else {
        toast({ title: "Failed to send", variant: "destructive" })
      }
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 relative">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-14 relative overflow-hidden">
          <div className="container">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Forgot Password</h1>
              <p className="mt-3 text-lg opacity-90">Enter your email to receive a reset link</p>
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
              <form onSubmit={(e)=>{ e.preventDefault(); m.mutate(); }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input type="email" placeholder="your@email.com" value={email} onChange={(e)=> setEmail(e.target.value)} />
                </div>
                <Button className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white" disabled={m.isPending}>{m.isPending?"Sending...":"Send Reset Link"}</Button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForgotPassword;
