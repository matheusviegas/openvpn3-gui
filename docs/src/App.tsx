import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { Screenshots } from "@/components/sections/Screenshots";
import { Installation } from "@/components/sections/Installation";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <Screenshots />
        <Installation />
      </main>
      <Footer />
    </div>
  );
}
