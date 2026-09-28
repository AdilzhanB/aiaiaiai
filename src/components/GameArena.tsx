import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Shield, Sparkles, TriangleAlert } from 'lucide-react'
import { coachForHazard } from '../motion/gestureEngine'
import { audio } from '../motion/audio'
import { useMotionStore } from '../store'
import type { Hazard, HazardKind } from '../types'

const GAME_SECONDS = 45
const LEAD_MS = 2700
const HIT_WINDOW = 720

const info: Record<HazardKind, { label: string; icon: typeof ArrowUp; hint: string }> = {
  jump: { label: 'PULSE UP', icon: ArrowUp, hint: 'Обе руки выше плеч' },
  duck: { label: 'DUCK', icon: ArrowDown, hint: 'Присядь ниже' },
  left: { label: 'SHIFT LEFT', icon: ArrowLeft, hint: 'Корпус влево' },
  right: { label: 'SHIFT RIGHT', icon: ArrowRight, hint: 'Корпус вправо' },
  shield: { label: 'SHIELD', icon: Shield, hint: 'Кисти вместе у груди' }
}

const sequence: HazardKind[] = [
  'jump','left','duck','right','shield',
  'duck','jump','shield','left','right',
  'jump','duck','right','shield','left',
  'shield','right','duck','jump','left'
]

function isMatch(kind: HazardKind, gesture: string) {
  return kind === gesture
}

