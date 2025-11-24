import * as React from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeaturedHotels from "@/components/FeaturedHotels";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const raw = typeof window !== "undefined" ? localStorage.getItem("auth") : null
  const auth = raw ? JSON.parse(raw) as { user?: { id?: number; role?: 'admin'|'user'|'owner' } } : null
  const role = (auth?.user?.role || 'user') as 'user'|'owner'|'admin'
  const userId = auth?.user?.id || 0
  const { toast } = useToast()
  const bookingsQ = useQuery({ queryKey: ["user","bookings",userId], queryFn: () => apiGet<{ bookings: { id:number; status:string }[] }>(`/api/user/bookings?userId=${userId}`), enabled: role==='user' && !!userId, refetchInterval: 15000 })
  React.useEffect(() => {
    const all = bookingsQ.data?.bookings || []
    const checked = all.filter(b=>String(b.status)==='checked_out').map(b=>b.id)
    if (!checked.length) return
    try {
      const k = 'reviewPromptShown'
      const cur = JSON.parse(localStorage.getItem(k) || '[]') as number[]
      const unseen = checked.filter(id=>!cur.includes(id))
      if (unseen.length) {
        toast({ title: 'Checkout complete', description: 'Please rate your stay in Inbox' })
        const next = Array.from(new Set(cur.concat(unseen)))
        localStorage.setItem(k, JSON.stringify(next))
      }
    } catch { /* ignore */ }
  }, [bookingsQ.data, toast])
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <FeaturedHotels />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
