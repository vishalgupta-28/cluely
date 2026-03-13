"use client"

import { useState, useEffect } from "react"
import { X, Mic, MonitorSmartphone, Bot, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParams } from "next/navigation"
import { useAppContext } from "@/context/AppContext"

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { sessionId } = useParams()
  const { sessionDetails } = useAppContext()



  const handleClose = () => setIsOpen(false)
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      setIsOpen(false)
    }
  }

  const steps = [
    {
      title: "Welcome to Your Session",
      content: (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : sessionDetails ? (
            <>
              <div className="text-lg font-medium text-center text-primary">
                {sessionDetails.name || "Untitled Session"}
              </div>
              {sessionDetails.description && <p className="text-muted-foreground">{sessionDetails.description}</p>}
              {sessionDetails.templateInfo && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="font-medium">Meeting Template</div>
                  <div className="grid grid-cols-[auto,1fr] gap-x-2 text-sm">
                    <div className="font-medium">Purpose:</div>
                    <div>{sessionDetails.templateInfo.purpose}</div>
                    <div className="font-medium">Goal:</div>
                    <div>{sessionDetails.templateInfo.goal}</div>
                    <div className="font-medium">Duration:</div>
                    <div>{sessionDetails.templateInfo.duration}</div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground">No session details available</p>
          )}
        </div>
      ),
    },
    {
      title: "How to Use JarWizAI",
      content: (
        <div className="space-y-4">
          {[
            {
              Icon: Mic,
              title: "Connect to Microphone",
              text: "Use the microphone button to record your voice during the Meeting. Your speech will be transcribed in real-time.",
            },
            {
              Icon: MonitorSmartphone,
              title: "Connect to Live Meeting",
              text: "Share your screen to capture both audio and video from your meeting. Make sure to select 'Share tab audio' when prompted.",
            },
            {
              Icon: Bot,
              title: "AI Assistance",
              text: "Ask questions or get help from the AI assistant. Use the quick action buttons for summaries, fact-checking, and more.",
            },
          ].map(({ Icon, title, text }, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="bg-primary/10 p-2 rounded-full">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Tips for Better Results",
      content: (
        <div className="space-y-4">
          {[
            {
              title: "Highlight Text",
              text: "Highlight any text in the conversation to automatically copy it. Then enable the 'Highlighted' option when asking questions.",
            },
            {
              title: "Web Search & RAG",
              text: "Enable web search for up-to-date information. Use RAG (Retrieval Augmented Generation) to leverage your uploaded documents.",
            },
            {
              title: "Save Your Work",
              text: "Your conversation is automatically saved. You can access a summary and review the session later from your dashboard.",
            },
          ].map(({ title, text }, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="bg-primary/10 p-2 rounded-full">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">{steps[currentStep]?.title || "Welcome"}</h2>

          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">{steps[currentStep].content}</div>

        {/* Footer with progress indicators and buttons */}
        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
          {/* Progress indicators */}
          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${index === currentStep ? "bg-primary" : "bg-gray-300"}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Skip
            </Button>
            <Button onClick={handleNext}>{currentStep < steps.length - 1 ? "Next" : "Get Started"}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

