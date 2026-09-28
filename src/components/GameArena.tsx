import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronsUp,
  HeartPulse,
  Shield,
  Sparkles,
  Timer,
  TriangleAlert,
  Zap
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { audio } from '../motion/audio'
import { coachForHazard } from '../motion/gestureEngine'
import { useMotionStore } from '../store'
import type { Hazard, HazardKind } from '../types'

const GAME_SECONDS = 60
const LEAD_MS = 2450
const HIT_WINDOW = 680
const SPAWN_MS = 1900

const actions: Record<
  HazardKind,
  {
    label: string
    short: string
    instruction: string
    icon: typeof ArrowLeft
  }
> = {
  left: {
    label: 'SHIFT LEFT',
    short: 'LEFT',
    instruction: 'Сместись влево',
    icon: ArrowLeft
  },
  right: {
    label: 'SHIFT RIGHT',
    short: 'RIGHT',
    instruction: 'Сместись вправо',
    icon: ArrowRight
  },
  duck: {
    label: 'DUCK',
    short: 'DUCK',
    instruction: 'Присядь ниже',
    icon: ArrowDown
  },
  boost: {
    label: 'BOOST',
    short: 'BOOST',
    instruction: 'Обе руки вверх',
    icon: ChevronsUp
  },
  shield: {
    label: 'SHIELD',
    short: 'SHIELD',
    instruction: 'Кисти вместе у груди',
    icon: Shield
  }
}

const sequence: HazardKind[] = [
  'left', 'boost', 'right', 'duck', 'shield',
  'right', 'left', 'boost', 'shield', 'duck',
  'left', 'right', 'duck', 'boost', 'shield',
  'boost', 'left', 'shield', 'right', 'duck',
  'right', 'shield', 'boost', 'left', 'duck',
  'shield', 'right', 'boost', 'duck', 'left'
]

const sectorNames = ['ION GARDEN', 'VOID CHANNEL', 'CORE CHAMBER']

