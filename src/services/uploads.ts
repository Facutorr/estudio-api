import crypto from 'node:crypto'
import path from 'node:path'
import { v2 as cloudinary } from 'cloudinary'
import { config } from '../config.js'

// Configure Cloudinary
if (config.cloudinaryUrl) {
  cloudinary.config({ url: config.cloudinaryUrl })
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
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) reject(error)
        else if (result) resolve(result.secure_url)
        else reject(new Error('No result from Cloudinary'))
      }
    ).end(buffer)
  })
}

// Delete image from Cloudinary by public_id
export async function deleteFromCloudinary(url: string): Promise<void> {
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