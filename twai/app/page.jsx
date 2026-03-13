"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/HomePageComponents/Header"
import HeroSection from "@/components/HomePageComponents/HeroSection"
import SolutionSection from "@/components/HomePageComponents/SolutionSection"
import FeaturesSection from "@/components/HomePageComponents/FeaturesSection"
import BenefitsSection from "@/components/HomePageComponents/BenefitsSection"
import TestimonialsSection from "@/components/HomePageComponents/TestimonialsSection"
import PricingSection from "@/components/HomePageComponents/PricingSection"
import FAQSection from "@/components/HomePageComponents/FAQSection"
import CTASection from "@/components/HomePageComponents/CTASection"
import Footer from "@/components/HomePageComponents/Footer"
import ProblemSection from "@/components/HomePageComponents/ProblemSection"

export default function Home() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1217]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF00D6]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1217] space-y-0">
      <Header />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <BenefitsSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  )
}

