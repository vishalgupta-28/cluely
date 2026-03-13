"use client"

import { useAppContext } from "../../context/AppContext"
import { Button } from "@/components/ui/button"
// --- 1. Import useToast ---
import { useToast } from "@/hooks/use-toast"
import { MonitorSmartphone, StopCircle } from "lucide-react"
import { useState } from "react"
import { useParams } from "next/navigation"

export default function CaptureScreenButton() {
  const { setWholeConversation, setStream, videoRef, stream } = useAppContext()
  const [isCapturing, setIsCapturing] = useState(false)
  const params = useParams()
  // --- 2. Get the toast function ---
  const { toast } = useToast()

  let socket = null
  let controller = null

  const startScreenShare = async () => {
    // Reset controller just in case
    controller = null;

    try {
      controller = new CaptureController();

      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: {
          // Request audio - essential for the check later
          echoCancellation: true,
          noiseSuppression: true,
          suppressLocalAudioPlayback: true,
        },
        // --- Keep necessary options, remove problematic experimental ones if needed ---
        controller: controller, // For focus control (experimental)
        surfaceSwitching: "exclude", // Standard
        // monitorTypeSurfaces: "exclude", // Highly Experimental - consider removing if causing issues
        // selfBrowserSurface: "exclude", // Consider removing if you want current tab shareable
      })

      // --- 3. Validate the selection ---
      const videoTracks = mediaStream.getVideoTracks();
      const audioTracks = mediaStream.getAudioTracks(); // Check for audio tracks

      let displaySurface = null;
      if (videoTracks.length > 0) {
        displaySurface = videoTracks[0].getSettings().displaySurface;
      }

      const hasAudio = audioTracks.length > 0; // Check if audio was actually included

      // --- Check if it's a browser tab AND has audio ---
      if (displaySurface === "browser" && hasAudio) {
        // --- ACCEPTED: Selection is valid, proceed ---
        console.log("Valid selection: Browser tab with audio.");

        // Set focus behavior (optional, experimental)
        if (controller) { // Ensure controller exists
          try {
            controller.setFocusBehavior("no-focus-change");
            console.log("Focus behavior set to 'no-focus-change'");
          } catch (error) {
            console.warn("Could not set focus behavior:", error);
          }
        }

        // --- Continue with the rest of the setup ---
        setStream(mediaStream);
        setIsCapturing(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // Set up event listener for when the user stops sharing (using the first video track)
        videoTracks[0].onended = () => {
          console.log("Screen share stopped via browser UI.");
          stopScreenShare(); // Call your cleanup function
        };

        // Setup WebSocket and MediaRecorder using the audio track
        console.log("Audio track found for recording.");
        const audioStream = new MediaStream(audioTracks); // Use the actual audio track(s)
        const mediaRecorder = new MediaRecorder(audioStream, { mimeType: "audio/webm" });

        await openWebSocket(); // Ensure WebSocket is ready

        mediaRecorder.ondataavailable = (event) => {
          if (socket && socket.readyState === WebSocket.OPEN && event.data.size > 0) {
            socket.send(event.data);
          }
        };

        mediaRecorder.start(250);
        console.log("MediaRecorder started.");

      } else {
        // --- REJECTED: Selection is invalid ---
        console.warn(`Invalid selection. Surface: ${displaySurface}, Has Audio: ${hasAudio}. Required: 'browser' with audio.`);

        // Stop all tracks from the obtained stream immediately
        mediaStream.getTracks().forEach(track => track.stop());
        console.log("MediaStream tracks stopped due to invalid selection.");

        // --- 4. Show Toast Notification ---
        toast({
          variant: "destructive", // Or "warning"
          title: "Screen Share Failed",
          description: "Please select a 'Browser Tab' and ensure 'Share tab audio' is checked.",
        });

        // Optionally reset controller if needed, although it's reset at the start
        controller = null;
        // Do NOT set isCapturing to true or proceed further
        return; // Exit the function early
      }

    } catch (error) {
      // Handle errors from getDisplayMedia itself (e.g., permission denied)
      console.error("Error accessing screen or during setup: ", error);
      toast({ // Also show toast for general errors
        variant: "destructive",
        title: "Screen Share Error",
        description: error.message === "Permission denied" ? "Permission to share screen was denied." : "Could not start screen sharing.",
      });
      stopScreenShare();
    }
  }

  const stopScreenShare = () => {
    console.log("stopScreenShare called."); // Add log
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      console.log("Stream tracks stopped.");
    } else {
      console.log("No active stream found to stop.");
    }
    setStream(null);
    setIsCapturing(false);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("Closing WebSocket.");
      socket.close();
    } else if (socket) {
      console.log(`WebSocket found but not open (state: ${socket.readyState}).`);
    } else {
      console.log("No active WebSocket found to close.");
    }
    socket = null; // Ensure socket is reset
    controller = null; // Ensure controller is reset
  }

  // --- fetchDeepgramToken and openWebSocket remain the same ---
  // (Ensure openWebSocket handles potential multiple calls robustly if necessary)
  // (Ensure the WebSocket message handling logic in openWebSocket is correct)
  const fetchDeepgramToken = async () => {
    // ... (implementation as before) ...
    const sessionId = params.sessionId

    const response = await fetch("/api/deepgram-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: sessionId,
        keyType: "capturescreen"
      }),
    })

    if (!response.ok) {
      const errorText = await response.text(); // Get more error details
      console.error("Deepgram token fetch failed:", response.status, errorText);
      throw new Error(`Failed to fetch Deepgram token (${response.status})`);
    }

    const data = await response.json()
    if (!data?.token?.key) {
      console.error("Invalid token structure received:", data);
      throw new Error("Invalid token structure received from API.");
    }
    return data.token.key
  }

  const openWebSocket = async () => {
    // Prevent multiple WebSockets if called again before closing
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      console.warn("WebSocket already open or connecting. Aborting new connection attempt.");
      // Resolve immediately if already open and ready? Or reject? Depends on desired behavior.
      if (socket.readyState === WebSocket.OPEN) return Promise.resolve();
      // If connecting, maybe wait or reject? For simplicity, just return/warn.
      return Promise.reject(new Error("WebSocket connection already in progress."));
    }

    return new Promise(async (resolve, reject) => {
      try {
        const token = await fetchDeepgramToken()
        console.log("Attempting to connect WebSocket with token:", token ? "obtained" : "MISSING"); // Log token status
        if (!token) {
          return reject(new Error("Failed to get Deepgram token. Cannot open WebSocket."));
        }

        const url = "wss://api.deepgram.com/v1/listen?model=nova-3&language=en&smart_format=true&punctuate=true" // Verify model if needed

        socket = new WebSocket(url, ["token", token])

        socket.onopen = () => {
          console.log("Connected to Deepgram WebSocket")
          // Consider if the 'Configure' message is truly needed by Deepgram here,
          // often configuration is done via URL params for live streaming.
          // Check Deepgram's current WebSocket API docs.
          // socket.send( JSON.stringify({ /* ... configuration ... */ }) );
          resolve()
        }

        socket.onerror = (error) => {
          console.error("WebSocket error", error)
          socket = null; // Clear on error
          reject(error) // Reject the promise on error
        }

        socket.onclose = (event) => {
          console.log("WebSocket closed:", event.code, event.reason);
          // Optionally reject promise if closed before expected? Or just log.
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            console.log("Stream tracks stopped.");
          } else {
            console.log("No active stream found to stop.");
          }
          setStream(null);
          setIsCapturing(false);

          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }

          if (socket && socket.readyState === WebSocket.OPEN) {
            console.log("Closing WebSocket.");
            socket.close();
          } else if (socket) {
            console.log(`WebSocket found but not open (state: ${socket.readyState}).`);
          } else {
            console.log("No active WebSocket found to close.");
          }
          socket = null; // Ensure socket is reset
          controller = null; // Ensure controller is reset
        }

        socket.onmessage = (event) => {
          // --- Existing onmessage logic ---
          try { // Add try-catch around message processing
            const data = JSON.parse(event.data);
            // Use optional chaining for safer access
            const transcript = data?.channel?.alternatives?.[0]?.transcript;
            if (transcript?.trim()) { // Check transcript exists and is not empty space
              const timestamp = new Date().toISOString();

              setWholeConversation((prev) => {
                // Ensure prev is an array
                const currentConversation = Array.isArray(prev) ? prev : [];
                const lastMessage = currentConversation[currentConversation.length - 1];

                // Check last message structure more robustly
                if (lastMessage && typeof lastMessage.other === 'string') {
                  const updatedMessage = lastMessage.other + " " + transcript;
                  const MAX_MESSAGE_LENGTH = 200; // Define constant

                  // Update existing message if not too long
                  if (updatedMessage.length <= MAX_MESSAGE_LENGTH) {
                    // Create a new object for the updated message to ensure state update
                    const newMessage = { ...lastMessage, other: updatedMessage, time: timestamp };
                    return [...currentConversation.slice(0, -1), newMessage];
                  } else {
                    // Start a new message if the updated one is too long
                    // Optionally mark the previous one as 'final' or 'saved' here if needed
                    return [...currentConversation, { other: transcript, time: timestamp, saved: false, hidden: false }];
                  }
                } else {
                  // Add a new message object if no suitable previous message exists
                  return [...currentConversation, { other: transcript, time: timestamp, saved: false, hidden: false }];
                }
              });
            } else if (data.type === 'Metadata') {
              console.log("Received Metadata:", data);
            } else if (data.type === 'SpeechFinal') { // Example: Handling end of speech segments
              console.log("Received SpeechFinal:", data);
              // Potentially mark the last message segment as 'saved' or 'final' here
            }

          } catch (parseError) {
            console.error("Error parsing WebSocket message data:", parseError, event.data);
          }
        } // end onmessage

      } catch (error) {
        console.error("Error fetching token or setting up WebSocket:", error)
        socket = null; // Clear on error
        reject(error) // Reject the promise on error
      }
    })
  }
  // --- JSX remains the same ---
  return (
    <Button
      onClick={isCapturing ? stopScreenShare : startScreenShare}
      variant={isCapturing ? "default" : "outline"}
      className={`w-full py-1 h-auto text-xs ${isCapturing ? "bg-primary/90 hover:bg-primary/80" : ""}`}
    >
      {isCapturing ? (
        <>
          <StopCircle className="h-3 w-3 mr-1" />
          Disconnect Meeting
        </>
      ) : (
        <>
          <MonitorSmartphone className="h-3 w-3 mr-1" />
          Connect to Live Meeting
        </>
      )}
    </Button>
  )
}