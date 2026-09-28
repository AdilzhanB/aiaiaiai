import { useEffect, useRef, useState } from 'react'
import { ChevronsUp, Rocket, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { audio } from '../motion/audio'
import { useMotionStore } from '../store'
import GestureGuide from './GestureGuide'

export function LaunchScene() {
  const [hold, setHold] = useState(0)
  const holdRef = useRef(0)
  const setPhase = useMotionStore((s) => s.setPhase)
  const resetRun = useMotionStore((s) => s.resetRun)
  const voiceEnabled = useMotionStore((s) => s.voiceEnabled)

  useEffect(() => {
    if (voiceEnabled) {
      audio.say('Подними обе руки, чтобы запустить забег', true)
    }

    const id = window.setInterval(() => {
      const state = useMotionStore.getState()
      const ready =
        state.gesture === 'boost' &&
        state.gestureConfidence > 0.34

      holdRef.current = ready
        ? Math.min(900, holdRef.current + 50)
        : Math.max(0, holdRef.current - 100)

      setHold(holdRef.current)

      if (holdRef.current >= 900) {
        window.clearInterval(id)
        resetRun()
        setPhase('countdown')
      }
    }, 50)

    return () => window.clearInterval(id)
  }, [resetRun, setPhase, voiceEnabled])

  return (
    <motion.section
      className="launch-scene"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="launch-core">
        <motion.div
          className="launch-ring ring-one"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="launch-ring ring-two"
          animate={{ rotate: -360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />
        <Rocket size={54} />
      </div>

      <div className="scene-eyebrow"><Sparkles size={15} /> READY TO RUN</div>
      <h1>Подними обе руки.</h1>
      <p>Удержи BOOST меньше секунды — и рифт откроется автоматически.</p>

      <div className="launch-gesture">
        <ChevronsUp size={52} />
        <div className="launch-meter"><span style={{ width: `${(hold / 900) * 100}%` }} /></div>
      </div>

      <GestureGuide />

      <button
        className="manual-start"
        onClick={() => {
          resetRun()
          setPhase('countdown')
        }}
      >
        Запустить вручную
      </button>
    </motion.section>
  )
}

export function CountdownScene() {
  const [value, setValue] = useState(3)
  const setPhase = useMotionStore((s) => s.setPhase)

  useEffect(() => {
    let current = 3
    audio.count(current)

    const id = window.setInterval(() => {
      current -= 1

      if (current <= 0) {
        window.clearInterval(id)
        audio.launch()
        setPhase('playing')
        return
      }

      setValue(current)
      audio.count(current)
    }, 850)

    return () => window.clearInterval(id)
  }, [setPhase])

  return (
    <section className="countdown-scene">
      <span>RIFT OPENING</span>
      <motion.strong
        key={value}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {value}
      </motion.strong>
    </section>
  )
}
