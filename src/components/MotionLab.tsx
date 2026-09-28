import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronsUp,
  Shield,
  Sparkles
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { audio } from '../motion/audio'
import { coachForHazard } from '../motion/gestureEngine'
import { useMotionStore } from '../store'
import type { ActionGesture } from '../types'
import GestureGuide from './GestureGuide'

const HOLD_MS = 450

const steps: Array<{
  id: ActionGesture
  title: string
  instruction: string
  voice: string
  icon: typeof ArrowLeft
}> = [
  {
    id: 'left',
    title: 'Уклон влево',
    instruction: 'Наклони голову и верх корпуса влево, как будто уворачиваешься. Ноги могут оставаться на месте.',
    voice: 'Наклонись влево',
    icon: ArrowLeft
  },
  {
    id: 'right',
    title: 'Уклон вправо',
    instruction: 'Наклони голову и верх корпуса вправо. Не нужно шагать или поворачиваться боком.',
    voice: 'Наклонись вправо',
    icon: ArrowRight
  },
  {
    id: 'duck',
    title: 'Низкая стойка',
    instruction: 'Присядь так, чтобы голова и плечи заметно опустились.',
    voice: 'Присядь',
    icon: ArrowDown
  },
  {
    id: 'boost',
    title: 'Импульс вверх',
    instruction: 'Подними обе кисти выше линии плеч.',
    voice: 'Руки вверх',
    icon: ChevronsUp
  },
  {
    id: 'shield',
    title: 'Энергетический щит',
    instruction: 'Сведи кисти вместе перед центром груди.',
    voice: 'Активируй щит',
    icon: Shield
  }
]

export default function MotionLab() {
  const [step, setStep] = useState(0)
  const [hold, setHold] = useState(0)
  const holdRef = useRef(0)
  const completedRef = useRef(false)

  const decision = useMotionStore((s) => s.decision)
  const calibration = useMotionStore((s) => s.calibration)
  const voiceEnabled = useMotionStore((s) => s.voiceEnabled)
  const setPhase = useMotionStore((s) => s.setPhase)

  const current = steps[Math.min(step, steps.length - 1)]
  const Icon = current.icon

  useEffect(() => {
    if (!voiceEnabled) return
    audio.say(current.voice, true)
  }, [current.voice, voiceEnabled])

  useEffect(() => {
    if (completedRef.current) return

    const id = window.setInterval(() => {
      const state = useMotionStore.getState()
      const matched =
        state.gesture === current.id &&
        state.gestureConfidence > 0.26

      if (matched) {
        holdRef.current = Math.min(HOLD_MS, holdRef.current + 50)
      } else {
        holdRef.current = Math.max(0, holdRef.current - 60)
      }

      setHold(holdRef.current)

      if (holdRef.current >= HOLD_MS) {
        holdRef.current = 0
        setHold(0)
        audio.success(step + 1)

        if (step >= steps.length - 1) {
          completedRef.current = true
          window.setTimeout(() => setPhase('ready'), 450)
        } else {
          setStep((value) => value + 1)
        }
      }
    }, 50)

    return () => window.clearInterval(id)
  }, [current.id, setPhase, step])

  const coach = useMemo(() => {
    if (!decision) return current.instruction
    if (decision.gesture === current.id) return 'Отлично. Есть движение — удержи его совсем немного.'
    return coachForHazard(current.id, decision, calibration)
  }, [calibration, current.id, current.instruction, decision])

  const isLateral = current.id === 'left' || current.id === 'right'
  const lean = decision?.metrics.lateralShift ?? 0
  const marker = 50 + Math.max(-1, Math.min(1, lean)) * 46
  const direction =
    lean < -0.1 ? 'ВЛЕВО' : lean > 0.1 ? 'ВПРАВО' : 'ЦЕНТР'

  return (
    <motion.section
      className="motion-lab scene-card"
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="lab-topline">
        <span><Sparkles size={15} /> MOTION LAB</span>
        <strong>{step + 1} / {steps.length}</strong>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          className="lab-command"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.96 }}
        >
          <motion.div
            className="lab-icon"
            animate={
              current.id === 'left'
                ? { x: [0, -12, 0], rotate: [0, -8, 0] }
                : current.id === 'right'
                  ? { x: [0, 12, 0], rotate: [0, 8, 0] }
                  : {}
            }
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon size={68} />
          </motion.div>
          <div>
            <span>ПОКАЖИ ДВИЖЕНИЕ</span>
            <h1>{current.title}</h1>
            <p>{current.instruction}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {isLateral && (
        <div
          style={{
            marginTop: 22,
            padding: '12px 14px',
            border: '1px solid rgba(160,183,255,.12)',
            borderRadius: 14,
            background: 'rgba(255,255,255,.018)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 9,
              fontFamily: 'var(--mono)',
              fontSize: '.58rem',
              color: '#75819d',
              letterSpacing: '.08em'
            }}
          >
            <span>LIVE LEAN</span>
            <strong style={{ color: Math.abs(lean) > 0.18 ? '#73ffda' : '#9aa5c0' }}>
              {direction} · {Math.round(Math.abs(lean) * 100)}%
            </strong>
          </div>
          <div
            style={{
              position: 'relative',
              height: 8,
              borderRadius: 999,
              background: 'linear-gradient(90deg, rgba(115,255,218,.28), rgba(255,255,255,.05) 50%, rgba(92,225,255,.28))'
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '50%',
                top: -4,
                bottom: -4,
                width: 1,
                background: 'rgba(255,255,255,.18)'
              }}
            />
            <motion.i
              animate={{ left: `${marker}%` }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              style={{
                position: 'absolute',
                top: '50%',
                width: 18,
                height: 18,
                marginLeft: -9,
                marginTop: -9,
                borderRadius: '50%',
                background: '#73ffda',
                boxShadow: '0 0 18px rgba(115,255,218,.5)'
              }}
            />
          </div>
        </div>
      )}

      <div className="hold-meter">
        <div style={{ width: `${(hold / HOLD_MS) * 100}%` }} />
      </div>

      <div className={`live-coach-card ${decision?.gesture === current.id ? 'success' : ''}`}>
        {decision?.gesture === current.id ? <Check size={22} /> : <Sparkles size={22} />}
        <div>
          <span>MOTION COACH</span>
          <strong>{coach}</strong>
        </div>
      </div>

      <GestureGuide />

      <div className="lab-progress-dots">
        {steps.map((item, index) => (
          <span
            key={item.id}
            className={index < step ? 'done' : index === step ? 'active' : ''}
          />
        ))}
      </div>
    </motion.section>
  )
}
