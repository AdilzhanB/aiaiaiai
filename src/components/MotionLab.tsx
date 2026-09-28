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

const steps: Array<{
  id: ActionGesture
  title: string
  instruction: string
  voice: string
  icon: typeof ArrowLeft
}> = [
  {
    id: 'left',
    title: 'Сдвиг влево',
    instruction: 'Смести плечи влево, не поворачиваясь боком.',
    voice: 'Сместись влево',
    icon: ArrowLeft
  },
  {
    id: 'right',
    title: 'Сдвиг вправо',
    instruction: 'Смести плечи вправо и удержи позицию.',
    voice: 'Сместись вправо',
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
        state.gestureConfidence > 0.34

      if (matched) {
        holdRef.current = Math.min(700, holdRef.current + 50)
      } else {
        holdRef.current = Math.max(0, holdRef.current - 90)
      }

      setHold(holdRef.current)

      if (holdRef.current >= 700) {
        holdRef.current = 0
        setHold(0)
        audio.success(step + 1)

        if (step >= steps.length - 1) {
          completedRef.current = true
          window.setTimeout(() => setPhase('ready'), 500)
        } else {
          setStep((value) => value + 1)
        }
      }
    }, 50)

    return () => window.clearInterval(id)
  }, [current.id, setPhase, step])

  const coach = useMemo(() => {
    if (!decision) return current.instruction
    if (decision.gesture === current.id) return 'Отлично. Удержи движение ещё мгновение.'
    return coachForHazard(current.id, decision, calibration)
  }, [calibration, current.id, current.instruction, decision])

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
          <div className="lab-icon"><Icon size={68} /></div>
          <div>
            <span>ПОКАЖИ ДВИЖЕНИЕ</span>
            <h1>{current.title}</h1>
            <p>{current.instruction}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="hold-meter">
        <div style={{ width: `${(hold / 700) * 100}%` }} />
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
