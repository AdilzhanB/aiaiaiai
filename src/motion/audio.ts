import type { HazardKind } from '../types'

let ctx: AudioContext | null = null
let lastSpeech = ''
let lastSpeechAt = 0

function getCtx() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  freq: number,
  duration: number,
  gain = 0.04,
  type: OscillatorType = 'sine',
  delay = 0
) {
  const c = getCtx()
  const oscillator = c.createOscillator()
  const amp = c.createGain()

  oscillator.type = type
  oscillator.frequency.value = freq

  amp.gain.setValueAtTime(0.0001, c.currentTime + delay)
  amp.gain.exponentialRampToValueAtTime(gain, c.currentTime + delay + 0.01)
  amp.gain.exponentialRampToValueAtTime(
    0.0001,
    c.currentTime + delay + duration
  )

  oscillator.connect(amp)
  amp.connect(c.destination)
  oscillator.start(c.currentTime + delay)
  oscillator.stop(c.currentTime + delay + duration + 0.03)
}

const cueTones: Record<HazardKind, number> = {
  boost: 760,
  duck: 190,
  left: 360,
  right: 520,
  shield: 620
}

export const audio = {
  unlock() {
    getCtx()
  },

  cue(kind: HazardKind) {
    const f = cueTones[kind]
    tone(f, 0.08, 0.025, 'triangle')
    tone(f * 1.25, 0.1, 0.02, 'sine', 0.06)
  },

  success(combo = 0) {
    const lift = Math.min(combo, 10) * 14
    tone(520 + lift, 0.09, 0.034, 'triangle')
    tone(780 + lift, 0.13, 0.026, 'sine', 0.06)
  },

  miss() {
    tone(150, 0.18, 0.045, 'sawtooth')
    tone(92, 0.22, 0.03, 'square', 0.08)
  },

  launch() {
    tone(300, 0.12, 0.03, 'triangle')
    tone(440, 0.12, 0.03, 'triangle', 0.12)
    tone(690, 0.2, 0.035, 'triangle', 0.24)
  },

  finish() {
    tone(520, 0.15, 0.03, 'sine')
    tone(680, 0.16, 0.03, 'sine', 0.14)
    tone(880, 0.3, 0.035, 'sine', 0.28)
  },

  count(value: number) {
    tone(value === 1 ? 720 : 420 + value * 60, 0.1, 0.03, 'triangle')
  },

  say(text: string, force = false) {
    if (!('speechSynthesis' in window)) return

    const now = performance.now()
    if (!force && text === lastSpeech && now - lastSpeechAt < 2500) return

    lastSpeech = text
    lastSpeechAt = now

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ru-RU'
    utterance.rate = 1.08
    utterance.pitch = 1
    utterance.volume = 0.82
    window.speechSynthesis.speak(utterance)
  },

  stopVoice() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }
}
