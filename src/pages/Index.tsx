import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeaturedHotels from "@/components/FeaturedHotels";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <FeaturedHotels />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
