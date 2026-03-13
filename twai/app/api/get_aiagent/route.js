import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Fetch all AI agents from the database
    const agents = await prisma.agent.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      agents: agents
    });
  } catch (error) {
    console.error("Error fetching AI agents:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch AI agents"
      },
      { status: 500 }
    );
  }
}