import Header from "@/components/Header"
import Footer from "@/components/Footer"

const UserDashboard = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-4">User Dashboard</h1>
        <p className="text-muted-foreground">View and manage your bookings.</p>
      </main>
      <Footer />
    </div>
  )
}

export default UserDashboard