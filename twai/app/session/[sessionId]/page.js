"use client"

import LeftSection from "../../../components/SessionPageComponents/left-section"
import MiddleSection from "../../../components/SessionPageComponents/middle-section"
import RightSection from "../../../components/SessionPageComponents/right-section"
import WelcomeModal from "@/components/SessionPageComponents/welcomeModal"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { isValidSession } from "./actions"
import { useAppContext } from "../../../context/AppContext"
import { Toaster } from "@/components/ui/toaster"
import { FullscreenLoader } from "@/components/loading-page"
import { appendConversation, appendChat } from "./actions"
export default function Home() {
  const { sessionId } = useParams()
  const { status } = useSession()
  const { wholeConversation, setCopiedText, setWholeConversation, setChatMessages, setSessionDetails, chatMessages, setSessionAgents } = useAppContext()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [loadingPhase, setLoadingPhase] = useState("initializing")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // <-- Add state for unsaved changes
  const [anyUnsavedChat, setAnyUnsavedChat] = useState(false); // <-- Add state for unsaved chat messages
  const [anyUnsavedConv, setAnyUnsavedConv] = useState(false); // <-- Add state for unsaved conversation messages
  // --- Existing useEffect for fetching data ---
  useEffect(() => {
    const fetchData = async () => {
      if (status === "unauthenticated") {
        router.push("/")
        return
      }
      if (status === "loading") {
        return
      }
      setLoadingPhase("authenticating")
      try {
        const data = await isValidSession({ sessionId: sessionId })
        if (data.failure) {
          if (data.failure.includes("no longer active")) {
            router.push("/dashboard?error=inactive-session")
            return
          }
          router.push("/")
          return
        }
        setLoadingPhase("loading-session")
        if (data.chat) {
          setChatMessages(data.chat.map((c) => ({ ...c, hidden: true, saved: true })))
        }
        if (data.conversation) {
          setWholeConversation(data.conversation.map((c) => ({ ...c, hidden: true, saved: true })))
        }
        if (data.sessionDetails) {
          setSessionDetails({ description: data.sessionDetails.description, name: data.sessionDetails.name, templateInfo: data.sessionDetails.template })
        }
        if (data.agents) {
          setSessionAgents(data.agents)
        }
        setIsLoading(false)
        // Initially, assume no unsaved changes after loading
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error("Error fetching session data:", error)
        if (error.message && error.message.includes("403")) {
          router.push("/dashboard?error=inactive-session")
          return
        }
        router.push("/")
      }
    }
    fetchData()
  }, [status, sessionId, router, setChatMessages, setWholeConversation, setSessionDetails, setSessionAgents])


  // --- New useEffect for 'beforeunload' ---
  useEffect(() => {
    const handleBeforeUnload = async (event) => {
      if (hasUnsavedChanges) {
        
        event.preventDefault();

        if (anyUnsavedConv) {
          await appendConversation({
            sessionId: sessionId,
            newMessages: wholeConversation
              .filter((msg) => msg.saved == false)
              .map((message) =>
                ["user", "other", "time"].reduce((acc, key) => {
                  if (message.hasOwnProperty(key)) acc[key] = message[key]
                  return acc
                }, {}),
              ),
          })
        }
        if (anyUnsavedChat) {
          await appendChat({
            sessionId,
            newMessages: chatMessages.filter((msg) => msg.saved == false).map(({ saved, hidden, ...rest }) => rest),
          })
          event.returnValue = ''; // Legacy support
          return 'We are still saving your conversation. Are you sure you want to leave?';
        }

        
      }

      // If no unsaved changes, return undefined (or nothing) to allow navigation without prompt
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handleBeforeUnload); // Handle back button

    // Cleanup function to remove the listener when the component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handleBeforeUnload); // Cleanup for back button
    };
  }, [hasUnsavedChanges, anyUnsavedChat, anyUnsavedConv, chatMessages, sessionId, wholeConversation]); // <-- Include all dependencies

  useEffect(() => {
    const checkUnsaved = () => {
      const unsavedChat = chatMessages.some(msg => !msg.saved);
      const unsavedConv = wholeConversation.some(item => !item.saved);
      setAnyUnsavedChat(unsavedChat);
      setAnyUnsavedConv(unsavedConv);
      setHasUnsavedChanges(unsavedChat || unsavedConv);
    };
    checkUnsaved();
  }, [chatMessages, wholeConversation]);

  if (status === "loading" || isLoading) {
    return <FullscreenLoader />
  }

  return (
    // ... rest of your component JSX
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 w-full p-2 grid grid-cols-1 lg:grid-cols-12 gap-2 max-h-screen overflow-hidden">
        {/* Left Section - Screen Capture + Conversation */}
        <div className="lg:col-span-4 xl:col-span-4 overflow-hidden flex flex-col max-h-[calc(100vh-16px)]">
          <LeftSection /* Pass functions to update hasUnsavedChanges if needed */ />
        </div>

        {/* Middle Section - AI Meeting Helper */}
        <div className="lg:col-span-5 xl:col-span-5 overflow-hidden flex flex-col max-h-[calc(100vh-16px)]">
          <MiddleSection /* Pass functions to update hasUnsavedChanges if needed */ />
        </div>

        {/* Right Section - AI Tools + Citations */}
        <div className="lg:col-span-3 xl:col-span-3 overflow-hidden flex flex-col max-h-[calc(100vh-16px)]">
          <RightSection /* Pass functions to update hasUnsavedChanges if needed */ />
        </div>
      </main>

      {/* Welcome Modal */}
      <WelcomeModal />

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}