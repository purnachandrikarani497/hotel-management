import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Hotel, Users, Award, Globe } from "lucide-react";
import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useEffect } from "react";

const About = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const { data, isLoading, isError } = useQuery({ queryKey: ["about"], queryFn: () => apiGet<{ stats: { label: string; value: string }[]; ourStory?: string; ourMission?: string; contact?: { name?: string; email?: string; phone1?: string; phone2?: string } }>("/api/about"), staleTime: 60_000, refetchOnWindowFocus: false })
  const stats = data?.stats || []
  const ourStory = data?.ourStory || ""
  const ourMission = data?.ourMission || ""
  const contact = data?.contact || {}

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-600 via-purple-700 to-pink-600 text-primary-foreground py-20 relative overflow-hidden">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">About Sana Stayz</h1>
            <p className="mt-6 text-xl opacity-90 max-w-2xl mx-auto">Your trusted partner in finding the perfect accommodation worldwide</p>
          </div>
        </section>

        <section className="py-16 bg-secondary">
          <div className="container">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {isLoading && <div className="col-span-full text-center">Loading...</div>}
              {isError && <div className="col-span-full text-center">Failed to load</div>}
              {!isLoading && !isError && stats.map((stat) => {
                const iconMap: Record<string, ComponentType<{ className?: string }>> = {
                  Hotels: Hotel,
                  "Happy Customers": Users,
                  "Awards Won": Award,
                  Countries: Globe,
                }
                const Icon = iconMap[stat.label] || Hotel
                return (
                  <div key={stat.label} className="text-center rounded-2xl bg-gradient-to-br from-white via-purple-50 to-pink-50 shadow-2xl p-6">
                    <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center bg-white/70 shadow">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-3xl font-black mb-1 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{stat.value}</div>
                    <div className="text-muted-foreground text-sm">{stat.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-center mb-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">Our Story</h2>
            <div className="rounded-2xl bg-gradient-to-br from-white via-blue-50 to-cyan-100 shadow-2xl p-6">
              <div className="space-y-4 text-muted-foreground">
                {ourStory && <p>{ourStory}</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-secondary">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-center mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Our Mission</h2>
            {ourMission && (
              <div className="rounded-2xl bg-white shadow-2xl p-6">
                <p className="text-center text-muted-foreground text-lg">{ourMission}</p>
              </div>
            )}
          </div>
        </section>

        {(contact?.name || contact?.email || contact?.phone1 || contact?.phone2) && (
          <section className="py-16">
            <div className="container max-w-4xl">
              <h2 className="text-3xl font-extrabold tracking-tight text-center mb-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">Contact</h2>
              <div className="rounded-2xl bg-gradient-to-br from-white via-purple-50 to-pink-50 shadow-2xl p-6 text-center">
                {contact?.name && <p className="text-muted-foreground">{contact.name}</p>}
                {contact?.email && <p className="text-muted-foreground">{contact.email}</p>}
                {(contact?.phone1 || contact?.phone2) && (
                  <p className="text-muted-foreground">{[contact?.phone1, contact?.phone2].filter(Boolean).join(" · ")}</p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default About;
