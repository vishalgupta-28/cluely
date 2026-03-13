import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get sessionId from query params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get session details
    const sessionDetails = await prisma.session.findUnique({
      where: {
        id: sessionId,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        templateId: true,
        isActive: true,
      },
    })

    if (!sessionDetails) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    
    // Check if the session is active
    if (!sessionDetails.isActive) {
      return NextResponse.json({ error: "This session is no longer active. Please create a new session." }, { status: 403 })
    }

    // If session has a template, get template details
    let templateInfo = null
    if (sessionDetails.templateId) {
      const template = await prisma.meetingTemplate.findUnique({
        where: { id: sessionDetails.templateId },
        select: {
          purpose: true,
          goal: true,
          additionalInfo: true,
          duration: true,
        },
      })

      if (template) {
        templateInfo = {
          purpose: template.purpose,
          goal: template.goal,
          additionalInfo: template.additionalInfo,
          duration: template.duration,
        }
      }
    }

    return NextResponse.json({
      ...sessionDetails,
      templateInfo,
    })
  } catch (error) {
    console.error("Error fetching session details:", error)
    return NextResponse.json({ error: "Failed to fetch session details" }, { status: 500 })
  }
}

