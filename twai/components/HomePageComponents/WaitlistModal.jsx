"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const WaitlistModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    // Basic email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setIsSubmitted(true)
      setEmail("")
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-[#1a1f29] rounded-xl p-5 md:p-6 max-w-md w-full mx-auto border border-gray-700 shadow-xl animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Get Early Access to JarWiz AI</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {isSubmitted ? (
          <div className="text-center py-6 md:py-8">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-[#FF00D6]/20 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 md:h-8 md:w-8 text-[#FF00D6]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Awesome!</h3>
            <p className="text-sm text-gray-400">You&apos;re on early access list of JarWiz AI.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-4">
                Be the first to get a real-time AI Meeting companion to ace your meetings!
              </p>
              <div className="space-y-2">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-[#242936] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF00D6] focus:border-transparent text-sm"
                  required
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#FF00D6] hover:bg-[#D600B1] text-white px-5 md:px-6 py-2 md:py-2.5 text-sm"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "Join Waitlist"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default WaitlistModal

