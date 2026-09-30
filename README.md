# RIFT//RUNNER

**RIFT//RUNNER** is a motion-controlled browser arcade where the player's upper body becomes the controller.

The player pilots a core through a 60-second neon rift. Incoming hazards require a physical response: shift left, shift right, duck, raise both hands for BOOST, or bring the hands together for SHIELD. The game sees the movement through an ordinary webcam, translates pose landmarks into custom gesture rules, animates the pilot, scores the reaction, and gives immediate corrective coaching when the movement is inaccurate.

## Product flow

The experience is intentionally more than a camera demo:

1. **Home** — product introduction and game premise.
2. **Auto Calibration** — learns the neutral shoulder position and body scale in about 2.4 seconds.
3. **Motion Lab** — verifies all five gestures one by one before gameplay.
4. **Hands-up Launch** — the run starts by holding BOOST, so the transition into the game is itself motion-controlled.
5. **Rift Run** — a 60-second, three-sector survival sequence with score, combo, integrity, sound, large distance-readable cues and live corrective coaching.
6. **Results** — score, accuracy, max combo and remaining integrity.
7. **Leaderboard** — optional Flask-backed top scores.

## Gestures

| Gesture | Player movement | Game action |
| --- | --- | --- |
| **LEFT** | lean head + upper body left, or shift left | dodge left |
| **RIGHT** | lean head + upper body right, or shift right | dodge right |
| **DUCK** | lower head and shoulders | pass below a pulse |
| **BOOST** | raise both wrists above the shoulder line | boost through a gate |
| **SHIELD** | bring both wrists together near the chest | absorb an energy impact |

Only the **upper body** is required. The player normally stands around 1–1.5 metres from a laptop rather than several metres away.

## Motion Coach

RIFT//RUNNER does not stop at “gesture not recognized”. For the currently required action it inspects geometric pose metrics and explains the correction.

Examples:

- “Подними правую кисть выше линии плеч.”
- “Присядь ниже: опусти голову и плечи ещё примерно на 24% ширины плеч.”
- “Наклони голову и верх корпуса влево ещё немного. Шагать не нужно.”
- “Сведи кисти ближе друг к другу перед грудью.”

During the run these messages are deliberately large and the optional voice coach reads them aloud, so the player can react without standing next to the screen.

## Recognition architecture

MediaPipe Pose Landmarker provides landmarks. The gameplay gestures are classified by project-specific rules in `src/motion/gestureEngine.ts`.

The engine uses:

- calibrated shoulder midpoint;
- calibrated shoulder width as a scale-normalized unit;
- wrist height relative to shoulders;
- head + shoulder vertical displacement for DUCK;
- a calibrated blend of shoulder translation and head/upper-body lean for LEFT/RIGHT;
- normalized wrist-to-wrist and wrist-to-chest distances for SHIELD;
- landmark visibility as a confidence gate.

This makes the gesture layer independent of absolute pixel resolution and reasonably tolerant of different camera distances.

## Tech stack

### Client
- React
- TypeScript
- Vite
- Zustand
- MediaPipe Tasks Vision
- Framer Motion
- Lucide
- Web Audio API
- Web Speech API
- responsive glassmorphism / CSS perspective effects

### Server
- Flask
- SQLite
- Flask-CORS
- Gunicorn

Camera frames never go to Flask. Pose inference happens in the browser. The server only stores leaderboard fields.

## Reliable local vision assets

The MediaPipe WASM runtime is served locally instead of being fetched from a CDN while the game is running.

Before both `npm run dev` and `npm run build`, the script `scripts/prepare-vision-assets.mjs`:

1. copies MediaPipe WASM assets from `node_modules/@mediapipe/tasks-vision/wasm` into `public/mediapipe/wasm`;
2. downloads the official Pose Landmarker Lite model if it is missing;
3. reuses the local model on later starts.

The generated model and WASM files are ignored by Git because they are reproducible build assets.

## Local development

Install frontend dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Open the HTTPS URL shown by Vite, normally:

```text
https://localhost:5173
```

The local certificate is self-signed, so the browser may ask you to continue once.

Start the leaderboard API in a second terminal:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The Flask API listens on:

```text
http://127.0.0.1:5050
```

Vite proxies `/api` requests to Flask.

## Useful commands

Prepare local MediaPipe assets manually:

```bash
npm run vision:prepare
```

Run unit tests:

```bash
npm run test
```

Production build:

```bash
npm run build
```

Check the backend:

```bash
python3 -m py_compile backend/app.py
```

## Project structure

```text
src/
├── components/
│   ├── GameArena.tsx
│   ├── GestureGuide.tsx
│   ├── Landing.tsx
│   ├── LaunchScene.tsx
│   ├── LeaderboardPage.tsx
│   ├── MotionLab.tsx
│   ├── PoseCamera.tsx
│   ├── ResultModal.tsx
│   └── SetupScene.tsx
├── motion/
│   ├── audio.ts
│   ├── gestureEngine.test.ts
│   └── gestureEngine.ts
├── api.ts
├── App.tsx
├── main.tsx
├── store.ts
├── styles.css
└── types.ts

backend/
├── app.py
├── Procfile
└── requirements.txt
```

## Camera tips

- Keep your face, shoulders and both hands visible.
- Front lighting gives the most stable tracking.
- A distance around 1–1.5 m usually works well on a laptop.
- If Motion Lab cannot confirm a gesture, follow the on-screen coach rather than moving randomly.

## Deployment

The recommended setup is:

- **Frontend:** Vercel
- **Leaderboard API:** Render

Both provide HTTPS, which is required for webcam access outside localhost.

### 1. Deploy the Flask API on Render

Create a new Render Blueprint or Web Service from this repository. The included `render.yaml` already defines the backend service.

After deployment, copy the public API URL, for example:

```text
https://rift-runner-api.onrender.com
```

Verify:

```text
https://rift-runner-api.onrender.com/api/health
```

It should return JSON with `"ok": true`.

> The current leaderboard uses SQLite. On hosts with ephemeral filesystems, leaderboard rows can reset after a redeploy/restart. This does not affect camera tracking or gameplay.

### 2. Deploy the frontend on Vercel

Import this GitHub repository into Vercel. The included `vercel.json` uses:

```text
Build command: npm run build
Output directory: dist
```

Add this environment variable in Vercel:

```text
VITE_API_URL=https://your-render-api-domain
```

Then redeploy.

The production site will be served over HTTPS, so webcam access works without the local self-signed certificate.

### 3. Production smoke test

Open the deployed site and verify this complete flow:

```text
Home
→ Camera permission
→ Calibration
→ Motion Lab
→ Hands-up launch
→ 60-second run
→ Results
→ Leaderboard
```

If camera permission is denied, use the browser site-permission control and allow Camera for the deployed HTTPS domain.