export default function GameArena() {
  const phase = useMotionStore((s) => s.phase)
  const gesture = useMotionStore((s) => s.gesture)
  const decision = useMotionStore((s) => s.decision)
  const calibration = useMotionStore((s) => s.calibration)
  const hazards = useMotionStore((s) => s.hazards)
  const score = useMotionStore((s) => s.score)
  const combo = useMotionStore((s) => s.combo)
  const secondsLeft = useMotionStore((s) => s.secondsLeft)
  const flash = useMotionStore((s) => s.flash)
  const addHazard = useMotionStore((s) => s.addHazard)
  const resolveHazard = useMotionStore((s) => s.resolveHazard)
  const setSecondsLeft = useMotionStore((s) => s.setSecondsLeft)
  const setPhase = useMotionStore((s) => s.setPhase)
  const clearFlash = useMotionStore((s) => s.clearFlash)

  const startedAt = useRef(0)
  const spawnIndex = useRef(0)
  const resolved = useRef(new Set<string>())
  const [now, setNow] = useState(performance.now())

  useEffect(() => {
    if (phase !== 'playing') return
    startedAt.current = performance.now()
    spawnIndex.current = 0
    resolved.current = new Set()
    audio.start()

    const first: Hazard = {
      id: `h-${Date.now()}-0`,
      kind: sequence[0],
      createdAt: performance.now(),
      hitAt: performance.now() + LEAD_MS,
      resolved: false
    }
    addHazard(first)
    spawnIndex.current = 1

    const spawn = window.setInterval(() => {
      const i = spawnIndex.current
      if (i >= sequence.length) return
      const t = performance.now()
      addHazard({
        id: `h-${Date.now()}-${i}`,
        kind: sequence[i],
        createdAt: t,
        hitAt: t + LEAD_MS,
        resolved: false
      })
      spawnIndex.current += 1
    }, 2100)

    const tick = window.setInterval(() => {
      const t = performance.now()
      setNow(t)
      const elapsed = (t - startedAt.current) / 1000
      const left = Math.max(0, GAME_SECONDS - Math.floor(elapsed))
      setSecondsLeft(left)

      const s = useMotionStore.getState()
      for (const h of s.hazards) {
        if (h.resolved || resolved.current.has(h.id)) continue
        const delta = t - h.hitAt
        if (Math.abs(delta) <= HIT_WINDOW && isMatch(h.kind, s.gesture) && s.gestureConfidence > .34) {
          resolved.current.add(h.id)
          resolveHazard(h.id, true)
          audio.success(s.combo)
        } else if (delta > HIT_WINDOW) {
          resolved.current.add(h.id)
          resolveHazard(h.id, false)
          audio.miss()
        }
      }

      if (elapsed >= GAME_SECONDS) {
        window.clearInterval(spawn)
        window.clearInterval(tick)
        audio.finish()
        setPhase('finished')
      }
    }, 80)

    return () => {
      window.clearInterval(spawn)
      window.clearInterval(tick)
    }
  }, [phase, addHazard, resolveHazard, setPhase, setSecondsLeft])

  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(clearFlash, 180)
    return () => window.clearTimeout(id)
  }, [flash, clearFlash])

  const active = useMemo(() => {
    return hazards
      .filter((h) => !h.resolved && h.hitAt > now - HIT_WINDOW)
      .sort((a, b) => a.hitAt - b.hitAt)[0]
  }, [hazards, now])

  const coach = useMemo(() => {
    if (!active || !decision || phase !== 'playing') return ''
    const dt = active.hitAt - now
    if (dt > 1450 || dt < -HIT_WINDOW) return ''
    if (isMatch(active.kind, gesture)) return decision.feedback
    return coachForHazard(active.kind, decision, calibration)
  }, [active, decision, phase, now, gesture, calibration])

  const progress = ((GAME_SECONDS - secondsLeft) / GAME_SECONDS) * 100
  const activeMeta = active ? info[active.kind] : null
  const ActiveIcon = activeMeta?.icon

  return (
    <section className={`arena glass ${flash ? `flash-${flash}` : ''}`}>
      <div className="arena-head">
        <div>
          <span className="eyebrow"><Sparkles size={14} /> REACTOR RUN // 45 SEC</span>
          <h2>Читай импульс. Двигайся. Не ломай комбо.</h2>
        </div>
        <div className="score-cluster">
          <div><span>SCORE</span><strong>{score.toLocaleString()}</strong></div>
          <div><span>COMBO</span><strong>×{combo}</strong></div>
          <div><span>TIME</span><strong>{secondsLeft}s</strong></div>
        </div>
      </div>

      <div className="timeline"><div style={{ width: `${progress}%` }} /></div>

      <div className="reactor">
        <div className="lane-grid" />
        <div className="reactor-core">
          <motion.div
            className={`player-orb g-${gesture}`}
            animate={{
              x: gesture === 'left' ? -90 : gesture === 'right' ? 90 : 0,
              y: gesture === 'jump' ? -44 : gesture === 'duck' ? 34 : 0,
              scale: gesture === 'shield' ? 1.14 : gesture === 'duck' ? .82 : 1
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          >
            <span />
            {gesture === 'shield' && <i className="shield-ring" />}
          </motion.div>
        </div>

        <AnimatePresence>
          {hazards.filter((h) => !h.resolved && h.hitAt > now - 900).map((h) => {
            const remaining = h.hitAt - now
            const pct = Math.max(0, Math.min(1, remaining / LEAD_MS))
            const m = info[h.kind]
            const Icon = m.icon
            return (
              <motion.div
                key={h.id}
                className={`hazard hazard-${h.kind}`}
                initial={{ top: '4%', opacity: 0, scale: .8 }}
                animate={{ top: `${12 + (1 - pct) * 66}%`, opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.35 }}
                transition={{ duration: .08, ease: 'linear' }}
              >
                <Icon size={18} />
                <span>{m.label}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>

        <div className="impact-zone"><span>IMPACT</span></div>
      </div>

      <div className="arena-bottom">
        <div className="next-move">
          {activeMeta && ActiveIcon ? (
            <>
              <div className="move-icon"><ActiveIcon size={26} /></div>
              <div>
                <span>СЛЕДУЮЩИЙ ИМПУЛЬС</span>
                <strong>{activeMeta.label}</strong>
                <small>{activeMeta.hint}</small>
              </div>
            </>
          ) : (
            <div><span>СИСТЕМА</span><strong>Сканирую следующий импульс…</strong></div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {coach ? (
            <motion.div
              key={coach}
              className={`coach ${gesture === active?.kind ? 'coach-good' : ''}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <TriangleAlert size={18} />
              <div>
                <span>LIVE COACH / РЕЖИМ «ОШИБКА»</span>
                <strong>{coach}</strong>
              </div>
            </motion.div>
          ) : (
            <motion.div className="coach coach-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="pulse-dot" />
              <div><span>LIVE COACH</span><strong>Готов к движению</strong></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
