import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronsUp,
  Shield
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useMotionStore } from '../store'
import type { ActionGesture } from '../types'

const items: Array<{
  id: ActionGesture
  label: string
  icon: typeof ArrowLeft
}> = [
  { id: 'left', label: 'LEFT', icon: ArrowLeft },
  { id: 'right', label: 'RIGHT', icon: ArrowRight },
  { id: 'duck', label: 'DUCK', icon: ArrowDown },
  { id: 'boost', label: 'BOOST', icon: ChevronsUp },
  { id: 'shield', label: 'SHIELD', icon: Shield }
]

export default function GestureGuide() {
  const gesture = useMotionStore((s) => s.gesture)
  const confidence = useMotionStore((s) => s.gestureConfidence)

  return (
    <div className="gesture-strip">
      {items.map(({ id, label, icon: Icon }) => {
        const active = gesture === id

        return (
          <motion.div
            key={id}
            className={`gesture-pill ${active ? 'is-active' : ''}`}
            animate={{ y: active ? -3 : 0, scale: active ? 1.035 : 1 }}
          >
            <Icon size={18} />
            <span>{label}</span>
            {active && <b>{Math.round(confidence * 100)}%</b>}
          </motion.div>
        )
      })}
    </div>
  )
}
