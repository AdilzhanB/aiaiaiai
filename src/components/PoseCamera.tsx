import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { Camera, ScanLine } from 'lucide-react'
import { analyzePose, calibrationFromFrames, frameQuality } from '../motion/gestureEngine'
import { useMotionStore } from '../store'
import type { Point, PoseFrame } from '../types'

const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'

const links = [
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]
]

function drawPose(canvas: HTMLCanvasElement, points: Point[], ok: boolean) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const [a, b] of links) {
    const p = points[a]
    const q = points[b]
    if (!p || !q || (p.visibility ?? 0) < .35 || (q.visibility ?? 0) < .35) continue
    ctx.beginPath()
    ctx.moveTo(p.x * w, p.y * h)
    ctx.lineTo(q.x * w, q.y * h)
    ctx.strokeStyle = ok ? 'rgba(117, 255, 210, .88)' : 'rgba(255, 203, 92, .78)'
    ctx.lineWidth = Math.max(2, w / 260)
    ctx.stroke()
  }

  for (const i of [11,12,13,14,15,16,23,24,25,26,27,28]) {
    const p = points[i]
    if (!p || (p.visibility ?? 0) < .35) continue
    ctx.beginPath()
    ctx.arc(p.x * w, p.y * h, Math.max(3, w / 150), 0, Math.PI * 2)
    ctx.fillStyle = ok ? '#75ffd2' : '#ffcb5c'
    ctx.fill()
  }
}

export default function PoseCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const rafRef = useRef<number>(0)
  const lastVideoTime = useRef(-1)
  const calibrationFrames = useRef<PoseFrame[]>([])
  const calibrationStart = useRef(0)
  const [fps, setFps] = useState(0)
  const fpsCounter = useRef({ n: 0, t: performance.now() })

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

    async function boot() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 960 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 60 }
          },
          audio: false
        })
        if (!alive) return
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setCamera(true)

        const vision = await FilesetResolver.forVisionTasks(WASM_ROOT)
        let landmarker: PoseLandmarker
        try {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: .55,
            minPosePresenceConfidence: .55,
            minTrackingConfidence: .55
          })
        } catch {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: POSE_MODEL },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: .5,
            minPosePresenceConfidence: .5,
            minTrackingConfidence: .5
          })
        }
        if (!alive) {
          landmarker.close()
          return
        }
        landmarkerRef.current = landmarker
        setModelReady(true)
        loop()
      } catch (e) {
        const message = e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Доступ к камере запрещён. Разреши камеру в адресной строке и обнови страницу.'
          : 'Не удалось запустить камеру. Проверь HTTPS, разрешение камеры и попробуй снова.'
        setCamera(false, message)
      }
    }

    function loop() {
      if (!alive) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const landmarker = landmarkerRef.current
      if (video && canvas && landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }

        const result = landmarker.detectForVideo(video, performance.now())
        const raw = result.landmarks?.[0]
        if (raw) {
          const points: Point[] = raw.map((p) => ({
            x: 1 - p.x,
            y: p.y,
            z: p.z,
            visibility: p.visibility
          }))
          const quality = frameQuality(points)
          drawPose(canvas, points, quality > .55)

          if (useMotionStore.getState().phase === 'calibrating') {
            if (!calibrationStart.current) calibrationStart.current = performance.now()
            calibrationFrames.current.push({ points, timestamp: performance.now() })
            if (calibrationFrames.current.length > 90) calibrationFrames.current.shift()
            if (performance.now() - calibrationStart.current > 2400) {
              const c = calibrationFromFrames(calibrationFrames.current)
              if (c.ready) {
                setCalibration(c)
                setPhase('ready')
                calibrationFrames.current = []
                calibrationStart.current = 0
              } else {
                calibrationFrames.current = []
                calibrationStart.current = performance.now()
              }
            }
          } else {
            calibrationFrames.current = []
            calibrationStart.current = 0
            const c = useMotionStore.getState().calibration
            if (c.ready) setMotion(analyzePose(points, c))
          }
        }

        fpsCounter.current.n += 1
        const now = performance.now()
        if (now - fpsCounter.current.t > 1000) {
          setFps(Math.round(fpsCounter.current.n * 1000 / (now - fpsCounter.current.t)))
          fpsCounter.current = { n: 0, t: now }
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    void boot()
    return () => {
      alive = false
      cancelAnimationFrame(rafRef.current)
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      stream?.getTracks().forEach((t) => t.stop())
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
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
        <div className="scan-line" />
        <div className="corner tl" /><div className="corner tr" />
        <div className="corner bl" /><div className="corner br" />
        {!cameraReady && !cameraError && (
          <div className="camera-loading">
            <ScanLine size={28} />
            <strong>Инициализация камеры</strong>
            <span>разреши доступ в браузере</span>
          </div>
        )}
        {cameraError && (
          <div className="camera-loading error">
            <strong>Камера недоступна</strong>
            <span>{cameraError}</span>
          </div>
        )}
        {phase === 'calibrating' && (
          <div className="calibration-overlay">
            <div className="calibration-ring" />
            <strong>Калибровка</strong>
            <span>Встань прямо · руки опусти · всё тело в кадре</span>
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
