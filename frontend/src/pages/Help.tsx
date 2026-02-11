import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { User, CalendarCheck, XCircle, Wallet, CalendarRange, Users, CheckCircle, ListChecks, Building2, BadgePercent, Headphones } from "lucide-react"
import * as React from "react"
import { useEffect } from "react"

const categories = [
  { id: "account", label: "Account Management", icon: User },
  { id: "booking", label: "Booking Details", icon: CalendarCheck },
  { id: "cancellation", label: "Cancellation", icon: XCircle },
  { id: "payment", label: "Payment/Refund Information", icon: Wallet },
  { id: "changeDates", label: "Change Booking Dates", icon: CalendarRange },
  { id: "manageGuest", label: "Manage Guest", icon: Users },
  { id: "confirmation", label: "Booking Confirmation", icon: CheckCircle },
  { id: "special", label: "Special Requests", icon: ListChecks },
  { id: "property", label: "Property Related Questions", icon: Building2 },
  { id: "bestPrice", label: "Best Price Guarantee", icon: BadgePercent },
  { id: "support", label: "Customer Service", icon: Headphones },
] as const

const faqs: Record<string, { q: string; a: string }[]> = {
  account: [
    { q: "How do I create an account?", a: "Click Register on the top bar, fill your name, email, and password, then verify via the email we send you." },
    { q: "How do I change my password?", a: "Go to User Dashboard → Account Settings → Change Password. Enter your current password and the new one to update." },
    { q: "How do I delete my account?", a: "Contact Customer Service from this Help page. We’ll process account deletion within 48 hours after verification." },
  ],
  booking: [
    { q: "Where can I check my booking?", a: "Open User Dashboard → Bookings. You’ll see status, dates, hotel details, and invoices." },
    { q: "Can I add guests after booking?", a: "Yes. Go to your booking details and use Manage Guests. Extra charges may apply depending on room type." },
  ],
  cancellation: [
    { q: "How can I cancel my booking?", a: "Go to your booking details and click Cancel. Refunds depend on hotel policy and timing." },
    { q: "Will I be charged if I cancel?", a: "Charges depend on the cancellation window. Free cancellation is usually available before the deadline." },
  ],
  payment: [
    { q: "What payment methods are supported?", a: "Cards, UPI, net banking, and certain wallets. Failed payments are auto-refunded or retried." },
    { q: "How long do refunds take?", a: "Refunds are initiated immediately and typically reflect within 3–7 business days depending on your bank." },
  ],
  changeDates: [
    { q: "How do I change my dates?", a: "Open your booking and select Change Dates. Price differences for seasonal or weekend rates may apply." },
  ],
  manageGuest: [
    { q: "Can I add or remove guests?", a: "Yes, from Manage Guests on the booking page. Some room types have strict limits." },
  ],
  confirmation: [
    { q: "I didn’t receive confirmation", a: "Check your spam folder. You can also re-send confirmation from the booking page." },
  ],
  special: [
    { q: "How do I add special requests?", a: "Use the Special Requests field during booking or edit later from booking details." },
  ],
  property: [
    { q: "How to contact the property?", a: "Property contact is shown on the booking page under Contact. You can message or call directly." },
  ],
  bestPrice: [
    { q: "How does Best Price work?", a: "If you find a lower price elsewhere, submit proof and we’ll match subject to terms." },
  ],
  support: [
    { q: "How to reach support?", a: "Use the chat box below or contact form on the Contact page. We’re available 24/7." },
  ],
}

const Help = () => {
  const [selected, setSelected] = React.useState<string>("account")
  const [search, setSearch] = React.useState("")
  const [messages, setMessages] = React.useState<{ role: "user" | "bot"; text: string }[]>([])
  const [input, setInput] = React.useState("")

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const filteredFaqs = React.useMemo(() => {
    const list = faqs[selected] || []
    const s = search.trim().toLowerCase()
    if (!s) return list
    return list.filter((x) => x.q.toLowerCase().includes(s) || x.a.toLowerCase().includes(s))
  }, [selected, search])

  const sendMessage = () => {
    const msg = input.trim()
    if (!msg) return
    setMessages((m) => [...m, { role: "user", text: msg }])
    setInput("")
    const all = Object.values(faqs).flat()
    const hit = all.find((x) => x.q.toLowerCase().includes(msg.toLowerCase()))
    const reply = hit
      ? `Here’s what I found: ${hit.a}`
      : "Thanks for your message! Our support will follow up shortly. You can also browse topics on the left or use the search above."
    setTimeout(() => {
      setMessages((m) => [...m, { role: "bot", text: reply }])
    }, 300)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-12">
          <div className="container max-w-6xl">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Help Center</h1>
              <p className="opacity-90">Find answers to common questions or chat with us for quick help.</p>
            </div>
          
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-8">
              <div className="md:col-span-3">
                <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0">
                  <CardHeader>
                    <CardTitle className="text-lg">Topics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {categories.map((c) => {
                        const Icon = c.icon
                        const active = selected === c.id
                        return (
                          <button
                            key={c.id}
                            className={`w-full flex items-center text-left gap-3 rounded-md px-3 py-2 text-sm ${active ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                            onClick={() => setSelected(c.id)}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{c.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-9 space-y-6">
                <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0">
                  <CardHeader>
                    <CardTitle className="text-lg">{categories.find((c) => c.id === selected)?.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex gap-2">
                      <Input 
                        placeholder="Search questions" 
                        value={search} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.length > 100) return;
                          if (!/^[a-zA-Z\s]*$/.test(val)) return;
                          setSearch(val);
                        }} 
                      />
                      <Button variant="outline" onClick={() => setSearch("")}>Clear</Button>
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                      {filteredFaqs.map((item, idx) => (
                        <AccordionItem key={`${selected}-${idx}`} value={`${selected}-${idx}`}>
                          <AccordionTrigger>{item.q}</AccordionTrigger>
                          <AccordionContent>{item.a}</AccordionContent>
                        </AccordionItem>
                      ))}
                      {filteredFaqs.length === 0 && (
                        <div className="text-sm text-muted-foreground">No results. Try a different search or ask in chat.</div>
                      )}
                    </Accordion>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0">
                  <CardHeader>
                    <CardTitle className="text-lg">Chat With Us</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="max-h-60 overflow-auto rounded-md border p-3 bg-muted/30">
                        {messages.length === 0 && (
                          <div className="text-sm text-muted-foreground">No messages yet. Ask anything about bookings, refunds, or account access.</div>
                        )}
                        {messages.map((m, i) => (
                          <div key={i} className={`mb-2 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{m.text}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Textarea 
                          className="min-h-[48px]" 
                          placeholder="Type your message" 
                          value={input} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.length > 200) return;
                            if (!/^[a-zA-Z\s]*$/.test(val)) return;
                            setInput(val);
                          }} 
                        />
                        <Button onClick={() => {
                          if (!input.trim()) return;
                          sendMessage();
                        }}>Send</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Help
