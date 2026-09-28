import { create } from 'zustand'
import type { Calibration, GamePhase, Gesture, Hazard, MotionDecision } from './types'

interface MotionState {
  phase: GamePhase
  gesture: Gesture
  gestureConfidence: number
  decision: MotionDecision | null
  calibration: Calibration
  cameraReady: boolean
  cameraError: string
  modelReady: boolean
  score: number
  combo: number
  maxCombo: number
  hits: number
  misses: number
  integrity: number
  secondsLeft: number
  hazards: Hazard[]
  flash: 'good' | 'bad' | ''
  playerName: string
  voiceEnabled: boolean
  setPhase: (phase: GamePhase) => void
  setMotion: (decision: MotionDecision) => void
  setCalibration: (calibration: Calibration) => void
  setCamera: (ready: boolean, error?: string) => void
  setModelReady: (ready: boolean) => void
  setSecondsLeft: (value: number) => void
  setPlayerName: (name: string) => void
  toggleVoice: () => void
  addHazard: (hazard: Hazard) => void
  resolveHazard: (id: string, success: boolean, points?: number) => void
  clearHazards: () => void
  resetRun: () => void
  resetCalibration: () => void
  clearFlash: () => void
}

const emptyCalibration: Calibration = {
  centerX: 0.5,
  shoulderWidth: 0.22,
  shoulderY: 0.34,
  headY: 0.2,
  headOffsetX: 0,
  chestY: 0.53,
  ready: false
}

export const useMotionStore = create<MotionState>((set) => ({
  phase: 'landing',
  gesture: 'neutral',
  gestureConfidence: 0,
  decision: null,
  calibration: emptyCalibration,
  cameraReady: false,
  cameraError: '',
  modelReady: false,
  score: 0,
  combo: 0,
  maxCombo: 0,
  hits: 0,
  misses: 0,
  integrity: 100,
  secondsLeft: 60,
  hazards: [],
  flash: '',
  playerName: '',
  voiceEnabled: true,

  setPhase: (phase) => set({ phase }),

  setMotion: (decision) =>
    set({
      decision,
      gesture: decision.gesture,
      gestureConfidence: decision.confidence
    }),

  setCalibration: (calibration) => set({ calibration }),

  setCamera: (cameraReady, cameraError = '') =>
    set({ cameraReady, cameraError }),

  setModelReady: (modelReady) => set({ modelReady }),

  setSecondsLeft: (secondsLeft) => set({ secondsLeft }),

  setPlayerName: (playerName) => set({ playerName }),

  toggleVoice: () => set((s) => ({ voiceEnabled: !s.voiceEnabled })),

  addHazard: (hazard) =>
    set((s) => ({ hazards: [...s.hazards, hazard] })),

  resolveHazard: (id, success, points = 120) =>
    set((s) => {
      const combo = success ? s.combo + 1 : 0
      const bonus = success ? Math.min(combo * 12, 180) : 0
      const integrity = success
        ? Math.min(100, s.integrity + (combo % 5 === 0 ? 3 : 0))
        : Math.max(0, s.integrity - 18)

      return {
        hazards: s.hazards.map((h) =>
          h.id === id ? { ...h, resolved: true } : h
        ),
        score: success ? s.score + points + bonus : s.score,
        combo,
        maxCombo: Math.max(s.maxCombo, combo),
        hits: s.hits + (success ? 1 : 0),
        misses: s.misses + (success ? 0 : 1),
        integrity,
        flash: success ? 'good' : 'bad'
      }
    }),

  clearHazards: () => set({ hazards: [] }),

  resetRun: () =>
    set({
      score: 0,
      combo: 0,
      maxCombo: 0,
      hits: 0,
      misses: 0,
      integrity: 100,
      secondsLeft: 60,
      hazards: [],
      flash: '',
      gesture: 'neutral',
      gestureConfidence: 0,
      decision: null
    }),

  resetCalibration: () =>
    set({
      calibration: emptyCalibration,
      gesture: 'neutral',
      gestureConfidence: 0,
      decision: null
    }),

  clearFlash: () => set({ flash: '' })
}))
