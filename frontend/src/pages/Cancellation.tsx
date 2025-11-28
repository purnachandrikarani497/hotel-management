import Header from "@/components/Header"
import Footer from "@/components/Footer"

const Cancellation = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16">
          <div className="container max-w-3xl">
            <h1 className="text-3xl font-bold mb-6 text-center">Cancellation Policy</h1>
            <div className="space-y-4 text-muted-foreground">
              <p>Cancellations are subject to the property’s policy shown at checkout.</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Free cancellation within 24 hours of booking, if allowed</li>
                <li>Fees may apply after the free window as per property terms</li>
                <li>No-shows can forfeit the booking amount</li>
                <li>Refunds are processed to the original payment method</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Cancellation
