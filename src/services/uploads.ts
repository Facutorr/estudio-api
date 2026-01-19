import crypto from 'node:crypto'
import path from 'node:path'

// Lazy load cloudinary to avoid validation errors on startup
let cloudinaryInstance: any = null

async function getCloudinary() {
  if (cloudinaryInstance) return cloudinaryInstance
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary not configured')
  }
  
  const { v2 } = await import('cloudinary')
  v2.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  })
  cloudinaryInstance = v2
  return v2
}

const allowedMime = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif']
])

export function assertAllowedImage(mime: string) {
  const ext = allowedMime.get(mime)
  if (!ext) throw new Error('Tipo de imagen no permitido')
  return ext
}

export function makeSafeFilename(ext: string) {
  const id = crypto.randomBytes(16).toString('hex')
  const safeExt = ext.startsWith('.') ? ext : `.${ext}`
  return `${id}${safeExt}`
}

export function safeJoinUploads(uploadsDir: string, filename: string) {
  const p = path.join(uploadsDir, filename)
  const normalizedBase = path.resolve(uploadsDir) + path.sep
  const normalizedPath = path.resolve(p)
  if (!normalizedPath.startsWith(normalizedBase)) throw new Error('Ruta inválida')
  return normalizedPath
}

export function isUploadsUrl(url: string) {
  return url.startsWith('/uploads/')
}

export function filenameFromUploadsUrl(url: string) {
  if (!isUploadsUrl(url)) return ''
  const filename = url.slice('/uploads/'.length)
  // hard stop on weird paths
  if (!filename || filename.includes('/') || filename.includes('\\')) return ''
  return filename
}

// Upload image to Cloudinary
export async function uploadToCloudinary(buffer: Buffer, folder = 'estudio-juridico'): Promise<string> {
  const cloudinary = await getCloudinary()
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error: any, result: any) => {
        if (error) reject(error)
        else if (result) resolve(result.secure_url)
        else reject(new Error('No result from Cloudinary'))
      }
    ).end(buffer)
  })
}

// Delete image from Cloudinary by public_id
export async function deleteFromCloudinary(url: string): Promise<void> {
  const cloudinary = await getCloudinary()
  // Extract public_id from URL
  // URL format: https://res.cloudinary.com/xxx/image/upload/v123/folder/filename.ext
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/)
  if (match?.[1]) {
    await cloudinary.uploader.destroy(match[1])
  }
}

export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com')
}