import type { Calibration, HazardKind, MotionDecision, MotionMetrics, Point, PoseFrame } from '../types'

const IDX = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28
} as const

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const visible = (p: Point | undefined) => !!p && (p.visibility ?? 1) > 0.45

const angle = (a: Point, b: Point, c: Point) => {
  const abx = a.x - b.x
  const aby = a.y - b.y
  const cbx = c.x - b.x
  const cby = c.y - b.y
  const dot = abx * cbx + aby * cby
  const den = Math.hypot(abx, aby) * Math.hypot(cbx, cby)
  if (!den) return 180
  return Math.acos(clamp(dot / den, -1, 1)) * 180 / Math.PI
}

export function frameQuality(points: Point[]) {
  const ids = [11, 12, 15, 16, 23, 24, 25, 26, 27, 28]
  const vals = ids.map((i) => points[i]?.visibility ?? 0)
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function calibrationFromFrames(frames: PoseFrame[]): Calibration {
  if (!frames.length) {
    return { centerX: .5, shoulderWidth: .2, shoulderY: .35, hipY: .62, bodyHeight: .55, ready: false }
  }
  const rows = frames
    .filter((f) => frameQuality(f.points) > .55)
    .map((f) => {
      const p = f.points
      const ls = p[IDX.leftShoulder]
      const rs = p[IDX.rightShoulder]
      const lh = p[IDX.leftHip]
      const rh = p[IDX.rightHip]
      const la = p[IDX.leftAnkle]
      const ra = p[IDX.rightAnkle]
      if (![ls, rs, lh, rh, la, ra].every(visible)) return null
      const s = mid(ls, rs)
      const h = mid(lh, rh)
      const a = mid(la, ra)
      return {
        centerX: (s.x + h.x) / 2,
        shoulderWidth: Math.max(dist(ls, rs), .08),
        shoulderY: s.y,
        hipY: h.y,
        bodyHeight: Math.max(a.y - s.y, .3)
      }
    })
    .filter(Boolean) as Omit<Calibration, 'ready'>[]

  if (rows.length < 8) {
    return { centerX: .5, shoulderWidth: .2, shoulderY: .35, hipY: .62, bodyHeight: .55, ready: false }
  }

  const avg = (k: keyof Omit<Calibration, 'ready'>) =>
    rows.reduce((s, r) => s + r[k], 0) / rows.length

  return {
    centerX: avg('centerX'),
    shoulderWidth: avg('shoulderWidth'),
    shoulderY: avg('shoulderY'),
    hipY: avg('hipY'),
    bodyHeight: avg('bodyHeight'),
    ready: true
  }
}

export function analyzePose(points: Point[], c: Calibration): MotionDecision {
  const ls = points[IDX.leftShoulder]
  const rs = points[IDX.rightShoulder]
  const lw = points[IDX.leftWrist]
  const rw = points[IDX.rightWrist]
  const lh = points[IDX.leftHip]
  const rh = points[IDX.rightHip]
  const lk = points[IDX.leftKnee]
  const rk = points[IDX.rightKnee]
  const la = points[IDX.leftAnkle]
  const ra = points[IDX.rightAnkle]

  const required = [ls, rs, lw, rw, lh, rh, lk, rk, la, ra]
  if (!required.every(visible)) {
    const blank: MotionMetrics = {
      centerX: .5,
      shoulderWidth: .2,
      wristsAbove: 0,
      leftWristAbove: false,
      rightWristAbove: false,
      kneeAngleLeft: 180,
      kneeAngleRight: 180,
      squatDepth: 0,
      wristDistance: 1,
      wristChestDistance: 1,
      confidence: frameQuality(points)
    }
    return {
      gesture: 'neutral',
      confidence: 0,
      metrics: blank,
      feedback: 'Отойди чуть дальше: камера должна видеть плечи, кисти, колени и стопы.'
    }
  }

  const shoulder = mid(ls, rs)
  const hip = mid(lh, rh)
  const centerX = (shoulder.x + hip.x) / 2
  const shoulderWidth = Math.max(dist(ls, rs), .08)
  const torso = Math.max(hip.y - shoulder.y, .12)
  const leftWristAbove = lw.y < ls.y - torso * .16
  const rightWristAbove = rw.y < rs.y - torso * .16
  const wristsAbove = Number(leftWristAbove) + Number(rightWristAbove)
  const kneeAngleLeft = angle(lh, lk, la)
  const kneeAngleRight = angle(rh, rk, ra)
  const avgKnee = (kneeAngleLeft + kneeAngleRight) / 2
  const squatDepth = clamp((155 - avgKnee) / 45)
  const wristDistance = dist(lw, rw) / shoulderWidth
  const chest = { x: shoulder.x, y: shoulder.y + torso * .48 }
  const wristMid = mid(lw, rw)
  const wristChestDistance = dist(wristMid, chest) / shoulderWidth
  const lean = (centerX - c.centerX) / Math.max(c.shoulderWidth, .08)
  const quality = frameQuality(points)

  let gesture: MotionDecision['gesture'] = 'neutral'
  let confidence = .25
  let feedback = 'Нейтральная стойка — готов к следующему импульсу.'

  const jumpScore = clamp((wristsAbove - .7) / 1.3)
  const duckScore = clamp((145 - avgKnee) / 35)
  const leftScore = clamp((-lean - .34) / .48)
  const rightScore = clamp((lean - .34) / .48)
  const shieldScore = clamp((.95 - wristDistance) / .55) * clamp((1.35 - wristChestDistance) / .8)

  const candidates = [
    { gesture: 'jump' as const, score: jumpScore, text: 'Импульс вверх зафиксирован.' },
    { gesture: 'duck' as const, score: duckScore, text: 'Низкая стойка зафиксирована.' },
    { gesture: 'left' as const, score: leftScore, text: 'Смещение влево зафиксировано.' },
    { gesture: 'right' as const, score: rightScore, text: 'Смещение вправо зафиксировано.' },
    { gesture: 'shield' as const, score: shieldScore, text: 'Энергетический щит активирован.' }
  ].sort((a, b) => b.score - a.score)

  if (candidates[0].score > .52) {
    gesture = candidates[0].gesture
    confidence = candidates[0].score * quality
    feedback = candidates[0].text
  }

  return {
    gesture,
    confidence,
    metrics: {
      centerX,
      shoulderWidth,
      wristsAbove,
      leftWristAbove,
      rightWristAbove,
      kneeAngleLeft,
      kneeAngleRight,
      squatDepth,
      wristDistance,
      wristChestDistance,
      confidence: quality
    },
    feedback
  }
}

export function coachForHazard(expected: HazardKind, d: MotionDecision, c: Calibration) {
  const m = d.metrics
  if (m.confidence < .52) {
    return 'Встань так, чтобы камера видела тело от головы до стоп. Свет должен падать на тебя спереди.'
  }

  if (expected === 'jump') {
    if (!m.leftWristAbove && !m.rightWristAbove) return 'Подними обе кисти выше плеч — сейчас обе руки слишком низко.'
    if (!m.leftWristAbove) return 'Левая кисть ещё ниже плеча. Подними левую руку выше.'
    if (!m.rightWristAbove) return 'Правая кисть ещё ниже плеча. Подними правую руку выше.'
    return 'Удержи обе руки наверху ещё мгновение.'
  }

  if (expected === 'duck') {
    const a = Math.round((m.kneeAngleLeft + m.kneeAngleRight) / 2)
    if (a > 145) return `Согни колени сильнее: сейчас примерно ${a}°, цель — ниже 125°.`
    if (a > 125) return `Ещё немного ниже: угол коленей около ${a}°, цель — 125° или меньше.`
    return 'Удержи низкую стойку до прохождения луча.'
  }

  const dx = (m.centerX - c.centerX) / Math.max(c.shoulderWidth, .08)
  if (expected === 'left') {
    const need = Math.max(0, .68 + dx)
    return `Смести корпус влево ещё примерно на ${Math.round(need * 100)}% ширины плеч.`
  }
  if (expected === 'right') {
    const need = Math.max(0, .68 - dx)
    return `Смести корпус вправо ещё примерно на ${Math.round(need * 100)}% ширины плеч.`
  }

  if (expected === 'shield') {
    if (m.wristDistance > .95) return 'Сведи кисти ближе друг к другу перед грудью, чтобы замкнуть щит.'
    if (m.wristChestDistance > 1.35) return 'Держи сведённые кисти ближе к центру груди.'
    return 'Удержи кисти вместе перед грудью ещё мгновение.'
  }

  return 'Вернись в центр и приготовься к следующему движению.'
}
