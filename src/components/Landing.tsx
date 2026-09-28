import { motion } from 'framer-motion'
import {
  ArrowRight,
  AudioLines,
  Camera,
  ChevronRight,
  Gamepad2,
  ShieldCheck,
  Sparkles,
  Trophy
} from 'lucide-react'
import { audio } from '../motion/audio'
import { useMotionStore } from '../store'

const gestures = [
  ['↟', 'BOOST'],
  ['⇣', 'DUCK'],
  ['←', 'LEFT'],
  ['→', 'RIGHT'],
  ['◇', 'SHIELD']
]

export default function Landing() {
  const setPhase = useMotionStore((s) => s.setPhase)
  const resetCalibration = useMotionStore((s) => s.resetCalibration)
  const resetRun = useMotionStore((s) => s.resetRun)

  const play = () => {
    audio.unlock()
    resetRun()
    resetCalibration()
    setPhase('calibrating')
  }

  return (
    <main className="landing">
      <div className="noise" />
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />

      <nav className="product-nav">
        <button className="brand-lockup" onClick={() => setPhase('landing')}>
          <span className="brand-glyph">R</span>
          <span>
            <strong>RIFT//RUNNER</strong>
            <small>MOTION ARCADE</small>
          </span>
        </button>

        <div className="nav-actions">
          <button className="nav-link" onClick={() => setPhase('leaderboard')}>
            <Trophy size={16} /> Рекорды
          </button>
          <button className="nav-cta" onClick={play}>
            Играть <ChevronRight size={16} />
          </button>
        </div>
      </nav>

      <section className="landing-hero">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="hero-kicker">
            <span className="live-dot" />
            BODY-CONTROLLED ARCADE
          </div>

          <h1>
            Пройди рифт.
            <span>Телом.</span>
          </h1>

          <p>
            Ты управляешь пилотом без клавиатуры и геймпада. Камера видит
            движение верхней части тела, а игра превращает наклоны, присед,
            поднятые руки и щит в реальные манёвры.
          </p>

          <div className="hero-actions">
            <button className="hero-play" onClick={play}>
              <Camera size={20} />
              Войти в рифт
              <ArrowRight size={20} />
            </button>
            <button className="hero-secondary" onClick={() => setPhase('leaderboard')}>
              <Trophy size={18} /> Таблица пилотов
            </button>
          </div>

          <div className="hero-trust">
            <span><ShieldCheck size={16} /> Видео остаётся в браузере</span>
            <span><AudioLines size={16} /> Голосовой Motion Coach</span>
          </div>
        </motion.div>

        <motion.div
          className="rift-showcase"
          initial={{ opacity: 0, scale: 0.9, rotateY: -8 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 0.8, delay: 0.08 }}
        >
          <div className="rift-grid" />
          <div className="rift-orbit orbit-a" />
          <div className="rift-orbit orbit-b" />
          <div className="rift-orbit orbit-c" />
          <motion.div
            className="core-ship"
            animate={{ y: [-8, 8, -8], rotate: [-3, 3, -3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span />
            <i />
          </motion.div>

          <div className="showcase-card card-left">
            <Gamepad2 size={16} />
            <span>CONTROLLER</span>
            <strong>YOUR BODY</strong>
          </div>

          <div className="showcase-card card-right">
            <Sparkles size={16} />
            <span>LIVE COACH</span>
            <strong>ACTIVE</strong>
          </div>

          <div className="gesture-ribbon">
            {gestures.map(([icon, name]) => (
              <div key={name}>
                <b>{icon}</b>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="product-story">
        <article>
          <span>01</span>
          <h3>Калибруй</h3>
          <p>2.4 секунды — игра запоминает твою нейтральную стойку и масштаб тела.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Пройди Motion Lab</h3>
          <p>Пять коротких движений проверяются до старта, чтобы в забеге не было сюрпризов.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Выживи 60 секунд</h3>
          <p>Три сектора, растущий темп, комбо, целостность корабля и финальный результат.</p>
        </article>
      </section>
    </main>
  )
}
