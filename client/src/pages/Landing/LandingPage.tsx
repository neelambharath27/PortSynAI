import { Hero } from "./sections/Hero";
import { Overview } from "./sections/Overview";
import { Features } from "./sections/Features";
import { AITechnologies } from "./sections/AITechnologies";
import { Advantages } from "./sections/Advantages";
import { ContactCTA } from "./sections/ContactCTA";

export function LandingPage() {
  return (
    <>
      <Hero />
      <Overview />
      <Features />
      <AITechnologies />
      <Advantages />
      <ContactCTA />
    </>
  );
}
