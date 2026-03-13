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

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get preparation hubs with all details including questionsAndAnswers array
    const preparation_details = await prisma.preparationHub.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        name: true,
        additionalDetails: true,
        questionsAndAnswers: true,
        meetingTemplateId: true,
        createdAt: true,
        meetingTemplate: {
          select: {
            purpose: true,
            goal: true,
          }
        },
        document:true
      }
    })

    // No need for null check on findMany - it returns empty array if nothing found
    
    // Add questionsCount to each preparation hub
    const preparationsWithCounts = preparation_details.map(prep => ({
      ...prep,
      questionsCount: Array.isArray(prep.questionsAndAnswers) ? prep.questionsAndAnswers.length : 0
    }))
    



    return NextResponse.json(preparationsWithCounts)
  } catch (error) {
    console.error("Error fetching session details:", error)
    return NextResponse.json({ error: "Failed to fetch session details" }, { status: 500 })
  }
}

