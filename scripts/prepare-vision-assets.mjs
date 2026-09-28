import { access, copyFile, mkdir, readdir, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const sourceWasm = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const targetWasm = path.join(root, 'public', 'mediapipe', 'wasm')
const targetModels = path.join(root, 'public', 'models')
const modelPath = path.join(targetModels, 'pose_landmarker_lite.task')
const modelUrl = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

async function existsLargeEnough(file, minBytes) {
  try {
    const info = await stat(file)
    return info.isFile() && info.size >= minBytes
  } catch {
    return false
  }
}

async function prepareWasm() {
  await access(sourceWasm)
  await mkdir(targetWasm, { recursive: true })
  const names = await readdir(sourceWasm)
  const assets = names.filter((name) => name.endsWith('.js') || name.endsWith('.wasm'))

  if (!assets.length) throw new Error('MediaPipe WASM assets were not found in node_modules')

  await Promise.all(
    assets.map((name) => copyFile(path.join(sourceWasm, name), path.join(targetWasm, name)))
  )

  console.log(`[vision] copied ${assets.length} MediaPipe WASM assets`)
}

async function prepareModel() {
  await mkdir(targetModels, { recursive: true })

  if (await existsLargeEnough(modelPath, 4_000_000)) {
    console.log('[vision] pose model already present')
    return
  }

  console.log('[vision] downloading pose model')
  const response = await fetch(modelUrl)

  if (!response.ok) throw new Error(`Pose model download failed: HTTP ${response.status}`)

  const data = new Uint8Array(await response.arrayBuffer())
  if (data.byteLength < 4_000_000) {
    throw new Error(`Pose model is unexpectedly small: ${data.byteLength} bytes`)
  }

  const temp = `${modelPath}.tmp`
  await writeFile(temp, data)
  await rename(temp, modelPath)
  console.log(`[vision] pose model ready (${Math.round(data.byteLength / 1024 / 1024)} MB)`)
}

await prepareWasm()
await prepareModel()
