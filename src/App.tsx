import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Gauge, Play, RefreshCcw, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import GameArena from './components/GameArena'
import GestureGuide from './components/GestureGuide'
import Landing from './components/Landing'
import PoseCamera from './components/PoseCamera'
import ResultModal from './components/ResultModal'
import { audio } from './motion/audio'
import { useMotionStore } from './store'

function SetupOverlay() {
  const phase = useMotionStore((s) => s.phase)
  const cameraReady = useMotionStore((s) => s.cameraReady)
  const modelReady = useMotionStore((s) => s.modelReady)
  const calibration = useMotionStore((s) => s.calibration)
  const setPhase = useMotionStore((s) => s.setPhase)
  const resetGame = useMotionStore((s) => s.resetGame)

  if (phase === 'playing' || phase === 'finished') return null

  const calibrate = () => {
    if (!cameraReady || !modelReady) return
    setPhase('calibrating')
  }

  const start = () => {
    resetGame()
    audio.unlock()
    setPhase('playing')
  }

  return (
    <AnimatePresence>
      {(phase === 'camera' || phase === 'calibrating' || phase === 'ready') && (
        <motion.div
          className="setup-float glass"
          initial={{ opacity: 0, y: 16, scale: .96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {phase === 'camera' && (
            <>
              <div className="setup-icon"><Camera size={24} /></div>
              <div className="setup-copy">
                <span>ШАГ 1 / 2</span>
                <strong>{cameraReady && modelReady ? 'Камера готова' : 'Запускаю vision engine…'}</strong>
                <p>Встань на 1.5–2.5 м от камеры. В кадре должны быть видны плечи, кисти, колени и стопы.</p>
              </div>
              <button className="primary-btn compact" disabled={!cameraReady || !modelReady} onClick={calibrate}>
                <Gauge size={17} /> Калибровать
              </button>
            </>
          )}

          {phase === 'calibrating' && (
            <>
              <div className="setup-icon scanning"><RefreshCcw size={24} /></div>
              <div className="setup-copy">
                <span>ШАГ 2 / 2</span>
                <strong>Снимаю твой нейтральный профиль</strong>
                <p>Стой прямо, руки вдоль тела. Это займёт около 2.4 секунды и адаптирует пороги под рост и дистанцию.</p>
              </div>
              <div className="loader-pill"><i /><i /><i /></div>
            </>
          )}

          {phase === 'ready' && calibration.ready && (
            <>
              <div className="setup-icon ready"><ShieldCheck size={24} /></div>
              <div className="setup-copy">
                <span>СИСТЕМА ГОТОВА</span>
                <strong>45 секунд · 5 типов движения</strong>
                <p>Следи за импульсом в арене. Live Coach подскажет, как исправить неточное движение до столкновения.</p>
              </div>
              <button className="primary-btn compact" onClick={start}><Play size={17} /> Старт</button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Dashboard() {
  const phase = useMotionStore((s) => s.phase)
  const setPhase = useMotionStore((s) => s.setPhase)
  const resetGame = useMotionStore((s) => s.resetGame)
  const gesture = useMotionStore((s) => s.gesture)

  const recalibrate = () => {
    resetGame()
    setPhase('calibrating')
  }

  const exitRun = () => {
    resetGame()
    setPhase('ready')
  }

  return (
    <main className="app-shell">
      <div className="ambient a1" /><div className="ambient a2" />
      <header className="topbar">
        <div className="brand"><span className="brand-mark">M</span><strong>MOTION//SHIFT</strong></div>
        <div className="top-status">
          <span className="secure"><span className="dot online" /> ON-DEVICE VISION</span>
          <span className="gesture-chip"><Sparkles size={14} /> {gesture.toUpperCase()}</span>
          {phase === 'playing' ? (
            <button className="ghost-btn" onClick={exitRun}><RotateCcw size={15} /> Сброс</button>
          ) : (
            <button className="ghost-btn" onClick={recalibrate}><RefreshCcw size={15} /> Калибровка</button>
          )}
        </div>
      </header>

      <div className="dashboard">
        <div className="left-stack">
          <PoseCamera />
          <GestureGuide />
        </div>
        <GameArena />
      </div>

      <SetupOverlay />
      {phase === 'finished' && <ResultModal />}

      <footer className="app-footer">
        <span>ADMIT HACKATHON 2026 · MOTION CASE</span>
        <span>Pose inference stays in your browser · leaderboard stores score only</span>
      </footer>
    </main>
  )
}

export default function App() {
  const phase = useMotionStore((s) => s.phase)
  return phase === 'landing' ? <Landing /> : <Dashboard />
}
