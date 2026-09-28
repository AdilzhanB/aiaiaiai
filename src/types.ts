export type Gesture = 'neutral' | 'boost' | 'duck' | 'left' | 'right' | 'shield'

export type ActionGesture = Exclude<Gesture, 'neutral'>

export type GamePhase =
  | 'landing'
  | 'calibrating'
  | 'training'
  | 'ready'
  | 'countdown'
  | 'playing'
  | 'finished'
  | 'leaderboard'

export type HazardKind = ActionGesture

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
  headY: number
  headOffsetX: number
  chestY: number
  ready: boolean
}

export interface MotionMetrics {
  centerX: number
  shoulderWidth: number
  shoulderY: number
  headY: number
  leftWristAbove: boolean
  rightWristAbove: boolean
  boostHeight: number
  crouchDepth: number
  wristDistance: number
  wristChestDistance: number
  shoulderShift: number
  headLean: number
  lateralShift: number
  quality: number
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

export interface LeaderboardEntry {
  id?: number
  name: string
  score: number
  accuracy: number
  max_combo: number
  created_at?: string
}
