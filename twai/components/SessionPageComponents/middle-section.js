"use client"

import { Button } from "@/components/ui/button"
import { Bot, X, Send, CloudUpload, Search, BarChart2, Highlighter, ScrollText, Database } from "lucide-react"
import { useAppContext } from "../../context/AppContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useParams } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import ReactMarkdown from "react-markdown"
import { unstable_noStore as noStore } from "next/cache"
import { v4 as uuidv4 } from "uuid"
import { appendChat } from "@/app/session/[sessionId]/actions"
import MarkdownRenderer from "../ui/markdown-renderer"

export default function MiddleSection() {
  noStore()
  const {
    isProcessing,
    setChatMessages,
    chatMessages,
    enableWebSearch,
    setEnableWebSearch,
    showGraph,
    setShowGraph,
    useHighlightedText,
    setUseHighlightedText,
    userInput,
    setUserInput,
    setGraphImage,
    wholeConversation,
    setUsedCitations,
    setCapturePartialTranscript,
    setMicPartialTranscript,
    setWholeConversation,
    videoRef,
    stream,
    setCopiedText,
    graphImage,
    usedCitations,
    setIsProcessing,
    useRag,
    setUseRag,
    setSaveChatCounter,
    saveChatCounter,
    copiedText,
  } = useAppContext()

  const { sessionId } = useParams()
  const [autoScroll, setAutoScroll] = useState(true)
  const chatEndRef = useRef(null)
  const [image, setImage] = useState(null)
  const [isGraphVisible, setIsGraphVisible] = useState(false)
  const [activeTab, setActiveTab] = useState("chat")
  const [lastUpdateTime, setLastUpdateTime] = useState(0)
  const [showChat, setShowChat] = useState(false)

  const toggleGraphVisibility = () => {
    setIsGraphVisible(!isGraphVisible)
  }

  const regenerateQuery = async (mid, regenerate_Query_or_Result_or_expandquestion) => {
    if (isProcessing) return
    setGraphImage(null)
    setIsProcessing(true)
    setCopiedText("")
    setUseHighlightedText(false)
    setUsedCitations([])

    const message = chatMessages.find((msg) => msg.id === mid && msg.sender === "user")
    const answer = chatMessages.find((msg) => msg.id === mid && msg.sender === "ai") || ""

    if (!message) {
      console.error("Message or answer not found")
      setIsProcessing(false)
      return
    }

    try {
      let id = uuidv4()
      if (regenerate_Query_or_Result_or_expandquestion == "expandquestion" && message.id) {
        id = message.id

        // Show "Thinking..." in the same message when expanding
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === mid && msg.sender === "ai"
              ? { ...msg, isExpanding: true }
              : msg,
          ),
        )
      }

      if (regenerate_Query_or_Result_or_expandquestion !== "expandquestion") {
        if (message.action == "chat_Jamie_AI") {
          setChatMessages((prev) => [
            ...prev,
            {
              text: message.text,
              sender: "user",
              id: id,
              time: new Date().toISOString(),
              action: message.action,
              latestConvoTime: message.latestConvoTime ? message.latestConvoTime : null,
              saved: false,
              hidden: false,
              isWeb: message.enableWebSearch,
              isRag: message.useRag,
              useHighlightedText: message.useHighlightedText,
              copiedText: message.copiedText,
            },
          ])
        } else {
          setChatMessages((prev) => [...prev, { text: "Thinking...", sender: "ai" }])
        }
      }

      const response = await fetch("/api/regenerate_Query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationTime: message.latestConvoTime,
          use_web: message.isWeb,
          requestType: message.action,
          useHighlightedText: message.useHighlightedText,
          copiedText: message.copiedText,
          sessionId,
          useRag: message.isRag,
          prevQuery: message.text,
          action: message.action,
          prevAnswer: answer.text || "",
          regenerate_Query_or_Result_or_expandquestion: regenerate_Query_or_Result_or_expandquestion,
        }),
      })

      if (!response.ok) {
        if (response.status === 403) {
          // Session is inactive, redirect to dashboard with error parameter
          router.push("/dashboard?error=inactive-session")
          return
        }
        throw new Error(`Server responded with ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("Streaming not supported")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Improved parsing: Keep the last line which might be incomplete
        const lines = buffer.split("\n")

        // Save the potentially incomplete line for next iteration
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const h = JSON.parse(line)

            if (
              h.query &&
              message.action !== "chat_Jamie_AI" &&
              regenerate_Query_or_Result_or_expandquestion !== "expandquestion"
            ) {
              setChatMessages((prev) => {
                const usermessageIndex = prev.findIndex((msg) => msg.id === id && msg.sender === "user")
                if (usermessageIndex != -1) {
                  const updatedMessages = prev
                    .filter((msg) => msg.text !== "Thinking...") // Remove any existing "Thinking..."
                    .map((msg) =>
                      msg.id === id && msg.sender === "user" ? { ...msg, text: h.query, saved: false } : msg
                    );

                  return [...updatedMessages, { sender: "ai", text: "Thinking..." }];
                } else {
                  return [
                    ...prev.filter((msg) => msg.text !== "Thinking..."),
                    {
                      text: h.query,
                      sender: "user",
                      id: id,
                      time: new Date().toISOString(),
                      action: message.action,
                      latestConvoTime: message.latestConvoTime ? message.latestConvoTime : null,
                      saved: false,
                      hidden: false,
                      isWeb: message.enableWebSearch,
                      isRag: message.useRag,
                      useHighlightedText: message.useHighlightedText,
                      copiedText: message.copiedText,
                    },
                    { text: "Thinking...", sender: "ai" },
                  ]
                }
              })
            }

            if (h.result) {
              setChatMessages((prev) => {
                const aiMessageIndex = prev.findIndex((msg) => msg.id === id && msg.sender === "ai")
                if (aiMessageIndex != -1) {
                  return prev
                    .filter((msg) => msg.text !== "Thinking...")
                    .map((msg) =>
                      msg.id === id && msg.sender === "ai" ? { ...msg, text: h.result, saved: false } : msg,
                    )
                } else {
                  return [
                    ...prev.filter((msg) => msg.text !== "Thinking..."),
                    {
                      text: h.result,
                      sender: "ai",
                      id: id,
                      time: new Date().toISOString(),
                      saved: false,
                      hidden: false,
                    },
                  ]
                }
              })
            }

            if (h.used_citations) {
              setUsedCitations(
                Object.entries(h.used_citations).map(([key, value]) => ({
                  id: key,
                  ...value,
                })),
              )
            }

            if (h.graph) {
              setGraphImage(h.graph)
              setShowGraph(true)
            }
          } catch (error) {
            console.warn("Streaming JSON parse error:", error)
          }
        }
      }

      // Process any remaining data in the buffer after the stream completes
      if (buffer.trim()) {
        try {
          const h = JSON.parse(buffer)

          if (
            h.query &&
            message.action !== "chat_Jamie_AI" &&
            regenerate_Query_or_Result_or_expandquestion !== "expandquestion"
          ) {
            setChatMessages((prev) => {
              const usermessageIndex = prev.findIndex((msg) => msg.id === id && msg.sender === "user")
              if (usermessageIndex !== -1) {
                return prev
                  .filter((msg) => msg.text !== "Thinking...")
                  .map((msg) =>
                    msg.id === id && msg.sender === "user" ? { ...msg, text: h.query, saved: false } : msg,
                  )
              } else {
                return [
                  ...prev.filter((msg) => msg.text !== "Thinking..."),
                  {
                    text: h.query,
                    sender: "user",
                    id: id,
                    time: new Date().toISOString(),
                    action: message.action,
                    latestConvoTime: message.latestConvoTime ? message.latestConvoTime : null,
                    saved: false,
                    hidden: false,
                    isWeb: message.enableWebSearch,
                    isRag: message.useRag,
                    useHighlightedText: message.useHighlightedText,
                    copiedText: message.copiedText,
                  },
                  { text: "Thinking...", sender: "ai" },
                ]
              }
            })
          }

          if (h.result) {
            setChatMessages((prev) => {
              const aiMessageIndex = prev.findIndex((msg) => msg.id === id && msg.sender === "ai")
              if (aiMessageIndex !== -1) {
                return prev
                  .filter((msg) => msg.text !== "Thinking...")
                  .map((msg) => (msg.id === id && msg.sender === "ai" ? { ...msg, text: h.result, saved: false } : msg))
              } else {
                return [
                  ...prev.filter((msg) => msg.text !== "Thinking..."),
                  { text: h.result, sender: "ai", id: id, time: new Date().toISOString(), saved: false, hidden: false },
                ]
              }
            })
          }

          if (h.used_citations) {
            setUsedCitations(
              Object.entries(h.used_citations).map(([key, value]) => ({
                id: key,
                ...value,
              })),
            )
          }

          if (h.graph) {
            setGraphImage(h.graph)
            setShowGraph(true)
          }

        } catch (error) {
          console.warn("Final buffer parse error:", error)
        }
      }

      // When updating the result for an expanded message, remove the "Thinking..." indicator
      if (regenerate_Query_or_Result_or_expandquestion === "expandquestion") {
        setChatMessages((prev) => {
          return prev.map((msg) =>
            msg.id === mid && msg.sender === "ai" && msg.isExpanding
              ? { ...msg, isExpanding: false, saved: false }
              : msg,
          )
        })
      }

      // Make sure to clean up any remaining "Thinking..." indicators at the end
      setChatMessages((prev) =>
        prev
          .map((msg) =>
            msg.isExpanding ? { ...msg, isExpanding: false } : msg,
          )
          .filter((msg) => msg.text !== "Thinking..."),
      )


      setChatMessages((prev) => [...prev.filter((msg) => msg.text !== "Thinking...")])
      setSaveChatCounter((prev) => prev + 1)
    } catch (error) {
      console.error("AI Request failed:", error)
      setChatMessages((prev) => [
        ...prev.filter((msg) => msg.text !== "Thinking..."),
        { text: "An error occurred while processing your request.", sender: "ai", hidden: false },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  // const handleSendMessage = async () => {
  //   if (isProcessing) return

  //   if (userInput.trim()) {
  //     const id = uuidv4()
  //     setCopiedText("")
  //     setUseHighlightedText(false)

  //     setChatMessages((prev) => [
  //       ...prev,
  //       {
  //         text: userInput,
  //         sender: "user",
  //         id: id,
  //         time: new Date().toISOString(),
  //         action: "chat_Jamie_AI",
  //         latestConvoTime: wholeConversation.length > 0 ? wholeConversation[wholeConversation.length - 1].time : null,
  //         saved: false,
  //         hidden: false,
  //         isWeb: enableWebSearch,
  //         isRag: useRag,
  //         useHighlightedText: false,
  //         copiedText: "",
  //       },
  //       { text: "Thinking...", sender: "ai" },
  //     ])

  //     setUserInput("")
  //     setUsedCitations([])
  //     setGraphImage(null)
  //     setIsProcessing(true)

  //     const formData = new FormData()
  //     formData.append("user_input", userInput)
  //     formData.append("use_web", enableWebSearch)
  //     formData.append("use_graph", showGraph)
  //     formData.append("sessionId", sessionId)
  //     formData.append("useRag", useRag)

  //     if (image) {
  //       formData.append("uploaded_file", image)
  //     }

  //     if (wholeConversation) {
  //       formData.append("raw_Conversation", JSON.stringify(wholeConversation))
  //     }

  //     try {
  //       const response = await fetch("/api/chat_Jamie_AI", {
  //         method: "POST",
  //         body: formData,
  //       })

  //       if (!response || !response.ok) throw new Error(`Server responded with ${response.status}`)

  //       const reader = response.body?.getReader()
  //       if (!reader) throw new Error("Streaming not supported")

  //       const decoder = new TextDecoder()
  //       let buffer = ""

  //       while (true) {
  //         const { done, value } = await reader.read()
  //         if (done) break

  //         buffer += decoder.decode(value, { stream: true })

  //         // Split on newlines and keep potentially incomplete last line
  //         const lines = buffer.split("\n")

  //         // Save the last line which might be incomplete for next iteration
  //         buffer = lines.pop() || ""

  //         for (const line of lines) {
  //           if (!line.trim()) continue
  //           try {
  //             const h = JSON.parse(line)

  //             if (h.result) {
  //               setChatMessages((prev) => {
  //                 const filteredMessages = prev.filter((msg) => msg.text !== "Thinking...")
  //                 const existingMessageIndex = filteredMessages.findIndex((msg) => msg.id === id && msg.sender === "ai")

  //                 if (existingMessageIndex !== -1) {
  //                   return filteredMessages.map((msg) =>
  //                     msg.id === id && msg.sender === "ai" ? { ...msg, text: h.result, saved: false } : msg,
  //                   )
  //                 } else {
  //                   return [
  //                     ...filteredMessages,
  //                     {
  //                       text: h.result,
  //                       sender: "ai",
  //                       id: id,
  //                       time: new Date().toISOString(),
  //                       saved: false,
  //                       hidden: false,
  //                     },
  //                   ]
  //                 }
  //               })
  //             }

  //             if (h.used_citations) {
  //               setUsedCitations(
  //                 Object.entries(h.used_citations).map(([key, value]) => ({
  //                   id: key,
  //                   ...value,
  //                 })),
  //               )
  //             }

  //             if (h.graph) {
  //               setGraphImage(h.graph)
  //               setShowGraph(true)
  //             }
  //           } catch (error) {
  //             console.warn("JSON parse error for line:", line, error)
  //           }
  //         }
  //       }

  //       // Process any remaining data in the buffer after the stream completes
  //       if (buffer.trim()) {
  //         try {
  //           const h = JSON.parse(buffer)

  //           if (h.result) {
  //             setChatMessages((prev) => {
  //               const filteredMessages = prev.filter((msg) => msg.text !== "Thinking...")
  //               const existingMessageIndex = filteredMessages.findIndex((msg) => msg.id === id && msg.sender === "ai")

  //               if (existingMessageIndex !== -1) {
  //                 return filteredMessages.map((msg) =>
  //                   msg.id === id && msg.sender === "ai" ? { ...msg, text: h.result, saved: false } : msg,
  //                 )
  //               } else {
  //                 return [
  //                   ...filteredMessages,
  //                   {
  //                     text: h.result,
  //                     sender: "ai",
  //                     id: id,
  //                     time: new Date().toISOString(),
  //                     saved: false,
  //                     hidden: false,
  //                   },
  //                 ]
  //               }
  //             })
  //           }

  //           if (h.used_citations) {
  //             setUsedCitations(
  //               Object.entries(h.used_citations).map(([key, value]) => ({
  //                 id: key,
  //                 ...value,
  //               })),
  //             )
  //           }

  //           if (h.graph) {
  //             setGraphImage(h.graph)
  //             setShowGraph(true)
  //           }
  //         } catch (error) {
  //           console.warn("Final buffer parse error:", error)
  //         }
  //       }

  //       setChatMessages((prev) => [...prev.filter((msg) => msg.text !== "Thinking...")])

  //       setSaveChatCounter((prev) => prev + 1)
  //     } catch (error) {
  //       console.error("Error sending message:", error)
  //       setChatMessages((prev) => [
  //         ...prev.filter((msg) => msg.text !== "Thinking..."),
  //         { text: "An error occurred while processing your request.", sender: "ai", hidden: false },
  //       ])
  //     } finally {
  //       setIsProcessing(false)
  //     }
  //   }
  // }

  const handleClear = () => {
    setChatMessages([])
    setUserInput("")
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file && ["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setImage(file)
    } else {
      alert("Please upload a valid image file (PNG, JPG, JPEG).")
    }
  }

  const triggerFileInput = () => {
    document.getElementById("imageUpload").click()
  }

  const handleRemoveImage = () => {
    setImage(null)
  }

  // Auto-scroll effect for chat
  useEffect(() => {
    if (autoScroll && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages, autoScroll])

  useEffect(() => {
    console.log("Trying saving?")
    const now = Date.now()
    if (now - lastUpdateTime >= 10000 && chatMessages.filter((msg) => msg.saved == false).length > 0) {
      // 10 seconds gap
      console.log("In  saving")
      appendChat({
        sessionId,
        newMessages: chatMessages.filter((msg) => msg.saved == false).map(({ saved, hidden, ...rest }) => rest),
      })
      setChatMessages((prev) =>
        prev.map(
          (msg) => (msg.saved ? msg : { ...msg, saved: true }), // Avoid filtering out messages
        ),
      )
      setLastUpdateTime(now)
    }
  }, [saveChatCounter, chatMessages])

  useEffect(() => {
    setChatMessages((prev) =>
      prev.map((message) =>
        message.hasOwnProperty("hidden") ? { ...message, hidden: showChat ? false : true } : message,
      ),
    )
  }, [showChat])

  const regenerateMessageIds = chatMessages
    .filter((msg) => msg.sender === "user" && ["help"].includes(msg.action))
    .map((msg) => msg.id)

  const chatwithjamieIds = chatMessages
    .filter((msg) => msg.sender === "user" && msg.action === "chat_Jamie_AI")
    .map((msg) => msg.id)

  return (
    <div className="h-full flex flex-col gap-2">
      <Card className="border shadow-sm flex-1 flex flex-col overflow-hidden">
        <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <Bot className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-medium">JarWizAI</CardTitle>
            {isProcessing && (
              <div className="flex items-center ml-2 px-2 py-1 bg-blue-50 rounded-full border border-blue-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-150 mr-1"></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-300 mr-1"></div>
                </div>
                <span className="text-xs font-medium text-blue-600 ml-1">Processing...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`text-muted-foreground h-7 px-2 ${autoScroll ? "bg-primary/10 text-primary" : ""}`}
              title={autoScroll ? "Auto-scroll On" : "Auto-scroll Off"}
            >
              <ScrollText className="h-4 w-4 mr-1" />
              {autoScroll ? "Auto-scroll On" : "Auto-scroll Off"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChat((prev) => !prev)} // Toggle state
              className={`text-muted-foreground h-7 px-2 ${showChat ? "bg-primary/10 text-primary" : ""}`}
              title={showChat ? "Hide Chat" : "Show Chat"}
            >
              {showChat ? "Hide Chat" : "Show Chat"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-0 flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Messages Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-2">
              {chatMessages.length === 0 ? (
                <div className="h-full flex mt-40 items-center justify-center text-center p-4">
                  <div className="max-w-sm">
                    <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground py-4">
                      <span className="block text-sm">Your interactions with JarWiz AI will start to appear here...</span>
                    </p>
                  </div>
                </div>
              ) : chatMessages.filter((msg) => !msg.hidden).length === 0 ? (
                <div className="h-full flex mt-40 items-center justify-center text-center p-4">
                  <div className="max-w-sm">
                    <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground py-4">
                      <span className="block text-sm">Your conversation is hidden for a clean screen.</span>
                      <span className="block text-xs mt-1">You can unhide it anytime from the above toggle.</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-1">
                  {chatMessages
                    .filter((msg) => !msg.hidden)
                    .map((message, index) => (
                      <div
                        key={index}
                        className={`flex flex-col gap-1 ${message.sender === "user" ? "items-end" : "items-start"}`}
                      >
                        {/* Chat Bubble */}
                        <div
                          className={`relative p-3 rounded-lg max-w-[85%] text-sm shadow-md ${message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                        >
                          {message.text === "Thinking..." ? (
                            <div className="flex items-center gap-1">
                              <div className="animate-pulse">Thinking</div>
                              <span className="animate-bounce">.</span>
                              <span className="animate-bounce delay-100">.</span>
                              <span className="animate-bounce delay-200">.</span>
                            </div>
                          ) : (
                            <div className="text-sm">
                              {/* Screenshot Preview */}
                              {message.screenshot && (
                                <div className="mb-2 border rounded-lg overflow-hidden bg-white">
                                  <img 
                                    src={message.screenshot} 
                                    alt="Screenshot" 
                                    className="w-full max-h-48 object-contain" 
                                  />
                                </div>
                              )}
                              <MarkdownRenderer>{message.text}</MarkdownRenderer>
                              {message.isExpanding && (
                                <div className="flex items-center gap-1 text-muted-foreground mt-2">
                                  <div className="animate-pulse">Expanding</div>
                                  <span className="animate-bounce">.</span>
                                  <span className="animate-bounce delay-100">.</span>
                                  <span className="animate-bounce delay-200">.</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Buttons Container */}
                        {message.id && (
                          <div className="flex gap-2">
                            {/* Regenerate Button */}
                            {(regenerateMessageIds.includes(message.id) ||
                              (chatwithjamieIds.includes(message.id) && message.sender === "ai")) && (
                                <button
                                  disabled={isProcessing}
                                  onClick={() => regenerateQuery(message.id, message.sender === "user" ? "Query" : "Result")}
                                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md 
          ${isProcessing ? "" : "hover:bg-gray-200"} transition-colors duration-200 border border-gray-200 shadow-sm`}
                                  title="Regenerate response"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path
                                      d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  Regenerate
                                </button>
                              )}

                            {/* Expand Answer Button */}
                            {message.sender === "ai" &&
                              (regenerateMessageIds.includes(message.id) || chatwithjamieIds.includes(message.id)) && (
                                <button
                                  disabled={isProcessing}
                                  onClick={() => regenerateQuery(message.id, "expandquestion")}
                                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md 
          ${isProcessing ? "" : "hover:bg-gray-200"} transition-colors duration-200 border border-gray-200 shadow-sm`}
                                  title="Expand response"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path
                                      d="M4 12h16M12 4v16M4 12l4-4m-4 4l4 4m12-4l-4-4m4 4l-4 4"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  Expand
                                </button>
                              )}
                          </div>
                        )}
                      </div>
                    ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </ScrollArea>

          </div>
        </CardContent>
      </Card>
    </div>
  )
}