function match(kind: HazardKind, gesture: string) {
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
  const integrity = useMotionStore((s) => s.integrity)
  const secondsLeft = useMotionStore((s) => s.secondsLeft)
  const flash = useMotionStore((s) => s.flash)
  const voiceEnabled = useMotionStore((s) => s.voiceEnabled)
  const addHazard = useMotionStore((s) => s.addHazard)
  const resolveHazard = useMotionStore((s) => s.resolveHazard)
  const setSecondsLeft = useMotionStore((s) => s.setSecondsLeft)
  const setPhase = useMotionStore((s) => s.setPhase)
  const clearFlash = useMotionStore((s) => s.clearFlash)

  const startedAt = useRef(0)
  const spawnIndex = useRef(0)
  const resolved = useRef(new Set<string>())
  const spoken = useRef(new Set<string>())
  const finished = useRef(false)
  const [now, setNow] = useState(performance.now())

  useEffect(() => {
    if (phase !== 'playing') return

    startedAt.current = performance.now()
    spawnIndex.current = 0
    resolved.current = new Set()
    spoken.current = new Set()
    finished.current = false

    const spawnOne = () => {
      const i = spawnIndex.current
      if (i >= sequence.length) return

      const t = performance.now()
      const kind = sequence[i]

      addHazard({
        id: `rift-${Date.now()}-${i}`,
        kind,
        createdAt: t,
        hitAt: t + LEAD_MS,
        resolved: false
      })

      audio.cue(kind)
      spawnIndex.current += 1
    }

    spawnOne()

    const spawn = window.setInterval(spawnOne, SPAWN_MS)

    const tick = window.setInterval(() => {
      const t = performance.now()
      setNow(t)

      const elapsed = (t - startedAt.current) / 1000
      const left = Math.max(0, GAME_SECONDS - Math.floor(elapsed))
      setSecondsLeft(left)

      const state = useMotionStore.getState()

      if (state.integrity <= 0 && !finished.current) {
        finished.current = true
        window.clearInterval(spawn)
        window.clearInterval(tick)
        audio.finish()
        setPhase('finished')
        return
      }

      for (const hazard of state.hazards) {
        if (hazard.resolved || resolved.current.has(hazard.id)) continue

        const delta = t - hazard.hitAt

        if (
          Math.abs(delta) <= HIT_WINDOW &&
          match(hazard.kind, state.gesture) &&
          state.gestureConfidence > 0.34
        ) {
          resolved.current.add(hazard.id)
          resolveHazard(hazard.id, true)
          audio.success(state.combo)
        } else if (delta > HIT_WINDOW) {
          resolved.current.add(hazard.id)
          resolveHazard(hazard.id, false)
          audio.miss()
        }
      }

      if (elapsed >= GAME_SECONDS && !finished.current) {
        finished.current = true
        window.clearInterval(spawn)
        window.clearInterval(tick)
        audio.finish()
        setPhase('finished')
      }
    }, 60)

    return () => {
      window.clearInterval(spawn)
      window.clearInterval(tick)
    }
  }, [addHazard, phase, resolveHazard, setPhase, setSecondsLeft])

  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(clearFlash, 180)
    return () => window.clearTimeout(id)
  }, [clearFlash, flash])

  const active = useMemo(() => {
    return hazards
      .filter((h) => !h.resolved && h.hitAt > now - HIT_WINDOW)
      .sort((a, b) => a.hitAt - b.hitAt)[0]
  }, [hazards, now])

  const queue = useMemo(() => {
    return hazards
      .filter((h) => !h.resolved && h.hitAt >= now - HIT_WINDOW)
      .sort((a, b) => a.hitAt - b.hitAt)
      .slice(0, 4)
  }, [hazards, now])

  const coach = useMemo(() => {
    if (!active || !decision) return ''
    const dt = active.hitAt - now

    if (dt > 1350 || dt < -HIT_WINDOW) return ''
    if (match(active.kind, gesture)) return 'Есть. Удержи движение до импульса.'
    return coachForHazard(active.kind, decision, calibration)
  }, [active, calibration, decision, gesture, now])

  useEffect(() => {
    if (!active || !coach || !voiceEnabled) return

    const dt = active.hitAt - now
    if (dt > 1100 || dt < 600 || spoken.current.has(active.id)) return

    spoken.current.add(active.id)
    audio.say(coach)
  }, [active, coach, now, voiceEnabled])

  const elapsed = GAME_SECONDS - secondsLeft
  const sector = Math.min(2, Math.floor(elapsed / 20))
  const progress = (elapsed / GAME_SECONDS) * 100
  const meta = active ? actions[active.kind] : null
  const ActiveIcon = meta?.icon
  const timeToImpact = active
    ? Math.max(0, Math.min(1, (active.hitAt - now) / LEAD_MS))
    : 1

  return (
    <section className={`game-arena ${flash ? `game-${flash}` : ''}`}>
      <div className="game-atmosphere">
        <div className="speed-lines" />
        <div className="tunnel tunnel-a" />
        <div className="tunnel tunnel-b" />
        <div className="tunnel tunnel-c" />
      </div>

      <header className="game-hud">
        <div className="hud-sector">
          <span>SECTOR {sector + 1}/3</span>
          <strong>{sectorNames[sector]}</strong>
        </div>

        <div className="hud-score">
          <span>SCORE</span>
          <strong>{score.toLocaleString()}</strong>
          <b>×{combo}</b>
        </div>

        <div className="hud-time">
          <Timer size={18} />
          <strong>{secondsLeft}</strong>
          <span>SEC</span>
        </div>
      </header>

      <div className="run-progress"><span style={{ width: `${progress}%` }} /></div>

      <div className="integrity-block">
        <div>
          <HeartPulse size={17} />
          <span>INTEGRITY</span>
          <strong>{integrity}%</strong>
        </div>
        <div className="integrity-bar"><span style={{ width: `${integrity}%` }} /></div>
      </div>

      <div className="pilot-zone">
        <motion.div
          className={`pilot-core pilot-${gesture}`}
          animate={{
            x: gesture === 'left' ? -150 : gesture === 'right' ? 150 : 0,
            y: gesture === 'boost' ? -70 : gesture === 'duck' ? 52 : 0,
            scale: gesture === 'shield' ? 1.08 : gesture === 'duck' ? 0.82 : 1
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        >
          <i />
          <span />
          {gesture === 'shield' && <b className="pilot-shield" />}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {meta && ActiveIcon ? (
          <motion.div
            key={active?.id}
            className={`impact-command command-${active?.kind}`}
            initial={{ opacity: 0, scale: 0.72, y: -40 }}
            animate={{
              opacity: 1,
              scale: 1 + (1 - timeToImpact) * 0.08,
              y: 0
            }}
            exit={{ opacity: 0, scale: 1.25 }}
          >
            <div className="command-ring">
              <ActiveIcon size={88} strokeWidth={1.6} />
            </div>
            <span>СДЕЛАЙ СЕЙЧАС</span>
            <strong>{meta.label}</strong>
            <small>{meta.instruction}</small>
          </motion.div>
        ) : (
          <motion.div className="impact-command standby" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="command-ring"><Sparkles size={70} /></div>
            <span>RIFT SCAN</span>
            <strong>ГОТОВЬСЯ</strong>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="incoming-queue">
        <span>NEXT</span>
        {queue.slice(1).map((hazard: Hazard) => {
          const item = actions[hazard.kind]
          const Icon = item.icon
          return (
            <div key={hazard.id}>
              <Icon size={17} />
              <strong>{item.short}</strong>
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {coach ? (
          <motion.div
            key={coach}
            className={`distance-coach ${gesture === active?.kind ? 'coach-ok' : ''}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            {gesture === active?.kind ? <Zap size={26} /> : <TriangleAlert size={26} />}
            <div>
              <span>MOTION COACH</span>
              <strong>{coach}</strong>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
