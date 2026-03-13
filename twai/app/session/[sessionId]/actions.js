"use server"

import { prisma } from "@/lib/prisma";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";


// Make ZOD checks here
export async function isValidSession({ sessionId }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return { failure: "not authenticated" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            sessions: {
                select: {
                    id: true,
                    conversation: true,
                    createdAt: true,
                    summary: true,
                    isActive: true,
                },
            },
        },
    });

    if (!user) {
        return { failure: "User not found" };
    }

    const foundSession = user.sessions.find((s) => s.id === sessionId);

    if (!foundSession) {
        return { failure: "Session not found" };
    }

    // Check if the session is active
    if (!foundSession.isActive) {
        return { failure: "This session is no longer active. Please create a new session." };
    }

    const found = await prisma.session.findUnique({
        where: { id: sessionId },
        select: {
            chat: true,
            conversation: true,
            template: true,
            description: true,
            name: true,
            documents: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    fileUrl: true,
                    isEmbedded: true,
                },
            },
            agents: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    tool: true,
                    imageUrl: true,
                },
            },
        },
    });

    return { 
        chat: found.chat, 
        conversation: found.conversation, 
        sessionDetails: found, 
        documents: found.documents,
        agents: found.agents
    };
}

export async function appendConversation({ sessionId, newMessages }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return { failure: "not authenticated" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            sessions: {
                select: {
                    id: true,
                    conversation: true,
                    createdAt: true,
                    summary: true,
                    isActive: true,
                },
            },
        },
    });

    if (!user) {
        return { failure: "User not found" };
    }

    const foundSession = user.sessions.find((s) => s.id === sessionId);

    if (!foundSession) {
        return { failure: "Session not found" };
    }

    // Check if the session is active
    if (!foundSession.isActive) {
        return { failure: "This session is no longer active. Please create a new session." };
    }

    await prisma.session.update({
        where: { id: sessionId },
        data: {
            conversation: [...foundSession.conversation, ...newMessages],
        },
    });

    return { success: foundSession };
}

export async function appendChat({ sessionId, newMessages }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return { failure: "Not authenticated" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            sessions: {
                select: {
                    id: true,
                    chat: true,
                    createdAt: true,
                    summary: true,
                    isActive: true,
                },
            },
        },
    });

    if (!user) {
        return { failure: "User not found" };
    }

    const foundSession = user.sessions.find((s) => s.id === sessionId);

    if (!foundSession) {
        return { failure: "Session not found" };
    }

    // Check if the session is active
    if (!foundSession.isActive) {
        return { failure: "This session is no longer active. Please create a new session." };
    }

    // Clone existing chat to avoid modifying state directly
    let updatedChat = [...foundSession.chat];

    newMessages.forEach((newMsg) => {
        const existingIndex = updatedChat.findIndex(
            (msg) => msg.id === newMsg.id && msg.sender === newMsg.sender
        );

        if (existingIndex !== -1) {
            // Update existing message's text
            updatedChat[existingIndex].text = newMsg.text;
        } else {
            // Append as a new message
            updatedChat.push(newMsg);
        }
    });

    await prisma.session.update({
        where: { id: sessionId },
        data: { chat: updatedChat },
    });

    return { success: foundSession };
}

export async function completeSession({ sessionId }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return { failure: "not authenticated" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            sessions: {
                select: {
                    id: true,
                    isActive: true,
                },
            },
        },
    });

    if (!user) {
        return { failure: "User not found" };
    }

    const foundSession = user.sessions.find((s) => s.id === sessionId);

    if (!foundSession) {
        return { failure: "Session not found" };
    }

    // Update the session to mark it as inactive
    await prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false },
    });

    return { success: true };
}

// export async function getToken(sessionId, mode) {
//     try{
//         if (mode !== "mic" && mode !== "capture") {
//             return { failure: "Invalid mode" };
//         }
//         const session = await getServerSession(authOptions);
    
//         if (!session) {
//             return { failure: "not authenticated" };
//         }
    
//         const user = await prisma.user.findUnique({
//             where: { email: session.user.email },
//             select: {
//                 sessions: {
//                     select: {
//                         id: true,
//                         conversation: true,
//                         createdAt: true,
//                         summary: true,
//                         micToken: true,
//                         captureToken: true,
//                     },
//                 },
//             },
//         });
    
//         if (!user) {
//             return { failure: "User not found" };
//         }
    
//         const foundSession = user.sessions.find((s) => s.id === sessionId);
    
//         if (!foundSession) {
//             return { failure: "Session not found" };
//         }
    
//         if (mode === "mic") {
//             if (!foundSession.micToken) {
//                 const response = await fetch("https://api.assemblyai.com/v2/realtime/token", {
//                     method: "POST",
//                     headers: {
//                         "Authorization": process.env.ASSEMBLYAI_API_KEY,
//                         "Content-Type": "application/json"
//                     },
//                     body: JSON.stringify({
//                         "expires_in": 3600,
//                     }),
//                 });
    
//                 if (!response.ok) {
//                     return { failure: "Failed to get token" };
//                 }
//                 const data = await response.json();
//                 await prisma.session.update({
//                     where: { id: sessionId },
//                     data: { micToken: data.token },
//                 });
//                 return { success: data.token };
//             }
//             else {
//                 return { success: foundSession.micToken }
//             };
//         }
//         if(mode === "capture") {
//             if (!foundSession.captureToken) {
//                 const response = await fetch("https://api.assemblyai.com/v2/realtime/token", {
//                     method: "POST",
//                     headers: {
//                         "Authorization": process.env.ASSEMBLYAI_API_KEY,
//                         "Content-Type": "application/json"
//                     },
//                     body: JSON.stringify({
//                         "expires_in": 3600,
//                     }),
//                 });
    
//                 if (!response.ok) {
//                     return { failure: "Failed to get token" };
//                 }
//                 const data = await response.json();
//                 await prisma.session.update({
//                     where: { id: sessionId },
//                     data: { captureToken: data.token },
//                 });
//                 return { success: data.token };
//             }
//             else {
//                 return { success: foundSession.captureToken }
//             };
//         }
//     }
//     catch (error) {
//         console.error("Error getting token: ", error);
//         return { failure: "Error getting token" };
//     }
    


// }








