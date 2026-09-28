import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { Camera, RefreshCw, ScanLine } from 'lucide-react'
import { analyzePose, calibrationFromFrames, frameQuality } from '../motion/gestureEngine'
import { useMotionStore } from '../store'
import type { Point, PoseFrame } from '../types'

const WASM_ROOT = '/mediapipe/wasm'
const MODEL_URL = '/models/pose_landmarker_lite.task'

const LINKS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28]
]

const LANDMARK_IDS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

function readableError(value: unknown) {
  if (value instanceof Error) return `${value.name}: ${value.message}`
  if (value instanceof Event) {
    const target = value.target
    if (target instanceof HTMLScriptElement && target.src) {
      return `${value.type}: ${target.src}`
    }
    return `Browser event: ${value.type}`
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function drawPose(canvas: HTMLCanvasElement, points: Point[], ok: boolean) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const [a, b] of LINKS) {
    const p = points[a]
    const q = points[b]
    if (!p || !q || (p.visibility ?? 0) < .35 || (q.visibility ?? 0) < .35) continue

    ctx.beginPath()
    ctx.moveTo(p.x * w, p.y * h)
    ctx.lineTo(q.x * w, q.y * h)
    ctx.strokeStyle = ok ? 'rgba(117,255,210,.94)' : 'rgba(255,203,92,.88)'
    ctx.lineWidth = Math.max(2, w / 260)
    ctx.stroke()
  }

  for (const id of LANDMARK_IDS) {
    const p = points[id]
    if (!p || (p.visibility ?? 0) < .35) continue

    ctx.beginPath()
    ctx.arc(p.x * w, p.y * h, Math.max(3, w / 150), 0, Math.PI * 2)
    ctx.fillStyle = ok ? '#75ffd2' : '#ffcb5c'
    ctx.shadowBlur = 12
    ctx.shadowColor = ok ? '#75ffd2' : '#ffcb5c'
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

export default function PoseCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const rafRef = useRef(0)
  const lastVideoTime = useRef(-1)
  const calibrationFrames = useRef<PoseFrame[]>([])
  const calibrationStart = useRef(0)
  const fpsCounter = useRef({ n: 0, t: performance.now() })
  const [fps, setFps] = useState(0)
  const [visionError, setVisionError] = useState('')

  const phase = useMotionStore((s) => s.phase)
  const calibration = useMotionStore((s) => s.calibration)
  const setCalibration = useMotionStore((s) => s.setCalibration)
  const setMotion = useMotionStore((s) => s.setMotion)
  const setCamera = useMotionStore((s) => s.setCamera)
  const setModelReady = useMotionStore((s) => s.setModelReady)
  const setPhase = useMotionStore((s) => s.setPhase)
  const cameraReady = useMotionStore((s) => s.cameraReady)
  const modelReady = useMotionStore((s) => s.modelReady)
  const cameraError = useMotionStore((s) => s.cameraError)

  useEffect(() => {
    let alive = true
    let stream: MediaStream | null = null

    const clearCanvas = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    const startCamera = async () => {
      if (!window.isSecureContext) {
        throw new Error('Camera API requires HTTPS or localhost')
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia is not available in this browser')
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      })

      if (!alive) return

      const video = videoRef.current
      if (!video) throw new Error('Camera video element is unavailable')

      video.srcObject = stream
      await video.play()
      setCamera(true, '')
    }

    const startModel = async () => {
      setVisionError('')
      setModelReady(false)

      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT)
      if (!alive) return

      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: .48,
        minPosePresenceConfidence: .48,
        minTrackingConfidence: .48
      })

      if (!alive) {
        landmarker.close()
        return
      }

      landmarkerRef.current?.close()
      landmarkerRef.current = landmarker
      setModelReady(true)
      setVisionError('')
    }

    const processPose = (points: Point[]) => {
      const quality = frameQuality(points)
      const canvas = canvasRef.current
      if (canvas) drawPose(canvas, points, quality > .55)

      const state = useMotionStore.getState()

      if (state.phase === 'calibrating') {
        if (!calibrationStart.current) calibrationStart.current = performance.now()

        calibrationFrames.current.push({ points, timestamp: performance.now() })
        if (calibrationFrames.current.length > 100) calibrationFrames.current.shift()

        if (performance.now() - calibrationStart.current >= 2400) {
          const next = calibrationFromFrames(calibrationFrames.current)

          if (next.ready) {
            setCalibration(next)
            setPhase('ready')
            calibrationFrames.current = []
            calibrationStart.current = 0
          } else {
            calibrationFrames.current = []
            calibrationStart.current = performance.now()
          }
        }
        return
      }

      calibrationFrames.current = []
      calibrationStart.current = 0

      if (state.calibration.ready) {
        setMotion(analyzePose(points, state.calibration))
      }
    }

    const loop = () => {
      if (!alive) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const landmarker = landmarkerRef.current

      if (
        video &&
        canvas &&
        landmarker &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        video.currentTime !== lastVideoTime.current
      ) {
        lastVideoTime.current = video.currentTime

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }

        try {
          const result = landmarker.detectForVideo(video, performance.now())
          const raw = result.landmarks?.[0]

          if (raw?.length) {
            const points: Point[] = raw.map((p) => ({
              x: 1 - p.x,
              y: p.y,
              z: p.z,
              visibility: p.visibility
            }))
            processPose(points)
          } else {
            clearCanvas()
          }

          fpsCounter.current.n += 1
          const now = performance.now()
          const elapsed = now - fpsCounter.current.t
          if (elapsed >= 1000) {
            setFps(Math.round(fpsCounter.current.n * 1000 / elapsed))
            fpsCounter.current = { n: 0, t: now }
          }
        } catch (error) {
          console.error('[MOTION] inference error', error)
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    const boot = async () => {
      setCamera(false, '')
      setModelReady(false)
      setVisionError('')

      try {
        await startCamera()
      } catch (error) {
        console.error('[MOTION] camera startup error', error)

        let message = readableError(error)
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          message = 'Доступ к камере запрещён. Разреши камеру для этого сайта и обнови страницу.'
        } else if (error instanceof DOMException && error.name === 'NotFoundError') {
          message = 'Камера не найдена на устройстве.'
        } else if (error instanceof DOMException && error.name === 'NotReadableError') {
          message = 'Камера уже используется другим приложением. Закрой FaceTime/Zoom/OBS и попробуй снова.'
        }

        setCamera(false, message)
        return
      }

      try {
        await startModel()
        loop()
      } catch (error) {
        console.error('[MOTION] MediaPipe startup error', error)
        setModelReady(false)
        setVisionError(readableError(error))
      }
    }

    void boot()

    return () => {
      alive = false
      cancelAnimationFrame(rafRef.current)
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [setCalibration, setCamera, setModelReady, setMotion, setPhase])

  return (
    <section className="camera-panel glass">
      <div className="panel-head">
        <div className="eyebrow"><Camera size={14} /> LIVE VISION</div>
        <div className="status-row">
          <span className={cameraReady ? 'dot online' : 'dot'} />
          <span>{cameraReady ? 'camera' : 'waiting'}</span>
          <span className={modelReady ? 'dot online' : 'dot'} />
          <span>{modelReady ? `${fps} fps` : 'model'}</span>
        </div>
      </div>

      <div className="camera-stage">
        <video ref={videoRef} playsInline muted autoPlay />
        <canvas ref={canvasRef} />
        <div className="scan-line" />
        <div className="corner tl" /><div className="corner tr" />
        <div className="corner bl" /><div className="corner br" />

        {!cameraReady && !cameraError && (
          <div className="camera-loading">
            <ScanLine size={28} />
            <strong>Инициализация камеры</strong>
            <span>Разреши доступ к камере в браузере.</span>
          </div>
        )}

        {cameraReady && !modelReady && !visionError && (
          <div className="camera-loading">
            <ScanLine size={28} />
            <strong>Загрузка Motion AI</strong>
            <span>Запускаю локальный MediaPipe Pose Landmarker…</span>
          </div>
        )}

        {cameraError && (
          <div className="camera-loading error">
            <strong>Camera Error</strong>
            <span>{cameraError}</span>
          </div>
        )}

        {visionError && (
          <div className="camera-loading error">
            <strong>Vision Engine Error</strong>
            <span>{visionError}</span>
            <button className="ghost-btn" type="button" onClick={() => window.location.reload()}>
              <RefreshCw size={15} /> Повторить
            </button>
          </div>
        )}

        {phase === 'calibrating' && modelReady && (
          <div className="calibration-overlay">
            <div className="calibration-ring" />
            <strong>Калибровка</strong>
            <span>Отойди на 1.5–2.5 м · руки опусти · плечи, кисти, колени и стопы должны быть в кадре</span>
          </div>
        )}
      </div>

      <div className="camera-foot">
        <span>Pose landmarks · 33 points</span>
        <span className={calibration.ready ? 'accent' : ''}>
          {calibration.ready ? 'CALIBRATED' : 'NOT CALIBRATED'}
        </span>
      </div>
    </section>
  )
}
