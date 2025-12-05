import * as React from "react"
import { Shield, BarChart3, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

type Stats = { totalHotels: number; totalBookings: number; totalRevenue: number; monthlySales?: Record<string, number>; cityGrowth?: Record<string, number> }
type Booking = { id: number; hotelId: number; checkIn: string; checkOut: string; guests: number; total: number; status: string }

type Props = { stats?: Stats; bookings: Booking[] }

const AdminOverview: React.FC<Props> = ({ stats, bookings }) => {
  const todayStr = new Date().toISOString().slice(0,10)
  const bookingsToday = bookings.filter(b => (b.checkIn || "").slice(0,10) === todayStr).length

  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" })
  const now = new Date()
  const currentMonth = now.getMonth()
  const bookingsThisMonth = bookings.filter(b => {
    const d = new Date(b.checkIn)
    return d.getMonth() === currentMonth && d.getFullYear() === now.getFullYear()
  }).length

  const monthlyCounts: Record<string, number> = {}
  bookings.forEach(b => {
    const d = new Date(b.checkIn)
    const label = monthFormatter.format(d)
    monthlyCounts[label] = (monthlyCounts[label] || 0) + 1
  })

  const year = now.getFullYear()
  const month = now.getMonth()
  const daysData = React.useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const arr: { day: string; bookings: number }[] = Array.from({ length: daysInMonth }, (_, i) => ({ day: String(i + 1), bookings: 0 }))
    bookings.forEach(b => {
      const d = new Date(b.checkIn)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const idx = d.getDate() - 1
        if (arr[idx]) arr[idx].bookings += 1
      }
    })
    return arr
  }, [bookings, year, month])

  const cityGrowth = stats?.cityGrowth || {}
  const citiesCount = Object.keys(cityGrowth).length

  return (
    <>
      <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-12">
        <div className="container">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8" />
            <h1 className="text-3xl md:text-4xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="opacity-90">Super Admin controls for the platform</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0"><CardHeader className="pb-2"><CardTitle className="text-sm">Total Hotels</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats?.totalHotels ?? 0}</div></CardContent></Card>
            <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0"><CardHeader className="pb-2"><CardTitle className="text-sm">Total Bookings</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats?.totalBookings ?? 0}</div></CardContent></Card>
            <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-green-50 to-emerald-100 border-0"><CardHeader className="pb-2"><CardTitle className="text-sm">Bookings Today</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{bookingsToday}</div></CardContent></Card>
            <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-yellow-50 to-orange-100 border-0"><CardHeader className="pb-2"><CardTitle className="text-sm">Bookings This Month</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{bookingsThisMonth}</div></CardContent></Card>
            <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0"><CardHeader className="pb-2"><CardTitle className="text-sm">Total Revenue</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">₹{stats?.totalRevenue ?? 0}</div></CardContent></Card>
            <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0"><CardHeader className="pb-2"><CardTitle className="text-sm">Cities</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{citiesCount}</div></CardContent></Card>
          </div>
        </div>
      </section>

      <div className="container py-8 space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Monthly Bookings</CardTitle>
              <BarChart3 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <ChartContainer
                className="h-60"
                config={{ bookings: { label: "Bookings", color: "hsl(var(--primary))" } }}
              >
                <BarChart data={daysData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
                  <ChartTooltip content={<ChartTooltipContent nameKey="bookings" />} />
                  <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4,4,0,0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="rounded-2xl p-0 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-cyan-100 border-0">
            <CardHeader className="flex-row items-center justify-between"><CardTitle>City-wise Growth</CardTitle><Building2 className="h-5 w-5 text-primary" /></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(cityGrowth).map(([c,v]) => (
                  <div key={c} className="flex items-center gap-2">
                    <div className="w-32 text-sm">{c}</div>
                    <div className="flex-1 bg-secondary h-2 rounded">
                      <div className="bg-primary h-2 rounded" style={{ width: `${Math.min(100, v*10)}%` }} />
                    </div>
                    <div className="text-xs w-8 text-right">{v}</div>
                  </div>
                ))}
                {citiesCount===0 && (<div className="text-sm text-muted-foreground">No data</div>)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

export default AdminOverview
