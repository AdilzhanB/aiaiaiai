import { describe, expect, it } from 'vitest'
import { analyzePose, calibrationFromFrames } from './gestureEngine'
import type { Calibration, Point, PoseFrame } from '../types'

const calibration: Calibration = {
  centerX: .5,
  shoulderWidth: .2,
  shoulderY: .3,
  hipY: .55,
  bodyHeight: .65,
  ready: true
}

function pose(): Point[] {
  const p = Array.from({ length: 33 }, () => ({ x: .5, y: .5, visibility: 1 }))
  p[11] = { x: .4, y: .3, visibility: 1 }
  p[12] = { x: .6, y: .3, visibility: 1 }
  p[13] = { x: .38, y: .4, visibility: 1 }
  p[14] = { x: .62, y: .4, visibility: 1 }
  p[15] = { x: .38, y: .48, visibility: 1 }
  p[16] = { x: .62, y: .48, visibility: 1 }
  p[23] = { x: .43, y: .55, visibility: 1 }
  p[24] = { x: .57, y: .55, visibility: 1 }
  p[25] = { x: .43, y: .75, visibility: 1 }
  p[26] = { x: .57, y: .75, visibility: 1 }
  p[27] = { x: .43, y: .95, visibility: 1 }
  p[28] = { x: .57, y: .95, visibility: 1 }
  return p
}

function shift(points: Point[], dx: number) {
  return points.map((point) => ({ ...point, x: point.x + dx }))
}

describe('gesture engine', () => {
  it('recognizes jump', () => {
    const p = pose()
    p[15] = { x: .38, y: .14, visibility: 1 }
    p[16] = { x: .62, y: .14, visibility: 1 }
    expect(analyzePose(p, calibration).gesture).toBe('jump')
  })

  it('recognizes left and right shifts', () => {
    expect(analyzePose(shift(pose(), -.2), calibration).gesture).toBe('left')
    expect(analyzePose(shift(pose(), .2), calibration).gesture).toBe('right')
  })

  it('recognizes shield', () => {
    const p = pose()
    p[15] = { x: .48, y: .42, visibility: 1 }
    p[16] = { x: .52, y: .42, visibility: 1 }
    expect(analyzePose(p, calibration).gesture).toBe('shield')
  })

  it('builds calibration from stable full-body frames', () => {
    const frames: PoseFrame[] = Array.from({ length: 12 }, (_, i) => ({
      points: pose(),
      timestamp: i * 33
    }))

    const result = calibrationFromFrames(frames)
    expect(result.ready).toBe(true)
    expect(result.centerX).toBeCloseTo(.5, 2)
    expect(result.shoulderWidth).toBeCloseTo(.2, 2)
  })
})
