import { Hotel, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-card border-t">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <Hotel className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">StayBook</span>
            </Link>
            <p className="text-muted-foreground mb-4">
              Your trusted partner for finding the perfect accommodation worldwide.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="text-muted-foreground hover:text-primary transition-colors">Careers</Link></li>
              <li><Link to="/press" className="text-muted-foreground hover:text-primary transition-colors">Press</Link></li>
              <li><Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors">Blog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link to="/help" className="text-muted-foreground hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/cancellation" className="text-muted-foreground hover:text-primary transition-colors">Cancellation Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Partners</h4>
            <ul className="space-y-2">
              <li><Link to="/list-property" className="text-muted-foreground hover:text-primary transition-colors">List Your Property</Link></li>
              <li><Link to="/partner-login" className="text-muted-foreground hover:text-primary transition-colors">Partner Login</Link></li>
              <li><Link to="/affiliate" className="text-muted-foreground hover:text-primary transition-colors">Affiliate Program</Link></li>
              <li><Link to="/become-partner" className="text-muted-foreground hover:text-primary transition-colors">Become a Partner</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2024 StayBook. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
