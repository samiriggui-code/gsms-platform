import { z } from 'zod';

const roleEnum = z.enum([
  'ADMIN',
  'LEAD_ASSESSOR',
  'ASSESSOR',
  'REVIEWER',
  'STAKEHOLDER',
]);

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  organizationName: z.string().min(1).max(255),
  organizationSlug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, digits, hyphens only'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const userPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: roleEnum,
  hasAvatar: z.boolean(),
});

export const authResponseSchema = z.object({
  token: z.string(),
  user: userPublicSchema,
  organization: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }),
});

export const meResponseSchema = userPublicSchema.extend({
  organization: authResponseSchema.shape.organization,
});

export const meUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

export const meAvatarUploadSchema = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  contentBase64: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type MeUpdateInput = z.infer<typeof meUpdateSchema>;
