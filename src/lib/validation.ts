import { z } from "zod";
import { normalizeBrazilianPhone } from "@/lib/phone";
import { normalizeDigits, slugify } from "@/lib/utils";

const phoneSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    try {
      return normalizeBrazilianPhone(value);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message:
          error instanceof Error ? error.message : "Informe um telefone valido.",
      });

      return z.NEVER;
    }
  });

export const companySchema = z.object({
  cnpj: z
    .string()
    .transform(normalizeDigits)
    .refine((value) => value.length === 14, "CNPJ deve ter 14 digitos."),
  corporate_name: z.string().trim().min(2).max(160),
  trade_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: phoneSchema.optional().or(z.literal("")),
  public_queue_slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .transform(slugify)
    .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)),
});

export const updateCompanySchema = companySchema.extend({
  status: z.enum(["active", "inactive"]),
});

export const platformCreateCompanySchema = companySchema.extend({
  admin_name: z.string().trim().min(2).max(120),
  admin_email: z.string().trim().email().max(160),
  admin_password: z.string().min(8).max(72),
});

export const platformUpdateCompanySchema = updateCompanySchema.extend({
  company_id: z.string().uuid(),
});

export const platformCreateUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  role: z.enum(["owner", "admin", "support"]),
  password: z.string().min(8).max(72),
});

export const platformUpdateUserSchema = z.object({
  platform_profile_id: z.string().uuid(),
  role: z.enum(["owner", "admin", "support"]),
  status: z.enum(["active", "inactive"]),
});

export const resetClientUserAccessSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(8).max(72),
});

export const onboardingSchema = companySchema.extend({
  admin_name: z.string().trim().min(2).max(120),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  role: z.enum(["admin", "employee"]),
  password: z.string().min(8).max(72),
});

export const updateUserSchema = z.object({
  profile_id: z.string().uuid(),
  role: z.enum(["admin", "employee"]),
  status: z.enum(["active", "inactive"]),
});

export const queueEntrySchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: phoneSchema,
  party_size: z.coerce
    .number()
    .int("Informe um numero inteiro.")
    .min(1, "A quantidade minima e 1.")
    .max(20, "A quantidade maxima padrao e 20."),
});

export const queueStatusSchema = z.object({
  queue_entry_id: z.string().uuid(),
});

export const publicCustomerTokenSchema = z.object({
  customer_token: z.string().trim().regex(/^[a-f0-9]{64}$/),
});

export const queueSettingsSchema = z.object({
  released_link_expiration_minutes: z.coerce
    .number()
    .int("Informe um numero inteiro.")
    .min(1, "O minimo e 1 minuto.")
    .max(60, "O maximo e 60 minutos."),
});

export const notificationChannelSchema = z.object({
  notification_channel: z.enum([
    "none",
    "simulated",
    "whatsapp_extension",
    "evolution_api",
    "sms",
  ]),
});

export const createWhatsAppDeviceSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome.").max(80),
});

export const whatsappDeviceIdSchema = z.object({
  device_id: z.string().uuid(),
});

export const extensionAuthValidateSchema = z.object({
  token: z.string().trim().min(20).max(256),
  signing_secret: z.string().trim().min(20).max(256).optional(),
  extension_version: z.string().trim().max(40).optional(),
  browser_name: z.string().trim().max(80).optional(),
  user_agent: z.string().trim().max(512).optional(),
});

export const extensionAckSchema = z.object({
  status: z.enum(["processing", "sent", "failed"]),
  reservation_id: z.string().uuid(),
  reservation_token: z.string().trim().min(32).max(256),
  provider_response: z.record(z.string(), z.unknown()).optional(),
  error_message: z.string().trim().max(500).optional(),
  retryable: z.boolean().optional(),
});

export const extensionHeartbeatSchema = z.object({
  whatsapp_status: z
    .enum([
      "connected",
      "disconnected",
      "loading",
      "qr_required",
      "error",
      "sending",
      "syncing",
    ])
    .default("disconnected"),
  connected_phone: phoneSchema.optional().or(z.literal("")),
  extension_version: z.string().trim().max(40).optional(),
  browser_name: z.string().trim().max(80).optional(),
  user_agent: z.string().trim().max(512).optional(),
  local_queue_size: z.coerce.number().int().min(0).max(1000).optional(),
  last_error: z.string().trim().max(500).optional().or(z.literal("")),
});

export const templateSchema = z.object({
  template_id: z.string().uuid().optional().or(z.literal("")),
  type: z.enum(["queue_created", "customer_released"]),
  title: z.string().trim().min(2).max(120),
  content: z.string().trim().min(10).max(1200),
  active: z.enum(["on", "off"]).optional(),
});
