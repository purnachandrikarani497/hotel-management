import Header from "@/components/Header"
import Footer from "@/components/Footer"

const OwnerDashboard = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-4">Hotel Owner Dashboard</h1>
        <p className="text-muted-foreground">Manage your properties and reservations.</p>
      </main>
      <Footer />
    </div>
  )
}

export default OwnerDashboard