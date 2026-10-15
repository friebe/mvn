/** One user-defined desk ritual (local). Water stays the built-in default. */

import type { Moment } from './exercises'
import { CUSTOM_RITUAL_KEY } from './storage-keys'

export const CUSTOM_RITUAL_ID = 'custom-ritual'

export const CUSTOM_RITUAL_TITLE_MAX = 48
export const CUSTOM_RITUAL_PROMPT_MAX = 160

export interface CustomRitualData {
  title: string
  prompt: string
}

function normalize(data: CustomRitualData): CustomRitualData | null {
  const title = data.title.trim()
  const prompt = data.prompt.trim()
  if (!title || !prompt) return null
  return {
    title: title.slice(0, CUSTOM_RITUAL_TITLE_MAX),
    prompt: prompt.slice(0, CUSTOM_RITUAL_PROMPT_MAX),
  }
}

export function readCustomRitual(): CustomRitualData | null {
  try {
    const raw = localStorage.getItem(CUSTOM_RITUAL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const title = (parsed as CustomRitualData).title
    const prompt = (parsed as CustomRitualData).prompt
    if (typeof title !== 'string' || typeof prompt !== 'string') return null
    return normalize({ title, prompt })
  } catch {
    return null
  }
}

export function writeCustomRitual(data: CustomRitualData | null): boolean {
  const next = data == null ? null : normalize(data)
  try {
    if (next == null) {
      localStorage.removeItem(CUSTOM_RITUAL_KEY)
    } else {
      localStorage.setItem(CUSTOM_RITUAL_KEY, JSON.stringify(next))
    }
    return true
  } catch {
    return false
  }
}

export function isCustomRitualConfigured(): boolean {
  return readCustomRitual() != null
}

export function customRitualMoment(data: CustomRitualData): Moment {
  return {
    id: CUSTOM_RITUAL_ID,
    kind: 'desk',
    part: 'desk',
    posture: 'either',
    depth: 'quick',
    title: data.title,
    prompt: data.prompt,
  }
}

export function getCustomRitualMoment(): Moment | undefined {
  const data = readCustomRitual()
  return data ? customRitualMoment(data) : undefined
}
