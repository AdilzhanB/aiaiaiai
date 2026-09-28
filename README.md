# MOTION//SHIFT

> **ADMIT Hackathon 2026 · Motion case**  
> Camera instead of a joystick: a browser reaction game controlled by body movement.

MOTION//SHIFT turns the webcam into a controller. The player survives a 45-second "reactor run" by responding to incoming movement prompts. Pose estimation runs directly in the browser; our own geometric rules convert 33 MediaPipe pose landmarks into gestures, confidence scores and corrective feedback.

## Why this fits the case

The official case requires real-time webcam motion recognition, at least three different movements, visible feedback, a complete scenario, browser-only use, and an **"Error mode"** that tells the user exactly how to correct an inaccurate movement. MOTION//SHIFT implements all of them.

### Gestures

| Gesture | Recognition rule | Game action |
| --- | --- | --- |
| **PULSE UP** | both wrists above the shoulders | jump over an energy pulse |
| **DUCK** | average knee angle passes the calibrated squat threshold | duck under a beam |
| **SHIFT LEFT** | torso center shifts left from calibrated neutral center | dodge left |
| **SHIFT RIGHT** | torso center shifts right from calibrated neutral center | dodge right |
| **SHIELD** | wrists come together close to the chest | activate energy shield |

The MediaPipe model only provides pose landmarks. Gesture classification, thresholding, calibration, scoring and the error-coaching logic are implemented in this repository.

## Error mode / Live Coach

This is not a generic "gesture not recognized" message. When the current hazard expects a gesture, the app inspects the pose metrics and generates a concrete correction.

Examples:

- PULSE UP: **"Правая кисть ещё ниже плеча. Подними правую руку выше."**
- DUCK: **"Согни колени сильнее: сейчас примерно 148°, цель — ниже 125°."**
- SHIFT LEFT: **"Смести корпус влево ещё примерно на 34% ширины плеч."**
- SHIELD: **"Сведи кисти ближе друг к другу перед грудью, чтобы замкнуть щит."**
- Low camera quality: **"Встань так, чтобы камера видела тело от головы до стоп."**

The coaching starts before the impact window, so the player has time to correct the motion instead of only being told after a miss.

## Complete user scenario

1. Open the web app.
2. Allow camera access.
3. Stand so the full body is visible.
4. Run a 2.4-second calibration.
5. Start a 45-second reactor run.
6. React to movement prompts using only the body.
7. See the skeleton, detected gesture, confidence, score, combo and Live Coach feedback.
8. Finish the run and receive score, accuracy, max combo and reaction statistics.
9. Optionally save the score to the leaderboard.

No keyboard is required during gameplay.

## Tech stack

### Frontend
- React + TypeScript + Vite
- Zustand
- MediaPipe Tasks Vision / Pose Landmarker
- Framer Motion
- Lucide icons
- Web Audio API
- Responsive CSS with mobile-camera support

### Backend
- Flask
- SQLite leaderboard
- Flask-CORS
- Gunicorn for deployment

Video frames and landmarks are **not sent to the Flask server**. Pose inference runs on-device in the browser. The backend only receives leaderboard fields: player name, score, accuracy and max combo.

## Run locally

### 1. Backend

```bash
cd backend
python -m venv .venv
```

macOS / Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

The API starts at `http://127.0.0.1:5050`.

### 2. Frontend

Open a second terminal in the repository root:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Vite proxies `/api` requests to the Flask backend.

## Camera requirements

- Chrome / Edge / Safari with camera permission.
- For local development, `localhost` is accepted as a secure camera context.
- For deployment, use HTTPS.
- Best results: whole body visible, camera approximately 1.5–2.5 m away, light from the front.
- The pose model and WASM runtime are loaded from public CDN / Google-hosted MediaPipe assets on first launch.

## Project structure

```text
.
├── backend/
│   ├── app.py
│   ├── Procfile
│   └── requirements.txt
├── src/
│   ├── components/
│   │   ├── GameArena.tsx
│   │   ├── GestureGuide.tsx
│   │   ├── Landing.tsx
│   │   ├── PoseCamera.tsx
│   │   └── ResultModal.tsx
│   ├── motion/
│   │   ├── audio.ts
│   │   └── gestureEngine.ts
│   ├── api.ts
│   ├── App.tsx
│   ├── store.ts
│   ├── styles.css
│   └── types.ts
├── package.json
└── vite.config.ts
```

## Scoring-oriented features

- **Workability:** camera → calibration → live recognition → game → final result.
- **Error mode:** metric-based, movement-specific correction before impact.
- **Technical implementation:** own gesture rules, adaptive calibration, confidence filtering, clean frontend/backend split.
- **UX/design:** skeleton overlay, motion map, live coach, animated reactor, sound feedback, clear onboarding.
- **Originality:** reaction game built around corrective motion coaching instead of only gesture-triggered buttons.
- **Bonuses:** own recognition logic, leaderboard, mobile-friendly camera layout, sound and VFX.

## Hackathon provenance

The repository was empty when work on this submission started. The first project commit was created on **28 September 2026 after the official 07:00 UTC+5 hackathon start**. No pre-hackathon application code or assets were imported into this repository.

## Planned deployment

A static frontend can be deployed to Vercel / Netlify / Cloudflare Pages and the Flask API to Render / Railway. Set:

```text
VITE_API_URL=https://your-api-host.example
```

when the frontend and API are hosted on different origins.

---

Built for the ADMIT Hackathon Motion qualifying case.
