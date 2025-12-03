import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Footer = () => {
  const location = useLocation();
  const isOwnerDashboard = location.pathname.startsWith("/dashboard/owner");
  return (
    <footer className="bg-gradient-to-br from-cyan-50 via-purple-100 via-pink-50 to-blue-50 border-t border-purple-200 text-gray-800 relative overflow-hidden animate-gradient-y">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-200/20 via-pink-200/20 to-cyan-200/20 animate-pulse"></div>
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-r from-purple-200/30 to-pink-200/30 rounded-full blur-3xl animate-float"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-r from-cyan-200/30 to-blue-200/30 rounded-full blur-3xl animate-float-delayed"></div>
      <div className="container py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex flex-col items-start space-y-2">
              <Link to="/" className="flex items-center space-x-2 hover:scale-105 transition-transform duration-300 group">
                <img src={(() => {
                  const env = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> })?.env) || {} as Record<string, string>
                  return env?.VITE_LOGO_URL || "/logo.svg";
                })()} alt="Sana Stayz" className="h-10 w-10 rounded-full object-cover ring-3 ring-purple-400 shadow-lg animate-bounce" onError={(e) => { e.currentTarget.src = "https://placehold.co/48x48?text=S" }} />
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 via-blue-600 to-cyan-500 bg-clip-text text-transparent drop-shadow-lg relative">
                  Sana Stayz
                  <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </span>
              </Link>
              <div className="flex items-center space-x-2 text-sm text-purple-600 font-medium">
                <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-purple-300"></div>
                <span>Your Premium Stay</span>
                <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-purple-300"></div>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed text-lg">
              🌟 Your trusted partner for finding extraordinary accommodations worldwide. Where elegance meets unforgettable experiences. 🌟
            </p>
            <div className="flex space-x-4">
              <a href="#" className="bg-purple-200 p-3 rounded-full text-purple-800 hover:bg-purple-300 hover:rotate-12 hover:scale-110 transform duration-300 shadow-md hover:shadow-lg transition-all">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="bg-pink-200 p-3 rounded-full text-pink-800 hover:bg-pink-300 hover:rotate-12 hover:scale-110 transform duration-300 shadow-md hover:shadow-lg transition-all">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="bg-blue-200 p-3 rounded-full text-blue-800 hover:bg-blue-300 hover:rotate-12 hover:scale-110 transform duration-300 shadow-md hover:shadow-lg transition-all">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="bg-cyan-200 p-3 rounded-full text-cyan-800 hover:bg-cyan-300 hover:rotate-12 hover:scale-110 transform duration-300 shadow-md hover:shadow-lg transition-all">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-xl text-purple-700 mb-6 relative">
              Company
              <div className="absolute -bottom-1 left-0 w-12 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
            </h4>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-gray-600 hover:text-purple-600 transition-colors hover:translate-x-2 transform duration-300 flex items-center">✨ About Us</Link></li>
            </ul>
          </div>

          {!isOwnerDashboard && (
            <div className="space-y-4">
              <h4 className="font-bold text-xl text-pink-700 mb-6 relative">
                Support
                <div className="absolute -bottom-1 left-0 w-12 h-1 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full"></div>
              </h4>
              <ul className="space-y-3">
                <li><Link to="/help" className="text-gray-600 hover:text-pink-600 transition-colors hover:translate-x-2 transform duration-300 flex items-center">💬 Help Center</Link></li>
                <li><Link to="/contact" className="text-gray-600 hover:text-pink-600 transition-colors hover:translate-x-2 transform duration-300 flex items-center">📞 Contact Us</Link></li>
              </ul>
            </div>
          )}

          {isOwnerDashboard && (
            <div className="space-y-4">
              <h4 className="font-bold text-xl text-cyan-700 mb-6 relative">
                Owner Portal
                <div className="absolute -bottom-1 left-0 w-12 h-1 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"></div>
              </h4>
              <ul className="space-y-3">
                <li><Link to="/dashboard/owner" className="text-gray-600 hover:text-cyan-600 transition-colors hover:translate-x-2 transform duration-300 flex items-center">🏠 Dashboard</Link></li>
                <li><Link to="/dashboard/owner/reviews" className="text-gray-600 hover:text-cyan-600 transition-colors hover:translate-x-2 transform duration-300 flex items-center">⭐ Reviews</Link></li>
                <li><Link to="/dashboard/owner/contact" className="text-gray-600 hover:text-cyan-600 transition-colors hover:translate-x-2 transform duration-300 flex items-center">💌 Contact</Link></li>
              </ul>
            </div>
          )}

        </div>

        <div className="border-t border-gradient-to-r from-purple-200 via-pink-200 to-cyan-200 via-blue-200 mt-12 pt-8 text-center">
          <p className="text-gray-600 text-lg font-medium animate-fade-in">
            💎 &copy; {new Date().getFullYear()} Sana Stayz. Crafted with elegance, reserved with sophistication. ✨
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
