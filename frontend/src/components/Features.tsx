import { Shield, CreditCard, HeadphonesIcon, Star } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Secure Booking",
    description: "Your data is protected with industry-leading security"
  },
  {
    icon: CreditCard,
    title: "Best Price Guarantee",
    description: "Find the best deals or we'll refund the difference"
  },
  {
    icon: HeadphonesIcon,
    title: "24/7 Support",
    description: "Our team is here to help you anytime, anywhere"
  },
  {
    icon: Star,
    title: "Trusted by Millions",
    description: "Join millions of satisfied travelers worldwide"
  }
];

const Features = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-white via-purple-50 to-pink-50">
      <div className="container mx-auto">
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent pb-1">Why Book With Us</h2>
          <p className="text-muted-foreground mt-2">Your trusted companion for safe, seamless, and value-packed stays</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center rounded-2xl bg-white shadow-2xl hover:shadow-purple-500/10 p-6 border-0">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 mb-4">
                <feature.icon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
