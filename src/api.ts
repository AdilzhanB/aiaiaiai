import type { LeaderboardEntry } from './types'

const base = import.meta.env.VITE_API_URL ?? ''

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const r = await fetch(`${base}/api/leaderboard`)
    if (!r.ok) return []
    return await r.json()
  } catch {
    return []
  }
}

export async function submitScore(entry: LeaderboardEntry) {
  const r = await fetch(`${base}/api/leaderboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  })
  if (!r.ok) throw new Error('score submit failed')
  return r.json()
}
