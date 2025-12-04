import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Contact = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-16">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Contact Us</h1>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">Steps to contact the owner are provided below</p>
          </div>
        </section>

        <section className="py-12">
          <div className="container max-w-4xl">
            <h2 className="text-2xl font-bold mb-4">Steps to Contact the Owner</h2>
            <div className="rounded-2xl p-6 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-100 border-0 space-y-3">
              <div>1. Open the hotel’s page.</div>
              <div>2. Click on View Hotels.</div>
              <div>3. Select View Details for the hotel you want.</div>
              <div>4. Scroll down to find the Owner Contact Details.</div>
              <div className="mt-4">📞 You may contact the owner directly for further information or booking.</div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
