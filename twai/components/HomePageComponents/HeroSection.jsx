"use client"

import { Button } from "@/components/ui/button"
import { VideoIcon, Users } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"

const HeroSection = () => {
  const [textIndex, setTextIndex] = useState(0)
  const suffixes = ["mpanion", "llaborator", "presenter", "pilot"]
  const suffixRef = useRef(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prevIndex) => (prevIndex + 1) % suffixes.length)
    }, 2500)

    return () => clearInterval(interval)
  }, [suffixes.length])

  return (
    <section className=" pt-32 pb-16 md:pt-32 md:pb-20 bg-[#0f1217] text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-40">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80')",
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1217] via-[#0f1217]/70 to-[#0f1217]"></div>
      </div>

      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10 w-[90%] md:w-auto">
        <div className="bg-[#1a1f29] py-3 px-4 md:px-6 rounded-full flex items-center gap-2 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer">
          <div className="bg-jarwiz-500 rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
            <span className="text-sm">🚀</span>
          </div>
          <span className="text-sm font-medium text-gray-200 truncate">
            We&apos;re launching on Product Hunt soon!
          </span>
          <div className="bg-white/10 h-6 w-6 rounded-full flex items-center justify-center ml-2 border border-white/20 flex-shrink-0">
            <span className="text-xs font-bold">PH</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto relative z-10">
        <div className="block md:hidden text-center mb-8">
          <h1 className="text-3xl bg-gradient-to-r from-jarwiz-400 to-jarwiz-500 bg-clip-text text-transparent">
          Your real-time, 1-click
          </h1>
          <h2 className="text-3xl pl-3 bg-gradient-to-r from-jarwiz-400 to-jarwiz-500 bg-clip-text text-transparent flex items-center justify-center">
            Meeting Co
            <div
              className="relative overflow-hidden ml-1"
              style={{
                height: "1.5em",
                minWidth: "130px",
                display: "inline-block",
                verticalAlign: "bottom",
              }}
            >
              {suffixes.map((suffix, index) => (
                <span
                  key={suffix}
                  className={`absolute transition-all duration-500 ease-in-out text-[#ff00d4] text-3xl whitespace-nowrap ${
                    index === textIndex ? "opacity-100 transform-none" : "opacity-0 translate-y-6"
                  }`}
                  style={{
                    left: "-2%",
                    top: "14%",
                    textShadow:
                      index === textIndex ? "0 0 2px rgba(255,0,214,0.2)" : "none",
                    WebkitBackgroundClip: "text",
                    letterSpacing: "0.5px",
                  }}
                >
                  {suffix}
                </span>
              ))}
            </div>
          </h2>
        </div>

        <div className="hidden md:block text-center">
          <h1 className="text-6xl lg:text-7xl mb-8 text-center font-extrabold bg-gradient-to-r from-jarwiz-400 to-jarwiz-500 bg-clip-text text-transparent">
            <div>Your real-time, 1-click</div>
            <div className="flex items-center justify-center flex-wrap">
              <span className="block sm:inline">AI Meeting Co</span>
              <div
                className="relative overflow-hidden mx-auto sm:mx-0 sm:ml-1 mt-2 sm:mt-0"
                style={{
                  height: "1.4em",
                  minWidth: "150px",
                  width: "100%",
                  maxWidth: "380px",
                  display: "inline-block",
                  verticalAlign: "bottom",
                }}
              >
                {suffixes.map((suffix, index) => (
                  <span
                    key={suffix}
                    className={`absolute transition-all duration-500 ease-in-out font-extrabold text-[#ff00d4] ${
                      index === textIndex ? "opacity-100 transform-none" : "opacity-0 translate-y-8"
                    }`}
                    style={{
                      left: "0%",
                      top: "15%",
                      textShadow:
                        index === textIndex ? "0 0 2px rgba(255,0,214,0.2)" : "none",
                      WebkitBackgroundClip: "text",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {suffix}
                  </span>
                ))}
              </div>
            </div>
          </h1>
        </div>

        <div className="space-y-4 text-center mx-auto mb-10 md:mb-14 font-medium">
          <p className="hidden md:block text-lg text-gray-300 animate-fade-in">
            Join every meeting with team of AI experts. No more pre-meeting stress, in-meeting anxiety or post-meeting
            regrets.
          </p>
          <p className="block md:hidden text-lg text-gray-300 animate-fade-in">
            Join every meeting with team of AI experts.
            <br />
            Drop all your docs, ideas & notes into JarWiz—get in-meeting instant answers, citations & arguments.
          </p>
          <p className="hidden md:block text-lg text-gray-300 animate-fade-in animation-delay-200">
            Drop all your docs, ideas & notes into JarWiz—get in-meeting instant answers, citations, and arguments.
          </p>
          <p className="hidden md:block text-lg text-gray-300 animate-fade-in animation-delay-500">
            1-click, context-aware agents working in background—no need to type queries or interrupt your flow.
          </p>
        </div>

        <div className="flex flex-wrap md:flex-nowrap justify-center gap-3 md:gap-4 mb-10 md:mb-14 overflow-x-auto w-full px-2 min-w-0">
          <div className="flex items-center gap-1.5 md:gap-3 text-gray-200 transition-all duration-300 hover:text-white hover:scale-105 flex-shrink-0">
            <span className="bg-white/10 p-1.5 md:p-2.5 rounded-lg flex items-center justify-center border border-white/5 shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Google Meet"
                role="img"
                viewBox="0 0 512 512"
                width="20px"
                height="20px"
              >
                <path d="M166 106v90h-90" fill="#ea4335"></path>
                <path d="M166 106v90h120v62l90-73v-49q0-30-30-30" fill="#ffba00"></path>
                <path d="M164 406v-90h122v-60l90 71v49q0 30-30 30" fill="#00ac47"></path>
                <path d="M286 256l90-73v146" fill="#00832d"></path>
                <path d="M376 183l42-34c9-7 18-7 18 7v200c0 14-9 14-18 7l-42-34" fill="#00ac47"></path>
                <path d="M76 314v62q0 30 30 30h60v-92" fill="#0066da"></path>
                <path d="M76 196h90v120h-90" fill="#2684fc"></path>
              </svg>
            </span>
            <span className="text-xs md:text-sm font-medium">Google Meet</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-3 text-gray-200 transition-all duration-300 hover:text-white hover:scale-105 flex-shrink-0">
            <span className="bg-white/10 p-1.5 md:p-2.5 rounded-lg flex items-center justify-center border border-white/5 shadow-lg">
              <VideoIcon size={20} className="text-[#0E86D4]" />
            </span>
            <span className="text-xs md:text-sm font-medium">Zoom</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-3 text-gray-200 transition-all duration-300 hover:text-white hover:scale-105 flex-shrink-0">
            <span className="bg-white/10 p-1.5 md:p-2.5 rounded-lg flex items-center justify-center border border-white/5 shadow-lg">
              <Users size={20} className="text-[#6264A7]" />
            </span>
            <span className="text-xs md:text-sm font-medium">Teams</span>
          </div>
        </div>

        <div className="flex justify-center">
          <Link href="/signup">
            <Button
              className="bg-[#FF00D6] hover:bg-[#D600B1] text-white text-base py-5 px-8 md:py-6 md:px-10 rounded-xl shadow-lg shadow-[#FF00D6]/20 hover:shadow-xl hover:shadow-[#FF00D6]/30 transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-auto"
            >
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
