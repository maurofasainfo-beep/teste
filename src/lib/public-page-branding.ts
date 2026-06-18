export const PUBLIC_PAGE_ASSET_BUCKET = "company-public-assets";
export const PUBLIC_PAGE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PUBLIC_PAGE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const DEFAULT_PUBLIC_PAGE_BRANDING = {
  primaryColor: "#4169E1",
  secondaryColor: "#1BAF9C",
  backgroundUrl: null as string | null,
  overlayColor: "#0F172A",
  textColor: "#FFFFFF",
};

export type PublicPageBranding = typeof DEFAULT_PUBLIC_PAGE_BRANDING;

type BrandingInput = {
  public_page_primary_color?: string | null;
  public_page_secondary_color?: string | null;
  public_page_position_card_background_url?: string | null;
  public_page_position_card_overlay_color?: string | null;
  public_page_position_card_text_color?: string | null;
};

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;
const PUBLIC_ASSET_PATH =
  `/storage/v1/object/public/${PUBLIC_PAGE_ASSET_BUCKET}/`;

export function getPublicPageBackgroundPath(companyId: string) {
  return `${companyId}/customer-page/position-card-background`;
}

export function getSafeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string" || !HEX_COLOR_PATTERN.test(value.trim())) {
    return fallback;
  }

  return value.trim().toUpperCase();
}

export function getSafePublicAssetUrl(
  value: unknown,
  options: { allowBlob?: boolean } = {},
) {
  if (typeof value !== "string" || value.trim() === "") return null;

  try {
    const url = new URL(value);

    if (options.allowBlob && url.protocol === "blob:") {
      return url.toString();
    }

    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      !url.pathname.includes(PUBLIC_ASSET_PATH)
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function normalizePublicPageBranding(
  input: BrandingInput,
): PublicPageBranding {
  return {
    primaryColor: getSafeHexColor(
      input.public_page_primary_color,
      DEFAULT_PUBLIC_PAGE_BRANDING.primaryColor,
    ),
    secondaryColor: getSafeHexColor(
      input.public_page_secondary_color,
      DEFAULT_PUBLIC_PAGE_BRANDING.secondaryColor,
    ),
    backgroundUrl: getSafePublicAssetUrl(
      input.public_page_position_card_background_url,
    ),
    overlayColor: getSafeHexColor(
      input.public_page_position_card_overlay_color,
      DEFAULT_PUBLIC_PAGE_BRANDING.overlayColor,
    ),
    textColor: getSafeHexColor(
      input.public_page_position_card_text_color,
      DEFAULT_PUBLIC_PAGE_BRANDING.textColor,
    ),
  };
}

export function buildPositionCardBackground(
  branding: PublicPageBranding,
  previewUrl?: string | null,
) {
  const backgroundUrl = getSafePublicAssetUrl(
    previewUrl ?? branding.backgroundUrl,
    { allowBlob: true },
  );

  if (!backgroundUrl) {
    return `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`;
  }

  const escapedUrl = backgroundUrl.replace(/["\\\n\r\f]/g, (character) =>
    encodeURIComponent(character),
  );
  const overlay = hexToRgba(branding.overlayColor, 0.35);

  return `linear-gradient(${overlay}, ${overlay}), url("${escapedUrl}")`;
}

export function hexToRgba(hexColor: string, alpha: number) {
  const safeColor = getSafeHexColor(
    hexColor,
    DEFAULT_PUBLIC_PAGE_BRANDING.overlayColor,
  );
  const red = Number.parseInt(safeColor.slice(1, 3), 16);
  const green = Number.parseInt(safeColor.slice(3, 5), 16);
  const blue = Number.parseInt(safeColor.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
