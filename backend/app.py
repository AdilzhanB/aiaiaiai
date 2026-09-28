import os
import sqlite3
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.environ.get("MOTION_DB", os.path.join(os.path.dirname(__file__), "motion.db"))


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            score INTEGER NOT NULL,
            accuracy INTEGER NOT NULL,
            max_combo INTEGER NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def top_scores(limit=10):
    conn = db()
    rows = conn.execute(
        """
        SELECT id, name, score, accuracy, max_combo, created_at
        FROM scores
        ORDER BY score DESC, accuracy DESC, max_combo DESC, id ASC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.get("/api/health")
def health():
    return jsonify(ok=True, service="motion-shift-api")


@app.get("/api/leaderboard")
def leaderboard():
    return jsonify(top_scores())


@app.post("/api/leaderboard")
def add_score():
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "PLAYER")).strip()[:18] or "PLAYER"

    try:
        score = max(0, min(int(payload.get("score", 0)), 999999))
        accuracy = max(0, min(int(payload.get("accuracy", 0)), 100))
        max_combo = max(0, min(int(payload.get("max_combo", 0)), 999))
    except (TypeError, ValueError):
        return jsonify(error="invalid numeric values"), 400

    conn = db()
    conn.execute(
        "INSERT INTO scores(name, score, accuracy, max_combo, created_at) VALUES (?, ?, ?, ?, ?)",
        (name, score, accuracy, max_combo, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    conn.close()
    return jsonify(ok=True, leaderboard=top_scores())


init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5050")), debug=True)
