"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import WaitlistModal from "./WaitlistModal"
import Link from "next/link"

const CTASection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <section className="py-12 md:py-16 px-4 bg-[#0f1217] border-t border-gray-800">
      <div className="container mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-normal md:font-bold text-white mb-4 md:mb-6">
            Ready to Transform Your Meetings?
          </h2>
          <p className="text-base text-gray-300 mb-6 md:mb-8">
            Join thousands of professionals who are saving time, reducing stress, and making better decisions with
            Jarwiz AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button
                className="bg-[#FF00D6] hover:bg-[#D600B1] text-white text-base py-4 md:py-6 px-6 md:px-8 rounded-xl w-full sm:w-auto"
              >
                Sign Up
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4 md:mt-6">
            No credit card required. Early access for waitlist members.
          </p>
        </div>
      </div>

      {/* Waitlist Modal */}
      <WaitlistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  )
}

export default CTASection

