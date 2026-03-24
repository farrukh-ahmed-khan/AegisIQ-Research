import CTASection from "@/components/CTASection/CTASection";
import FeaturesSection from "@/components/FeaturesSection/FeaturesSection";
import Footer from "@/components/Footer/Footer";
import HeroSection from "@/components/herosection/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection/HowItWorksSection";
import Navbar from "@/components/navbar/Navbar";
import PricingSection from "@/components/PricingSection/PricingSection";
import TestimonialsSection from "@/components/TestimonialsSection/TestimonialsSection";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "hsl(222 47% 6%)" }}>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection /> 
      <Footer /> 
    </div>
  )
}
