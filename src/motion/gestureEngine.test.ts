import { describe, expect, it } from 'vitest'
import { analyzePose, calibrationFromFrames } from './gestureEngine'
import type { Calibration, Point, PoseFrame } from '../types'

const calibration: Calibration = {
  centerX: 0.5,
  shoulderWidth: 0.2,
  shoulderY: 0.34,
  headY: 0.18,
  chestY: 0.512,
  ready: true
}

function basePose(): Point[] {
  const p = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 1
  }))

  p[0] = { x: 0.5, y: 0.18, visibility: 1 }
  p[11] = { x: 0.4, y: 0.34, visibility: 1 }
  p[12] = { x: 0.6, y: 0.34, visibility: 1 }
  p[13] = { x: 0.38, y: 0.43, visibility: 1 }
  p[14] = { x: 0.62, y: 0.43, visibility: 1 }
  p[15] = { x: 0.37, y: 0.5, visibility: 1 }
  p[16] = { x: 0.63, y: 0.5, visibility: 1 }

  return p
}

function shiftX(points: Point[], amount: number) {
  return points.map((point) => ({ ...point, x: point.x + amount }))
}

function shiftUpperY(points: Point[], amount: number) {
  const copy = points.map((point) => ({ ...point }))
  for (const id of [0, 11, 12, 13, 14, 15, 16]) {
    copy[id].y += amount
  }
  return copy
}

describe('upper-body gesture engine', () => {
  it('recognizes boost', () => {
    const p = basePose()
    p[15] = { x: 0.37, y: 0.12, visibility: 1 }
    p[16] = { x: 0.63, y: 0.12, visibility: 1 }

    expect(analyzePose(p, calibration).gesture).toBe('boost')
  })

  it('recognizes lateral shifts', () => {
    expect(analyzePose(shiftX(basePose(), -0.18), calibration).gesture).toBe('left')
    expect(analyzePose(shiftX(basePose(), 0.18), calibration).gesture).toBe('right')
  })

  it('recognizes duck using head and shoulder drop', () => {
    expect(analyzePose(shiftUpperY(basePose(), 0.14), calibration).gesture).toBe('duck')
  })

  it('recognizes shield near chest', () => {
    const p = basePose()
    p[15] = { x: 0.47, y: 0.5, visibility: 1 }
    p[16] = { x: 0.53, y: 0.5, visibility: 1 }

    expect(analyzePose(p, calibration).gesture).toBe('shield')
  })

  it('calibrates from upper-body frames only', () => {
    const frames: PoseFrame[] = Array.from({ length: 14 }, (_, index) => ({
      points: basePose(),
      timestamp: index * 33
    }))

    const result = calibrationFromFrames(frames)

    expect(result.ready).toBe(true)
    expect(result.centerX).toBeCloseTo(0.5, 2)
    expect(result.shoulderWidth).toBeCloseTo(0.2, 2)
    expect(result.headY).toBeCloseTo(0.18, 2)
  })
})
