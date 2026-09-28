import { Camera, ScanFace, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMotionStore } from '../store'
import GestureGuide from './GestureGuide'

export default function SetupScene() {
  const cameraReady = useMotionStore((s) => s.cameraReady)
  const modelReady = useMotionStore((s) => s.modelReady)

  return (
    <motion.section
      className="setup-scene scene-card"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="scene-eyebrow">
        <Sparkles size={16} /> AUTO CALIBRATION
      </div>

      <h1>Встань естественно.</h1>
      <p className="scene-lead">
        Нужны только голова, плечи и кисти — отходить на три метра больше не
        нужно. Оптимальная дистанция обычно около 1–1.5 м.
      </p>

      <div className="setup-status">
        <div className={cameraReady ? 'ready' : ''}>
          <Camera size={22} />
          <span>Камера</span>
          <strong>{cameraReady ? 'готова' : 'подключаю'}</strong>
        </div>
        <div className={modelReady ? 'ready' : ''}>
          <ScanFace size={22} />
          <span>Motion AI</span>
          <strong>{modelReady ? 'готов' : 'загружаю'}</strong>
        </div>
      </div>

      <div className="calibration-instructions">
        <div><b>1</b><span>Смотри в камеру</span></div>
        <div><b>2</b><span>Опусти руки</span></div>
        <div><b>3</b><span>Не двигайся пару секунд</span></div>
      </div>

      <GestureGuide />

      <div className="auto-progress">
        <span />
        <small>Калибровка начнётся автоматически, когда Motion AI увидит позу.</small>
      </div>
    </motion.section>
  )
}
