import { Bot, CalendarCheck, FileText, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { LoadingDots } from "@/components/ui/loadingDots"

export function DashboardSkeleton() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Skeleton */}
      <div className="flex h-full w-64 flex-col border-r bg-white px-4 py-6 shadow-sm">
        {/* User Info Skeleton */}
        <div className="mb-6 flex flex-col items-center space-y-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="text-center">
            <Skeleton className="h-4 w-32 mx-auto mb-2" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        </div>

        {/* Navigation Tabs Skeleton */}
        <nav className="mb-6 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </nav>

        <Skeleton className="mt-auto h-10 w-full rounded-md" />
      </div>

      {/* Main Content Skeleton */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-36" />
        </header>

        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          <div className="mb-4">
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-lg border bg-white p-5 shadow-sm h-[200px] flex flex-col">
                <div className="mb-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <div className="flex-grow">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="mt-auto flex justify-between">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

export function SessionSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 w-full p-2 grid grid-cols-1 lg:grid-cols-12 gap-2 max-h-screen overflow-hidden">
        {/* Left Section */}
        <div className="lg:col-span-4 xl:col-span-4 overflow-hidden flex flex-col max-h-[calc(100vh-16px)]">
          <div className="h-full flex flex-col gap-2">
            {/* Screen Capture Card */}
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <div className="p-2">
                <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden mb-2 shimmer" />
                <div className="flex flex-col sm:flex-row gap-1">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </div>

            {/* Conversation Card */}
            <div className="border rounded-lg shadow-sm flex-1 overflow-hidden">
              <div className="p-2 pt-8 flex-1 h-full flex flex-col">
                <div className="flex-1 space-y-3 py-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                      <Skeleton className={`h-14 ${i % 2 === 0 ? "w-3/4 ml-auto" : "w-2/3"} rounded-lg`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section */}
        <div className="lg:col-span-5 xl:col-span-5 overflow-hidden flex flex-col max-h-[calc(100vh-16px)]">
          <div className="border rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-3 pb-1 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-1">
                <Bot className="h-4 w-4" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>

            <div className="p-3 pt-2 flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <div className="h-full flex items-center justify-center flex-col">
                  <Bot className="h-12 w-12 text-muted animate-pulse mb-3" />
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </div>

            <div className="p-3 pt-1 border-t">
              <Skeleton className="h-24 w-full mb-2" />
              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="lg:col-span-3 xl:col-span-3 overflow-hidden flex flex-col max-h-[calc(100vh-16px)]">
          <div className="h-full flex flex-col gap-2">
            {/* AI Tools Card */}
            <div className="border rounded-lg shadow-sm">
              <div className="p-2 pb-1 flex flex-row items-center justify-between">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-7 w-16" />
              </div>
              <div className="p-2 pt-0">
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <Skeleton key={i} className="h-7" />
                  ))}
                </div>
              </div>
            </div>

            {/* Citations Section */}
            <div className="border rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="p-2 pb-1">
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="p-2 pt-0 flex-1 overflow-hidden">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Skeleton className="h-24 w-24 rounded-full mx-auto mb-3" />
                    <Skeleton className="h-4 w-40 mx-auto mb-2" />
                    <Skeleton className="h-3 w-32 mx-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export function FullscreenLoader() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <div className="relative mb-8">
        <div className="size-20 rounded-full bg-blue-100 flex items-center justify-center relative">
          <Bot className="size-10 text-jarwiz-600" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-jarwiz-500 rounded-full p-1.5">
          <CalendarCheck className="size-4 text-white" />
        </div>
        <span className="absolute inset-0 rounded-full border-2 border-jarwiz-400 animate-ping-slow"></span>
      </div>

      <h1 className="text-2xl font-bold mb-2">
        Jarwiz<span className="text-jarwiz-500">AI</span>
      </h1>
      <p className="text-gray-500 mb-4">Loading your intelligent meeting assistant</p>

      <div className="flex items-center gap-8 mt-6">
        <div className="flex flex-col items-center">
          <FileText className="mb-2 size-6 text-gray-400" />
          <div className="h-1 w-16 bg-gray-200 rounded overflow-hidden">
            <div className="h-full bg-jarwiz-500 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <Users className="mb-2 size-6 text-gray-400" />
          <div className="h-1 w-16 bg-gray-200 rounded overflow-hidden">
            <div className="h-full w-1/3 bg-jarwiz-500 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <Bot className="mb-2 size-6 text-gray-400" />
          <div className="h-1 w-16 bg-gray-200 rounded overflow-hidden">
            <div className="h-full w-2/3 bg-jarwiz-500 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LoadingOverlay({ message = "Loading", isOpen = true }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center max-w-sm w-full mx-4">
        <div className="size-12 rounded-full border-4 border-jarwiz-100 border-t-jarwiz-500 animate-spin mb-4"></div>
        <h3 className="text-lg font-medium mb-1">{message}</h3>
        <p className="text-sm text-gray-500">
          Please wait
          <LoadingDots />
        </p>
      </div>
    </div>
  )
}

export function ButtonLoading() {
  return (
    <div className="inline-flex">
      <div className="size-4 border-2 border-t-transparent border-jarwiz-500 rounded-full animate-spin mr-2"></div>
      <span>Loading...</span>
    </div>
  )
}

