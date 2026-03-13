import Header from "@/components/Header"
import Footer from "@/components/Footer"

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16">
          <div className="container max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-center">Terms & Conditions</h1>
            <div className="space-y-8 text-muted-foreground">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
                <p>By accessing and using Sana Stayz, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">2. Booking Policy</h2>
                <p>All bookings made through Sana Stayz are subject to availability and acceptance. We reserve the right to refuse any booking at our discretion.</p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>Users must be at least 18 years old to make a booking.</li>
                  <li>Accurate information must be provided during the booking process.</li>
                  <li>Confirmation emails will be sent for all successful bookings.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">3. Payment Terms</h2>
                <p>Payment must be made in full at the time of booking unless otherwise specified. We accept major credit/debit cards and other specified payment methods.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">4. User Responsibilities</h2>
                <p>Users are responsible for maintaining the confidentiality of their account information and for all activities that occur under their account.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">5. Limitation of Liability</h2>
                <p>Sana Stayz shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our services.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">6. Changes to Terms</h2>
                <p>We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
              </section>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Terms
