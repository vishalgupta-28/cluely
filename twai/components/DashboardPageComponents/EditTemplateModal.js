"use client"

import { useState, useEffect } from "react"
import { updateMeetingTemplate, getEmbeddedDocuments } from "../../app/dashboard/actions"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function EditTemplateModal({ isOpen, onClose, template, onSuccess }) {
  const [purpose, setPurpose] = useState("")
  const [goal, setGoal] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [duration, setDuration] = useState("30 mins")
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [availableDocuments, setAvailableDocuments] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const fetchDocuments = async () => {
    setIsLoading(true)
    try {
      const result = await getEmbeddedDocuments()
      if (result.documents) {
        setAvailableDocuments(result.documents)
      } else {
        toast({
          title: "Failed to fetch documents",
          description: "Could not retrieve embedded documents. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({
        title: "Error",
        description: "An error occurred while fetching documents.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (template) {
      setPurpose(template.purpose || "")
      setGoal(template.goal || "")
      setAdditionalInfo(template.additionalInfo || "")
      setDuration(template.duration || "30 mins")

      if (template.documents) {
        setSelectedDocuments(template.documents.map((doc) => doc.id))
      } else {
        setSelectedDocuments([])
      }

      fetchDocuments()
    }
  }, [template])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append("purpose", purpose)
    formData.append("goal", goal)
    formData.append("additionalInfo", additionalInfo)
    formData.append("duration", duration)

    // Add each selected document ID
    selectedDocuments.forEach((docId) => {
      formData.append("documentIds", docId)
    })

    try {
      const result = await updateMeetingTemplate(template.id, formData)
      if (result.success) {
        // Create updated template object to pass to parent component
        const updatedTemplate = {
          ...template,
          purpose,
          goal,
          additionalInfo,
          duration,
          documents: availableDocuments
            .filter((doc) => selectedDocuments.includes(doc.id))
            .map((doc) => ({ id: doc.id, title: doc.title })),
        }

        onSuccess(updatedTemplate)
        onClose()
      } else {
        console.error("Failed to update template:", result.failure)
        toast({
          title: "Failed to update template",
          description: result.failure || "Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating template:", error)
      toast({
        title: "Error",
        description: "An error occurred while updating the template.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDocumentToggle = (docId) => {
    setSelectedDocuments((prev) => (prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]))
  }

  if (!isOpen || !template) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Edit Meeting Template</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
              Meeting Purpose
            </label>
            <input
              type="text"
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Enter meeting purpose"
              required
            />
          </div>

          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-gray-700">
              Meeting Goal
            </label>
            <input
              type="text"
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Enter meeting goal"
              required
            />
          </div>

          <div>
            <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700">
              Additional Information
            </label>
            <textarea
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Enter additional information"
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
              Duration
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="15 mins">15 mins</option>
              <option value="30 mins">30 mins</option>
              <option value="45 mins">45 mins</option>
              <option value="1 hour">1 hour</option>
              <option value="1.5 hours">1.5 hours</option>
              <option value="2 hours">2 hours</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Documents (Embedded Only)</label>
            {isLoading ? (
              <div className="text-center py-4">Loading documents...</div>
            ) : availableDocuments.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">No embedded documents available</div>
            ) : (
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                {availableDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      id={`doc-${doc.id}`}
                      checked={selectedDocuments.includes(doc.id)}
                      onChange={() => handleDocumentToggle(doc.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <label htmlFor={`doc-${doc.id}`} className="text-sm">
                      {doc.title || "Untitled Document"}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  Updating...
                </div>
              ) : (
                "Update Template"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

