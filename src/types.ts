export type Gesture = 'neutral' | 'jump' | 'duck' | 'left' | 'right' | 'shield'

export type GamePhase = 'landing' | 'camera' | 'calibrating' | 'ready' | 'playing' | 'finished'

export type HazardKind = 'jump' | 'duck' | 'left' | 'right' | 'shield'

export interface Point {
  x: number
  y: number
  z?: number
  visibility?: number
}

export interface PoseFrame {
  points: Point[]
  timestamp: number
}

export interface Calibration {
  centerX: number
  shoulderWidth: number
  shoulderY: number
  hipY: number
  bodyHeight: number
  ready: boolean
}

export interface MotionMetrics {
  centerX: number
  shoulderWidth: number
  wristsAbove: number
  leftWristAbove: boolean
  rightWristAbove: boolean
  kneeAngleLeft: number
  kneeAngleRight: number
  squatDepth: number
  wristDistance: number
  wristChestDistance: number
  confidence: number
}

export interface MotionDecision {
  gesture: Gesture
  confidence: number
  metrics: MotionMetrics
  feedback: string
}

export interface Hazard {
  id: string
  kind: HazardKind
  createdAt: number
  hitAt: number
  resolved: boolean
}

export interface GameStats {
  score: number
  combo: number
  maxCombo: number
  hits: number
  misses: number
  accuracy: number
  duration: number
}

export interface LeaderboardEntry {
  id?: number
  name: string
  score: number
  accuracy: number
  max_combo: number
  created_at?: string
}
