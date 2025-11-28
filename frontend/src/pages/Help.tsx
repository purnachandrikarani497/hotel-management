import Header from "@/components/Header"
import Footer from "@/components/Footer"

const Help = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16">
          <div className="container max-w-3xl">
            <h1 className="text-3xl font-bold mb-6 text-center">Help Center</h1>
            <div className="space-y-4 text-muted-foreground">
              <p>Find answers to common questions, booking steps, payments, and account issues.</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>How to search and book hotels</li>
                <li>Managing bookings and refunds</li>
                <li>Account access and security</li>
                <li>Contact support for unresolved issues</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Help
