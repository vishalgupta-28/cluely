"use client"

import { useState, useRef, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FloatingImageWindow({ imageData, onClose }) {
  const [position, setPosition] = useState({
    x: window.innerWidth - 200 - 20 - 200,  // 400px window width + 20px padding from the right edge
    y: window.innerHeight - 600 - 20, // 300px window height + 20px padding from the bottom edge
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [zoomLevel, setZoomLevel] = useState(1)
  const windowRef = useRef(null)

  // Handle mouse down on header for dragging
  const handleMouseDown = (e) => {
    if (e.target.closest(".window-controls")) return

    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })

    e.preventDefault()
  }

  // Handle mouse move while dragging
  const handleMouseMove = (e) => {
    if (!isDragging) return

    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y

    // Keep window within viewport bounds
    const windowWidth = windowRef.current?.offsetWidth || 400
    const windowHeight = windowRef.current?.offsetHeight || 300

    const boundedX = Math.max(0, Math.min(window.innerWidth - windowWidth, newX))
    const boundedY = Math.max(0, Math.min(window.innerHeight - windowHeight, newY))

    setPosition({ x: boundedX, y: boundedY })
  }

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Set up event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    } else {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragOffset, handleMouseMove])

  return (
    <div
      ref={windowRef}
      className="floating-window"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "default",
        width: "400px", // Adjust default size here
        height: "600px", // Adjust default size here
      }}
    >
      <div
        className="floating-window-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "grab", backgroundColor: "#0c8eeb" }}
      >
        <h3 className="text-sm font-medium text-white">Image Preview</h3>
        <div className="window-controls flex items-center gap-2">
          {/* <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.25))}
            className="h-6 w-6 p-0"
            title="Zoom out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
            className="h-6 w-6 p-0"
            title="Zoom in"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </Button> */}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="floating-window-content">
        <img
          src={imageData.startsWith('http') ? imageData : `data:image/png;base64,${imageData}`}
          alt="Citation"
          className="max-w-full max-h-full object-contain rounded-md transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})` }}
          onError={(e) => {
            console.log('FloatingImageWindow: Image failed to load:', imageData)
            e.target.style.display = 'none'
          }}
        />
      </div>
    </div>
  )
}

export default FloatingImageWindow
