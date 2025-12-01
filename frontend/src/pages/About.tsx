import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Hotel, Users, Award, Globe } from "lucide-react";
import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

const About = () => {
  const { data, isLoading, isError } = useQuery({ queryKey: ["about"], queryFn: () => apiGet<{ stats: { label: string; value: string }[]; ourStory?: string; ourMission?: string; contact?: { name?: string; email?: string; phone1?: string; phone2?: string } }>("/api/about"), staleTime: 60_000, refetchOnWindowFocus: false })
  const stats = data?.stats || []
  const ourStory = data?.ourStory || ""
  const ourMission = data?.ourMission || ""
  const contact = data?.contact || {}

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-hero-gradient text-primary-foreground py-20">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">About Sana Stayz</h1>
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
              {ourStory && <p>{ourStory}</p>}
            </div>
          </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-secondary">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Mission</h2>
            {ourMission && (
              <p className="text-center text-muted-foreground text-lg">{ourMission}</p>
            )}
          </div>
        </section>

        {/* Contact Section */}
        {(contact?.name || contact?.email || contact?.phone1 || contact?.phone2) && (
        <section className="py-16">
          <div className="container max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-6">Contact</h2>
            {contact?.name && <p className="text-muted-foreground">{contact.name}</p>}
            {contact?.email && <p className="text-muted-foreground">{contact.email}</p>}
            {(contact?.phone1 || contact?.phone2) && (
              <p className="text-muted-foreground">{[contact?.phone1, contact?.phone2].filter(Boolean).join(" · ")}</p>
            )}
          </div>
        </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default About;
