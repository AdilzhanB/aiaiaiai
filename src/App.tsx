import {
  Home,
  Trophy,
  Volume2,
  VolumeX
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import GameArena from './components/GameArena'
import Landing from './components/Landing'
import LeaderboardPage from './components/LeaderboardPage'
import { CountdownScene, LaunchScene } from './components/LaunchScene'
import MotionLab from './components/MotionLab'
import PoseCamera from './components/PoseCamera'
import ResultModal from './components/ResultModal'
import SetupScene from './components/SetupScene'
import { audio } from './motion/audio'
import { useMotionStore } from './store'

function ProductHeader() {
  const phase = useMotionStore((s) => s.phase)
  const voiceEnabled = useMotionStore((s) => s.voiceEnabled)
  const toggleVoice = useMotionStore((s) => s.toggleVoice)
  const setPhase = useMotionStore((s) => s.setPhase)

  const quiet = phase === 'playing' || phase === 'countdown'

  return (
    <header className={`experience-header ${quiet ? 'quiet' : ''}`}>
      <button className="brand-lockup compact" onClick={() => setPhase('landing')}>
        <span className="brand-glyph">R</span>
        <span>
          <strong>RIFT//RUNNER</strong>
          <small>MOTION ARCADE</small>
        </span>
      </button>

      <div className="experience-actions">
        <button
          className="icon-action"
          onClick={() => {
            toggleVoice()
            if (voiceEnabled) audio.stopVoice()
          }}
          aria-label="Voice coach"
        >
          {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span>{voiceEnabled ? 'VOICE ON' : 'VOICE OFF'}</span>
        </button>

        {!quiet && (
          <>
            <button className="icon-action" onClick={() => setPhase('leaderboard')}>
              <Trophy size={18} /><span>RECORDS</span>
            </button>
            <button className="icon-action" onClick={() => setPhase('landing')}>
              <Home size={18} /><span>HOME</span>
            </button>
          </>
        )}
      </div>
    </header>
  )
}

function Experience() {
  const phase = useMotionStore((s) => s.phase)
  const miniCamera =
    phase === 'ready' ||
    phase === 'countdown' ||
    phase === 'playing' ||
    phase === 'finished'

  return (
    <main className={`experience phase-${phase}`}>
      <div className="noise" />
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <ProductHeader />

      <div className={`experience-layout ${miniCamera ? 'camera-floating' : ''}`}>
        <PoseCamera variant={miniCamera ? 'mini' : 'setup'} />

        <div className="experience-scene">
          <AnimatePresence mode="wait">
            {phase === 'calibrating' && <SetupScene key="calibrating" />}
            {phase === 'training' && <MotionLab key="training" />}
            {phase === 'ready' && <LaunchScene key="ready" />}
            {phase === 'countdown' && <CountdownScene key="countdown" />}
            {phase === 'playing' && <GameArena key="playing" />}
            {phase === 'finished' && <ResultModal key="finished" />}
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}

export default function App() {
  const phase = useMotionStore((s) => s.phase)

  if (phase === 'landing') return <Landing />
  if (phase === 'leaderboard') return <LeaderboardPage />
  return <Experience />
}
