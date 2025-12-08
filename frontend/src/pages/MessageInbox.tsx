import * as React from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Star } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Thread = { id:number; bookingId:number; hotelId:number; userId:number; ownerId:number; createdAt?: string; lastMessage?: { content:string; senderRole:string; createdAt:string } | null; unreadForUser?: number; unreadForOwner?: number }
type Message = { id:number; threadId:number; senderRole:'user'|'owner'|'system'; senderId:number|null; content:string; createdAt:string; readByUser?: boolean; readByOwner?: boolean }

const MessageInbox = () => {
  const raw = typeof window !== "undefined" ? localStorage.getItem("auth") : null
  const auth = raw ? JSON.parse(raw) as { user?: { id?: number; role?: 'admin'|'user'|'owner' } } : null
  const role = (auth?.user?.role || 'user') as 'user'|'owner'|'admin'
  const userId = auth?.user?.id || 0
  const qc = useQueryClient()
  const { toast } = useToast()
  const threadsQ = useQuery({
    queryKey: ["inbox","threads",role,userId],
    queryFn: () => role === 'owner' ? apiGet<{ threads: Thread[] }>(`/api/messages/threads?ownerId=${userId}`) : apiGet<{ threads: Thread[] }>(`/api/messages/threads?userId=${userId}`),
    enabled: !!userId,
    refetchInterval: 1500,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  })
  const threads = React.useMemo(() => threadsQ.data?.threads ?? [], [threadsQ.data])
  const orderedThreads = React.useMemo(() => {
    const arr = [...threads]
    arr.sort((a,b) => {
      const at = new Date(a.lastMessage?.createdAt || a.createdAt || 0).getTime()
      const bt = new Date(b.lastMessage?.createdAt || b.createdAt || 0).getTime()
      return bt - at
    })
    return arr
  }, [threads])
  const [activeId, setActiveId] = React.useState<number>(threads[0]?.id || 0)
  React.useEffect(() => {
    if (threads.length && !threads.find(t=>t.id===activeId)) setActiveId(threads[0].id)
  }, [threads, activeId])
  const messagesQ = useQuery({ queryKey: ["inbox","messages",activeId], queryFn: () => apiGet<{ messages: Message[] }>(`/api/messages/thread/${activeId}/messages`), enabled: !!activeId, refetchInterval: 1500, refetchOnWindowFocus: true })
  const messages = React.useMemo(() => messagesQ.data?.messages ?? [], [messagesQ.data])
  const orderedMessages = React.useMemo(() => {
    const arr = [...messages]
    arr.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return arr
  }, [messages])
  const markRead = useMutation({ mutationFn: (id:number) => apiPost(`/api/messages/thread/${id}/read`, { role: role==='owner'?'owner':'user' }), onSuccess: (_res, vars) => { qc.invalidateQueries({ queryKey: ["inbox","threads",role,userId] }) }, onError: () => {} , retry: false })
  const lastReadRef = React.useRef<number>(0)
  React.useEffect(() => { if (activeId && lastReadRef.current !== activeId && !markRead.isPending) { lastReadRef.current = activeId; markRead.mutate(activeId); qc.setQueryData(["inbox","threads",role,userId], (data?: { threads: Thread[] }) => { const arr = (data?.threads||[]).map(t => t.id===activeId ? { ...t, unreadForUser: 0, unreadForOwner: 0 } : t); return { threads: arr } }) } }, [activeId, markRead.isPending, markRead, qc, role, userId])
  const [draft, setDraft] = React.useState("")
  const send = useMutation({ mutationFn: (p:{ id:number; content:string }) => apiPost(`/api/messages/thread/${p.id}/send`, { senderRole: role==='owner'?'owner':'user', senderId: userId, content: p.content }), onSuccess: (_res, vars) => { setDraft(""); qc.invalidateQueries({ queryKey: ["inbox","messages",vars.id] }) } })

  const bookingsQ = useQuery({ queryKey: ["user","bookings",userId], queryFn: () => apiGet<{ bookings: { id:number; hotelId:number; status:string }[] }>(`/api/user/bookings?userId=${userId}`), enabled: role==='user' && !!userId, refetchInterval: 3000 })
  const threadBooking = React.useMemo(() => {
    const t = (threads||[]).find(x=>x.id===activeId)
    const bid = t?.bookingId
    return (bookingsQ.data?.bookings||[]).find(b=>b.id===bid)
  }, [activeId, threads, bookingsQ.data])
  const hasCheckoutMsg = messages.some(m=>m.senderRole==='system' && /Checkout complete/i.test(m.content||''))
  const canReview = role==='user' && hasCheckoutMsg
  const isCancelled = String(threadBooking?.status||'') === 'cancelled'
  const [rating, setRating] = React.useState<number>(5)
  const [feedback, setFeedback] = React.useState<string>("")
  const createReview = useMutation({ mutationFn: () => {
    const t = (threads||[]).find(x=>x.id===activeId)
    const hotelId = Number((t?.hotelId ?? threadBooking?.hotelId) || 0)
    const comment = String(feedback||'').trim()
    const bookingId = Number(threadBooking?.id||0) || null
    return apiPost(`/api/user/reviews`, { userId, hotelId, bookingId, rating, comment })
  }, onSuccess: (_res) => {
    const t = (threads||[]).find(x=>x.id===activeId)
    const hotelId = Number((t?.hotelId ?? threadBooking?.hotelId) || 0)
    const ownerId = Number(t?.ownerId||0)
    setFeedback("")
    toast({ title: "Review submitted", description: `Thank you for rating hotel #${hotelId}` })
    qc.invalidateQueries({ queryKey: ["hotel","reviews", hotelId] })
    if (ownerId) qc.invalidateQueries({ queryKey: ["owner","reviews", ownerId] })
  }, onError: () => { toast({ title: "Review submission failed", variant: "destructive" }) } })

  const resolveImage = (src?: string) => { const s = String(src||''); if (!s) return 'https://placehold.co/64x64?text=Hotel'; const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>; const base = env?.VITE_API_URL || 'http://localhost:5000'; if (/^https?:\/\/localhost:\d+\/uploads\//i.test(s)) return s.replace(/localhost:\d+/i,'localhost:5000'); if (s.startsWith('/uploads')) return `${base}${s}`; if (s.startsWith('uploads')) return `${base}/${s}`; if (s.startsWith('/src/assets')) { const origin = typeof window !== 'undefined' ? window.location.origin : ''; return origin ? `${origin}${s}` : 'https://placehold.co/64x64?text=Hotel' } return s }
  const [hotelMap, setHotelMap] = React.useState<{ [id:number]: { id:number; name:string; image:string } }>({})
  React.useEffect(() => {
    const ids = Array.from(new Set(threads.map(t=>t.hotelId))).filter(Boolean)
    const need = ids.filter(id => !hotelMap[id])
    if (!need.length) return
    Promise.all(need.map(id => apiGet<{ hotel: { id:number; name:string; image:string } }>(`/api/hotels/${id}`).catch(()=>({ hotel: { id, name: `Hotel ${id}`, image: '' } }))))
      .then(list => {
        const next = { ...hotelMap }
        list.forEach(({ hotel }) => { next[hotel.id] = { id: hotel.id, name: hotel.name, image: hotel.image } })
        setHotelMap(next)
      })
      .catch(()=>{})
  }, [threads, hotelMap])

  const chatTitle = role==='owner' ? 'Owner Chat' : 'User Chat'
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-12">
          <div className="container">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold">Message Inbox · {chatTitle}</h1>
            </div>
            <p className="opacity-90">Chat with the other party and view booking notifications</p>
          </div>
        </section>
        <div className="container py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0">
              <CardHeader><CardTitle>Threads</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded border overflow-hidden max-h-[320px] overflow-y-auto sm:max-h-none">
                  {(orderedThreads||[]).map(t => (
                    <div key={t.id} className={`p-3 border-t first:border-t-0 cursor-pointer ${activeId===t.id? 'bg-card' : ((role==='owner' ? (t.unreadForOwner||0) : (t.unreadForUser||0)) ? 'bg-accent/20' : 'bg-card')}`} onClick={()=>setActiveId(t.id)}>
                      <div className="flex items-center gap-3">
                        <img src={resolveImage(hotelMap[t.hotelId]?.image)} alt={hotelMap[t.hotelId]?.name||`Hotel ${t.hotelId}`} className="h-10 w-10 rounded object-cover border" onError={(e)=>{ e.currentTarget.src='https://placehold.co/64x64?text=Hotel' }} />
                        <div className="flex-1">
                          <div className="font-medium">{hotelMap[t.hotelId]?.name || `Hotel ${t.hotelId}`}</div>
                          <div className="text-xs text-muted-foreground">Booking #{t.bookingId}</div>
                        </div>
                        {(() => { const c = role==='owner' ? (t.unreadForOwner||0) : (t.unreadForUser||0); return (c && activeId !== t.id) ? (<span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] h-5 min-w-5 px-1">{c}</span>) : null })()}
                      </div>
                      {t.lastMessage && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {t.lastMessage.senderRole==='system' ? 'System' : t.lastMessage.senderRole}: {t.lastMessage.content}
                        </div>
                      )}
                    </div>
                  ))}
                  {threads.length===0 && <div className="p-3 text-sm text-muted-foreground">No threads yet</div>}
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2 rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0">
              <CardHeader><CardTitle>Conversation</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[320px] sm:h-[400px] overflow-y-auto rounded border p-3 bg-card">
                  {(orderedMessages||[]).map(m => {
                    const youRole = role==='owner' ? 'owner' : 'user'
                    const isYou = m.senderRole === youRole
                    const who = m.senderRole==='system' ? 'System' : (isYou ? 'You' : (role==='owner' ? 'User' : 'Owner'))
                    const alignCls = m.senderRole==='system' ? 'text-center' : (isYou ? 'text-right' : 'text-left')
                    const bubbleCls = m.senderRole==='system' ? 'bg-muted text-foreground' : (isYou ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')
                    const isUnread = role==='owner' ? (m.readByOwner===false) : (m.readByUser===false)
                    const highlight = isUnread ? ' outline outline-2 outline-primary/60' : ''
                    return (
                      <div key={m.id} className={`my-2 ${alignCls}`}>
                        <div className="text-[10px] mb-1 text-muted-foreground">{who}</div>
                        <div className={`inline-block px-3 py-2 rounded ${bubbleCls}${highlight}`}>{m.content}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">{new Date(m.createdAt).toLocaleString()}</div>
                      </div>
                    )
                  })}
                  {messages.length===0 && <div className="text-sm text-muted-foreground">Select a thread</div>}
                </div>
                <div className="flex gap-2 mt-3">
                  <Input placeholder={isCancelled?"Conversation closed":"Type a message"} value={draft} onChange={e=>setDraft(e.target.value)} disabled={isCancelled} />
                  <Button onClick={()=>send.mutate({ id: activeId, content: draft })} disabled={isCancelled || !draft || !activeId}>Send</Button>
                </div>
                {(!isCancelled && canReview) && (
                  <div className="mt-4 p-4 rounded border bg-muted/30">
                    <div className="mb-2 font-semibold">Rate your stay</div>
                    <div className="flex items-center gap-1 mb-3">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`h-6 w-6 ${n <= rating ? 'fill-current text-accent' : 'text-muted-foreground'}`} style={{cursor:'pointer'}} onClick={()=>setRating(n)} />
                      ))}
                    </div>
                    <Input placeholder="Feedback (optional)" value={feedback} onChange={e=>setFeedback(e.target.value)} />
                    <div className="mt-3 text-right">
                      <Button onClick={()=>createReview.mutate()} disabled={!userId || createReview.isPending || createReview.isSuccess}>{createReview.isPending ? 'Submitting...' : (createReview.isSuccess ? 'Submitted' : 'Submit')}</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default MessageInbox
