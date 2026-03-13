import { NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
  },
})

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get("image")

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename - detect if it's WebP or PNG based on the uploaded file
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    
    // Detect file type from the uploaded file
    const isWebP = file.type === 'image/webp' || file.name.endsWith('.webp')
    const extension = isWebP ? 'webp' : 'png'
    const contentType = isWebP ? 'image/webp' : 'image/png'
    
    const filename = `screenshots/screenshot_${timestamp}_${randomId}.${extension}`

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME_IMAGE,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    }

    const command = new PutObjectCommand(uploadParams)
    await s3Client.send(command)

    // Generate S3 URL
    const bucketName = process.env.AWS_S3_BUCKET_NAME_IMAGE
    const region = process.env.AWS_S3_BUCKET_REGION
    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${filename}`

    return NextResponse.json({
      imageUrl: s3Url,
      message: `Image uploaded successfully to S3 in ${extension.toUpperCase()} format`,
      format: extension,
      size: `${(buffer.length / 1024).toFixed(1)} KB`
    })

  } catch (error) {
    console.error("S3 Upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload image to S3" },
      { status: 500 }
    )
  }
}
