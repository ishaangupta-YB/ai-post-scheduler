import * as React from "react"
import type { IconSvgElement } from "@hugeicons/react"

export enum ChannelTypeEnum {
  TWITTER = "TWITTER",
  INSTAGRAM = "INSTAGRAM",
  THREADS = "THREADS",
  FACEBOOK = "FACEBOOK",
  LINKEDIN = "LINKEDIN",
  BLUESKY = "BLUESKY",
  YOUTUBE = "YOUTUBE",
  TIKTOK = "TIKTOK",
}

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
)

const ThreadsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16.945 11.205c-.328-3.056-2.585-4.887-5.068-4.887-2.625 0-4.908 1.83-4.908 5.673 0 3.868 2.235 5.727 4.965 5.727 1.884 0 3.125-.873 3.738-1.996h-1.921c-.495.496-1.077.727-1.817.727-1.408 0-2.454-.833-2.645-2.443h6.353c.18-1.503.228-2.316.228-2.668 0-.044-.002-.088-.005-.132v-.002zM12.012 8.01c1.238 0 2.112.83 2.308 2.164H9.72c.24-1.34 1.152-2.164 2.292-2.164zm4.246 3.144c.005.122.01.265.01.43v.015c0 .17-.005.358-.02.565h-4.23c.123 1.157 1.05 1.874 2.19 1.874.848 0 1.554-.42 1.954-.972h1.662c-.733 1.258-2.02 2.215-3.616 2.215-2.046 0-3.83-1.41-3.83-4.408 0-3.03 1.76-4.425 3.847-4.425 1.986 0 3.837 1.488 3.837 4.093v.012h-1.804z" />
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
)

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

const BlueskyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 10.8c-1.087-2.114-5.713-6.347-8.96-7.62-5.182-2.036-2.592 5.86-1.503 7.502.827 1.248 3.568 2.68 5.706 2.919-4.832.221-7.234 2.116-4.996 6.084 1.782 3.16 6.068 3.23 9.753.84v-.002c3.684 2.391 7.971 2.32 9.753-.84 2.238-3.968-.164-5.863-4.996-6.084 2.138-.24 4.88-1.671 5.706-2.919 1.089-1.642 3.68-9.538-1.503-7.502-3.247 1.273-7.873 5.506-8.96 7.62z" />
  </svg>
)

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

const TiktokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.78-1.15 5.54-3.33 7.37-1.92 1.62-4.55 2.28-6.99 1.88-2.67-.42-5.14-2.22-6.18-4.7-1.07-2.51-.74-5.54.85-7.75 1.55-2.16 4.18-3.4 6.88-3.41v4.06c-1.52.06-3.08.73-4.04 1.95-.91 1.15-1.14 2.76-.62 4.12.49 1.35 1.66 2.45 3.06 2.8 1.43.37 3.06.1 4.26-.82 1.13-.86 1.77-2.29 1.78-3.72.03-5.82.01-11.64.02-17.46h4.25z" />
  </svg>
)

export const CHANNEL_TYPE_ICONS: Record<ChannelTypeEnum, React.ComponentType<{ className?: string }>> = {
  [ChannelTypeEnum.TWITTER]:   TwitterIcon,
  [ChannelTypeEnum.LINKEDIN]:  LinkedinIcon,
  [ChannelTypeEnum.INSTAGRAM]: InstagramIcon,
  [ChannelTypeEnum.THREADS]:   ThreadsIcon,
  [ChannelTypeEnum.FACEBOOK]:  FacebookIcon,
  [ChannelTypeEnum.BLUESKY]:   BlueskyIcon,
  [ChannelTypeEnum.YOUTUBE]:   YoutubeIcon,
  [ChannelTypeEnum.TIKTOK]:    TiktokIcon,
}

export const CHANNEL_TYPE_URLS: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.TWITTER]:   "https://x.com",
  [ChannelTypeEnum.LINKEDIN]:  "https://linkedin.com",
  [ChannelTypeEnum.INSTAGRAM]: "https://instagram.com",
  [ChannelTypeEnum.THREADS]:   "https://threads.com",
  [ChannelTypeEnum.FACEBOOK]:  "https://facebook.com",
  [ChannelTypeEnum.BLUESKY]:   "https://bluesky.com",
  [ChannelTypeEnum.YOUTUBE]:   "https://youtube.com",
  [ChannelTypeEnum.TIKTOK]:    "https://tiktok.com",
}

