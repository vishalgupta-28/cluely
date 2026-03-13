import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { preparationId, questions } = body

    if (!preparationId || !questions) {
      return NextResponse.json({ error: "Preparation ID and questions are required" }, { status: 400 })
    }

    // Get the user's email from the session
    const userEmail = session.user.email

    // Get the user record
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Find the preparation hub and verify it belongs to the user
    const preparationHub = await prisma.preparationHub.findFirst({
      where: {
        id: preparationId,
        userId: user.id,
      },
    })

    if (!preparationHub) {
      return NextResponse.json({ error: "Preparation hub not found or access denied" }, { status: 404 })
    }

    // Clean up the questions data to ensure it's compatible with the database model
    // Remove any unnecessary fields and ensure proper structure
    const cleanedQuestions = questions.map(q => ({
      question: q.question,
      answer: q.answer
    }))

    // Update the preparation hub with the updated questions
    const updatedPreparationHub = await prisma.preparationHub.update({
      where: {
        id: preparationId,
      },
      data: {
        questionsAndAnswers: cleanedQuestions,
      },
    })

    return NextResponse.json({
      success: true,
      preparationHub: updatedPreparationHub,
    })
  } catch (error) {
    console.error("Error updating questions:", error)
    return NextResponse.json({ error: "Failed to update questions" }, { status: 500 })
  }
}
