import { useState } from "react";
import { User, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  let authed = false;
  let role: 'admin'|'user'|'owner' = 'user'
  let userId = 0
  try {
    const raw = localStorage.getItem("auth");
    const parsed = raw ? JSON.parse(raw) : null
    authed = !!(parsed?.token)
    role = parsed?.user?.role || 'user'
    userId = parsed?.user?.id || 0
  } catch {
    authed = false
  }
  const unread = useQuery({ queryKey: ["inbox","count", role, userId], queryFn: () => role==='owner' ? apiGet<{ count:number }>(`/api/messages/unread-count?ownerId=${userId}`) : apiGet<{ count:number }>(`/api/messages/unread-count?userId=${userId}`), enabled: authed && !!userId, refetchInterval: 2000 })

  const navLinks = (() => {
    const base = [
      { to: "/", label: "Home" },
      { to: "/hotels", label: "Hotels" },
      { to: "/about", label: "About Us" },
    ]
    if (authed && role === 'user') {
      base.push({ to: "/dashboard/user/details", label: "User Details" })
      base.push({ to: "/dashboard/user", label: "User Dashboard" })
    }
    return base
  })()

  const hideNavLinks = pathname.startsWith("/dashboard/admin") || pathname.startsWith("/dashboard/owner") || pathname.startsWith("/inbox")
  const dashboardLinks = (() => {
    if (pathname.startsWith("/dashboard/admin")) {
      return [
        { to: "/dashboard/admin", label: "Overview" },
        { to: "/dashboard/admin/users", label: "Users" },
        { to: "/dashboard/admin/hotels", label: "Hotels" },
        { to: "/dashboard/admin/bookings", label: "Bookings" },
        { to: "/dashboard/admin/contact", label: "Contact" },
        { to: "/dashboard/admin/settings", label: "About Us" },
      ]
    }
    if (pathname.startsWith("/dashboard/owner")) {
      return [
        { to: "/dashboard/owner", label: "Overview" },
        { to: "/dashboard/owner/register", label: "Register" },
        { to: "/dashboard/owner/rooms", label: "Rooms" },
        { to: "/dashboard/owner/bookings", label: "Bookings" },
        { to: "/dashboard/owner/guests", label: "Guests" },
        { to: "/dashboard/owner/pricing", label: "Pricing" },
        { to: "/dashboard/owner/reviews", label: "Reviews" },
        { to: "/dashboard/owner/coupons", label: "Coupons" },
        { to: "/dashboard/owner/contact", label: "Contact" },
      ]
    }
    return []
  })()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-blue-50 via-purple-100 via-cyan-100 to-pink-100 border-purple-200 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-purple-200/30 to-cyan-200/30 animate-pulse"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-white/10 to-purple-100/20"></div>
      <div className="container flex h-16 items-center justify-between relative z-10">
        <Link to="/" className="flex items-center space-x-2 hover:scale-105 transition-transform duration-300">
          <img src={(() => {
            const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>
            return env?.VITE_LOGO_URL || "/logo.svg";
          })()} alt="Sana Stayz" className="h-8 w-8 rounded-full object-cover ring-3 ring-purple-400 shadow-lg animate-bounce" onError={(e) => { e.currentTarget.src = "https://placehold.co/64x64?text=S" }} />
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent drop-shadow-md">Sana Stayz</span>
        </Link>

        {(!hideNavLinks) ? (
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-purple-700 transition-colors hover:text-pink-600 hover:scale-110 transform duration-300 relative after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-purple-500 after:to-pink-500 after:left-0 after:bottom-0 hover:after:w-full after:transition-all after:duration-300"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : (
          <nav className="hidden md:flex items-center space-x-6">
            {dashboardLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-purple-700 transition-colors hover:text-pink-600 hover:scale-110 transform duration-300 relative after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-purple-500 after:to-pink-500 after:left-0 after:bottom-0 hover:after:w-full after:transition-all after:duration-300"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center space-x-4">
          {(() => {
            if (authed) {
              return (
                <>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex border-purple-400 text-purple-600 bg-white/80 backdrop-blur-sm hover:bg-purple-50 hover:border-purple-500 hover:scale-105 transition-all duration-300"
                  onClick={() => navigate("/inbox")}
                >
                  Inbox
                    {unread.data?.count ? (
                      <span className="ml-2 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-red-400 to-red-500 text-white text-[10px] h-5 min-w-5 shadow-lg animate-pulse">{unread.data.count}</span>
                    ) : null}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden md:flex border-pink-400 text-pink-600 bg-white/80 backdrop-blur-sm hover:bg-pink-50 hover:border-pink-500 hover:scale-105 transition-all duration-300"
                    onClick={() => {
                      localStorage.removeItem("auth");
                      navigate("/signin");
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              );
            }
            return (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden md:flex text-purple-700 hover:bg-purple-100 hover:scale-105 transition-all duration-300"
                  onClick={() => navigate("/signin")}
                >
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  size="sm"
                  className="hidden md:flex bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                  onClick={() => navigate("/register")}
                >
                  Register
                </Button>
              </>
            );
          })()}

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col space-y-4 mt-8">
                {(!hideNavLinks ? navLinks : dashboardLinks).map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-lg font-medium transition-colors hover:text-primary"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-2">
                  {(() => {
                    let authed = false;
                    try {
                      const raw = localStorage.getItem("auth");
                      authed = !!(raw && JSON.parse(raw)?.token);
                    } catch {
                      authed = false;
                    }
                    if (authed) {
                      return (
                        <Link
                          to="/inbox"
                          className="text-lg font-medium transition-colors hover:text-primary"
                          onClick={() => setIsOpen(false)}
                        >
                          Inbox
                          {unread.data?.count ? (
                            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] h-5 min-w-5 px-1">{unread.data.count}</span>
                          ) : null}
                        </Link>
                      );
                    }
                    return null
                  })()}
                </div>
                <div className="pt-4 border-t space-y-3">
                  {(() => {
                    let authed = false;
                    try {
                      const raw = localStorage.getItem("auth");
                      authed = !!(raw && JSON.parse(raw)?.token);
                    } catch {
                      authed = false;
                    }
                    if (authed) {
                      return (
                        <Button
                          className="w-full"
                          onClick={() => {
                            localStorage.removeItem("auth");
                            setIsOpen(false);
                            navigate("/signin");
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </Button>
                      );
                    }
                    return (
                      <>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            navigate("/signin");
                            setIsOpen(false);
                          }}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Sign In
                        </Button>
                        <Button
                          className="w-full"
                          onClick={() => {
                            navigate("/register");
                            setIsOpen(false);
                          }}
                        >
                          Register
                        </Button>
                      </>
                    );
                  })()}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
