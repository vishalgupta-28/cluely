"use client"

import { createContext, useContext, useState,useRef, use } from "react"

const AppContext = createContext()

export function AppProvider({ children }) {
  const [capturePartialTranscript, setCapturePartialTranscript] = useState("")
  const [chatMessages, setChatMessages] = useState([])
  const [userInput, setUserInput] = useState("")
  const [microphoneConnected, setMicrophoneConnected] = useState(false)
  const [micStream, setMicStream] = useState(null);
  const [micPartialTranscript, setMicPartialTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [wholeConversation, setWholeConversation] = useState([]);
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const [stream,setStream] = useState(null);
  const videoRef = useRef(null);
  const [usedCitations, setUsedCitations] = useState([]);
  const [copiedText, setCopiedText] = useState("");
  const [useHighlightedText,setUseHighlightedText] = useState(false);
  const [useRag,setUseRag] = useState(false);
  const [graphImage, setGraphImage] = useState(null)
  const micToken = useRef(null);
  const captureToken = useRef(null);
  const [saveChatCounter,setSaveChatCounter] = useState(0);
  const [sessionDetails,setSessionDetails] = useState(null);
  const [screenshotImage, setScreenshotImage] = useState(null);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [sessionAgents, setSessionAgents] = useState([]);

  return (
    <AppContext.Provider
      value={{
        capturePartialTranscript,
        setCapturePartialTranscript,
        chatMessages,
        setChatMessages,
        userInput,
        setUserInput,
        microphoneConnected,
        setMicrophoneConnected,
        videoRef,
        stream,
        setStream,
        micStream,
        setMicStream,
        micPartialTranscript,
        setMicPartialTranscript,
        wholeConversation, setWholeConversation,
        isProcessing, setIsProcessing,
        enableWebSearch,
        setEnableWebSearch,
        showGraph,
        setShowGraph,usedCitations, setUsedCitations,setCopiedText,copiedText,micToken,captureToken,setUseHighlightedText,useHighlightedText,graphImage,setGraphImage,useRag,setUseRag,setSaveChatCounter,
        saveChatCounter,sessionDetails,
        setSessionDetails,
        screenshotImage, setScreenshotImage,
        isScreenshotMode, setIsScreenshotMode,
        sessionAgents, setSessionAgents
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  return useContext(AppContext)
}

