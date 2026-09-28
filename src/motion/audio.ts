let ctx: AudioContext | null = null

function getCtx() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, duration: number, gain = .045, type: OscillatorType = 'sine', delay = 0) {
  const c = getCtx()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, c.currentTime + delay)
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + delay + .01)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + duration)
  o.connect(g)
  g.connect(c.destination)
  o.start(c.currentTime + delay)
  o.stop(c.currentTime + delay + duration + .02)
}

export const audio = {
  unlock() {
    getCtx()
  },
  success(combo = 0) {
    const lift = Math.min(combo, 8) * 18
    tone(480 + lift, .1, .035, 'triangle')
    tone(720 + lift, .13, .025, 'sine', .065)
  },
  miss() {
    tone(128, .18, .05, 'sawtooth')
    tone(92, .22, .035, 'square', .08)
  },
  start() {
    tone(320, .12, .03, 'triangle')
    tone(460, .12, .03, 'triangle', .12)
    tone(680, .16, .035, 'triangle', .24)
  },
  finish() {
    tone(520, .16, .03, 'sine')
    tone(660, .16, .03, 'sine', .14)
    tone(820, .3, .035, 'sine', .28)
  }
}
