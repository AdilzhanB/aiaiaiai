import { motion } from 'framer-motion'
import { Camera, ChevronRight, Crosshair, ScanFace, ShieldCheck, Sparkles } from 'lucide-react'
import { audio } from '../motion/audio'
import { useMotionStore } from '../store'

const features = [
  { icon: ScanFace, title: '33 pose points', text: 'MediaPipe работает прямо в браузере' },
  { icon: Crosshair, title: '5 движений', text: 'Своя геометрическая логика поверх landmarks' },
  { icon: ShieldCheck, title: 'Error mode', text: 'Конкретная подсказка ещё до ошибки' }
]

export default function Landing() {
  const setPhase = useMotionStore((s) => s.setPhase)

  const enter = () => {
    audio.unlock()
    setPhase('camera')
  }

  return (
    <main className="landing-shell">
      <div className="ambient a1" /><div className="ambient a2" />
      <nav className="landing-nav">
        <div className="brand"><span className="brand-mark">M</span><strong>MOTION//SHIFT</strong></div>
        <span className="hack-tag">ADMIT HACKATHON · 2026</span>
      </nav>

      <section className="hero">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .55 }}
        >
          <div className="hero-kicker"><Sparkles size={16} /> CAMERA IS THE CONTROLLER</div>
          <h1>Твоё тело.<br/><em>Твой джойстик.</em></h1>
          <p>
            Реакционная игра, где камера считывает позу в реальном времени.
            Уклоняйся, приседай, поднимай руки и активируй щит — без клавиатуры и мыши.
          </p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={enter}>
              <Camera size={19} /> Запустить камеру <ChevronRight size={18} />
            </button>
            <span className="privacy-note">Видео не отправляется на сервер</span>
          </div>
        </motion.div>

        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: .92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: .7, delay: .1 }}
        >
          <div className="hero-grid" />
          <div className="silhouette">
            <span className="head" />
            <span className="body-line l1" /><span className="body-line l2" />
            <span className="body-line l3" /><span className="body-line l4" />
            <span className="body-line l5" />
            {[0,1,2,3,4,5,6,7].map((i) => <i key={i} className={`joint j${i}`} />)}
          </div>
          <div className="hero-hud hud-a"><span>POSE</span><strong>TRACKING</strong><i /></div>
          <div className="hero-hud hud-b"><span>LATENCY</span><strong>&lt; 50ms</strong></div>
          <div className="hero-hud hud-c"><span>ERROR COACH</span><strong>LIVE</strong><i /></div>
        </motion.div>
      </section>

      <section className="feature-strip">
        {features.map(({ icon: Icon, title, text }) => (
          <div className="feature" key={title}>
            <Icon size={22} />
            <div><strong>{title}</strong><span>{text}</span></div>
          </div>
        ))}
      </section>
    </main>
  )
}
