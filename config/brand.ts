/**
 * Central brand / tenant configuration.
 *
 * A new owner cloning this repo as a template should edit THIS file (and the
 * environment variables it reads) rather than hunting for hardcoded strings in
 * source. Everything here used to be scattered across pages, API routes, and
 * components. See docs/PORTABILITY.md for the remaining (data-level) items that
 * still need to be parameterised before this is a fully generic template.
 */
export const brand = {
  /** Full product name — used in <title> and primary headers. */
  productName: 'Cyborg VA Portal',
  /** Short product name — used in compact headers (e.g. login). */
  shortName: 'Cyborg VA',
  /** The operating company / tenant this deployment serves. */
  companyName: 'Funnel Futurist',
  /** Short descriptor shown under the product name. */
  tagline: 'Team Portal',
  /** Where VAs send invoices. Surfaced in chat, offboarding, and the VA form. */
  billingEmail: 'accounting@joburn.com',
  /** Founder / stakeholder names shown in offboarding notifications. */
  founders: ['John Coburn', 'Phoenix Bohannon'],
  /**
   * Hours offset east of UTC for "work hours" copy and week-boundary math.
   * Philippine Time (PHT) is UTC+8. Changing this does NOT retroactively move
   * stored week_start keys — see lib/constants.ts (TIMEZONE_OFFSET_HOURS).
   */
  timezoneOffsetHours: 8,
  timezoneLabel: 'PHT',
  /**
   * Public site URL used as the redirect base for auth emails when
   * NEXT_PUBLIC_SITE_URL is not set. Override via env in any real deployment.
   */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ff-team-onboarding.vercel.app',
} as const

/** `${productName} — ${companyName}`, the canonical document title. */
export const fullTitle = `${brand.productName} — ${brand.companyName}`
