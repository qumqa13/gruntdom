/**
 * Central place for product-level constants that used to be sprinkled
 * across components as magic strings.
 *
 * Anything user-visible (contact email, support URL) lives here so
 * marketing copy never gets out of sync, and a future "real address"
 * swap is a single-line change.
 */

export const SITE = {
  name: "Plotview",
  /** Public contact address shown in mailto: links and CTAs. */
  contactEmail: "kontakt@plotview.example",
  /** Default subject prefix for incoming inquiries. */
  contactSubjectPrefix: "[Plotview] ",
} as const;

export function mailtoLink(subject?: string): string {
  const subjectPart = subject
    ? `?subject=${encodeURIComponent(SITE.contactSubjectPrefix + subject)}`
    : "";
  return `mailto:${SITE.contactEmail}${subjectPart}`;
}

/**
 * Rate-limit defaults for the visualization endpoint.
 * Override via env vars in production. See `.env.example`.
 */
export const RATE_LIMIT = {
  /** Max generations per IP per rolling hour. */
  generationsPerHour: Number(
    process.env.RATE_LIMIT_GENERATIONS_PER_HOUR ?? "10",
  ),
  /** Window length in ms. */
  windowMs: 60 * 60 * 1000,
} as const;
