"use client"

import { useState, useEffect } from "react"
import { updateDocument } from "../../app/dashboard/actions"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function EditDocumentModal({ isOpen, onClose, document, onSuccess }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [addEmbedding, setAddEmbedding] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (document) {
      setTitle(document.title || "")
      setDescription(document.description || "")
      setAddEmbedding(document.isEmbedded || false)
    }
  }, [document])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    formData.append("add_embedding", addEmbedding.toString())

    try {
      const result = await updateDocument(document.id, formData)
      if (result.success) {
        // Pass the updated document to the parent component
        const updatedDocument = {
          ...document,
          title,
          description,
          isEmbedded: addEmbedding,
        }
        onSuccess(updatedDocument)
        onClose()
      } else {
        console.error("Failed to update document:", result.failure || result.error)
        toast({
          title: "Failed to update document",
          description: result.failure || result.error || "Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating document:", error)
      toast({
        title: "Error",
        description: "An error occurred while updating the document.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !document) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Edit Document</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Document Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Enter document title"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Enter document description"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="addEmbedding"
              checked={addEmbedding}
              onChange={(e) => setAddEmbedding(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="addEmbedding" className="text-sm text-gray-700">
              Add Embedding (for AI search capabilities)
            </label>
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
                "Update Document"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

