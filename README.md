# MOTION//SHIFT

> **ADMIT Hackathon 2026 · Motion case**  
> Camera instead of a joystick: a browser reaction game controlled by body movement.

MOTION//SHIFT turns the webcam into a controller. The player survives a 45-second Reactor Run by responding to incoming movement prompts. Pose estimation runs directly in the browser; our own geometric rules convert 33 MediaPipe pose landmarks into gestures, confidence scores and corrective feedback.

## Gestures

| Gesture | Recognition rule | Game action |
| --- | --- | --- |
| **PULSE UP** | both wrists above the shoulders | jump |
| **DUCK** | knee-angle squat threshold | duck |
| **SHIFT LEFT** | torso shifts from calibrated center | dodge left |
| **SHIFT RIGHT** | torso shifts from calibrated center | dodge right |
| **SHIELD** | wrists meet close to the chest | activate shield |

MediaPipe supplies pose landmarks only. Gesture classification, calibration, scoring and corrective coaching are implemented in this repository.

## Error mode / Live Coach

The coach explains what is wrong rather than showing a generic recognition failure. Examples:

- **PULSE UP:** “Правая кисть ещё ниже плеча. Подними правую руку выше.”
- **DUCK:** “Согни колени сильнее: сейчас примерно 148°, цель — ниже 125°.”
- **SHIFT LEFT:** “Смести корпус влево ещё примерно на 34% ширины плеч.”
- **SHIELD:** “Сведи кисти ближе друг к другу перед грудью, чтобы замкнуть щит.”

## Reliable local vision runtime

The MediaPipe WASM runtime is served locally by Vite instead of being fetched from a CDN during gameplay.

Before `npm run dev` and `npm run build`, `scripts/prepare-vision-assets.mjs`:

1. copies WASM assets from `node_modules/@mediapipe/tasks-vision/wasm` to `public/mediapipe/wasm`;
2. downloads the official Pose Landmarker Lite model if it is not already present;
3. reuses the local model on subsequent starts.

The generated large files are gitignored.

## Local run

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Open the HTTPS URL printed by Vite, normally:

```text
https://localhost:5173
```

For the leaderboard backend, use a second terminal:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Troubleshooting

If the camera opens but the model does not:

```bash
npm run vision:prepare
```

Then verify:

```text
public/mediapipe/wasm/vision_wasm_internal.wasm
public/models/pose_landmarker_lite.task
```

If calibration does not finish, move farther from the camera until shoulders, wrists, hips, knees and feet are visible.

## Checks

```bash
npm run test
npm run build
python3 -m py_compile backend/app.py
```

GitHub Actions runs the same checks on every push.

## Hackathon provenance

The repository was empty when work on this submission started. The first project commit was created on **28 September 2026 after the official 07:00 UTC+5 hackathon start**. No pre-hackathon application code or assets were imported into this repository.