export const CHANNEL_TYPE_LABELS: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.TWITTER]:   "Twitter / X",
  [ChannelTypeEnum.LINKEDIN]:  "LinkedIn",
  [ChannelTypeEnum.INSTAGRAM]: "Instagram",
  [ChannelTypeEnum.THREADS]:   "Threads",
  [ChannelTypeEnum.FACEBOOK]:  "Facebook",
  [ChannelTypeEnum.BLUESKY]:   "Bluesky",
  [ChannelTypeEnum.YOUTUBE]:   "YouTube",
  [ChannelTypeEnum.TIKTOK]:    "TikTok",
}

// Official brand colors for chip/badge/icon tinting.
export const CHANNEL_TYPE_COLORS: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.TWITTER]:   "#000000",
  [ChannelTypeEnum.LINKEDIN]:  "#2867B2",
  [ChannelTypeEnum.INSTAGRAM]: "#E4405F",
  [ChannelTypeEnum.THREADS]:   "#000000",
  [ChannelTypeEnum.FACEBOOK]:  "#1877F2",
  [ChannelTypeEnum.BLUESKY]:   "#1285FE",
  [ChannelTypeEnum.YOUTUBE]:   "#FF0000",
  [ChannelTypeEnum.TIKTOK]:    "#000000",
}

// Hard per-post character ceilings enforced by each network.
export const CHANNEL_TYPE_CHAR_LIMITS: Record<ChannelTypeEnum, number> = {
  [ChannelTypeEnum.TWITTER]:   280,
  [ChannelTypeEnum.LINKEDIN]:  3000,
  [ChannelTypeEnum.INSTAGRAM]: 2200,
  [ChannelTypeEnum.THREADS]:   500,
  [ChannelTypeEnum.FACEBOOK]:  63206,
  [ChannelTypeEnum.BLUESKY]:   300,
  [ChannelTypeEnum.YOUTUBE]:   100,
  [ChannelTypeEnum.TIKTOK]:    100,
}

export type Channel = {
  type: ChannelTypeEnum
  label: string
  url: string
  brandColor: string
  charLimit: number
  icon: React.ComponentType<{ className?: string }>
}

// Canonical ordered list — use this anywhere you need to iterate every supported network
// (channel pickers, settings rows, posting matrix, etc.).
export const CHANNELS: readonly Channel[] = [
  ChannelTypeEnum.TWITTER,
  ChannelTypeEnum.LINKEDIN,
  ChannelTypeEnum.INSTAGRAM,
  ChannelTypeEnum.THREADS,
  ChannelTypeEnum.FACEBOOK,
  ChannelTypeEnum.BLUESKY,
  ChannelTypeEnum.YOUTUBE,
  ChannelTypeEnum.TIKTOK,
].map((type) => ({
  type,
  label: CHANNEL_TYPE_LABELS[type],
  url: CHANNEL_TYPE_URLS[type],
  brandColor: CHANNEL_TYPE_COLORS[type],
  charLimit: CHANNEL_TYPE_CHAR_LIMITS[type],
  icon: CHANNEL_TYPE_ICONS[type],
}))

export function getChannelUrl(type: ChannelTypeEnum | undefined): string {
  if (!type) return ""
  return CHANNEL_TYPE_URLS[type]
}

export function getChannelIcon(
  type: ChannelTypeEnum | undefined,
): React.ComponentType<{ className?: string }> | null {
  if (!type) return null
  return CHANNEL_TYPE_ICONS[type]
}

export function getChannelLabel(type: ChannelTypeEnum | undefined): string {
  if (!type) return ""
  return CHANNEL_TYPE_LABELS[type]
}

export function getChannelColor(type: ChannelTypeEnum | undefined): string {
  if (!type) return ""
  return CHANNEL_TYPE_COLORS[type]
}

export function getChannelCharLimit(
  type: ChannelTypeEnum | undefined,
): number {
  if (!type) return 0
  return CHANNEL_TYPE_CHAR_LIMITS[type]
}
