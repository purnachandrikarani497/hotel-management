import Header from "@/components/Header"
import Footer from "@/components/Footer"

const AdminDashboard = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, hotels, and bookings.</p>
      </main>
      <Footer />
    </div>
  )
}

export default AdminDashboard