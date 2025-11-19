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
    <section className="py-16 bg-muted/50">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <feature.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
