import {
  BlueskyIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  NewTwitterIcon,
  ThreadsIcon,
  TiktokIcon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons"
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

export const CHANNEL_TYPE_ICONS: Record<ChannelTypeEnum, IconSvgElement> = {
  [ChannelTypeEnum.TWITTER]:   NewTwitterIcon,
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
  icon: IconSvgElement
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
): IconSvgElement | null {
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
