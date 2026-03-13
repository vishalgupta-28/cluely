"use client"

import { useSession, signOut } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getUserDetails, removeDocument, getSummary, deleteMeetingTemplate, deleteSession } from "./actions"
import PreparationHubTable from "../../components/PreparationHubTable"
import PreparationHubModal from "../../components/PreparationHubModal"
import QuestionAnswerEditor from "../../components/QuestionAnswerEditor"
import { Calendar, FileText, Folder, LogOut, Plus, Trash, User, Edit, Store, Trash2, GraduationCap } from "lucide-react"
import CreateSessionModal from "../../components/DashboardPageComponents/CreateSessionModal"
import DocumentUploadModal from "../../components/DashboardPageComponents/DocumentUploadModal"
import CreateTemplateModal from "../../components/DashboardPageComponents/CreateTemplateModal"
import EditDocumentModal from "../../components/DashboardPageComponents/EditDocumentModal"
import EditTemplateModal from "../../components/DashboardPageComponents/EditTemplateModal"
import { DashboardSkeleton, LoadingOverlay } from "../../components/loading-page"
import { SpinnerButton } from "../../components/ui/spinnerButton"
import { Toaster } from "../../components/ui/toaster"
import { useToast } from "../../hooks/use-toast"
import PDFViewerModal from "../../components/DashboardPageComponents/PDFViewerModal"
import { FullscreenLoader } from "../../components/loading-page"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState("sessions")
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false)
  const [selectedSessionSummary, setSelectedSessionSummary] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [agents, setAgents] = useState([])
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [isOpeningSession, setIsOpeningSession] = useState(false)
  const [showInactiveSessionAlert, setShowInactiveSessionAlert] = useState(false)
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Add these state variables in the DashboardPage component
  const [isEditDocumentModalOpen, setIsEditDocumentModalOpen] = useState(false)
  const [isEditTemplateModalOpen, setIsEditTemplateModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isDeletingSession, setIsDeletingSession] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState(null)

  // Add loading state to sign-out button
  // Fix summary generation bug to apply loading state only to specific session

  // Update the sign-out button to include loading state
  const [isSigningOut, setIsSigningOut] = useState(false)

  // Fix summary generation bug - track loading state per session
  const [loadingSummaryId, setLoadingSummaryId] = useState(null)
  
  // Preparation Hub states
  const [preparationHubs, setPreparationHubs] = useState([])
  const [isLoadingPreparations, setIsLoadingPreparations] = useState(false)
  const [isPreparationModalOpen, setIsPreparationModalOpen] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  // Check for query parameters to display notifications
  useEffect(() => {
    // Check if we have an 'error' query parameter
    const searchParams = new URLSearchParams(window.location.search)
    const errorParam = searchParams.get("error")
    if (errorParam === "inactive-session") {
      setShowInactiveSessionAlert(true)
      // Clear the URL query parameter
      window.history.replaceState({}, document.title, window.location.pathname)
      // Auto-hide the alert after 5 seconds
      setTimeout(() => {
        setShowInactiveSessionAlert(false)
      }, 5000)
    }
  }, [])

  const fetchUserData = useCallback(async () => {
    setIsLoading(true)
    const data = await getUserDetails()
    if (data.user) {
      setUser(data.user)
      setIsLoading(false)
    }
  }, [])

  const fetchAgentStore = useCallback(async () => {
    try {
      const response = await fetch("/api/get_aiagent")
      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`)
      }
      const data = await response.json()
      if (data.success && data.agents) {
        setAgents(data.agents)
      } else {
        toast({
          title: "Failed to fetch agents",
          description: data.error || "Could not retrieve agent data. Please try again later.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching agents:", error)
      toast({
        title: "Failed to fetch agents",
        description: "Could not retrieve agent data. Please try again later.",
        variant: "destructive",
      })
    }
  }, [toast])

  // Fetch preparation hubs
  const fetchPreparationHubs = useCallback(async () => {
    setIsLoadingPreparations(true)
    try {
      const response = await fetch("/api/get_preparation")
      if (!response.ok) {
        throw new Error(`Failed to fetch preparation hubs: ${response.statusText}`)
      }
      const data = await response.json()
      setPreparationHubs(data)
    } catch (error) {
      console.error("Error fetching preparation hubs:", error)
      toast({
        title: "Error",
        description: "Failed to load preparation hubs.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingPreparations(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAgentStore()
    fetchUserData()
    fetchPreparationHubs()
  }, [fetchAgentStore, fetchUserData, fetchPreparationHubs])

  const handleDeleteDocument = async (documentId) => {
    setIsDeleting(true)
    setDeletingId(documentId)

    try {
      const result = await removeDocument(documentId)

      if (result.success) {
        // Update the documents list without a full refetch
        setUser((prevUser) => ({
          ...prevUser,
          documents: prevUser.documents.filter((doc) => doc.id !== documentId),
        }))

        toast({
          title: "Document deleted",
          description: "The document has been successfully deleted.",
          variant: "success",
        })
      } else if (result.error || result.failure) {
        console.error("Error deleting document:", result.error || result.failure)
        toast({
          title: "Failed to delete document",
          description: result.error || result.failure || "Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Exception while deleting document:", error)
      toast({
        title: "Error",
        description: "An error occurred while deleting the document.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    setIsDeleting(true)
    setDeletingId(templateId)

    try {
      const result = await deleteMeetingTemplate(templateId)

      if (result.success) {
        // Update the templates list without a full refetch
        setUser((prevUser) => ({
          ...prevUser,
          meetingTemplates: prevUser.meetingTemplates.filter((template) => template.id !== templateId),
        }))

        toast({
          title: "Template deleted",
          description: "The meeting template has been successfully deleted.",
          variant: "success",
        })
      } else if (result.failure) {
        console.error("Error deleting template:", result.failure)
        toast({
          title: "Failed to delete template",
          description: result.failure || "Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Exception while deleting template:", error)
      toast({
        title: "Error",
        description: "An error occurred while deleting the template.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  const handleDeleteSession = async (sessionId) => {
    setIsDeletingSession(true)
    setDeletingSessionId(sessionId)

    try {
      const result = await deleteSession(sessionId)

      if (result.success) {
        // Update the sessions list without a full refetch
        setUser((prevUser) => ({
          ...prevUser,
          sessions: prevUser.sessions.filter((session) => session.id !== sessionId),
        }))

        toast({
          title: "Session deleted",
          description: "The session has been successfully deleted.",
          variant: "success",
        })
      } else if (result.failure) {
        console.error("Error deleting session:", result.failure)
        toast({
          title: "Failed to delete session",
          description: result.failure || "Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Exception while deleting session:", error)
      toast({
        title: "Error",
        description: "An error occurred while deleting the session.",
        variant: "destructive",
      })
    } finally {
      setIsDeletingSession(false)
      setDeletingSessionId(null)
    }
  }

  const handleOpenSession = (sessionId) => {
    setIsOpeningSession(true)
    router.push(`/session/${sessionId}`)
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut()
  }

  const handleGenerateSummary = async (sessionId) => {
    setLoadingSummaryId(sessionId)
    try {
      const data = await getSummary(sessionId)
      if (data.summary) {
        setSelectedSessionSummary(data.summary)
        setIsSummaryModalOpen(true)
      } else if (data.failure) {
        console.error("Error generating summary:", data.failure)
        toast({
          title: "Failed to generate summary",
          description: data.failure || "Please try again.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Failed to generate summary",
          description: "Could not generate summary. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setLoadingSummaryId(null)
    }
  }

  const handleEditDocument = (document) => {
    setSelectedDocument(document)
    setIsEditDocumentModalOpen(true)
  }

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template)
    setIsEditTemplateModalOpen(true)
  }

  const handleViewPdf = (fileUrl) => {
    setSelectedPdfUrl(fileUrl)
    setIsPdfModalOpen(true)
  }

  const handleDocumentUploadSuccess = (newDocumentId) => {
    // Fetch just the new document and add it to the state
    const fetchNewDocument = async () => {
      const data = await getUserDetails()
      if (data.user && data.user.documents) {
        const newDocument = data.user.documents.find((doc) => doc.id === newDocumentId)
        if (newDocument) {
          setUser((prevUser) => ({
            ...prevUser,
            documents: [newDocument, ...prevUser.documents],
          }))
        }
      }
    }

    fetchNewDocument()
  }

  const handleDocumentUpdateSuccess = (updatedDocument) => {
    // Update the document in the state without a full refetch
    setUser((prevUser) => ({
      ...prevUser,
      documents: prevUser.documents.map((doc) => (doc.id === updatedDocument.id ? updatedDocument : doc)),
    }))

    toast({
      title: "Document updated",
      description: "The document has been successfully updated.",
      variant: "success",
    })
  }

  const handleDeletePreparation = async (preparationId) => {
    try {
      const response = await fetch(`/api/preparation?id=${preparationId}`, {
        method: "DELETE",
      })
      
      if (response.ok) {
        setPreparationHubs(prev => prev.filter(prep => prep.id !== preparationId))
        
        toast({
          title: "Success",
          description: "Preparation hub deleted successfully.",
          variant: "success",
        })
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete preparation hub")
      }
    } catch (error) {
      console.error("Error deleting preparation:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete preparation hub.",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePreparation = async (preparationId, updateData) => {
    try {
      const response = await fetch(`/api/preparation?id=${preparationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })
      
      if (response.ok) {
        const updatedPreparation = await response.json()
        setPreparationHubs(prev => 
          prev.map(prep => prep.id === preparationId ? updatedPreparation : prep)
        )
        
        toast({
          title: "Success",
          description: "Preparation hub updated successfully.",
          variant: "success",
        })
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to update preparation hub")
      }
    } catch (error) {
      console.error("Error updating preparation:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update preparation hub.",
        variant: "destructive",
      })
    }
  }

  // State for question editor modal
  const [isQuestionEditorOpen, setIsQuestionEditorOpen] = useState(false)
  const [selectedPreparation, setSelectedPreparation] = useState(null)
  
  const handleEditPreparationQuestions = (preparationId) => {
    const preparation = preparationHubs.find(prep => prep.id === preparationId)
    if (!preparation) {
      toast({
        title: "Error",
        description: "Preparation hub not found",
        variant: "destructive",
      })
      return
    }

    setSelectedPreparation(preparation)
    setIsQuestionEditorOpen(true)
  }
  
  const handleSaveQuestions = async (preparationId, questions) => {
    try {
      const response = await fetch("/api/preparation/update-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preparationId, questions }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update questions")
      }

      const data = await response.json()
      
      // Update the preparation hub in state with new questions
      setPreparationHubs(prev => 
        prev.map(prep => 
          prep.id === preparationId 
            ? { ...prep, questionsAndAnswers: questions, questionsCount: questions.length } 
            : prep
        )
      )
      
      toast({
        title: "Success",
        description: "Questions saved successfully",
        variant: "success",
      })
    } catch (error) {
      console.error("Error saving questions:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save questions.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleCreatePreparationHub = async (formData) => {
    try {
      const response = await fetch("/api/preparation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create preparation hub")
      }

      const newPreparationHub = await response.json()
      
      // Add the new preparation hub to state
      setPreparationHubs((prev) => [newPreparationHub, ...prev])
      
      toast({
        title: "Success",
        description: "Preparation hub created successfully.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error creating preparation hub:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create preparation hub.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleGenerateQuestions = async (preparationId) => {
    try {
      toast({
        title: "Generating questions",
        description: "Please wait while we generate questions...",
      })
      
      const response = await fetch("/api/preparation/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preparationId, count: 5 }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate questions")
      }

      const data = await response.json()
      
      // Update the preparation hub in state with new questions
      setPreparationHubs(prev => 
        prev.map(prep => 
          prep.id === preparationId 
            ? { ...prep, questionsAndAnswers: data.questions, questionsCount: data.questions.length } 
            : prep
        )
      )
      
      toast({
        title: "Success",
        description: `Generated ${data.questions.length} questions successfully.`,
        variant: "success",
      })
    } catch (error) {
      console.error("Error generating questions:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate questions.",
        variant: "destructive",
      })
    }
  }

  const handleTemplateUpdateSuccess = (updatedTemplate) => {
    // Update the template in the state without a full refetch
    setUser((prevUser) => ({
      ...prevUser,
      meetingTemplates: prevUser.meetingTemplates.map((template) =>
        template.id === updatedTemplate.id ? updatedTemplate : template,
      ),
    }))

    toast({
      title: "Template updated",
      description: "The meeting template has been successfully updated.",
      variant: "success",
    })
  }

  if (status === "loading" || isLoading) {
    return <FullscreenLoader />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Loading overlays */}
      <LoadingOverlay message="Opening session" isOpen={isOpeningSession} />

      {/* Inactive Session Alert */}
      {showInactiveSessionAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md shadow-md z-50 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        This session is no longer active. Please create a new session.
        <button
          onClick={() => setShowInactiveSessionAlert(false)}
          className="ml-3 text-amber-800 hover:text-amber-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      )}

      {/* Sidebar */}
      <div className="flex h-full w-64 flex-col border-r bg-white px-4 py-6 shadow-sm">
        {/* User Info */}
        <div className="mb-6 flex flex-col items-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div className="text-center">
            <p className="font-medium">{session?.user?.name}</p>
            <p className="text-sm text-gray-500">{session?.user?.email}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mb-6 space-y-1">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "sessions" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Calendar className="mr-2 h-5 w-5" />
            Sessions
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "documents" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FileText className="mr-2 h-5 w-5" />
            Documents
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "templates" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Folder className="mr-2 h-5 w-5" />
            Meeting Templates
          </button>
          <button
            onClick={() => setActiveTab("agentStore")}
            className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "agentStore" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Store className="mr-2 h-5 w-5" />
            Agent Store
          </button>
          <button
            onClick={() => setActiveTab("preparation")}
            className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "preparation" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <GraduationCap className="mr-2 h-5 w-5" />
            Preparation Hub
          </button>
        </nav>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-auto inline-flex w-full items-center justify-start rounded-md px-4 py-2 text-sm font-medium text-red-600 hover:bg-gray-50 transition-colors"
        >
          {isSigningOut ? (
            <>
              <div className="mr-2 h-4 w-4 border-2 border-t-transparent border-red-600 rounded-full animate-spin"></div>
              Signing Out...
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </>
          )}
        </button>
      </div>

      {/* Dashboard Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
          <h1 className="text-lg font-medium">
            {activeTab === "sessions" && "Meeting Sessions"}
            {activeTab === "documents" && "Document Library"}
            {activeTab === "templates" && "Meeting Templates"}
            {activeTab === "agentStore" && "Agent Store"}
            {activeTab === "preparation" && "Preparation Hub"}
          </h1>
          {(activeTab !== "agentStore" && activeTab !== "preparation") && (
            <button
              onClick={() => {
                if (activeTab === "sessions") setIsSessionModalOpen(true)
                if (activeTab === "documents") setIsDocumentModalOpen(true)
                if (activeTab === "templates") setIsTemplateModalOpen(true)
              }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <span className="flex items-center">
                <Plus className="mr-1 h-4 w-4" />
                {activeTab === "sessions" && "Start New Session"}
                {activeTab === "documents" && "Upload Document"}
                {activeTab === "templates" && "Create Template"}
              </span>
            </button>
          )}
        </header>

        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {/* Sessions Tab */}
          {activeTab === "sessions" && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-medium">Available Sessions</h2>
                <p className="text-sm text-gray-500">A list of your Meeting Sessions.</p>
              </div>

              {user?.sessions?.length > 0 ? (
                <div className="w-full border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[2fr_2fr_1fr_2fr] gap-4 p-2 text-gray-700 font-medium bg-gray-100">
                    <span>Name</span>
                    <span>Description</span>
                    <span>Date</span>
                    <span>Actions</span>
                  </div>

                  {[...user.sessions]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((session) => (
                      <div
                        key={session.id}
                        className="grid grid-cols-[2fr_2fr_1fr_2fr] gap-4 p-2 border-b items-center"
                      >
                        {/* Session Name with active indicator */}
                        <div className="flex items-center">
                          {session.isActive && (
                            <span className="h-2.5 w-2.5 rounded-full bg-green-500 mr-2 flex-shrink-0" 
                                  title="Active session"></span>
                          )}
                          <span className="truncate text-blue-600">
                            {session.name || `Session #${session.id}`}
                            {session.isActive && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                                Active
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Session Description (truncated) */}
                        <span className="truncate text-gray-600">{session.description || "No description"}</span>

                        {/* Creation Date */}
                        <span className="text-xs text-gray-500">
                          {new Date(session.createdAt).toLocaleString(undefined, {
                            dateStyle: 'short', 
                            timeStyle: 'short'
                          })}
                        </span>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {session.isActive && (
                            <SpinnerButton
                              onClick={() => handleOpenSession(session.id)}
                              className="rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 transition-colors"
                              loadingText="Opening..."
                              loading={isOpeningSession}
                              size="sm"
                              variant="secondary"
                            >
                              Open Session
                            </SpinnerButton>
                          )}
                          <SpinnerButton
                            onClick={() => handleGenerateSummary(session.id)}
                            className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                            loading={loadingSummaryId === session.id}
                            loadingText="Loading..."
                            size="sm"
                            variant="outline"
                          >
                            Summary
                          </SpinnerButton>
                          {!session.isActive && (
                            <SpinnerButton
                              onClick={() => handleDeleteSession(session.id)}
                              disabled={isDeletingSession && deletingSessionId === session.id}
                              loading={isDeletingSession && deletingSessionId === session.id}
                              loadingText="Deleting..."
                              className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                              size="sm"
                              variant="outline"
                            >
                              <Trash className="inline-block h-3 w-3" />
                            </SpinnerButton>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
                  <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-1 text-lg font-medium">No sessions available</h3>
                  <p className="text-gray-500">Create a new session to get started.</p>
                  <button
                    onClick={() => setIsSessionModalOpen(true)}
                    className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="mr-1 inline-block h-4 w-4" />
                    Start New Session
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === "documents" && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-medium">Document Library</h2>
                <p className="text-sm text-gray-500">Manage your uploaded documents.</p>
              </div>

              {user?.documents?.length > 0 ? (
                <div className="w-full border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr_2fr] gap-4 p-2 text-gray-700 font-medium bg-gray-100">
                    <span>Title</span>
                    <span>Description</span>
                    <span>Date</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>

                  {user.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="grid grid-cols-[1.5fr_2fr_1fr_1fr_2fr] gap-4 p-2 border-b items-center"
                    >
                      {/* Document Title */}
                      <span className="truncate text-blue-600">{doc.title || "Untitled Document"}</span>

                      {/* Document Description (truncated) */}
                      <span className="truncate text-gray-600">{doc.description || "No description"}</span>

                      {/* Upload Date */}
                      <span className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString()}</span>

                      {/* Status Badge */}
                      <div className="text-left">
                        <span
                          className={`text-xs px-2 py-1 rounded-full inline-block ${
                            doc.isEmbedded ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {doc.isEmbedded ? "Embedded" : "Not Embedded"}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewPdf(doc.fileUrl)}
                          className="rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          <Edit className="mr-1 inline-block h-3 w-3" />

                        </button>
                        <SpinnerButton
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={isDeleting && deletingId === doc.id}
                          loading={isDeleting && deletingId === doc.id}
                          loadingText="Deleting..."
                          className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                          size="sm"
                          variant="outline"
                        >
                          <Trash className="inline-block h-3 w-3" />

                        </SpinnerButton>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
                  <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-1 text-lg font-medium">No documents available</h3>
                  <p className="text-gray-500">Upload a document to get started.</p>
                  <button
                    onClick={() => setIsDocumentModalOpen(true)}
                    className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="mr-1 inline-block h-4 w-4" />
                    Upload Document
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-medium">Meeting Templates</h2>
                <p className="text-sm text-gray-500">Create and manage your meeting templates.</p>
              </div>

              {user?.meetingTemplates?.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {user.meetingTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="rounded-lg border bg-white p-5 shadow-sm transition-shadow hover:shadow-md h-[280px] flex flex-col"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-medium text-blue-600 truncate max-w-[200px]">{template.purpose}</h3>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 whitespace-nowrap ml-2">
                          {template.duration}
                        </span>
                      </div>
                      <div className="mb-3 flex-grow overflow-hidden">
                        <p className="text-sm font-medium text-gray-700">Goal:</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{template.goal}</p>

                        {template.additionalInfo && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700">Additional Info:</p>
                            <p className="text-sm text-gray-600 line-clamp-2">{template.additionalInfo}</p>
                          </div>
                        )}

                        {template.documents && template.documents.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700">Documents:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {template.documents.map((doc) => (
                                <span key={doc.id} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                                  {doc.title || "Untitled"}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-auto">
                        <div className="text-xs text-gray-500 mb-2">
                          Created: {new Date(template.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex justify-between">
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            <Edit className="mr-1 inline-block h-3 w-3" />
                            Edit
                          </button>
                          <SpinnerButton
                            onClick={() => handleDeleteTemplate(template.id)}
                            disabled={isDeleting && deletingId === template.id}
                            loading={isDeleting && deletingId === template.id}
                            loadingText="Deleting..."
                            className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                            size="sm"
                            variant="outline"
                          >
                            <Trash className="mr-1 inline-block h-3 w-3" />
                            Delete
                          </SpinnerButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
                  <Folder className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-1 text-lg font-medium">No templates available</h3>
                  <p className="text-gray-500">Create a meeting template to get started.</p>
                  <button
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="mr-1 inline-block h-4 w-4" />
                    Create Template
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Preparation Hub Tab */}
          {activeTab === "preparation" && (
            <div>
              <div className="mb-6">
                <div className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 p-6 shadow-md">
                  <h2 className="mb-2 text-xl font-bold text-white">Preparation Hub</h2>
                  <p className="mb-4 text-blue-100">
                    Generate questions and answers based on meeting templates to prepare for interviews, tests, or any important events.
                  </p>
                  <button
                    onClick={() => setIsPreparationModalOpen(true)}
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Create New Preparation
                  </button>
                </div>
              </div>

              {isLoadingPreparations ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin h-8 w-8 border-t-2 border-blue-500 border-r-2 rounded-full"></div>
                  <span className="ml-2 text-gray-600">Loading preparation hubs...</span>
                </div>
              ) : (
                <PreparationHubTable 
                  preparations={preparationHubs} 
                  onDelete={handleDeletePreparation}
                  onEdit={handleEditPreparationQuestions}
                  onGenerate={handleGenerateQuestions}
                  meetingTemplates={user?.meetingTemplates || []}
                  documents={user?.documents || []}
                  onUpdate={handleUpdatePreparation}
                />
              )}
            </div>
          )}

          {/* Agent Store Tab */}
          {activeTab === "agentStore" && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-medium">Agent Store</h2>
                <p className="text-sm text-gray-500">Browse available AI agents for your meetings.</p>
              </div>

              {agents && agents.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="rounded-lg border bg-white p-5 shadow-sm transition-shadow hover:shadow-md h-[250px] flex flex-col"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-medium text-blue-600 truncate max-w-[200px]">{agent.name}</h3>
                        {agent.imageUrl && (
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 ml-2 flex-shrink-0">
                            <img
                              src={agent.imageUrl || "/placeholder.svg"}
                              alt={agent.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <p className="mb-3 text-sm text-gray-600 line-clamp-3 flex-grow">{agent.description}</p>

                      <div className="mt-auto">
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Tools Used:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.tool && agent.tool.map((tool, index) => (
                              <span key={index} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
                  <Store className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-1 text-lg font-medium">No agents available</h3>
                  <p className="text-gray-500">Check back later for new AI agents.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        userId={user?.id}
        agents={agents}
        onSuccess={fetchUserData}
      />

      <DocumentUploadModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        onSuccess={handleDocumentUploadSuccess}
      />

      <CreateTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        userId={user?.id}
        documents={user?.documents || []}
        onSuccess={fetchUserData}
      />
      
      <PreparationHubModal
        isOpen={isPreparationModalOpen}
        onClose={() => setIsPreparationModalOpen(false)}
        meetingTemplates={user?.meetingTemplates || []}
        documents={user?.documents || []}
        onSubmit={handleCreatePreparationHub}
      />

      {/* Question Answer Editor Modal */}
      {isQuestionEditorOpen && selectedPreparation && (
        <QuestionAnswerEditor
          isOpen={isQuestionEditorOpen}
          onClose={() => setIsQuestionEditorOpen(false)}
          preparationId={selectedPreparation.id}
          preparationName={selectedPreparation.name}
          questions={selectedPreparation.questionsAndAnswers || []}
          onSave={handleSaveQuestions}
        />
      )}

      {/* Summary Modal */}
      {isSummaryModalOpen && selectedSessionSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-medium">Session Summary</h2>
              <button
                onClick={() => setIsSummaryModalOpen(false)}
                className="rounded-full p-1 hover:bg-gray-200 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <h3 className="font-medium text-blue-600">Summary:</h3>
              <div className="space-y-2 mt-2 max-h-[60vh] overflow-y-auto pr-2">
                {selectedSessionSummary
                  .split("-")
                  .filter((line) => line.trim() !== "") // Remove empty lines
                  .map((line, index) => (
                    <div key={index} className="flex items-start">
                      <span className="mr-2 text-blue-600">•</span>
                      <p className="text-sm text-gray-700">{line.trim()}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      <PDFViewerModal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} pdfUrl={selectedPdfUrl} />

      {/* Add these modals at the end of the component */}
      <EditDocumentModal
        isOpen={isEditDocumentModalOpen}
        onClose={() => setIsEditDocumentModalOpen(false)}
        document={selectedDocument}
        onSuccess={handleDocumentUpdateSuccess}
      />

      <EditTemplateModal
        isOpen={isEditTemplateModalOpen}
        onClose={() => setIsEditTemplateModalOpen(false)}
        template={selectedTemplate}
        onSuccess={handleTemplateUpdateSuccess}
      />

      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}

