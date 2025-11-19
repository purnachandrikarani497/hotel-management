import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Hotel, Users, Award, Globe } from "lucide-react";
import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

const About = () => {
  const { data, isLoading, isError } = useQuery({ queryKey: ["about"], queryFn: () => apiGet<{ stats: { label: string; value: string }[] }>("/api/about") })
  const stats = data?.stats || []

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-hero-gradient text-primary-foreground py-20">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">About StayBook</h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Your trusted partner in finding the perfect accommodation worldwide
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-secondary">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {isLoading && <div className="col-span-4 text-center">Loading...</div>}
              {isError && <div className="col-span-4 text-center">Failed to load</div>}
              {!isLoading && !isError && stats.map((stat) => {
                const iconMap: Record<string, ComponentType<{ className?: string }>> = {
                  Hotels: Hotel,
                  "Happy Customers": Users,
                  "Awards Won": Award,
                  Countries: Globe,
                }
                const Icon = iconMap[stat.label] || Hotel
                return (
                  <div key={stat.label} className="text-center">
                    <Icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <div className="text-3xl font-bold mb-2">{stat.value}</div>
                    <div className="text-muted-foreground">{stat.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Founded in 2020, StayBook has revolutionized the way people discover and book
                accommodations. We believe that everyone deserves access to quality stays at
                fair prices, whether you're traveling for business or pleasure.
              </p>
              <p>
                Our platform connects travelers with thousands of verified properties worldwide,
                from budget-friendly hostels to luxury resorts. We work directly with property
                owners to ensure the best rates and authentic experiences.
              </p>
              <p>
                With a commitment to transparency, security, and customer satisfaction, we've
                helped millions of travelers find their perfect stay. Our 24/7 customer support
                and best price guarantee give you peace of mind throughout your booking journey.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 bg-secondary">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Mission</h2>
            <p className="text-center text-muted-foreground text-lg">
              To make travel accessible and enjoyable for everyone by providing a seamless
              booking experience, competitive prices, and outstanding customer service.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
