import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email().max(254),
  phone: z.string().trim().max(40).optional().default(''),
  password: z.string().min(8).max(200)
})

export const pageViewSchema = z.object({
  path: z.string().trim().min(1).max(200),
  referrer: z.string().trim().max(500).optional()
})

export const adminAnalyticsOverviewQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30)
})

export const adminAnalyticsRecentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100)
})

export const contactCreateSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().max(254),
  phone: z.string().min(6).max(40).optional(),
  pais: z.string().min(1).max(80).optional().default('Uruguay'),
  departamento: z.string().min(1).max(80).optional().default('Montevideo'),
  subject: z.string().min(1).max(120).default('consulta-general'),
  subcategoria: z.string().min(1).max(80).optional(),
  subcategoriaDetalle: z.string().max(200).optional(),
  message: z.string().min(10).max(8000),
  acceptPrivacy: z.literal(true)
})

export const reviewCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  rating: z.coerce.number().int().min(1).max(5),
  message: z.string().trim().min(10).max(2000),
  acceptPrivacy: z.literal(true)
})

export const reviewsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12)
})

export const intakeSuggestQuerySchema = z.object({
  text: z.string().trim().min(1).max(500)
})

export const adminReviewsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
  limit: z.coerce.number().int().min(1).max(500).default(200)
})

const httpsUrl = z
  .string()
  .max(500)
  .url()
  .refine((u) => u.startsWith('https://'), 'URL debe ser https://')

const httpOrHttpsUrl = z
  .string()
  .max(500)
  .url()
  .refine((u) => u.startsWith('http://') || u.startsWith('https://'), 'URL inválida')

const relativeUploadsUrl = z
  .string()
  .max(500)
  .refine((u) => u.startsWith('/uploads/'), 'URL inválida')

const mediaUrl = z.union([httpOrHttpsUrl, relativeUploadsUrl])

export const newsSourceCreateSchema = z.object({
  name: z.string().min(1).max(120),
  rssUrl: httpsUrl
})

export const newsPostCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(50_000).default(''),
  imageUrl: z.union([httpOrHttpsUrl, relativeUploadsUrl, z.literal('')]).optional(),
  featured: z.boolean().optional().default(false),
  template: z.enum(['simple', 'hero', 'gallery']).optional(),
  media: z
    .array(mediaUrl)
    .max(12)
    .optional(),
  link: z.union([httpOrHttpsUrl, z.literal('')]).optional(),
  publishedAt: z.string().datetime().optional()
}).superRefine((val, ctx) => {
  if (val.featured) {
    const hasCover = Boolean(val.imageUrl && val.imageUrl.trim() !== '') || (val.media?.length ?? 0) > 0
    if (!hasCover) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La publicación del carrusel requiere una imagen (subida o URL)'
      })
    }
  }
})

export const homeHeroSlidesUpsertSchema = z
  .object({
    slides: z
      .array(
        z.object({
          imageUrl: mediaUrl,
          title: z.string().max(120).default(''),
          text: z.string().max(240).default(''),
          link: z.union([httpOrHttpsUrl, z.literal('')]).default(''),
          enabled: z.boolean().default(true)
        })
      )
      .max(7)
  })
  .strict()

export const newsCarouselSlidesUpsertSchema = z
  .object({
    slides: z
      .array(
        z.object({
          imageUrl: mediaUrl,
          title: z.string().max(200).default(''),
          text: z.string().max(300).default(''),
          link: z.union([httpOrHttpsUrl, z.literal('')]).default(''),
          enabled: z.boolean().default(true)
        })
      )
      .max(12)
  })
  .strict()
