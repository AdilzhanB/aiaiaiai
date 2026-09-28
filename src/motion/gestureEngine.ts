import type {
  Calibration,
  HazardKind,
  MotionDecision,
  MotionMetrics,
  Point,
  PoseFrame
} from '../types'

const IDX = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftWrist: 15,
  rightWrist: 16
} as const

const clamp = (v: number, lo = 0, hi = 1) =>
  Math.max(lo, Math.min(hi, v))

const dist = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y)

const mid = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2
})

const visible = (p: Point | undefined, threshold = 0.35) =>
  !!p && (p.visibility ?? 1) > threshold

export function frameQuality(points: Point[]) {
  const ids = [0, 11, 12, 15, 16]
  const vals = ids.map((i) => points[i]?.visibility ?? 0)
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function calibrationFromFrames(frames: PoseFrame[]): Calibration {
  const rows = frames
    .filter((frame) => frameQuality(frame.points) > 0.48)
    .map((frame) => {
      const p = frame.points
      const nose = p[IDX.nose]
      const ls = p[IDX.leftShoulder]
      const rs = p[IDX.rightShoulder]

      if (![nose, ls, rs].every((point) => visible(point))) return null

      const shoulder = mid(ls, rs)
      const shoulderWidth = Math.max(dist(ls, rs), 0.08)

      return {
        centerX: shoulder.x,
        shoulderWidth,
        shoulderY: shoulder.y,
        headY: nose.y,
        headOffsetX: (nose.x - shoulder.x) / shoulderWidth,
        chestY: shoulder.y + shoulderWidth * 0.86
      }
    })
    .filter(Boolean) as Omit<Calibration, 'ready'>[]

  if (rows.length < 10) {
    return {
      centerX: 0.5,
      shoulderWidth: 0.22,
      shoulderY: 0.34,
      headY: 0.2,
      headOffsetX: 0,
      chestY: 0.53,
      ready: false
    }
  }

  const avg = (key: keyof Omit<Calibration, 'ready'>) =>
    rows.reduce((sum, row) => sum + row[key], 0) / rows.length

  return {
    centerX: avg('centerX'),
    shoulderWidth: avg('shoulderWidth'),
    shoulderY: avg('shoulderY'),
    headY: avg('headY'),
    headOffsetX: avg('headOffsetX'),
    chestY: avg('chestY'),
    ready: true
  }
}

export function analyzePose(points: Point[], c: Calibration): MotionDecision {
  const nose = points[IDX.nose]
  const ls = points[IDX.leftShoulder]
  const rs = points[IDX.rightShoulder]
  const lw = points[IDX.leftWrist]
  const rw = points[IDX.rightWrist]
  const quality = frameQuality(points)

  if (![nose, ls, rs, lw, rw].every((point) => visible(point))) {
    const metrics: MotionMetrics = {
      centerX: 0.5,
      shoulderWidth: 0.2,
      shoulderY: 0.35,
      headY: 0.2,
      leftWristAbove: false,
      rightWristAbove: false,
      boostHeight: 0,
      crouchDepth: 0,
      wristDistance: 2,
      wristChestDistance: 2,
      shoulderShift: 0,
      headLean: 0,
      lateralShift: 0,
      quality
    }

    return {
      gesture: 'neutral',
      confidence: 0,
      metrics,
      feedback: 'Покажи камере голову, плечи и обе кисти.'
    }
  }

  const shoulder = mid(ls, rs)
  const shoulderWidth = Math.max(dist(ls, rs), 0.08)
  const centerX = shoulder.x
  const leftWristAbove = lw.y < shoulder.y - shoulderWidth * 0.18
  const rightWristAbove = rw.y < shoulder.y - shoulderWidth * 0.18

  const boostHeight =
    ((shoulder.y - lw.y) + (shoulder.y - rw.y)) /
    (2 * shoulderWidth)

  const crouchDepth =
    (((shoulder.y - c.shoulderY) + (nose.y - c.headY)) / 2) /
    Math.max(c.shoulderWidth, 0.08)

  const chest: Point = {
    x: shoulder.x,
    y: shoulder.y + shoulderWidth * 0.86
  }

  const wristMid = mid(lw, rw)
  const wristDistance = dist(lw, rw) / shoulderWidth
  const wristChestDistance = dist(wristMid, chest) / shoulderWidth

  const shoulderShift =
    (centerX - c.centerX) / Math.max(c.shoulderWidth, 0.08)

  const currentHeadOffset =
    (nose.x - shoulder.x) / shoulderWidth

  const headLean = currentHeadOffset - c.headOffsetX

  // Natural dodge: both whole-body translation and a visible upper-body/head lean count.
  // Head lean gets more weight because users naturally dodge by leaning, not by sliding
  // both shoulders horizontally while keeping the head centered.
  const lateralShift =
    shoulderShift * 0.42 +
    headLean * 0.78

  const shieldScore =
    clamp((0.72 - wristDistance) / 0.42) *
    clamp((1.15 - wristChestDistance) / 0.75)

  const boostScore =
    Number(leftWristAbove && rightWristAbove) *
    clamp((boostHeight - 0.18) / 0.62)

  const duckScore = clamp((crouchDepth - 0.18) / 0.48)

  // Easier, more natural dodge thresholds. A modest lean should register,
  // while calibration keeps neutral head tilt from becoming a false dodge.
  const leftScore = clamp((-lateralShift - 0.10) / 0.30)
  const rightScore = clamp((lateralShift - 0.10) / 0.30)

  const candidates = [
    {
      gesture: 'shield' as const,
      score: shieldScore,
      text: 'Щит замкнут.'
    },
    {
      gesture: 'boost' as const,
      score: boostScore,
      text: 'Импульс вверх активирован.'
    },
    {
      gesture: 'duck' as const,
      score: duckScore,
      text: 'Низкая стойка зафиксирована.'
    },
    {
      gesture: 'left' as const,
      score: leftScore,
      text: 'Уклон влево зафиксирован.'
    },
    {
      gesture: 'right' as const,
      score: rightScore,
      text: 'Уклон вправо зафиксирован.'
    }
  ].sort((a, b) => b.score - a.score)

  const best = candidates[0]
  const confidence = best.score * quality

  const metrics: MotionMetrics = {
    centerX,
    shoulderWidth,
    shoulderY: shoulder.y,
    headY: nose.y,
    leftWristAbove,
    rightWristAbove,
    boostHeight,
    crouchDepth,
    wristDistance,
    wristChestDistance,
    shoulderShift,
    headLean,
    lateralShift,
    quality
  }

  if (best.score < 0.36) {
    return {
      gesture: 'neutral',
      confidence: Math.min(0.32, quality * 0.32),
      metrics,
      feedback: 'Нейтральная стойка. Жду следующий импульс.'
    }
  }

  return {
    gesture: best.gesture,
    confidence,
    metrics,
    feedback: best.text
  }
}

export function coachForHazard(
  expected: HazardKind,
  decision: MotionDecision,
  calibration: Calibration
) {
  const m = decision.metrics

  if (m.quality < 0.45) {
    return 'Покажи камере лицо, плечи и обе кисти — подойди чуть ближе или добавь света.'
  }

  if (expected === 'boost') {
    if (!m.leftWristAbove && !m.rightWristAbove) {
      return 'Подними обе кисти выше плеч — сейчас обе руки слишком низко.'
    }
    if (!m.leftWristAbove) {
      return 'Подними левую кисть выше линии плеч.'
    }
    if (!m.rightWristAbove) {
      return 'Подними правую кисть выше линии плеч.'
    }

    const missing = Math.max(0, 0.62 - m.boostHeight)
    return `Ещё выше: подними руки примерно на ${Math.round(missing * 100)}% ширины плеч.`
  }

  if (expected === 'duck') {
    const missing = Math.max(0, 0.62 - m.crouchDepth)
    return `Присядь ниже: опусти голову и плечи ещё примерно на ${Math.round(missing * 100)}% ширины плеч.`
  }

  if (expected === 'left') {
    const missing = Math.max(0, 0.25 + m.lateralShift)
    return `Наклони голову и верх корпуса влево ещё примерно на ${Math.round(missing * 100)}% ширины плеч. Шагать не нужно.`
  }

  if (expected === 'right') {
    const missing = Math.max(0, 0.25 - m.lateralShift)
    return `Наклони голову и верх корпуса вправо ещё примерно на ${Math.round(missing * 100)}% ширины плеч. Шагать не нужно.`
  }

  if (expected === 'shield') {
    if (m.wristDistance > 0.72) {
      return 'Сведи кисти ближе друг к другу перед грудью.'
    }
    if (m.wristChestDistance > 1.15) {
      return 'Перенеси сведённые кисти к центру груди.'
    }
    return 'Удержи кисти вместе ещё мгновение, чтобы щит замкнулся.'
  }

  const dx =
    (m.centerX - calibration.centerX) /
    Math.max(calibration.shoulderWidth, 0.08)

  return Math.abs(dx) > 0.25
    ? 'Вернись в центр и приготовься к следующему манёвру.'
    : 'Держи нейтральную стойку.'
}
