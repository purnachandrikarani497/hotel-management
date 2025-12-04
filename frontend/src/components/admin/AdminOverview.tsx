import * as React from "react"
import { Shield, BarChart3, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
              <div className="flex items-end gap-2 h-40">
                {Object.entries(monthlyCounts).map(([m,v]) => (
                  <div key={m} className="flex-1">
                    <div className="bg-primary/80 rounded-md w-full" style={{ height: Math.max(8, Math.min(160, v*8)) }} />
                    <div className="text-xs mt-1 text-muted-foreground">{m}</div>
                  </div>
                ))}
                {Object.keys(monthlyCounts).length===0 && (<div className="text-sm text-muted-foreground">No data</div>)}
              </div>
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
