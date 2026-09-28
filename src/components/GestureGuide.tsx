import { motion } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Shield, Activity } from 'lucide-react'
import { useMotionStore } from '../store'
import type { Gesture } from '../types'

const gestures: { id: Gesture; name: string; sub: string; icon: typeof ArrowUp }[] = [
  { id: 'jump', name: 'PULSE UP', sub: 'обе руки выше плеч', icon: ArrowUp },
  { id: 'duck', name: 'DUCK', sub: 'согни колени', icon: ArrowDown },
  { id: 'left', name: 'SHIFT LEFT', sub: 'корпус влево', icon: ArrowLeft },
  { id: 'right', name: 'SHIFT RIGHT', sub: 'корпус вправо', icon: ArrowRight },
  { id: 'shield', name: 'SHIELD', sub: 'кисти у груди', icon: Shield }
]

export default function GestureGuide() {
  const gesture = useMotionStore((s) => s.gesture)
  const confidence = useMotionStore((s) => s.gestureConfidence)
  const decision = useMotionStore((s) => s.decision)

  return (
    <section className="gesture-guide glass">
      <div className="panel-head">
        <div className="eyebrow"><Activity size={14} /> MOTION MAP</div>
        <span className="confidence">{Math.round(confidence * 100)}%</span>
      </div>
      <div className="gesture-grid">
        {gestures.map((g) => {
          const Icon = g.icon
          const active = gesture === g.id
          return (
            <motion.div
              key={g.id}
              className={`gesture-tile ${active ? 'active' : ''}`}
              animate={{ scale: active ? 1.025 : 1 }}
            >
              <Icon size={20} />
              <div><strong>{g.name}</strong><span>{g.sub}</span></div>
              {active && <i />}
            </motion.div>
          )
        })}
      </div>
      <div className="raw-feedback">
        <span>DETECTED</span>
        <strong>{decision?.feedback ?? 'Встань в кадр для распознавания движений.'}</strong>
      </div>
    </section>
  )
}
