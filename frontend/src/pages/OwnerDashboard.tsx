import * as React from "react"
import type { DateRange } from "react-day-picker"
import { useParams } from "react-router-dom"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Building2, Calendar as CalendarIcon } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import RoomTypeManager from "@/components/RoomTypeManager"
import { useToast } from "@/hooks/use-toast"

const ymdLocal = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const da = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${da}`
}

type OwnerStats = {
  totalRooms: number
  totalBookings: number
  totalRevenue: number
  pendingBookings: number
  hotelStatus: string
}

type Hotel = {
  id: number
  name: string
  location: string
  status: string
  price: number
  amenities: string[]
  images: string[]
  docs: string[]
  description?: string
  contactEmail?: string
  contactPhone1?: string
  contactPhone2?: string
  ownerName?: string
  pricing?: {
    normalPrice?: number
    weekendPrice?: number
    seasonal?: { start: string; end: string; price: number }[]
    specials?: { date: string; price: number }[]
    extraHourRate?: number
    cancellationHourRate?: number
  }
}

type UpdateInfoVars = {
  id: number
  name?: string
  location?: string
  price?: number
  description?: string
  status?: string
  featured?: boolean
  contactEmail?: string
  contactPhone1?: string
  contactPhone2?: string
  ownerName?: string
}

type Room = {
  id: number
  hotelId: number
  type: string
  roomNumber?: string
  price: number
  members: number
  availability: boolean
  blocked: boolean
  amenities: string[]
  photos: string[]
}

type Booking = {
  id: number
  hotelId: number
  roomId?: number
  roomNumber?: string
  checkIn: string
  checkOut: string
  guests: number
  total: number
  status: string
  createdAt?: string
  extraHours?: number
  extraCharges?: number
  cancellationFee?: number
  user?: {
    id: number
    email?: string
    firstName?: string
    lastName?: string
    fullName?: string
  } | null
}

type Review = {
  id: number
  hotelId: number
  rating: number
  comment: string
  createdAt: string
  response?: string
  user?: {
    id: number
    email?: string
    firstName?: string
    lastName?: string
    fullName?: string
  } | null
}

type GuestUser = {
  id: number
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  fullName?: string
  dob?: string
  address?: string
  idType?: string
  idNumber?: string
  idDocUrl?: string
}

type GuestLastBooking = {
  id: number
  hotelId: number
  checkIn: string
  checkOut: string
  guests?: number
  status: string
  createdAt?: string
}

type GuestItem = {
  user: GuestUser | null
  lastBooking: GuestLastBooking | null
}

const OwnerDashboard = () => {
  const raw = typeof window !== "undefined" ? localStorage.getItem("auth") : null
  const auth = raw ? (JSON.parse(raw) as { user?: { id?: number; email?: string; phone?: string; firstName?: string; lastName?: string; fullName?: string } }) : null
  const ownerId = auth?.user?.id || 0

  const { feature } = useParams<{ feature?: string }>()
  const qc = useQueryClient()
  const { toast } = useToast()

  const abKey = "addedByDashboard"
  type AddedStore = {
    hotels?: number[]
    rooms?: number[]
    reviews?: number[]
    coupons?: number[]
    wishlist?: number[]
  }

  const readAB = React.useCallback((): AddedStore => {
    try {
      return JSON.parse(localStorage.getItem(abKey) || "{}") as AddedStore
    } catch {
      return {}
    }
  }, [])

  const writeAB = (obj: AddedStore) => {
    try {
      localStorage.setItem(abKey, JSON.stringify(obj))
      return true
    } catch (e) {
      return false
    }
  }

  const addId = (type: keyof AddedStore, id: number) => {
    const cur = readAB()
    const list = new Set(cur[type] || [])
    list.add(id)
    cur[type] = Array.from(list)
    writeAB(cur)
  }

  const stats = useQuery({
    queryKey: ["owner", "stats", ownerId],
    queryFn: () => apiGet<OwnerStats>(`/api/owner/stats?ownerId=${ownerId}`),
    enabled: !!ownerId,
  })

  const hotelsQ = useQuery({
    queryKey: ["owner", "hotels", ownerId],
    queryFn: () => apiGet<{ hotels: Hotel[] }>(`/api/owner/hotels?ownerId=${ownerId}`),
    enabled: !!ownerId,
  })

  const roomsQ = useQuery({
    queryKey: ["owner", "rooms", ownerId],
    queryFn: () => apiGet<{ rooms: Room[] }>(`/api/owner/rooms?ownerId=${ownerId}`),
    enabled: !!ownerId,
  })

  const bookingsQ = useQuery({
    queryKey: ["owner", "bookings", ownerId],
    queryFn: () => apiGet<{ bookings: Booking[] }>(`/api/owner/bookings?ownerId=${ownerId}`),
    enabled: !!ownerId,
  })

  const reviewsQ = useQuery({
    queryKey: ["owner", "reviews", ownerId],
    queryFn: () => apiGet<{ reviews: Review[] }>(`/api/owner/reviews?ownerId=${ownerId}`),
    enabled: !!ownerId,
  })

  const settingsQ = useQuery({
    queryKey: ["admin","settings"],
    queryFn: () => apiGet<{ settings: { contactName?: string; contactEmail?: string; contactPhone1?: string; contactPhone2?: string } }>(`/api/admin/settings`),
    staleTime: 30_000,
    refetchInterval: 5000,
  })

  const guestsQ = useQuery({
    queryKey: ["owner", "guests", ownerId],
    queryFn: () => apiGet<{ guests: GuestItem[] }>(`/api/owner/guests?ownerId=${ownerId}`),
    enabled: !!ownerId,
    refetchInterval: 10000,
  })

  type AdminUser = { id:number; email:string; firstName?:string; lastName?:string; role?:string; phone?:string }
  const adminsQ = useQuery({ queryKey: ["admin","users"], queryFn: () => apiGet<{ users: AdminUser[] }>(`/api/admin/users`), staleTime: 30_000 })

  const allHotels = hotelsQ.data?.hotels || []
  const hotels = hotelsQ.data?.hotels || []

  const roomsRaw = React.useMemo(() => roomsQ.data?.rooms || [], [roomsQ.data])
  const rooms = React.useMemo(() => roomsRaw || [], [roomsRaw])

  const roomGroups = React.useMemo(() => {
    const map: { [k: string]: { count: number; ids: number[] } } = {}
    rooms.forEach((r) => {
      const k = `${r.hotelId}|${r.type}`
      const cur = map[k] || { count: 0, ids: [] }
      cur.count += 1
      cur.ids.push(r.id)
      map[k] = cur
    })
    return map
  }, [rooms])

  const roomSummaries = React.useMemo(() => {
    const map: { [k: string]: { key: string; hotelId: number; type: string; ids: number[]; count: number; price: number; members: number; amenities: string[]; photos: string[]; availability: boolean; blocked: boolean; roomNumbers: string[] } } = {}
    rooms.forEach((r) => {
      const k = `${r.hotelId}|${r.type}`
      const m = map[k]
      if (!m) {
        map[k] = { key: k, hotelId: r.hotelId, type: r.type, ids: [r.id], count: 1, price: r.price, members: r.members, amenities: r.amenities || [], photos: r.photos || [], availability: r.availability, blocked: r.blocked, roomNumbers: r.roomNumber ? [r.roomNumber] : [] }
      } else {
        m.ids.push(r.id)
        m.count += 1
        m.price = r.price
        m.members = r.members
        m.amenities = Array.isArray(r.amenities) && r.amenities.length ? r.amenities : m.amenities
        if ((r.photos || []).length) m.photos = r.photos || []
        m.availability = r.availability
        m.blocked = r.blocked
        if (r.roomNumber) m.roomNumbers.push(r.roomNumber)
      }
    })
    const ordered = Object.values(map).map(g => ({
      ...g,
      roomNumbers: (g.roomNumbers || []).slice().sort((a,b)=>{
        const na = /^\d+$/.test(String(a)) ? Number(a) : Number.MAX_SAFE_INTEGER
        const nb = /^\d+$/.test(String(b)) ? Number(b) : Number.MAX_SAFE_INTEGER
        if (na !== nb) return na - nb
        return String(a).localeCompare(String(b))
      })
    }))
    return ordered.sort((a, b) => {
      const aMaxId = Math.max(...a.ids)
      const bMaxId = Math.max(...b.ids)
      return bMaxId - aMaxId
    })
  }, [rooms])

  const getRoomById = (id: number) => rooms.find((x) => x.id === id)

  const adjustRoomCount = async (hotelId: number, type: string, target: number, base: Room) => {
    const k = `${hotelId}|${type}`
    const cur = roomGroups[k]?.count || 0
    const safe = Math.max(1, Math.min(20, Number(target) || 1))
    if (safe > cur) {
      const payload = {
        hotelId,
        type,
        price: base.price,
        members: base.members,
        amenities: base.amenities,
        photos: base.photos,
        availability: base.availability,
      }
      for (let i = 0; i < safe - cur; i++) {
        createRoom.mutate(payload)
      }
    } else if (safe < cur) {
      const ids = (roomGroups[k]?.ids || []).slice().sort((a, b) => b - a)
      const toDelete = ids.slice(0, cur - safe)
      for (const id of toDelete) {
        await apiDelete(`/api/owner/rooms/${id}`)
      }
      qc.invalidateQueries({ queryKey: ["owner", "rooms", ownerId] })
    }
  }

  const hotelName = (id: number) => {
    const all = hotelsQ.data?.hotels || []
    const h = all.find((x) => x.id === id)
    return h?.name || ""
  }

  const resolveOwnerHotelId = (n: number) => {
    const list = hotelsQ.data?.hotels || []
    if (!n) return 0
    if (n >= 1 && n <= list.length) return list[n - 1].id
    return 0
  }

  const resolve = (u: string) => {
    if (!u) return ""
    const s = String(u)
    const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>
    let base = env?.VITE_API_URL || 'http://localhost:5000'
    if (/localhost:\d+/i.test(base) && !/localhost:5000/i.test(base)) base = base.replace(/localhost:\d+/i, 'localhost:5000')
    if (s.startsWith("/uploads")) return `${base}${s}`
    if (s.startsWith("uploads")) return `${base}/${s}`
    return s
  }

  const bookings = React.useMemo(() => bookingsQ.data?.bookings ?? [], [bookingsQ.data])
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  const bookingsOrdered = React.useMemo(() => {
    const arr: Booking[] = [...bookings]
    arr.sort(
      (a: Booking, b: Booking) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    )
    return arr
  }, [bookings])

  const bookingsFiltered = React.useMemo(() => {
    const m = (s: string) => {
      if (s === "checkin") return "checked_in"
      if (s === "checkout") return "checked_out"
      return s
    }
    if (statusFilter === "all") return bookingsOrdered
    return bookingsOrdered.filter(
      (b: Booking) => String(b.status).trim().toLowerCase() === m(statusFilter),
    )
  }, [bookingsOrdered, statusFilter])

  // Time filters for bookings & guests
  const [dateFilterBookings, setDateFilterBookings] = React.useState<string>("all")

  const inRange = React.useCallback((iso?: string, kind: string = "all") => {
    if (!iso || kind === "all") return true
    const d = new Date(iso)
    if (!(d instanceof Date) || isNaN(d.getTime())) return false
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (kind === "daily") {
      return d >= startOfDay && d < new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
    }
    if (kind === "weekly") {
      return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }
    if (kind === "monthly") {
      return d >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    return true
  }, [])

  const bookingsTimeFiltered = React.useMemo(
    () =>
      bookingsFiltered
        .filter((b) => inRange(b.checkIn || b.createdAt || "", dateFilterBookings))
        .filter((b) => {
          try {
            const raw = localStorage.getItem("deletedOwnerBookings") || "{}"
            const map = JSON.parse(raw) as { [id: number]: boolean }
            return !map[b.id]
          } catch {
            return true
          }
        }),
    [bookingsFiltered, dateFilterBookings, inRange],
  )

  const reviews = reviewsQ.data?.reviews || []

  const guests = React.useMemo(() => guestsQ.data?.guests || [], [guestsQ.data?.guests])
  const [dateFilterGuests, setDateFilterGuests] = React.useState<string>("all")
  const guestsTimeFiltered = React.useMemo(
    () => guests
      .filter((g) => inRange(g.lastBooking?.checkIn || "", dateFilterGuests))
      .filter((g) => {
        try {
          const raw = localStorage.getItem("deletedOwnerGuests") || "{}"
          const map = JSON.parse(raw) as { [id: number]: boolean }
          const uid = Number(g.user?.id || 0)
          return uid ? !map[uid] : true
        } catch {
          return true
        }
      }),
    [guests, dateFilterGuests, inRange],
  )
  const guestsOrdered = React.useMemo(() => {
    const arr = [...guestsTimeFiltered]
    arr.sort((a, b) => {
      const bt = new Date(b.lastBooking?.createdAt || 0).getTime()
      const at = new Date(a.lastBooking?.createdAt || 0).getTime()
      if (bt !== at) return bt - at
      const bid = Number(b.user?.id || 0)
      const aid = Number(a.user?.id || 0)
      return bid - aid
    })
    return arr
  }, [guestsTimeFiltered])

  const [lastHotelRegId, setLastHotelRegId] = React.useState<number | null>(null)

  const submitHotel = useMutation({
    mutationFn: (p: {
      name: string
      location: string
      price: number
      amenities: string[]
      description?: string
    }) =>
      apiPost<
        { id: number },
        {
          ownerId: number
          name: string
          location: string
          price: number
          amenities: string[]
          description?: string
        }
      >(`/api/owner/hotels/submit`, { ownerId, ...p }),
    onSuccess: (res) => {
      const serial = (hotelsQ.data?.hotels || []).length + 1
      setLastHotelRegId(serial)
      if (res?.id) addId("hotels", res.id)
      toast({ title: "Hotel submitted", description: `#${serial}` })
      qc.invalidateQueries({ queryKey: ["owner", "hotels", ownerId] })
    },
  })

  const updateAmenities = useMutation({
    mutationFn: (p: { id: number; amenities: string[] }) =>
      apiPost(`/api/owner/hotels/${p.id}/amenities`, { amenities: p.amenities }),
    onSuccess: (_res, vars) => {
      toast({ title: "Amenities updated", description: `Hotel #${vars.id}` })
      qc.invalidateQueries({ queryKey: ["owner", "hotels", ownerId] })
    },
  })

  const updateDescription = useMutation({
    mutationFn: (p: { id: number; description: string }) =>
      apiPost(`/api/owner/hotels/${p.id}/description`, { description: p.description }),
    onSuccess: (_res, vars) => {
      toast({ title: "Description updated", description: `Hotel #${vars.id}` })
      qc.invalidateQueries({ queryKey: ["owner", "hotels", ownerId] })
    },
  })

  const updateImages = useMutation({
    mutationFn: (p: { id: number; images: string[] }) =>
      apiPost(`/api/owner/hotels/${p.id}/images`, { images: p.images }),
    onSuccess: (_res, vars) => {
      setImageUploaded((prev) => ({ ...prev, [vars.id]: true }))
      toast({
        title: "Images uploaded",
        description: `Hotel #${vars.id} • ${vars.images.length} file(s)`,
      })
      qc.invalidateQueries({ queryKey: ["owner", "hotels", ownerId] })
      qc.invalidateQueries({ queryKey: ["hotels"] })
      qc.invalidateQueries({ queryKey: ["featured"] })
      qc.invalidateQueries({ queryKey: ["hotel", String(vars.id)] })
      qc.invalidateQueries({ queryKey: ["hotel", Number(vars.id)] })
      try { localStorage.setItem('hotelUpdated', JSON.stringify({ id: Number(vars.id), ts: Date.now() })) } catch (_e) { void 0 }
    },
  })

  const updateDocs = useMutation({
    mutationFn: (p: { id: number; docs: string[] }) =>
      apiPost(`/api/owner/hotels/${p.id}/docs`, { docs: p.docs }),
    onSuccess: (_res, vars) => {
      setDocUploaded((prev) => ({ ...prev, [vars.id]: true }))
      toast({
        title: "Documents uploaded",
        description: `Hotel #${vars.id} • ${vars.docs.length} file(s)`,
      })
      qc.invalidateQueries({ queryKey: ["owner", "hotels", ownerId] })
    },
  })

  const updateInfo = useMutation<{ status: string }, unknown, UpdateInfoVars>({
    mutationFn: (p: UpdateInfoVars) => apiPost(`/api/owner/hotels/${p.id}/info`, p),
    onSuccess: (_res, vars) => {
      toast({ title: "Hotel updated", description: `#${vars.id}` })
      qc.invalidateQueries({ queryKey: ["owner", "hotels", ownerId] })
      qc.invalidateQueries({ queryKey: ["hotel", String(vars.id)] })
      qc.invalidateQueries({ queryKey: ["hotel", Number(vars.id)] })
      qc.invalidateQueries({ queryKey: ["admin","hotels"] })
      try { localStorage.setItem('hotelUpdated', JSON.stringify({ id: Number(vars.id), ts: Date.now() })) } catch (_e) { void 0 }
      try {
        const key = `hotelContact:${String(vars.id)}`
        const payload = {
          contactEmail: String(vars.contactEmail || ''),
          contactPhone1: String(vars.contactPhone1 || ''),
          contactPhone2: String(vars.contactPhone2 || ''),
          ownerName: String(vars.ownerName || '')
        }
        localStorage.setItem(key, JSON.stringify(payload))
      } catch (_e) { void 0 }
    },
  })

  const [deletingHotelId, setDeletingHotelId] = React.useState<number|null>(null)
  const deleteHotel = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/owner/hotels/${id}`),
    onMutate: async (id:number) => {
      setDeletingHotelId(id)
      await qc.cancelQueries({ queryKey: ["owner","hotels", ownerId] })
      const prev = qc.getQueryData<{ hotels: Hotel[] }>(["owner","hotels", ownerId]) || { hotels: [] }
      qc.setQueryData(["owner","hotels", ownerId], (data?: { hotels: Hotel[] }) => ({ hotels: (data?.hotels || []).filter(h => h.id !== id) }))
      return { prev }
    },
    onError: (_err,_id,ctx) => { if (ctx?.prev) qc.setQueryData(["owner","hotels", ownerId], ctx.prev); toast({ title: "Delete failed", variant: "destructive" }) },
    onSuccess: (_res, vars) => { toast({ title: "Hotel deleted", description: `#${vars}` }) },
    onSettled: () => { setDeletingHotelId(null); qc.invalidateQueries({ queryKey: ["owner","hotels", ownerId] }) },
  })

  const [lastRoomId, setLastRoomId] = React.useState<number | null>(null)

  const createRoom = useMutation({
    mutationFn: (p: {
      hotelId: number
      type: string
      price: number
      members: number
      amenities: string[]
      photos: string[]
      availability: boolean
      roomNumber?: string
    }) =>
      apiPost<
        { id: number },
        {
          ownerId: number
          hotelId: number
          type: string
          price: number
          members: number
          amenities: string[]
          photos: string[]
          availability: boolean
          roomNumber?: string
        }
      >(`/api/owner/rooms`, { ownerId, ...p }),
    onSuccess: (res, vars) => {
      if (res?.id) {
        addId("rooms", res.id)
        setLastRoomId(res.id)
        toast({ title: "Room added", description: `#${res.id}` })
        qc.setQueryData(["owner", "rooms", ownerId], (prev: { rooms: Room[] } | undefined) => {
          const base = prev?.rooms || []
          const next: Room = {
            id: res.id,
            hotelId: vars.hotelId,
            type: vars.type,
            roomNumber: vars.roomNumber,
            price: vars.price,
            members: vars.members,
            availability: vars.availability,
            blocked: false,
            amenities: Array.isArray(vars.amenities) ? vars.amenities : [],
            photos: Array.isArray(vars.photos) ? vars.photos : [],
          }
          return { rooms: base.concat(next) }
        })
      }
      qc.invalidateQueries({ queryKey: ["owner", "rooms", ownerId] })
      qc.invalidateQueries({ queryKey: ["owner", "stats", ownerId] })
    },
    onError: (err) => {
      const msg = (() => {
        if (err instanceof Error) return String(err.message || '')
        if (typeof err === 'object' && err) {
          const r = err as { response?: { data?: { error?: string; message?: string } } }
          return r?.response?.data?.error || r?.response?.data?.message || 'Add room failed'
        }
        return 'Add room failed'
      })()
      toast({ title: 'Add room failed', description: msg, variant: 'destructive' })
    }
  })

  const updateRoom = useMutation({
    mutationFn: (p: {
      id: number
      price?: number
      members?: number
      availability?: boolean
      amenities?: string[]
      photos?: string[]
      type?: string
      roomNumber?: string
    }) => apiPost(`/api/owner/rooms/${p.id}`, p),
    onSuccess: (_res, vars) => {
      toast({ title: "Room updated", description: `#${vars.id}` })
      qc.invalidateQueries({ queryKey: ["owner", "rooms", ownerId] })
    },
  })

  const blockRoom = useMutation({
    mutationFn: (p: { id: number; blocked: boolean }) =>
      apiPost(`/api/owner/rooms/${p.id}/block`, { blocked: p.blocked }),
    onSuccess: (_res, vars) => {
      toast({
        title: vars.blocked ? "Room blocked" : "Room unblocked",
        description: `#${vars.id}`,
      })
      qc.invalidateQueries({ queryKey: ["owner", "rooms", ownerId] })
    },
  })

  const approveBooking = useMutation({
    mutationFn: (id: number) => apiPost(`/api/owner/bookings/${id}/approve`, {}),
    onSuccess: (_res, vars) => {
      toast({ title: "Booking approved", description: `#${vars}` })
      qc.invalidateQueries({ queryKey: ["owner", "bookings", ownerId] })
      qc.invalidateQueries({ queryKey: ["owner", "stats", ownerId] })
    },
  })

  const cancelBooking = useMutation({
    mutationFn: async (p: { id: number; reason: string }) => {
      try {
        return await apiPost(`/api/owner/bookings/${p.id}/cancel`, { reason: p.reason })
      } catch (_e) {
        return await apiPost(`/api/admin/bookings/${p.id}/cancel`, {})
      }
    },
    onSuccess: (_res, vars) => {
      toast({ title: "Booking cancelled", description: `#${vars.id}` })
      qc.invalidateQueries({ queryKey: ["owner", "bookings", ownerId] })
      qc.invalidateQueries({ queryKey: ["owner", "stats", ownerId] })
    },
    onError: (err: unknown) => {
      const msg = (() => {
        if (err instanceof Error) return String(err.message || '')
        if (typeof err === 'object' && err) {
          const r = err as { response?: { data?: { error?: string; message?: string } } }
          const m = r?.response?.data?.error || r?.response?.data?.message
          if (typeof m === 'string') return m
        }
        return ''
      })()
      toast({ title: "Cancellation failed", description: msg || "Please try again", variant: "destructive" })
    },
  })

  const ownerCancelOptions = [
    "Overbooking",
    "Payment Issue",
    "Technical Error",
    "Maintenance/Renovation",
    "Violation of Hotel Policies",
    "Fraud/Suspicious Activity",
    "Natural Disaster",
    "Severe Weather Conditions",
    "Double Booking/Invalid Dates",
    "Health and Safety Concerns",
    "Hotel Emergency",
    "Other"
  ]
  const [ownerCancelVisible, setOwnerCancelVisible] = React.useState<{ [id: number]: boolean }>({})
  const [ownerCancelSel, setOwnerCancelSel] = React.useState<{ [id: number]: string }>({})
  const [ownerCancelOther, setOwnerCancelOther] = React.useState<{ [id: number]: string }>({})

  const checkinBooking = useMutation({
    mutationFn: (id: number) => apiPost(`/api/owner/bookings/${id}/checkin`, {}),
    onSuccess: (_res, vars) => {
      toast({ title: "Checked in", description: `Booking #${vars}` })
      qc.invalidateQueries({ queryKey: ["owner", "bookings", ownerId] })
      qc.invalidateQueries({ queryKey: ["owner", "stats", ownerId] })
    },
  })

  const checkoutBooking = useMutation({
    mutationFn: (id: number) => apiPost(`/api/owner/bookings/${id}/checkout`, {}),
    onSuccess: (_res, vars) => {
      toast({ title: "Checked out", description: `Booking #${vars}` })
      qc.invalidateQueries({ queryKey: ["owner", "bookings", ownerId] })
      qc.invalidateQueries({ queryKey: ["owner", "stats", ownerId] })
    },
  })

  const updatePricing = useMutation({
    mutationFn: (p: {
      hotelId: number
      normalPrice?: number
      weekendPrice?: number
      extraHourRate?: number
      cancellationHourRate?: number
      seasonal?: { start: string; end: string; price: number }[]
      specials?: { date: string; price: number }[]
    }) => apiPost(`/api/owner/pricing/${p.hotelId}`, p),
    onSuccess: (_res, vars) => {
      toast({ title: "Pricing updated", description: `Hotel #${vars.hotelId}` })
      qc.invalidateQueries({ queryKey: ["owner", "hotels", ownerId] })
    },
  })

  const deletePricing = useMutation({
    mutationFn: (hotelId: number) => apiDelete(`/api/owner/pricing/${hotelId}`),
    onSuccess: (_res, vars) => {
      toast({ title: "Pricing deleted", description: `Hotel #${vars}` })
      qc.invalidateQueries({ queryKey: ["owner", "hotels", ownerId] })
    },
  })

  const respondReview = useMutation({
    mutationFn: (p: { id: number; response: string }) =>
      apiPost(`/api/owner/reviews/${p.id}/respond`, { response: p.response }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["owner", "reviews", ownerId] })
      toast({ title: "Response sent", description: `Review #${vars.id}` })
    },
    onError: () => toast({ title: "Response failed", variant: "destructive" }),
  })

  const [hotelForm, setHotelForm] = React.useState({
    name: "",
    location: "",
    price: 0,
    amenities: "",
    description: "",
  })

  const [amenitiesEdit, setAmenitiesEdit] = React.useState<{ [id: number]: string }>({})
  const [descriptionEdit, setDescriptionEdit] = React.useState<{ [id: number]: string }>({})
  const [nameEdit, setNameEdit] = React.useState<{ [id: number]: string }>({})
  const [locationEdit, setLocationEdit] = React.useState<{ [id: number]: string }>({})
  const [priceEdit, setPriceEdit] = React.useState<{ [id: number]: string }>({})
  const [statusEdit, setStatusEdit] = React.useState<{ [id: number]: string }>({})
  const [editing, setEditing] = React.useState<{ [id: number]: boolean }>({})

  const [imageFiles, setImageFiles] = React.useState<{ [id: number]: File[] }>({})
  const [docFiles, setDocFiles] = React.useState<{ [id: number]: File[] }>({})
  const [imageUploaded, setImageUploaded] = React.useState<{ [id: number]: boolean }>({})
  const [docUploaded, setDocUploaded] = React.useState<{ [id: number]: boolean }>({})

  const [roomForm, setRoomForm] = React.useState({
    hotelId: 0,
    type: "Standard",
    price: 0,
    members: 1,
    amenities: "",
    availability: true,
    count: 1,
    roomNumbers: "",
  })

  const [roomPhotoFiles, setRoomPhotoFiles] = React.useState<File[]>([])
  const [uploadInfo, setUploadInfo] = React.useState<{
    type: "images" | "documents" | "photos" | null
    names: string[]
  }>({ type: null, names: [] })

  const [_cancelReason, setCancelReason] = React.useState<{ [id: number]: string }>({})

  const [pricingForm, setPricingForm] = React.useState<{
    [id: number]: {
      normalPrice: string
      weekendPrice: string
      extraHourRate?: string
      cancellationHourRate?: string
      seasonal: { start: string; end: string; price: string }[]
      specials: { date: string; price: string }[]
    }
  }>({})

  const [pricingType, setPricingType] = React.useState<{ [id: number]: string }>({})
  const [pricingEditing, setPricingEditing] = React.useState<{ [id: number]: boolean }>({})

  const [seasonSel, setSeasonSel] = React.useState<{ [id: number]: DateRange | undefined }>({})
  const [seasonPrice, setSeasonPrice] = React.useState<{ [id: number]: string }>({})
  const [specialSel, setSpecialSel] = React.useState<{ [id: number]: Date[] }>({})
  const [specialPrice, setSpecialPrice] = React.useState<{ [id: number]: string }>({})

  const [roomTypes, setRoomTypes] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("roomTypes")
      const arr = raw ? JSON.parse(raw) : null
      return Array.isArray(arr) && arr.length ? arr : ["Standard", "Deluxe", "Suite", "Family"]
    } catch {
      return ["Standard", "Deluxe", "Suite", "Family"]
    }
  })

  const [contactForm, setContactForm] = React.useState<{ [id:number]: { email?: string; phone1?: string; phone2?: string; ownerName?: string } }>({})
  const [contactEditing, setContactEditing] = React.useState<{ [id:number]: boolean }>({})
  React.useEffect(()=>{
    const list = (hotelsQ.data?.hotels || []) as Hotel[]
    const init: { [id:number]: { email?: string; phone1?: string; phone2?: string; ownerName?: string } } = {}
    const ownerEmail = auth?.user?.email || ''
    const ownerPhone = auth?.user?.phone || ''
    const ownerName = (auth?.user?.fullName || `${auth?.user?.firstName || ''} ${auth?.user?.lastName || ''}`.trim()) || ''
    list.forEach((h: Hotel)=>{ init[h.id] = { email: h.contactEmail || ownerEmail, phone1: h.contactPhone1 || ownerPhone, phone2: h.contactPhone2 || '', ownerName: h.ownerName || ownerName } })
    setContactForm(init)
  }, [hotelsQ.data, auth?.user?.email, auth?.user?.phone, auth?.user?.fullName, auth?.user?.firstName, auth?.user?.lastName])

  const setRoomTypesPersist = (next: string[]) => {
    setRoomTypes(next)
    try {
      localStorage.setItem("roomTypes", JSON.stringify(next))
    } catch (_e) {
      // ignore
    }
  }

  const addRoomType = (t: string) => {
    const s = new Set(roomTypes.map((x) => x.trim()).filter(Boolean))
    s.add(t.trim())
    setRoomTypesPersist(Array.from(s))
  }

  const [reviewReply, setReviewReply] = React.useState<{ [id: number]: string }>({})

  const [roomEdit, setRoomEdit] = React.useState<{
    [id: number]: {
      price?: string
      members?: string
      amenities?: string
      availability?: boolean
      blocked?: boolean
      type?: string
      availableRooms?: string
    }
  }>({})
  const [roomGroupEdit, setRoomGroupEdit] = React.useState<{ [key: string]: { price?: string; members?: string; amenities?: string; availability?: boolean; blocked?: boolean; availableRooms?: string; roomNumbers?: string } }>({})
  const [roomGroupEditing, setRoomGroupEditing] = React.useState<{ [key: string]: boolean }>({})
  const [roomPhotosByGroup, setRoomPhotosByGroup] = React.useState<{ [key: string]: File[] }>({})

  const [roomEditing, setRoomEditing] = React.useState<{ [id: number]: boolean }>({})
  const [roomPhotosById, setRoomPhotosById] = React.useState<{ [id: number]: File[] }>({})

  // Initialize pricing form from hotels + rooms
  React.useEffect(() => {
    const hs = hotelsQ.data?.hotels || []
    const next: {
      [id: number]: {
        normalPrice: string
        weekendPrice: string
        extraHourRate?: string
        cancellationHourRate?: string
        seasonal: { start: string; end: string; price: string }[]
        specials: { date: string; price: string }[]
      }
    } = {}

    const typesNext: { [id: number]: string } = {}

    hs.forEach((h: Hotel) => {
      const p = h?.pricing || {}
      const normalPrice = String(p?.normalPrice ?? "")
      const weekendPrice = String(p?.weekendPrice ?? "")
      const seasonal = Array.isArray(p?.seasonal)
        ? p.seasonal.map((s) => ({
            start: String(s.start || ""),
            end: String(s.end || ""),
            price: String(s.price ?? ""),
          }))
        : []
      const specials = Array.isArray(p?.specials)
        ? p.specials.map((sp) => ({
            date: String(sp.date || ""),
            price: String(sp.price ?? ""),
          }))
        : []
      const extraHourRate = String(p?.extraHourRate ?? "")
      const cancellationHourRate = String(p?.cancellationHourRate ?? "")

      let np = normalPrice || ""
      if (!np) {
        const rs = roomsRaw.filter((r) => r.hotelId === h.id)
        if (rs.length) {
          np = String(rs[0].price)
          typesNext[h.id] = rs[0].type
        } else {
          const any = roomsRaw[0]
          if (any) {
            np = String(any.price)
            typesNext[h.id] = any.type
          }
        }
      }

      next[h.id] = {
        normalPrice: np,
        weekendPrice: weekendPrice || "",
        extraHourRate,
        cancellationHourRate,
        seasonal,
        specials,
      }
    })

    setPricingForm(next)
    setPricingType(typesNext)
  }, [hotelsQ.data, roomsRaw])

  // When pricingType changes, sync normalPrice with selected room type
  React.useEffect(() => {
    const hs = hotelsQ.data?.hotels || []
    setPricingForm((prev) => {
      const next = { ...prev }
      hs.forEach((h: Hotel) => {
        const sel = pricingType[h.id]
        if (!sel) return
        const selNorm = sel.trim().toLowerCase()
        const rrHotel = roomsRaw.find(
          (r) => r.hotelId === h.id && r.type.trim().toLowerCase() === selNorm,
        )
        const rrGlobal = roomsRaw.find((r) => r.type.trim().toLowerCase() === selNorm)
        const anyR = roomsRaw.find((r) => r.hotelId === h.id)
        const cur =
          next[h.id] || ({ normalPrice: "", weekendPrice: "", extraHourRate: "", cancellationHourRate: "", seasonal: [], specials: [] } as {
            normalPrice: string
            weekendPrice: string
            extraHourRate?: string
            cancellationHourRate?: string
            seasonal: { start: string; end: string; price: string }[]
            specials: { date: string; price: string }[]
          })

        const newPrice = String(rrHotel?.price ?? rrGlobal?.price ?? anyR?.price ?? cur.normalPrice)
        next[h.id] = { ...cur, normalPrice: newPrice }
      })
      return next
    })
  }, [pricingType, roomsRaw, hotelsQ.data])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-50 via-pink-100 to-pink-200 relative overflow-hidden">
      {/* Enhanced Magical Background Effects with Light Colors */}
      <div className="absolute inset-0 opacity-25">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-r from-rose-200/30 to-pink-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-gradient-to-r from-violet-200/30 to-cyan-200/30 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-r from-yellow-100/40 to-orange-100/40 rounded-full blur-2xl animate-float opacity-50"></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-lavender-200/25 to-blue-200/25 rounded-full blur-xl animate-float-reverse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-emerald-100/35 to-teal-100/35 rounded-full blur-2xl animate-float animation-delay-2000"></div>
      </div>

      {/* Rotating Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-100/10 via-purple-100/10 to-cyan-100/10 animate-rotate-bg opacity-60"></div>

      {/* Wave Animation Overlay */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0.1)', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0.3)', stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0.2)', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0.4)', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <path d="M0,400 C300,300 900,500 1200,400 L1200,600 L0,600 Z" fill="url(#waveGradient1)" className="animate-wave-1"></path>
        <path d="M0,450 C400,350 800,550 1200,450 L1200,600 L0,600 Z" fill="url(#waveGradient2)" className="animate-wave-2"></path>
      </svg>

      {/* Enhanced Sparkle Particles - Light Colors */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full animate-ping opacity-70"></div>
      <div className="absolute top-40 right-40 w-1.5 h-1.5 bg-gradient-to-r from-pink-300 to-lavender-300 rounded-full animate-ping opacity-60 animation-delay-1000"></div>
      <div className="absolute bottom-32 left-32 w-1 h-1 bg-gradient-to-r from-blue-300 to-cyan-300 rounded-full animate-ping opacity-50 animation-delay-2000"></div>
      <div className="absolute bottom-20 right-20 w-1.5 h-1.5 bg-gradient-to-r from-purple-300 to-violet-300 rounded-full animate-ping opacity-55 animation-delay-3000"></div>
      <div className="absolute top-60 left-40 w-1.5 h-1.5 bg-gradient-to-r from-emerald-300 to-teal-300 rounded-full animate-bounce opacity-65 animation-delay-1500"></div>
      <div className="absolute bottom-40 right-60 w-1 h-1 bg-gradient-to-r from-indigo-300 to-blue-300 rounded-full animate-bounce opacity-60 animation-delay-2500"></div>
      <div className="absolute top-1/3 left-1/2 w-1.5 h-1.5 bg-gradient-to-r from-rose-300 to-pink-300 rounded-full animate-pulse opacity-70 animation-delay-800"></div>
      <div className="absolute bottom-1/3 right-1/3 w-1 h-1 bg-gradient-to-r from-violet-300 to-purple-300 rounded-full animate-pulse opacity-65 animation-delay-1800"></div>

      {/* Floating Geometric Shapes with Light Colors */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
        <div className="absolute top-16 left-16 w-20 h-20 border-2 border-pink-200 rotate-45 animate-float-slow animate-glow-light"></div>
        <div className="absolute top-32 right-32 w-16 h-16 border-2 border-violet-200 rotate-12 animate-float-slow animation-delay-1000 animate-twist"></div>
        <div className="absolute bottom-32 left-32 w-14 h-14 border-2 border-cyan-200 rounded-full animate-float-slow animation-delay-2000 animate-scale-pulse"></div>
        <div className="absolute bottom-24 right-24 w-12 h-12 border-2 border-emerald-200 rotate-30 animate-float-slow animation-delay-3000 animate-wiggle"></div>
        <div className="absolute top-1/2 left-20 w-18 h-18 border-2 border-indigo-200 rounded-full animate-float-medium animation-delay-1500"></div>
        <div className="absolute top-3/4 right-20 w-16 h-16 border-2 border-purple-200 rotate-60 animate-float-medium animation-delay-2500 animate-heartbeat"></div>
        <div className="absolute bottom-1/4 left-1/3 w-14 h-14 border-2 border-teal-200 rotate-15 animate-float-medium animation-delay-800 animate-morph"></div>
      </div>

      {/* Morphing Circles */}
      <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-r from-pink-200/20 to-violet-200/20 rounded-full blur-lg animate-morph-circle opacity-40"></div>
      <div className="absolute bottom-40 left-16 w-28 h-28 bg-gradient-to-r from-cyan-200/20 to-blue-200/20 rounded-full blur-lg animate-morph-circle animation-delay-2000 opacity-35"></div>

      {/* Animated Mesh Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,_theme(colors.pink.100)_1px,_transparent_1px)] bg-[length:32px_32px] opacity-10 animate-pulse"></div>

      {/* Bokeh Light Effects */}
      <div className="absolute top-32 left-32 w-24 h-24 bg-gradient-to-r from-emerald-300/20 to-cyan-300/20 rounded-full blur-xl animate-bokeh"></div>
      <div className="absolute bottom-32 right-32 w-28 h-28 bg-gradient-to-r from-violet-300/15 to-pink-300/15 rounded-full blur-xl animate-bokeh animation-delay-3000"></div>
      <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-gradient-to-r from-yellow-300/25 to-orange-300/25 rounded-full blur-lg animate-bokeh animation-delay-6000"></div>

      {/* Character/Mascot Breathing */}
      <div className="absolute top-24 right-24 animate-breathe">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-300/30 to-purple-300/30 rounded-full flex items-center justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400/40 to-blue-400/40 rounded-full flex items-center justify-center">
            <span className="text-2xl animate-pulse">🤖</span>
          </div>
        </div>
      </div>

      {/* Rotating Hexagonal Patterns */}
      <div className="absolute top-1/4 left-1/4 animate-hex-rotate">
        <svg className="w-20 h-20 opacity-5" viewBox="0 0 100 100">
          <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="currentColor" className="text-purple-300"/>
        </svg>
      </div>
      <div className="absolute bottom-1/4 right-1/4 animate-hex-rotate animation-delay-5000">
        <svg className="w-16 h-16 opacity-5" viewBox="0 0 100 100">
          <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="currentColor" className="text-cyan-300"/>
        </svg>
      </div>

      {/* Enhanced Floating Elements */}
      <div className="absolute top-16 left-16 animate-float-reverse">
        <div className="w-8 h-8 bg-gradient-to-r from-pink-300/20 to-violet-300/20 rounded-lg rotate-12"></div>
      </div>
      <div className="absolute top-40 right-40 animate-float-medium">
        <div className="w-6 h-6 bg-gradient-to-r from-emerald-300/15 to-teal-300/15 rounded-full"></div>
      </div>
      <div className="absolute bottom-20 left-20 animate-float-slow">
        <div className="w-10 h-10 bg-gradient-to-r from-yellow-300/10 to-orange-300/10 rounded-xl rotate-45"></div>
      </div>

      <Header />
      <main className="flex-1 relative z-10">
        {!feature && (
          <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-16 relative overflow-hidden">
            {/* Enhanced animated background effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent animate-pulse"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-black/20"></div>

            {/* Additional floating elements */}
            <div className="absolute top-16 left-16 w-32 h-32 bg-gradient-to-r from-yellow-300/10 to-orange-300/10 rounded-full blur-xl animate-float shadow-2xl animate-morph opacity-80"></div>
            <div className="absolute top-32 right-32 w-28 h-28 bg-gradient-to-r from-pink-300/10 to-purple-300/10 rounded-full blur-lg animate-float-delayed animate-glow shadow-2xl"></div>
            <div className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-r from-cyan-300/8 to-blue-300/8 rounded-full blur-2xl animate-float opacity-60 animate-morph"></div>
            <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-r from-green-300/10 to-purple-300/10 rounded-full blur-xl animate-float-delayed opacity-50"></div>

            {/* Particles Background */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Left side particles */}
              <div className="absolute top-20 left-32 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-particle opacity-90"></div>
              <div className="absolute top-40 left-16 w-1 h-1 bg-pink-300 rounded-full animate-particle opacity-80 animation-delay-1000"></div>
              <div className="absolute top-60 left-24 w-1 h-1 bg-cyan-300 rounded-full animate-particle opacity-70 animation-delay-2000"></div>
              <div className="absolute bottom-32 left-20 w-1.5 h-1.5 bg-orange-300 rounded-full animate-particle opacity-60"></div>
              <div className="absolute bottom-48 left-12 w-1 h-1 bg-purple-300 rounded-full animate-particle opacity-50 animation-delay-3000"></div>

              {/* Right side particles */}
              <div className="absolute top-24 right-20 w-2 h-2 bg-blue-300 rounded-full animate-particle opacity-85"></div>
              <div className="absolute top-44 right-16 w-1.5 h-1.5 bg-indigo-300 rounded-full animate-particle opacity-75 animation-delay-1500"></div>
              <div className="absolute bottom-24 right-24 w-1 h-1 bg-teal-300 rounded-full animate-particle opacity-65 animation-delay-2500"></div>
              <div className="absolute bottom-40 right-12 w-1.5 h-1.5 bg-violet-300 rounded-full animate-particle opacity-55"></div>

              {/* Center particles */}
              <div className="absolute top-1/3 left-1/2 w-1 h-1 bg-emerald-300 rounded-full animate-particle opacity-70 animation-delay-800"></div>
              <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-rose-300 rounded-full animate-particle opacity-60 animation-delay-1800"></div>
            </div>

            {/* Sparkle effects - enhanced */}
            <div className="absolute top-20 left-32 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping opacity-90"></div>
            <div className="absolute top-40 right-16 w-1 h-1 bg-pink-300 rounded-full animate-ping opacity-80 animation-delay-1000"></div>
            <div className="absolute top-60 left-1/4 w-1 h-1 bg-cyan-300 rounded-full animate-ping opacity-70 animation-delay-2000"></div>
            <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-orange-300 rounded-full animate-pulse opacity-80 animation-delay-500"></div>
            <div className="absolute top-48 right-1/3 w-1 h-1 bg-purple-300 rounded-full animate-bounce opacity-60 animation-delay-1500"></div>

            {/* Rainbow effects */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 via-purple-500 animate-rainbow"></div>
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 via-cyan-500 via-yellow-500 via-red-500 via-blue-500 animate-rainbow"></div>
            </div>

            {/* Geometric overlays */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
              <div className="absolute top-24 left-24 w-16 h-16 border-2 border-white rotate-45 animate-pulse animate-morph"></div>
              <div className="absolute top-40 right-40 w-12 h-12 border-2 border-white rounded-full animate-pulse animation-delay-2000 animate-wiggle"></div>
              <div className="absolute bottom-32 left-1/3 w-20 h-20 border-2 border-white rotate-30 animate-pulse animation-delay-1000 animate-heartbeat"></div>
              <div className="absolute bottom-24 right-1/4 w-14 h-14 border-2 border-white rounded-full animate-pulse animation-delay-800"></div>
              <div className="absolute top-1/2 left-20 w-18 h-18 border-2 border-white rotate-12 animate-pulse animation-delay-1600"></div>
            </div>

            <div className="container relative z-10">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm border border-white/30 shadow-2xl hover:scale-110 transition-transform duration-500">
                    <Building2 className="h-12 w-12 animate-pulse drop-shadow-lg" />
                  </div>
                </div>
                <div>
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-yellow-300 via-orange-400 via-pink-400 to-red-500 bg-clip-text text-transparent drop-shadow-2xl mb-4 animate-fade-in relative">
                    <span className="inline-block overflow-hidden border-r-4 border-orange-400 animate-type whitespace-nowrap">
                      Hotel Owner Dashboard
                    </span>
                    <span className="animate-blink">&nbsp;</span>
                  </h1>
                  <p className="opacity-90 text-xl md:text-2xl mt-2 font-light animate-fade-in animation-delay-500 relative">
                    💫 Elegant management of your exceptional properties 💫
                    <span className="absolute -top-2 -right-4 text-pink-300 animate-bounce">✨</span>
                    <span className="absolute -bottom-1 -left-4 text-yellow-300 animate-pulse">🌟</span>
                  </p>
                  <div className="mt-4 flex justify-center animate-fade-in animation-delay-1000">
                    <div className="flex items-center space-x-1 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20 animate-breathe">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                      <span className="text-sm opacity-80">Live Dashboard</span>
                      <span className="ml-2 animate-spin">⚡</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-16 grid gap-8 lg:grid-cols-5 md:grid-cols-2 sm:grid-cols-1">
                <Card className="group shadow-2xl hover:shadow-cyan-500/30 bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0 hover:scale-110 hover:rotate-2 hover:perspective-[1000px] hover:rotate-y-12 transition-all duration-700 ease-out cursor-pointer backdrop-blur-sm hover:shadow-[0_0_50px_rgba(34,211,238,0.3)] relative overflow-hidden animate-bounce-entrance">
                  {/* Animated floating pseudo-elements */}
                  <div className="absolute -top-2 -left-2 w-4 h-4 bg-cyan-300 rounded-full animate-float opacity-60 animation-delay-500"></div>
                  <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce opacity-50 animation-delay-1000"></div>
                  {/* Card interior effects */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent animate-gradient-shift opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 animate-rainbow"></div>
                  <CardHeader className="pb-3 text-center">
                    <CardTitle className="text-sm font-bold text-cyan-700 uppercase tracking-wider">Total Rooms</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-center">
                    <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-500 drop-shadow-lg mb-2">
                      {stats.data?.totalRooms ?? 0}
                    </div>
                    <div className="text-xs text-cyan-600 opacity-70 uppercase tracking-wide">Available</div>
                  </CardContent>
                </Card>

                <Card className="group shadow-2xl hover:shadow-purple-500/30 bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0 hover:scale-110 hover:rotate-2 transition-all duration-700 ease-out cursor-pointer backdrop-blur-sm hover:shadow-[0_0_50px_rgba(147,51,234,0.3)]">
                  <CardHeader className="pb-3 text-center">
                    <CardTitle className="text-sm font-bold text-purple-700 uppercase tracking-wider">Total Bookings</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-center">
                    <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:from-pink-600 group-hover:to-rose-600 transition-all duration-500 drop-shadow-lg mb-2">
                      {stats.data?.totalBookings ?? 0}
                    </div>
                    <div className="text-xs text-purple-600 opacity-70 uppercase tracking-wide">Reservations</div>
                  </CardContent>
                </Card>

                <Card className="group shadow-2xl hover:shadow-green-500/30 bg-gradient-to-br from-white via-green-50 to-emerald-100 border-0 hover:scale-110 hover:rotate-2 transition-all duration-700 ease-out cursor-pointer backdrop-blur-sm hover:shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                  <CardHeader className="pb-3 text-center">
                    <CardTitle className="text-sm font-bold text-green-700 uppercase tracking-wider">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-center">
                    <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent group-hover:from-emerald-600 group-hover:to-teal-600 transition-all duration-500 drop-shadow-lg mb-2">
                      ₹{stats.data?.totalRevenue ?? 0}
                    </div>
                    <div className="text-xs text-green-600 opacity-70 uppercase tracking-wide">Earnings</div>
                  </CardContent>
                </Card>

                <Card className="group shadow-2xl hover:shadow-orange-500/30 bg-gradient-to-br from-white via-orange-50 to-yellow-100 border-0 hover:scale-110 hover:rotate-2 transition-all duration-700 ease-out cursor-pointer backdrop-blur-sm hover:shadow-[0_0_50px_rgba(249,115,22,0.3)]">
                  <CardHeader className="pb-3 text-center">
                    <CardTitle className="text-sm font-bold text-orange-700 uppercase tracking-wider">Pending</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-center">
                    <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent group-hover:from-yellow-600 group-hover:to-amber-600 transition-all duration-500 drop-shadow-lg mb-2">
                      {stats.data?.pendingBookings ?? 0}
                    </div>
                    <div className="text-xs text-orange-600 opacity-70 uppercase tracking-wide">Awaiting</div>
                  </CardContent>
                </Card>

                <Card className="group shadow-2xl hover:shadow-red-500/30 bg-gradient-to-br from-white via-red-50 to-rose-100 border-0 hover:scale-110 hover:rotate-2 transition-all duration-700 ease-out cursor-pointer backdrop-blur-sm hover:shadow-[0_0_50px_rgba(239,68,68,0.3)] min-w-0">
                  <CardHeader className="pb-2 text-center">
                    <CardTitle className="text-sm font-bold text-red-700 uppercase tracking-wider">Status</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 text-center px-2">
                    <div className="text-2xl md:text-3xl font-black bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent group-hover:from-rose-600 group-hover:to-pink-600 transition-all duration-500 drop-shadow-lg mb-1 capitalize break-words leading-tight">
                      {stats.data?.hotelStatus ?? "pending"}
                    </div>
                    <div className="text-xs text-red-600 opacity-80 uppercase font-semibold leading-relaxed">Registration</div>
                  </CardContent>
                </Card>
              </div>

              {/* Decorative bottom element */}
              <div className="mt-12 flex justify-center">
                <div className="relative">
                  <div className="w-32 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full"></div>
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white/60 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {feature === "register" && (
          <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-14 relative overflow-hidden">
            <div className="container">
              <div className="text-center">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                  Hotel Registration
                </h1>
                <p className="mt-3 text-lg opacity-90">
                  Add your property details and get approved faster
                </p>
                <div className="mt-4 flex justify-center">
                  <div className="flex items-center space-x-1 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                    <span className="text-sm opacity-80">Registration Portal</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="container py-8 space-y-8">
          {/* REGISTER HOTEL */}
          {feature === "register" && (
            <Card className="group shadow-2xl hover:shadow-cyan-500/30 bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0 hover:scale-[1.01] transition-all duration-500 ease-out backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent">Hotel Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const hasHotel = allHotels.length > 0
                  return (
                    <div className="text-sm text-muted-foreground">
                      {hasHotel ? (
                        <span>
                          Registration is one-time. Your Hotel ID
                          {allHotels.length > 1 ? "s" : ""}:{" "}
                          {allHotels.map((_, idx) => `#${idx + 1}`).join(", ")}.
                        </span>
                      ) : (
                        <span>No hotel registered yet.</span>
                      )}
                      {lastHotelRegId && (
                        <span className="ml-2 font-medium text-foreground">
                          Last registered ID: #{lastHotelRegId}
                        </span>
                      )}
                    </div>
                  )
                })()}
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="Hotel Name"
                    value={hotelForm.name}
                    onChange={(e) =>
                      setHotelForm({ ...hotelForm, name: e.target.value })
                    }
                    disabled={(hotelsQ.data?.hotels || []).length > 0}
                  />
                  <Input
                    placeholder="Location"
                    value={hotelForm.location}
                    onChange={(e) =>
                      setHotelForm({ ...hotelForm, location: e.target.value })
                    }
                    disabled={(hotelsQ.data?.hotels || []).length > 0}
                  />
                  <Input
                    type="number"
                    placeholder="Base Price"
                    value={hotelForm.price}
                    onChange={(e) =>
                      setHotelForm({
                        ...hotelForm,
                        price: Number(e.target.value),
                      })
                    }
                    disabled={(hotelsQ.data?.hotels || []).length > 0}
                  />
                  <Input
                    className="col-span-3"
                    placeholder="Amenities (comma-separated)"
                    value={hotelForm.amenities}
                    onChange={(e) =>
                      setHotelForm({ ...hotelForm, amenities: e.target.value })
                    }
                    disabled={(hotelsQ.data?.hotels || []).length > 0}
                  />
                  <Input
                    className="col-span-3"
                    placeholder="Description"
                    value={hotelForm.description}
                    onChange={(e) =>
                      setHotelForm({
                        ...hotelForm,
                        description: e.target.value,
                      })
                    }
                    disabled={(hotelsQ.data?.hotels || []).length > 0}
                  />
              </div>
              <Button
                onClick={() =>
                  submitHotel.mutate({
                    name: hotelForm.name,
                    location: hotelForm.location,
                    price: hotelForm.price,
                    amenities: hotelForm.amenities
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                    description: hotelForm.description,
                  })
                }
                disabled={
                  (hotelsQ.data?.hotels || []).length > 0 ||
                  !hotelForm.name ||
                  !hotelForm.location
                }
              >
                Submit Hotel
              </Button>
              {(() => {
                const list = hotelsQ.data?.hotels || []
                if (!list.length) return null
                return (
                  <div className="rounded-lg border overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left">
                          <th className="p-3">S.No</th>
                          <th className="p-3 min-w-[200px]">Hotel</th>
                          <th className="p-3 min-w-[160px]">Location</th>
                          <th className="p-3 min-w-[100px]">Price</th>
                          <th className="p-3">Amenities</th>
                          <th className="p-3 min-w-[220px]">Description</th>
                          <th className="p-3 min-w-[180px]">Upload Images</th>
                          <th className="p-3 min-w-[180px]">Upload Documents</th>
                          <th className="p-3 min-w-[140px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:hover]:bg-muted/30">
                        {list.map((h, idx) => (
                          <tr key={h.id} className="border-t">
                            <td className="p-3">{idx + 1}</td>
                            <td className="p-3">
                              {editing[h.id] ? (
                                <Input
                                  className="w-full"
                                  placeholder="Hotel Name"
                                  value={nameEdit[h.id] ?? h.name}
                                  onChange={(e)=> setNameEdit({ ...nameEdit, [h.id]: e.target.value })}
                                />
                              ) : (
                                <div>{idx + 1} • {h.name}</div>
                              )}
                            </td>
                            <td className="p-3">
                              {editing[h.id] ? (
                                <Input
                                  className="w-full"
                                  placeholder="Location"
                                  value={locationEdit[h.id] ?? h.location}
                                  onChange={(e)=> setLocationEdit({ ...locationEdit, [h.id]: e.target.value })}
                                />
                              ) : (
                                <div>{h.location}</div>
                              )}
                            </td>
                            <td className="p-3">
                              {editing[h.id] ? (
                                <Input
                                  className="w-full min-w-[100px]"
                                  type="number"
                                  placeholder="₹"
                                  value={priceEdit[h.id] ?? String(h.price)}
                                  onChange={(e)=> setPriceEdit({ ...priceEdit, [h.id]: e.target.value })}
                                />
                              ) : (
                                <div>₹{h.price}</div>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1 flex-wrap mb-2">
                                {(h.amenities || []).map((a: string) => (
                                  <span key={`${h.id}-${a}`} className="px-2 py-1 bg-secondary rounded text-xs">{a}</span>
                                ))}
                              </div>
                              {editing[h.id] && (
                                <Input
                                  className="w-full"
                                  placeholder="amenities"
                                  value={amenitiesEdit[h.id] ?? (h.amenities||[]).join(', ')}
                                  onChange={(e)=> setAmenitiesEdit({ ...amenitiesEdit, [h.id]: e.target.value })}
                                />
                              )}
                            </td>
                            <td className="p-3">
                              {editing[h.id] ? (
                                <Input
                                  className="w-full"
                                  placeholder="Description"
                                  value={descriptionEdit[h.id] ?? (h.description || '')}
                                  onChange={(e)=> setDescriptionEdit({ ...descriptionEdit, [h.id]: e.target.value })}
                                />
                              ) : (
                                <div>{h.description || '-'}</div>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2 flex-wrap mb-2">
                                {(h.images || []).map((img)=> (
                                  <img key={`${h.id}-${img}`} src={resolve(img)} alt="Hotel" className="h-10 w-10 object-cover rounded" />
                                ))}
                              </div>
                              {editing[h.id] && (
                                <div className="mt-2 flex flex-col items-start gap-2">
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e)=> setImageFiles({ ...imageFiles, [h.id]: Array.from(e.target.files||[]).slice(0,10) })}
                                  />
                                  <Button size="sm" onClick={async ()=>{ const imgs = imageFiles[h.id] || []; if (!imgs.length) return; const toDataUrl = (f: File)=> new Promise<string>((resolve,reject)=>{ const r = new FileReader(); r.onload = ()=> resolve(String(r.result||'')); r.onerror = reject; r.readAsDataURL(f) }); const dataUrls = await Promise.all(imgs.map(toDataUrl)); updateImages.mutate({ id: h.id, images: dataUrls }); setUploadInfo({ type:'images', names: imgs.map(f=>f.name) }) }}>Save</Button>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1 flex-wrap mb-2">
                                {(h.docs || []).map((d, i)=> (
                                  <a key={`${h.id}-doc-${i}`} href={d} target="_blank" rel="noreferrer" className="px-2 py-1 bg-secondary rounded text-xs inline-block">Document {i+1}</a>
                                ))}
                              </div>
                              {editing[h.id] && (
                                <div className="mt-2 flex flex-col items-start gap-2">
                                  <input
                                    type="file"
                                    multiple
                                    onChange={(e)=> setDocFiles({ ...docFiles, [h.id]: Array.from(e.target.files||[]).slice(0,10) })}
                                  />
                                  <Button size="sm" onClick={async ()=>{ const docs = docFiles[h.id] || []; if (!docs.length) return; const toDataUrl = (f: File)=> new Promise<string>((resolve,reject)=>{ const r = new FileReader(); r.onload = ()=> resolve(String(r.result||'')); r.onerror = reject; r.readAsDataURL(f) }); const dataUrls = await Promise.all(docs.map(toDataUrl)); updateDocs.mutate({ id: h.id, docs: dataUrls }); setUploadInfo({ type:'documents', names: docs.map(f=>f.name) }) }}>Save</Button>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline" onClick={()=>{ const next = !editing[h.id]; setEditing({ ...editing, [h.id]: next }) }}>{editing[h.id] ? 'Stop Edit' : 'Edit'}</Button>
                                <Button size="sm" onClick={async ()=>{
                                  const info = {
                                    id: h.id,
                                    name: String(nameEdit[h.id] ?? h.name),
                                    location: String(locationEdit[h.id] ?? h.location),
                                    price: Number(priceEdit[h.id] ?? h.price) || 0,
                                    description: String(descriptionEdit[h.id] ?? (h.description || '')),
                                  }
                                  updateInfo.mutate(info)
                                  const amenStr = String(amenitiesEdit[h.id] ?? (h.amenities || []).join(', '))
                                  const arr = amenStr.split(',').map(s=>s.trim()).filter(Boolean)
                                  updateAmenities.mutate({ id: h.id, amenities: arr })
                                  setEditing({ ...editing, [h.id]: false })
                                }}>Update</Button>
                                <Button size="sm" variant="outline" disabled={deletingHotelId===h.id || deleteHotel.isPending} onClick={()=> deleteHotel.mutate(h.id)}>{deletingHotelId===h.id || deleteHotel.isPending ? 'Deleting…' : 'Delete'}</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        )}

        {/* Upload result popup */}
        {uploadInfo.type && (
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="bg-card border rounded-lg shadow-card p-6 w-[400px]">
              <div className="text-lg font-semibold mb-2">{uploadInfo.type === 'images' ? 'Images uploaded' : uploadInfo.type === 'documents' ? 'Documents uploaded' : 'Room photos added'}</div>
              <div className="text-sm text-muted-foreground mb-4">Files:</div>
              <div className="space-y-1 max-h-40 overflow-auto">
                {uploadInfo.names.map(n => (<div key={n} className="text-sm">{n}</div>))}
              </div>
              <div className="mt-4 flex justify-end"><Button onClick={()=>setUploadInfo({ type:null, names:[] })}>Close</Button></div>
            </div>
          </div>
        )}
        {uploadInfo.type && lastRoomId && feature==='rooms' && (()=>{ const lr = rooms.find(x=>x.id===lastRoomId); return lr ? (
            <div className="rounded-lg border p-4 mt-4">
              <div className="text-lg font-bold mb-2">Room Details</div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-sm text-muted-foreground">ID</span><div>{lr.id}</div></div>
                <div><span className="text-sm text-muted-foreground">Hotel</span><div>{lr.hotelId}</div></div>
                <div><span className="text-sm text-muted-foreground">Type</span><div>{lr.type}</div></div>
                <div><span className="text-sm text-muted-foreground">Members</span><div>{lr.members}</div></div>
                <div><span className="text-sm text-muted-foreground">Price</span><div>₹{lr.price}</div></div>
                <div><span className="text-sm text-muted-foreground">Availability</span><div>{lr.availability ? 'Available' : 'Unavailable'}</div></div>
                <div><span className="text-sm text-muted-foreground">Blocked</span><div>{lr.blocked ? 'Blocked' : 'Free'}</div></div>
                <div><span className="text-sm text-muted-foreground">Amenities</span><div className="flex gap-1 flex-wrap">{lr.amenities?.map(a=>(<span key={a} className="px-2 py-1 bg-secondary rounded text-xs">{a}</span>))}</div></div>
                <div><span className="text-sm text-muted-foreground">Photos</span><div className="flex gap-2 flex-wrap">{(lr.photos||[]).map(p=>(<img key={`${lr.id}-${p}`} src={resolve(p)} alt="Room" className="h-10 w-10 object-cover rounded" />))}</div></div>
              </div>
            </div>
          ) : null })()}

        

        

        

          {/* ROOMS */}
          {feature === "rooms" && (
            <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-14 relative overflow-hidden">
              <div className="container">
                <div className="text-center">
                  <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Manage Rooms</h1>
                  <p className="mt-3 text-lg opacity-90">Create room types and add rooms with amenities and photos</p>
                  <div className="mt-4 flex justify-center">
                    <div className="flex items-center space-x-1 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                      <span className="text-sm opacity-80">Rooms Portal</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
          {feature === "rooms" && (
            <div className="container mt-8 grid gap-8 lg:grid-cols-4 md:grid-cols-2 sm:grid-cols-1">
              <Card className="group shadow-2xl hover:shadow-cyan-500/30 bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm">
                <CardHeader className="pb-3 text-center"><CardTitle className="text-sm font-bold text-blue-700 uppercase tracking-wider">Total Rooms</CardTitle></CardHeader>
                <CardContent className="pt-0 text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent drop-shadow-lg mb-2">{rooms.length}</div>
                  <div className="text-xs text-blue-600 opacity-70 uppercase tracking-wide">Count</div>
                </CardContent>
              </Card>

              <Card className="group shadow-2xl hover:shadow-green-500/30 bg-gradient-to-br from-white via-green-50 to-emerald-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm">
                <CardHeader className="pb-3 text-center"><CardTitle className="text-sm font-bold text-green-700 uppercase tracking-wider">Available</CardTitle></CardHeader>
                <CardContent className="pt-0 text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent drop-shadow-lg mb-2">{rooms.filter(r=>r.availability && !r.blocked).length}</div>
                  <div className="text-xs text-green-600 opacity-70 uppercase tracking-wide">Rooms</div>
                </CardContent>
              </Card>

              <Card className="group shadow-2xl hover:shadow-orange-500/30 bg-gradient-to-br from-white via-orange-50 to-yellow-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm">
                <CardHeader className="pb-3 text-center"><CardTitle className="text-sm font-bold text-orange-700 uppercase tracking-wider">Blocked</CardTitle></CardHeader>
                <CardContent className="pt-0 text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent drop-shadow-lg mb-2">{rooms.filter(r=>r.blocked).length}</div>
                  <div className="text-xs text-orange-600 opacity-70 uppercase tracking-wide">Rooms</div>
                </CardContent>
              </Card>

              <Card className="group shadow-2xl hover:shadow-purple-500/30 bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0 hover:scale-110 transition-all duration-700 ease-out backdrop-blur-sm">
                <CardHeader className="pb-3 text-center"><CardTitle className="text-sm font-bold text-purple-700 uppercase tracking-wider">Types</CardTitle></CardHeader>
                <CardContent className="pt-0 text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg mb-2">{Array.from(new Set(rooms.map(r=>r.type))).length}</div>
                  <div className="text-xs text-purple-600 opacity-70 uppercase tracking-wide">Unique</div>
                </CardContent>
              </Card>
            </div>
          )}
          {feature === "rooms" && (
            <Card className="group shadow-2xl hover:shadow-purple-500/30 bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0 hover:scale-[1.01] transition-all duration-500 ease-out backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent">Manage Rooms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <RoomTypeManager types={roomTypes} onAddType={addRoomType} />
                <div className="grid grid-cols-7 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Hotel</label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={roomForm.hotelId}
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          hotelId: Number(e.target.value || 0),
                        })
                      }
                    >
                      <option value={0}>Select hotel</option>
                      {hotels.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.id} • {h.name}
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-muted-foreground mt-1">
                      {roomForm.hotelId ? hotelName(roomForm.hotelId) : ""}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Type</label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={roomForm.type}
                      onChange={(e) =>
                        setRoomForm({ ...roomForm, type: e.target.value })
                      }
                    >
                      {roomTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Price
                    </label>
                    <Input
                      type="number"
                      value={roomForm.price}
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          price: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Members
                    </label>
                    <Input
                      type="number"
                      value={roomForm.members}
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          members: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">No. of Rooms</label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={roomForm.count}
                      onChange={(e)=>setRoomForm({ ...roomForm, count: Number(e.target.value)||1 })}
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                        <option key={`rooms-count-${n}`} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-2 block">Room Numbers (comma-separated)</label>
                    <Input
                      placeholder="e.g., 501, 502, 503"
                      value={roomForm.roomNumbers}
                      onChange={(e) => setRoomForm({ ...roomForm, roomNumbers: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-2 block">
                      Amenities (comma-separated)
                    </label>
                    <Input
                      value={roomForm.amenities}
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          amenities: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-3 flex items-center gap-3">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) =>
                        setRoomPhotoFiles(
                          Array.from(e.target.files || []).slice(0, 10),
                        )
                      }
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={roomForm.availability}
                        onChange={(e) =>
                          setRoomForm({
                            ...roomForm,
                            availability: e.target.checked,
                          })
                        }
                      />
                      <span className="text-sm">Available</span>
                    </div>
                  </div>
                  <div className="col-span-3 flex items-end">
                    <Button
                      onClick={async () => {
                        const files = roomPhotoFiles.slice(0, 10)
                        const toDataUrl = (f: File) =>
                          new Promise<string>((resolve, reject) => {
                            const r = new FileReader()
                            r.onload = () => resolve(String(r.result || ""))
                            r.onerror = reject
                            r.readAsDataURL(f)
                          })
                        const photos = files.length
                          ? await Promise.all(files.map(toDataUrl))
                          : []
                        const resolvedId = roomForm.hotelId
                        if (!resolvedId) {
                          toast({ title: 'Select a hotel', description: 'Please choose one of your hotels.' })
                          return
                        }
                        const payloadBase = {
                          hotelId: resolvedId,
                          type: roomForm.type,
                          price: roomForm.price,
                          members: roomForm.members,
                          amenities: roomForm.amenities
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                          photos,
                          availability: roomForm.availability,
                        }
                        const n = Math.max(1, Math.min(20, Number(roomForm.count)||1))
                        const nums = String(roomForm.roomNumbers||"").split(",").map(s=>s.trim()).filter(Boolean)
                        for (let i = 0; i < n; i++) {
                          const roomNumber = nums[i] || ""
                          const payload: { hotelId:number; type:string; price:number; members:number; amenities:string[]; photos:string[]; availability:boolean; roomNumber?: string } = { ...payloadBase, roomNumber }
                          createRoom.mutate(payload)
                        }
                        setUploadInfo({
                          type: "photos",
                          names: files.map((f) => f.name),
                        })
                      }}
                      disabled={!roomForm.hotelId || !roomForm.type}
                    >
                      Add Room
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="p-3">S.No</th>
                        <th className="p-3">Hotel</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">Members</th>
                        <th className="p-3">Rooms Available</th>
                        <th className="p-3">Room Numbers</th>
                        <th className="p-3">Amenities</th>
                        <th className="p-3">Photos</th>
                        <th className="p-3">Availability</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:hover]:bg-muted/30">
                      {roomSummaries.map((g, idx) => (
                        <tr key={g.key} className="border-t">
                          <td className="p-3">{idx + 1}</td>
                          <td className="p-3">{g.hotelId} • {hotelName(g.hotelId)}</td>
                          <td className="p-3">{g.type}</td>
                          <td className="p-3">
                            <Input type="number" className="w-24" placeholder="₹" value={roomGroupEdit[g.key]?.price ?? String(g.price)} onChange={(e)=> setRoomGroupEdit({ ...roomGroupEdit, [g.key]: { ...(roomGroupEdit[g.key]||{}), price: e.target.value } })} disabled={!roomGroupEditing[g.key]} />
                          </td>
                          <td className="p-3">
                            <Input type="number" className="w-20" placeholder="#" value={roomGroupEdit[g.key]?.members ?? String(g.members)} onChange={(e)=> setRoomGroupEdit({ ...roomGroupEdit, [g.key]: { ...(roomGroupEdit[g.key]||{}), members: e.target.value } })} disabled={!roomGroupEditing[g.key]} />
                          </td>
                          <td className="p-3">
                            {roomGroupEditing[g.key] ? (
                              <Input type="number" className="w-16" value={roomGroupEdit[g.key]?.availableRooms ?? String(g.count)} onChange={(e)=> setRoomGroupEdit({ ...roomGroupEdit, [g.key]: { ...(roomGroupEdit[g.key]||{}), availableRooms: e.target.value } })} />
                            ) : (
                              <div>{g.count}</div>
                            )}
                          </td>
                          <td className="p-3">
                            {roomGroupEditing[g.key] ? (
                              <Input
                                placeholder="e.g., 501, 502, 503"
                                value={roomGroupEdit[g.key]?.roomNumbers ?? (g.roomNumbers || []).join(", ")}
                                onChange={(e)=> setRoomGroupEdit({ ...roomGroupEdit, [g.key]: { ...(roomGroupEdit[g.key]||{}), roomNumbers: e.target.value } })}
                              />
                            ) : (
                              <>
                                {g.roomNumbers && g.roomNumbers.length ? (
                                  <div className="flex gap-1 flex-wrap">
                                    {g.roomNumbers.map((rn) => (
                                      <span key={`${g.key}-${rn}`} className="px-2 py-1 bg-secondary rounded text-xs">{rn}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">-</div>
                                )}
                              </>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1 flex-wrap mb-2">{g.amenities?.map((a)=> (<span key={`${g.key}-${a}`} className="px-2 py-1 bg-secondary rounded text-xs">{a}</span>))}</div>
                            <Input placeholder="amenities" value={roomGroupEdit[g.key]?.amenities ?? ""} onChange={(e)=> setRoomGroupEdit({ ...roomGroupEdit, [g.key]: { ...(roomGroupEdit[g.key]||{}), amenities: e.target.value } })} disabled={!roomGroupEditing[g.key]} />
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2 flex-wrap">{(g.photos || []).map((p)=> (<img key={`${g.key}-${p}`} src={resolve(p)} alt="Room" className="h-10 w-10 object-cover rounded" />))}</div>
                            <div className="mt-2"><input type="file" multiple accept="image/*" onChange={(e)=> setRoomPhotosByGroup({ ...roomPhotosByGroup, [g.key]: Array.from(e.target.files||[]).slice(0,10) })} disabled={!roomGroupEditing[g.key]} /></div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${g.availability ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground'}`}>{g.availability ? 'Available' : 'Unavailable'}</span><input type="checkbox" checked={roomGroupEdit[g.key]?.availability ?? g.availability} onChange={(e)=> setRoomGroupEdit({ ...roomGroupEdit, [g.key]: { ...(roomGroupEdit[g.key]||{}), availability: e.target.checked } })} disabled={!roomGroupEditing[g.key]} /></div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={()=>{ const next = !roomGroupEditing[g.key]; setRoomGroupEditing({ ...roomGroupEditing, [g.key]: next }); toast({ title: next ? 'Edit enabled' : 'Edit disabled', description: `Hotel #${g.hotelId} • ${g.type}` }) }}>{roomGroupEditing[g.key] ? 'Stop Edit' : 'Edit'}</Button>
                              <Button size="sm" onClick={async ()=> { const edits = roomGroupEdit[g.key] || {}; const payload: { price?: number; members?: number; amenities?: string[]; availability?: boolean } = {}; if (edits.price !== undefined) payload.price = Number(edits.price); if (edits.members !== undefined) payload.members = Number(edits.members); if (edits.amenities !== undefined) payload.amenities = (edits.amenities||'').split(',').map(s=>s.trim()).filter(Boolean); if (edits.availability !== undefined) payload.availability = !!edits.availability; for (const id of g.ids) { updateRoom.mutate({ id, ...payload }) } if (edits.blocked !== undefined) { for (const id of g.ids) { blockRoom.mutate({ id, blocked: !!edits.blocked }) } } if (edits.availableRooms !== undefined) { const target = Number(edits.availableRooms); const base: Room = getRoomById(g.ids[0]) || { id:0, hotelId:g.hotelId, type:g.type, price:g.price, members:g.members, availability:g.availability, blocked:g.blocked, amenities:g.amenities, photos:g.photos }; await adjustRoomCount(g.hotelId, g.type, target, base) } if (edits.roomNumbers !== undefined) { const list = String(edits.roomNumbers||'').split(',').map(s=>s.trim()).filter(Boolean); const curCount = g.ids.length; if (list.length > curCount) { const base: Room = getRoomById(g.ids[0]) || { id:0, hotelId:g.hotelId, type:g.type, price:g.price, members:g.members, availability:g.availability, blocked:g.blocked, amenities:g.amenities, photos:g.photos }; const extras = list.slice(curCount); for (const rn of extras) { createRoom.mutate({ hotelId: g.hotelId, type: g.type, price: base.price, members: base.members, amenities: base.amenities || [], photos: base.photos || [], availability: base.availability, roomNumber: rn }) } } else if (list.length < curCount) { const idsSorted = g.ids.slice().sort((a,b)=> b-a); const toDelete = idsSorted.slice(0, curCount - list.length); for (const id of toDelete) { await apiDelete(`/api/owner/rooms/${id}`) } } const ids = g.ids.slice(0, Math.max(list.length, 0)); for (let i=0; i<ids.length; i++) { const rn = list[i] || ''; updateRoom.mutate({ id: ids[i], roomNumber: rn }) } qc.invalidateQueries({ queryKey: ['owner','rooms', ownerId] }) } const files = roomPhotosByGroup[g.key] || []; if (files.length) { const toDataUrl = (f: File)=> new Promise<string>((resolve,reject)=>{ const reader = new FileReader(); reader.onload = ()=> resolve(String(reader.result||'')); reader.onerror = reject; reader.readAsDataURL(f) }); const dataUrls = await Promise.all(files.map(toDataUrl)); for (const id of g.ids) { updateRoom.mutate({ id, photos: dataUrls }) } setUploadInfo({ type:'photos', names: files.map(f=>f.name) }) } }}>Update</Button>
                              <Button size="sm" variant="outline" onClick={async ()=> { try { await qc.cancelQueries({ queryKey: ['owner','rooms', ownerId] }); const prev = qc.getQueryData<{ rooms: Room[] }>(['owner','rooms', ownerId]) || { rooms: [] }; const gone = new Set(g.ids); qc.setQueryData(['owner','rooms', ownerId], (data?: { rooms: Room[] }) => ({ rooms: (data?.rooms || []).filter(r => !gone.has(r.id)) })); await Promise.all(g.ids.map(id => apiDelete(`/api/owner/rooms/${id}`))); toast({ title: 'Rooms deleted', description: `${g.ids.length} item(s)` }); } catch { toast({ title: 'Delete failed', variant: 'destructive' }) } finally { qc.invalidateQueries({ queryKey: ['owner','rooms', ownerId] }) } }}>Delete</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload result popup */}
          {uploadInfo.type && (
            <div className="fixed inset-0 flex items-center justify-center">
              <div className="bg-card border rounded-lg shadow-card p-6 w-[400px]">
                <div className="text-lg font-semibold mb-2">
                  {uploadInfo.type === "images"
                    ? "Images uploaded"
                    : uploadInfo.type === "documents"
                      ? "Documents uploaded"
                      : "Room photos added"}
                </div>
                <div className="text-sm text-muted-foreground mb-4">Files:</div>
                <div className="space-y-1 max-h-40 overflow-auto">
                  {uploadInfo.names.map((n) => (
                    <div key={n} className="text-sm">
                      {n}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => setUploadInfo({ type: null, names: [] })}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}

          {uploadInfo.type && lastRoomId && feature === "rooms" && (() => {
            const lr = rooms.find((x) => x.id === lastRoomId)
            return lr ? (
              <div className="rounded-lg border p-4 mt-4">
                <div className="text-lg font-bold mb-2">Room Details</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-sm text-muted-foreground">ID</span>
                    <div>{lr.id}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Hotel</span>
                    <div>{lr.hotelId}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Type</span>
                    <div>{lr.type}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Members
                    </span>
                    <div>{lr.members}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Price</span>
                    <div>₹{lr.price}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Availability
                    </span>
                    <div>{lr.availability ? "Available" : "Unavailable"}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Blocked
                    </span>
                    <div>{lr.blocked ? "Blocked" : "Free"}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Amenities
                    </span>
                    <div className="flex gap-1 flex-wrap">
                      {lr.amenities?.map((a) => (
                        <span
                          key={a}
                          className="px-2 py-1 bg-secondary rounded text-xs"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Photos
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {(lr.photos || []).map((p) => (
                        <img
                          key={`${lr.id}-${p}`}
                          src={resolve(p)}
                          alt="Room"
                          className="h-10 w-10 object-cover rounded"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          })()}

          {/* BOOKINGS */}
          {feature === "bookings" && (
            <Card className="shadow-card hover:shadow-card-hover transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Manage Bookings</CardTitle>
                <div className="flex items-center gap-2">
                    {(() => {
                      const opts = [
                        { k: "all", v: "All" },
                        { k: "pending", v: "Pending" },
                        { k: "confirmed", v: "Confirmed" },
                        { k: "checkin", v: "Check-in" },
                        { k: "checkout", v: "Check-out" },
                        { k: "cancelled", v: "Cancelled" },
                      ]
                      return (
                        <select
                          className="px-2 py-1 rounded border bg-background text-sm"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          {opts.map((o) => (
                            <option key={o.k} value={o.k}>
                              {o.v}
                            </option>
                          ))}
                        </select>
                      )
                    })()}
                    {(() => {
                      const opts = [
                        { k: "all", v: "All time" },
                        { k: "daily", v: "Daily" },
                        { k: "weekly", v: "Weekly" },
                        { k: "monthly", v: "Monthly" },
                      ]
                      return (
                        <select
                          className="px-2 py-1 rounded border bg-background text-sm"
                          value={dateFilterBookings}
                          onChange={(e) => setDateFilterBookings(e.target.value)}
                        >
                          {opts.map((o) => (
                            <option key={o.k} value={o.k}>
                              {o.v}
                            </option>
                          ))}
                        </select>
                      )
                    })()}
                    <Button
                      variant="outline"
                      onClick={() => {
                        const rows = bookingsTimeFiltered.map((b) => [
                          `#${b.id}`,
                          String(b.hotelId || ""),
                          String(
                            b.user?.fullName ||
                              `${b.user?.firstName || ""} ${
                                b.user?.lastName || ""
                              }`.trim() ||
                              b.user?.email ||
                              "",
                          ),
                          String(b.user?.email || ""),
                          String(b.roomId || ""),
                          String(b.checkIn || ""),
                          String(b.checkOut || ""),
                          String(b.guests || ""),
                          String(b.total || ""),
                          String(b.status || ""),
                        ])
                        const header = [
                          "Booking",
                          "Hotel",
                          "User",
                          "Email",
                          "Room",
                          "CheckIn",
                          "CheckOut",
                          "Guests",
                          "Total",
                          "Status",
                        ]
                        const csv = [header]
                          .concat(rows)
                          .map((r) =>
                            r
                              .map((x) => {
                                const s = String(x ?? "")
                                if (
                                  s.includes(",") ||
                                  s.includes('"') ||
                                  s.includes("\n")
                                )
                                  return `"${s.replace(/"/g, '""')}"`
                                return s
                              })
                              .join(","),
                          )
                          .join("\n")

                        const blob = new Blob([csv], {
                          type: "text/csv;charset=utf-8;",
                        })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `owner-bookings-${dateFilterBookings}.csv`
                        a.click()
                        setTimeout(() => URL.revokeObjectURL(url), 2000)
                      }}
                    >
                      Download Excel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        try {
                          const raw = localStorage.getItem("deletedOwnerBookings") || "{}"
                          const map = JSON.parse(raw) as { [id: number]: boolean }
                          bookingsTimeFiltered.forEach((b) => { map[b.id] = true })
                          localStorage.setItem("deletedOwnerBookings", JSON.stringify(map))
                        } catch { void 0 }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="p-3">S.No</th>
                        <th className="p-3">Booking</th>
                        <th className="p-3">Hotel</th>
                        <th className="p-3">User</th>
                        <th className="p-3">Room</th>
                        <th className="p-3">Dates</th>
                        <th className="p-3">Guests</th>
                        <th className="p-3">Total</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:hover]:bg-muted/30">
                      {bookingsTimeFiltered.map((b, idx) => (
                        <tr key={b.id} className="border-t">
                          <td className="p-3">{idx + 1}</td>
                          <td className="p-3">#{b.id}</td>
                          <td className="p-3">{b.hotelId}</td>
                          <td className="p-3">
                            <div className="font-medium">
                              {b.user?.fullName ||
                                `${b.user?.firstName || ""} ${
                                  b.user?.lastName || ""
                                }`.trim() ||
                                b.user?.email ||
                                `User #${b.user?.id || ""}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {b.user?.email || "-"}
                            </div>
                          </td>
                          <td className="p-3">{b.roomNumber ? b.roomNumber : (b.roomId ?? "-")}</td>
                          <td className="p-3">
                            {b.checkIn} → {b.checkOut}
                            {(() => {
                              const eh = Number(b?.extraHours || 0)
                              const ec = Number(b?.extraCharges || 0)
                              const cf = Number(b?.cancellationFee || 0)
                              if (eh > 0) {
                                return (
                                  <div className="text-xs mt-1">
                                    <span className="px-1 py-0.5 rounded bg-secondary">Extra {eh}h • ₹{ec}</span>
                                  </div>
                                )
                              }
                              if (cf > 0 && String(b.status).toLowerCase() === 'cancelled') {
                                return (
                                  <div className="text-xs mt-1">
                                    <span className="px-1 py-0.5 rounded bg-secondary">Cancellation Fee • ₹{cf}</span>
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </td>
                          <td className="p-3">{b.guests}</td>
                          <td className="p-3">₹{b.total}</td>
                          <td className="p-3">
                            <div className={`inline-flex items-center gap-4 px-6 py-4 rounded-2xl text-lg font-bold shadow-xl border-2 whitespace-nowrap uppercase ${
                              String(b.status).toLowerCase().includes('approved') ||
                              String(b.status).toLowerCase().includes('confirmed') ||
                              String(b.status).toLowerCase() === 'checked_in'
                                ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-emerald-700 text-white border-green-900 shadow-green-900/50'
                                : String(b.status).toLowerCase().includes('pending')
                                ? 'bg-gradient-to-r from-yellow-500 via-amber-600 to-yellow-700 text-white border-orange-900 shadow-orange-900/50 animate-pulse'
                                : String(b.status).toLowerCase().includes('cancelled')
                                ? 'bg-gradient-to-r from-red-500 via-rose-600 to-red-700 text-white border-red-900 shadow-red-900/50'
                                : 'bg-gradient-to-r from-blue-500 via-cyan-600 to-blue-700 text-white border-blue-900 shadow-blue-900/50'
                            }`}>
                              {/* Status Icon */}
                              {String(b.status).toLowerCase().includes('approved') ||
                               String(b.status).toLowerCase().includes('confirmed') ? (
                                <div className="w-2 h-2 bg-green-800 rounded-full animate-pulse flex-shrink-0"></div>
                              ) : String(b.status).toLowerCase().includes('pending') ? (
                                <div className="w-2 h-2 bg-orange-800 rounded-full animate-bounce flex-shrink-0"></div>
                              ) : String(b.status).toLowerCase().includes('cancelled') ? (
                                <div className="w-2 h-2 bg-red-800 rounded-full flex-shrink-0 animate-ping"></div>
                              ) : null}
                              <span className="tracking-normal">
                                {b.status === 'confirmed' ? 'APPROVED' :
                                 b.status === 'checked_in' ? 'CHECKED IN' :
                                 b.status === 'checked_out' ? 'CHECKED OUT' :
                                 b.status === 'cancelled' ? 'CANCELLED' :
                                 b.status === 'pending' ? 'PENDING APPROVAL' :
                                 b.status.toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 flex gap-2 flex-wrap items-center">
                            {(() => {
                              const s = String(b.status || "")
                                .trim()
                                .toLowerCase()
                              const canCancel = s === "confirmed"
                              const canCheckin = s === "confirmed"
                              const canCheckout = s === "confirmed" || s === "checked_in"
                              return (
                                <>
                                  {canCheckin && (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        checkinBooking.mutate(b.id)
                                      }
                                    >
                                      Check-in
                                    </Button>
                                  )}
                                  {canCheckout && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        checkoutBooking.mutate(b.id)
                                      }
                                    >
                                      Check-out
                                    </Button>
                                  )}
                                  {canCancel && (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => setOwnerCancelVisible({ ...ownerCancelVisible, [b.id]: !(ownerCancelVisible[b.id] || false) })}>Cancel</Button>
                                      {ownerCancelVisible[b.id] ? (
                                        <div className="flex items-center gap-2">
                                          <select className="px-2 py-1 rounded border text-sm" value={ownerCancelSel[b.id] || ''} onChange={(e)=> setOwnerCancelSel({ ...ownerCancelSel, [b.id]: e.target.value })}>
                                            <option value="">Select reason</option>
                                            {ownerCancelOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                                          </select>
                                          {(ownerCancelSel[b.id] === 'Other') && (
                                            <Input className="w-48" placeholder="Please specify" value={ownerCancelOther[b.id] || ''} onChange={(e)=> setOwnerCancelOther({ ...ownerCancelOther, [b.id]: e.target.value })} />
                                          )}
                                          {(() => {
                                            const chosen = ownerCancelSel[b.id] || ''
                                            const extra = chosen === 'Other' ? (ownerCancelOther[b.id] || '') : ''
                                            const reason = `${chosen}${extra ? (': ' + extra) : ''}`.trim()
                                            return (
                                              <Button size="sm" variant="destructive" onClick={()=> cancelBooking.mutate({ id: b.id, reason })}>Confirm</Button>
                                            )
                                          })()}
                                        </div>
                                      ) : null}
                                    </>
                                  )}
                                </>
                              )
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        {/* GUESTS */}
        {feature === "guests" && (
            <Card className="shadow-card hover:shadow-card-hover transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Guests</CardTitle>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const opts = [
                        { k: "all", v: "All time" },
                        { k: "daily", v: "Daily" },
                        { k: "weekly", v: "Weekly" },
                        { k: "monthly", v: "Monthly" },
                      ]
                      return (
                        <select
                          className="px-2 py-1 rounded border bg-background text-sm"
                          value={dateFilterGuests}
                          onChange={(e) => setDateFilterGuests(e.target.value)}
                        >
                          {opts.map((o) => (
                            <option key={o.k} value={o.k}>
                              {o.v}
                            </option>
                          ))}
                        </select>
                      )
                    })()}
                    <Button
                      variant="outline"
                      onClick={() => {
                        const rows = guestsTimeFiltered.map((g) => [
                          String(g.user?.id || ""),
                          String(
                            g.user?.fullName ||
                              `${g.user?.firstName || ""} ${
                                g.user?.lastName || ""
                              }`.trim(),
                          ),
                          String(g.user?.email || ""),
                          String(g.user?.phone || ""),
                          String(g.user?.idType || ""),
                          String(g.user?.idNumber || ""),
                          String(g.user?.address || ""),
                          String((() => { const id = Number(g.lastBooking?.id || 0); const fromApi = g.lastBooking?.guests; const count = typeof fromApi === 'number' ? fromApi : (bookings.find(b=> Number(b.id||0)===id)?.guests as unknown as number | undefined); return count ?? ''; })()),
                          String(g.lastBooking?.id || ""),
                          String(g.lastBooking?.hotelId || ""),
                          String(g.lastBooking?.checkIn || ""),
                          String(g.lastBooking?.checkOut || ""),
                          String(g.lastBooking?.status || ""),
                        ])
                        const header = [
                          "UserId",
                          "Name",
                          "Email",
                          "Phone",
                          "ID Type",
                          "ID Number",
                          "Address",
                          "Guests",
                          "LastBookingId",
                          "HotelId",
                          "CheckIn",
                          "CheckOut",
                          "Status",
                        ]
                        const csv = [header]
                          .concat(rows)
                          .map((r) =>
                            r
                              .map((x) => {
                                const s = String(x ?? "")
                                if (
                                  s.includes(",") ||
                                  s.includes('"') ||
                                  s.includes("\n")
                                )
                                  return `"${s.replace(/"/g, '""')}"`
                                return s
                              })
                              .join(","),
                          )
                          .join("\n")
                        const blob = new Blob([csv], {
                          type: "text/csv;charset=utf-8;",
                        })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `owner-guests-${dateFilterGuests}.csv`
                        a.click()
                        setTimeout(() => URL.revokeObjectURL(url), 2000)
                      }}
                    >
                      Download Excel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        try {
                          const raw = localStorage.getItem("deletedOwnerGuests") || "{}"
                          const map = JSON.parse(raw) as { [id: number]: boolean }
                          guestsTimeFiltered.forEach((g) => {
                            const uid = Number(g.user?.id || 0)
                            if (uid) map[uid] = true
                          })
                          localStorage.setItem("deletedOwnerGuests", JSON.stringify(map))
                        } catch { void 0 }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr className="text-left">
                          <th className="p-3">S.No</th>
                          <th className="p-3">Guest</th>
                          <th className="p-3">Contact</th>
                          <th className="p-3">ID</th>
                          <th className="p-3">Document</th>
                          <th className="p-3">Address</th>
                          <th className="p-3">Guests</th>
                          <th className="p-3">Last Booking</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:hover]:bg-muted/30">
                      {guestsOrdered.map((g, idx) => (
                        <tr
                          key={String(
                            g.user?.id || g.lastBooking?.id || Math.random(),
        )}

                          className="border-t"
                        >
                          <td className="p-3">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-medium">
                              {g.user?.fullName ||
                                `${g.user?.firstName || ""} ${
                                  g.user?.lastName || ""
                                }`.trim() ||
                                `User #${g.user?.id}`}
                          </div>
                            <div className="text-xs text-muted-foreground">
                              #{g.user?.id}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">{g.user?.email}</div>
                            <div className="text-xs text-muted-foreground">
                              {g.user?.phone}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              {g.user?.idType} {g.user?.idNumber}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              DOB {g.user?.dob || "-"}
                            </div>
                          </td>
                          <td className="p-3">
                            {(() => {
                              const u = String(g.user?.idDocUrl || "")
                              if (!u) return (<span className="text-sm text-muted-foreground">No document</span>)
                              const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>
                              const base = env?.VITE_API_URL || 'http://localhost:5000'
                              const s = u.startsWith("/uploads") ? `${base}${u}` : (u.startsWith("uploads") ? `${base}/${u}` : u)
                              return (
                                <a href={s} target="_blank" rel="noreferrer">
                                  <img src={s} alt="Document" className="h-10 w-10 rounded object-cover border" onError={(e)=>{ e.currentTarget.src='https://placehold.co/40x40?text=Doc' }} />
                                </a>
                              )
                            })()}
                          </td>
                          <td className="p-3">
                            {g.user?.address || "-"}
                          </td>
                          <td className="p-3">{(() => { const id = Number(g.lastBooking?.id || 0); const fromApi = g.lastBooking?.guests; const count = typeof fromApi === 'number' ? fromApi : (bookings.find(b=> Number(b.id||0)===id)?.guests as unknown as number | undefined); return (count ?? '-') as unknown as React.ReactNode })()}</td>
                          <td className="p-3">
                            {g.lastBooking ? (
                              <div className="text-sm">
                                #{g.lastBooking.id} • Hotel{" "}
                                {g.lastBooking.hotelId}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                No booking
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {guestsTimeFiltered.length === 0 && (
                        <tr>
                          <td
                            className="p-3 text-muted-foreground"
                            colSpan={6}
                          >
                            No guests yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
          </Card>
        )}

        {/* CONTACT */}
        {feature === "contact" && (
          <Card className="shadow-card hover:shadow-card-hover transition-all">
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3">Hotel</th>
                      <th className="p-3">Hotel Email</th>
                      <th className="p-3">Contact 1</th>
                      <th className="p-3">Contact 2</th>
                      <th className="p-3">Owner Name</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:hover]:bg-muted/30">
                    {(hotelsQ.data?.hotels || []).map((h: Hotel)=> (
                      <tr key={`contact-${h.id}`} className="border-t">
                        <td className="p-3">{h.id} • {h.name}</td>
                        <td className="p-3"><Input placeholder="email" value={contactForm[h.id]?.email ?? ''} onChange={(e)=> setContactForm({ ...contactForm, [h.id]: { ...(contactForm[h.id]||{}), email: e.target.value } })} disabled={!contactEditing[h.id]} /></td>
                        <td className="p-3"><Input placeholder="phone" maxLength={10} value={contactForm[h.id]?.phone1 ?? ''} onChange={(e)=> { const v = (e.target.value||'').replace(/\D/g,'').slice(0,10); setContactForm({ ...contactForm, [h.id]: { ...(contactForm[h.id]||{}), phone1: v } }) }} disabled={!contactEditing[h.id]} /></td>
                        <td className="p-3"><Input placeholder="phone" maxLength={10} value={contactForm[h.id]?.phone2 ?? ''} onChange={(e)=> { const v = (e.target.value||'').replace(/\D/g,'').slice(0,10); setContactForm({ ...contactForm, [h.id]: { ...(contactForm[h.id]||{}), phone2: v } }) }} disabled={!contactEditing[h.id]} /></td>
                        <td className="p-3"><Input placeholder="Owner Name" value={contactForm[h.id]?.ownerName ?? ''} onChange={(e)=> setContactForm({ ...contactForm, [h.id]: { ...(contactForm[h.id]||{}), ownerName: e.target.value } })} disabled={!contactEditing[h.id]} /></td>
                        <td className="p-3 flex gap-2"><Button size="sm" variant="outline" onClick={()=> setContactEditing({ ...contactEditing, [h.id]: !(contactEditing[h.id] || false) })}>{contactEditing[h.id] ? 'Stop Edit' : 'Edit'}</Button><Button size="sm" onClick={()=> updateInfo.mutate({ id: h.id, contactEmail: contactForm[h.id]?.email || '', contactPhone1: contactForm[h.id]?.phone1 || '', contactPhone2: contactForm[h.id]?.phone2 || '', ownerName: contactForm[h.id]?.ownerName || '' })} disabled={!contactEditing[h.id]}>Save</Button><Button size="sm" variant="destructive" onClick={()=> { setContactForm({ ...contactForm, [h.id]: { email:'', phone1:'', phone2:'', ownerName:'' } }); updateInfo.mutate({ id: h.id, contactEmail: '', contactPhone1: '', contactPhone2: '', ownerName: '' }) }}>Delete</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {feature === "contact" && (
          <Card className="shadow-card hover:shadow-card-hover transition-all">
            <CardHeader><CardTitle>Admin Contact Details</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3">Full Name</th>
                      <th className="p-3">Phone 1</th>
                      <th className="p-3">Phone 2</th>
                      <th className="p-3">Email</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:hover]:bg-muted/30">
                    <tr className="border-t">
                      <td className="p-3">{settingsQ.data?.settings?.contactName || '-'}</td>
                      <td className="p-3">{settingsQ.data?.settings?.contactPhone1 || '-'}</td>
                      <td className="p-3">{settingsQ.data?.settings?.contactPhone2 || '-'}</td>
                      <td className="p-3">{settingsQ.data?.settings?.contactEmail || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

          {/* PRICING */}
          {feature === "pricing" && (
            <Card className="shadow-card hover:shadow-card-hover transition-all">
              <CardHeader>
                <CardTitle>Dynamic Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="p-2">Hotel</th>
                        <th className="p-2">Normal ₹</th>
                        <th className="p-2">Weekend ₹</th>
                        <th className="p-2">Extra Hour ₹</th>
                        <th className="p-2">Cancellation Hour ₹</th>
                        <th className="p-2">Seasonal</th>
                        <th className="p-2">Special Days</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hotels.map((h) => {
                        const pf =
                          pricingForm[h.id] || ({
                            normalPrice: "",
                            weekendPrice: "",
                            extraHourRate: "",
                            cancellationHourRate: "",
                            seasonal: [],
                            specials: [],
                          } as {
                            normalPrice: string
                            weekendPrice: string
                            extraHourRate?: string
                            cancellationHourRate?: string
                            seasonal: {
                              start: string
                              end: string
                              price: string
                            }[]
                            specials: { date: string; price: string }[]
                          })

                        return (
                          <tr key={h.id} className="border-t">
                            <td className="p-2">
                              {h.id} • {h.name}
                              <div className="mt-2">
                                <select
                                  className="px-2 py-1 rounded border bg-background text-xs"
                                  value={pricingType[h.id] || ""}
                                  onChange={(e) => {
                                    const sel = e.target.value
                                    setPricingType({
                                      ...pricingType,
                                      [h.id]: sel,
                                    })
                                    const selNorm = sel.trim().toLowerCase()
                                    const rrHotel = roomsRaw.find(
                                      (r) =>
                                        r.hotelId === h.id &&
                                        r.type.trim().toLowerCase() === selNorm,
                                    )
                                    const rrGlobal = roomsRaw.find(
                                      (r) =>
                                        r.type.trim().toLowerCase() === selNorm,
                                    )
                                    const newPrice = String(
                                      rrHotel?.price ??
                                        rrGlobal?.price ??
                                        h.price ??
                                        "",
                                    )
                                    setPricingForm((prev) => ({
                                      ...prev,
                                      [h.id]: {
                                        ...(prev[h.id] || pf),
                                        normalPrice: newPrice,
                                      },
                                    }))
                                  }}
                                >
                                  <option value="">Select room type</option>
                                  {Array.from(
                                    new Set([
                                      ...roomTypes,
                                      ...roomsRaw
                                        .filter((r) => r.hotelId === h.id)
                                        .map((r) => r.type),
                                    ]),
                                  ).map((t) => (
                                    <option key={`${h.id}-${t}`} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="p-2">
                              <Input
                                placeholder=""
                                value={pricingForm[h.id]?.normalPrice ?? ""}
                                onChange={(e) =>
                                  setPricingForm({
                                    ...pricingForm,
                                    [h.id]: {
                                      ...(pricingForm[h.id] || pf),
                                      normalPrice: e.target.value,
                                    },
                                  })
                                }
                                disabled={!pricingEditing[h.id]}
                              />
                            </td>
                          <td className="p-2">
                            <Input
                              placeholder=""
                              value={pf.weekendPrice}
                              onChange={(e) =>
                                setPricingForm({
                                  ...pricingForm,
                                  [h.id]: {
                                    ...pf,
                                    weekendPrice: e.target.value,
                                  },
                                })
                              }
                              disabled={!pricingEditing[h.id]}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              placeholder=""
                              value={pf.extraHourRate || ""}
                              onChange={(e) =>
                                setPricingForm({
                                  ...pricingForm,
                                  [h.id]: {
                                    ...pf,
                                    extraHourRate: e.target.value,
                                  },
                                })
                              }
                              disabled={!pricingEditing[h.id]}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              placeholder=""
                              value={pf.cancellationHourRate || ""}
                              onChange={(e) =>
                                setPricingForm({
                                  ...pricingForm,
                                  [h.id]: {
                                    ...pf,
                                    cancellationHourRate: e.target.value,
                                  },
                                })
                              }
                              disabled={!pricingEditing[h.id]}
                            />
                          </td>
                            <td className="p-2">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="p-2"
                                        aria-label="Select range"
                                        disabled={!pricingEditing[h.id]}
                                      >
                                        <CalendarIcon className="h-4 w-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="w-auto p-0 bg-popover z-50"
                                      align="start"
                                    >
                                      <Calendar
                                        mode="range"
                                        selected={seasonSel[h.id]}
                                        onSelect={(v) =>
                                          setSeasonSel({
                                            ...seasonSel,
                                            [h.id]: v,
                                          })
                                        }
                                        numberOfMonths={2}
                                        fromDate={new Date()}
                                        disabled={{ before: new Date() }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <Input
                                    className="w-28"
                                    placeholder=""
                                    value={seasonPrice[h.id] || ""}
                                    onChange={(e) =>
                                      setSeasonPrice({
                                        ...seasonPrice,
                                        [h.id]: e.target.value,
                                      })
                                    }
                                    disabled={!pricingEditing[h.id]}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const sel: DateRange | undefined =
                                        seasonSel[h.id]
                                      const price = seasonPrice[h.id] || ""
                                      const start = sel?.from ? ymdLocal(sel.from) : ""
                                      const end = sel?.to ? ymdLocal(sel.to) : ""
                                      if (start && end) {
                                        const next = (pf.seasonal || []).concat({
                                          start,
                                          end,
                                          price,
                                        })
                                        setPricingForm({
                                          ...pricingForm,
                                          [h.id]: {
                                            ...pf,
                                            seasonal: next,
                                          },
                                        })
                                      }
                                    }}
                                    disabled={!pricingEditing[h.id]}
                                  >
                                    Apply Range
                                  </Button>
                                </div>
                                {(pf.seasonal || []).map((row, idx) => (
                                  <div
                                    key={idx}
                                    className="grid grid-cols-4 gap-2"
                                  >
                                    <Input
                                      placeholder="Start"
                                      value={row.start}
                                      onChange={(e) => {
                                        const next = (pf.seasonal || []).slice()
                                        next[idx] = {
                                          ...row,
                                          start: e.target.value,
                                        }
                                        setPricingForm({
                                          ...pricingForm,
                                          [h.id]: {
                                            ...pf,
                                            seasonal: next,
                                          },
                                        })
                                      }}
                                      disabled={!pricingEditing[h.id]}
                                    />
                                    <Input
                                      placeholder="End"
                                      value={row.end}
                                      onChange={(e) => {
                                        const next = (pf.seasonal || []).slice()
                                        next[idx] = {
                                          ...row,
                                          end: e.target.value,
                                        }
                                        setPricingForm({
                                          ...pricingForm,
                                          [h.id]: {
                                            ...pf,
                                            seasonal: next,
                                          },
                                        })
                                      }}
                                      disabled={!pricingEditing[h.id]}
                                    />
                                    <Input
                                      placeholder=""
                                      value={row.price}
                                      onChange={(e) => {
                                        const next = (pf.seasonal || []).slice()
                                        next[idx] = {
                                          ...row,
                                          price: e.target.value,
                                        }
                                        setPricingForm({
                                          ...pricingForm,
                                          [h.id]: {
                                            ...pf,
                                            seasonal: next,
                                          },
                                        })
                                      }}
                                      disabled={!pricingEditing[h.id]}
                                    />
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        const next = (pf.seasonal || []).filter(
                                          (_r, i) => i !== idx,
                                        )
                                        setPricingForm({
                                          ...pricingForm,
                                          [h.id]: {
                                            ...pf,
                                            seasonal: next,
                                          },
                                        })
                                      }}
                                      disabled={!pricingEditing[h.id]}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    const next = (pf.seasonal || []).concat({
                                      start: "",
                                      end: "",
                                      price: "",
                                    })
                                    setPricingForm({
                                      ...pricingForm,
                                      [h.id]: { ...pf, seasonal: next },
                                    })
                                  }}
                                  disabled={!pricingEditing[h.id]}
                                >
                                  Add Seasonal
                                </Button>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="p-2"
                                        aria-label="Select dates"
                                        disabled={!pricingEditing[h.id]}
                                      >
                                        <CalendarIcon className="h-4 w-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="p-0"
                                      align="start"
                                    >
                                      <Calendar
                                        mode="multiple"
                                        selected={specialSel[h.id] || []}
                                        onSelect={(v: Date[] | undefined) =>
                                          setSpecialSel({
                                            ...specialSel,
                                            [h.id]: Array.isArray(v) ? v : [],
                                          })
                                        }
                                        fromDate={new Date()}
                                        disabled={{ before: new Date() }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <Input
                                    className="w-28"
                                    placeholder=""
                                    value={specialPrice[h.id] || ""}
                                    onChange={(e) =>
                                      setSpecialPrice({
                                        ...specialPrice,
                                        [h.id]: e.target.value,
                                      })
                                    }
                                    disabled={!pricingEditing[h.id]}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const dates = (specialSel[h.id] || []).map((d) => ymdLocal(d))
                                      const price = specialPrice[h.id] || ""
                                      if (dates.length) {
                                        const rows = dates.map((date) => ({
                                          date,
                                          price,
                                        }))
                                        const next = (pf.specials || []).concat(
                                          rows,
                                        )
                                        setPricingForm({
                                          ...pricingForm,
                                          [h.id]: { ...pf, specials: next },
                                        })
                                      }
                                    }}
                                    disabled={!pricingEditing[h.id]}
                                  >
                                    Apply Dates
                                  </Button>
                                </div>
                                {(pf.specials || []).map((row, idx) => (
                                  <div
                                    key={idx}
                                    className="grid grid-cols-3 gap-2"
                                  >
                                    <Input
                                      placeholder="Date"
                                      value={row.date}
                                      onChange={(e) => {
                                        const next = (pf.specials || []).slice()
                                        next[idx] = {
                                          ...row,
                                          date: e.target.value,
                                        }
                                        setPricingForm({
                                          ...pricingForm,
                                          [h.id]: {
                                            ...pf,
                                            specials: next,
                                          },
                                        })
                                      }}
                                      disabled={!pricingEditing[h.id]}
                                    />
                                    <Input
                                      placeholder=""
                                      value={row.price}
                                      onChange={(e) => {
                                        const next = (pf.specials || []).slice()
                                        next[idx] = {
                                          ...row,
                                          price: e.target.value,
                                        }
                                        setPricingForm({
                                          ...pricingForm,
                                          [h.id]: {
                                            ...pf,
                                            specials: next,
                                          },
                                        })
                                      }}
                                      disabled={!pricingEditing[h.id]}
                                    />
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        const next = (pf.specials || []).filter(
                                          (_r, i) => i !== idx,
                                        )
                                        setPricingForm({
                                          ...pricingForm,
                                          [h.id]: {
                                            ...pf,
                                            specials: next,
                                          },
                                        })
                                      }}
                                      disabled={!pricingEditing[h.id]}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    const next = (pf.specials || []).concat({
                                      date: "",
                                      price: "",
                                    })
                                    setPricingForm({
                                      ...pricingForm,
                                      [h.id]: { ...pf, specials: next },
                                    })
                                  }}
                                  disabled={!pricingEditing[h.id]}
                                >
                                  Add Special Day
                                </Button>
                              </div>
                            </td>
                            <td className="p-2 flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const next = !pricingEditing[h.id]
                                  setPricingEditing({
                                    ...pricingEditing,
                                    [h.id]: next,
                                  })
                                  toast({
                                    title: next
                                      ? "Edit enabled"
                                      : "Edit disabled",
                                    description: `Pricing • Hotel #${h.id}`,
                                  })
                                }}
                              >
                                {pricingEditing[h.id] ? "Stop Edit" : "Edit"}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  updatePricing.mutate({
                                    hotelId: h.id,
                                    normalPrice: pf.normalPrice
                                      ? Number(pf.normalPrice)
                                      : undefined,
                                    weekendPrice: pf.weekendPrice
                                      ? Number(pf.weekendPrice)
                                      : undefined,
                                    extraHourRate: (pf.extraHourRate || "").trim()
                                      ? Number(pf.extraHourRate)
                                      : undefined,
                                    cancellationHourRate: (pf.cancellationHourRate || "").trim()
                                      ? Number(pf.cancellationHourRate)
                                      : undefined,
                                    seasonal: (pf.seasonal || [])
                                      .filter(
                                        (s) =>
                                          s.start && s.end && s.price.trim(),
                                      )
                                      .map((s) => ({
                                        start: s.start,
                                        end: s.end,
                                        price: Number(s.price),
                                      })),
                                    specials: (pf.specials || [])
                                      .filter(
                                        (sp) =>
                                          sp.date && sp.price.trim(),
                                      )
                                      .map((sp) => ({
                                        date: sp.date,
                                        price: Number(sp.price),
                                      })),
                                  })
                                }
                                disabled={!pricingEditing[h.id]}
                              >
                                Update
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deletePricing.mutate(h.id)}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6">
                  <div className="text-sm font-medium mb-2">Saved Pricing</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left">
                          <th className="p-2">Hotel</th>
                          <th className="p-2">Normal ₹</th>
                          <th className="p-2">Weekend ₹</th>
                          <th className="p-2">Extra Hour ₹</th>
                          <th className="p-2">Cancellation Hour ₹</th>
                          <th className="p-2">Seasonal</th>
                          <th className="p-2">Special Days</th>
                          <th className="p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hotels.map((h) => {
                          const p = h.pricing || {}
                          const seasonal = Array.isArray(p.seasonal) ? p.seasonal : []
                          const specials = Array.isArray(p.specials) ? p.specials : []
                          return (
                            <tr key={`saved-${h.id}`} className="border-t">
                              <td className="p-2">{h.id} • {h.name}</td>
                              <td className="p-2">{p.normalPrice !== undefined ? `₹${Number(p.normalPrice)}` : '-'}</td>
                              <td className="p-2">{p.weekendPrice !== undefined ? `₹${Number(p.weekendPrice)}` : '-'}</td>
                              <td className="p-2">{p.extraHourRate !== undefined ? `₹${Number(p.extraHourRate)}` : '-'}</td>
                              <td className="p-2">{p.cancellationHourRate !== undefined ? `₹${Number(p.cancellationHourRate)}` : '-'}</td>
                              <td className="p-2">
                                <div className="flex flex-wrap gap-2">
                                  {seasonal.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                                  {seasonal.map((s, idx) => (
                                    <div key={`season-${h.id}-${idx}`} className="inline-flex items-center gap-2">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary">{String(s.start)} → {String(s.end)} • ₹{Number(s.price||0)}</span>
                                      <Button size="sm" variant="outline" onClick={() => {
                                        const next = seasonal.filter((_, i) => i !== idx)
                                        updatePricing.mutate({ hotelId: h.id, seasonal: next.map(ss => ({ start: String(ss.start), end: String(ss.end), price: Number(ss.price||0) })) })
                                      }}>Remove</Button>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="flex flex-wrap gap-2">
                                  {specials.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                                  {specials.map((sp, idx) => (
                                    <div key={`special-${h.id}-${idx}`} className="inline-flex items-center gap-2">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary">{String(sp.date)} • ₹{Number(sp.price||0)}</span>
                                      <Button size="sm" variant="outline" onClick={() => {
                                        const next = specials.filter((_, i) => i !== idx)
                                        updatePricing.mutate({ hotelId: h.id, specials: next.map(ssp => ({ date: String(ssp.date), price: Number(ssp.price||0) })) })
                                      }}>Remove</Button>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-2 flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline" onClick={() => {
                                  setPricingEditing({ ...pricingEditing, [h.id]: true })
                                  setPricingForm(prev => ({
                                    ...prev,
                                    [h.id]: {
                                      normalPrice: String(p.normalPrice ?? prev[h.id]?.normalPrice ?? ''),
                                      weekendPrice: String(p.weekendPrice ?? prev[h.id]?.weekendPrice ?? ''),
                                      extraHourRate: String(p.extraHourRate ?? prev[h.id]?.extraHourRate ?? ''),
                                      cancellationHourRate: String(p.cancellationHourRate ?? prev[h.id]?.cancellationHourRate ?? ''),
                                      seasonal: seasonal.map(s => ({ start: String(s.start||''), end: String(s.end||''), price: String(Number(s.price||0)) })),
                                      specials: specials.map(sp => ({ date: String(sp.date||''), price: String(Number(sp.price||0)) }))
                                    }
                                  }))
                                  toast({ title: 'Edit enabled', description: `Pricing • Hotel #${h.id}` })
                                }}>Edit</Button>
                                <Button size="sm" variant="destructive" onClick={() => deletePricing.mutate(h.id)}>Delete</Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* REVIEWS */}
          {feature === "reviews" && (
            <Card className="shadow-2xl hover:shadow-orange-500/20 bg-gradient-to-br from-white via-orange-50 to-pink-50 border-0 scale-100 hover:scale-102 transition-all duration-500 ease-out">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-700 to-pink-700 bg-clip-text text-transparent drop-shadow-sm">
                  Review Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviews.map((r, idx) => (
                    <div key={r.id} className="group border-0 rounded-xl p-6 bg-gradient-to-r from-white via-yellow-50 to-orange-50 shadow-lg hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500 ease-out cursor-pointer relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-pink-500"></div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold shadow-md">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-gray-800">
                              Hotel {r.hotelId}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-2xl text-yellow-500">
                                {'★'.repeat(Math.floor(r.rating))}{'☆'.repeat(5 - Math.floor(r.rating))}
                              </div>
                              <span className="text-sm text-gray-600">({r.rating}/5)</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 bg-white/80 px-3 py-1 rounded-full">
                          {new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="text-base font-medium text-gray-700 mb-2">
                        {r.user?.fullName ||
                          `${r.user?.firstName || ""} ${
                            r.user?.lastName || ""
                          }`.trim() ||
                          r.user?.email ||
                          `Guest #${r.user?.id || ""}`}
                      </div>
                      <div className="text-sm text-gray-600 leading-relaxed mb-4 italic">
                        "{r.comment}"
                      </div>
                      {r.response && (
                        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-300">
                          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                            Your Response
                          </div>
                          <div className="text-sm text-gray-800">{r.response}</div>
                        </div>
                      )}
                      <div className="flex gap-3 mt-4">
                        <Input
                          placeholder="Write your response..."
                          value={reviewReply[r.id] || ""}
                          onChange={(e) =>
                            setReviewReply({
                              ...reviewReply,
                              [r.id]: e.target.value,
                            })
                          }
                          className="flex-1 bg-white/90 border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                        />
                        <Button
                          onClick={() =>
                            respondReview.mutate({
                              id: r.id,
                              response: reviewReply[r.id] || "",
                            })
                          }
                          className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
                        >
                          Respond
                        </Button>
                      </div>
                    </div>
                  ))}
                  {reviews.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4 text-gray-300">★</div>
                      <div className="text-lg text-gray-500 font-medium">No reviews yet</div>
                      <div className="text-sm text-gray-400 mt-2">Wait for your first guest feedback!</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default OwnerDashboard
