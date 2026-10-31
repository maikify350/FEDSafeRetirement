#!/usr/bin/env python3
"""Render checks for an explainer MP4: catch the defects a viewer feels before anyone sees the video.

usage: check_render.py <mp4> [--shots shots.json] [--json]

Each check prints PASS, WARN or FAIL with the reason; exit code 1 on any FAIL. Needs ffmpeg and numpy.

  freeze      nothing moves for longer than MAX_STILL seconds (the final hold is allowed)
  cut         one frame changes far more than both neighbours (a hard cut or snap)
  speed       any quarter second moves faster than SPEED_LIMIT mean grey-level change (a whip, zoom or pan too fast)
  jump        a near-frozen second followed by a fast one (freeze then jump)
  short_shot  with --shots, a shot on screen under MIN_SHOT seconds
"""
import json
import subprocess
import sys

import numpy as np

W, H, FPS = 108, 192, 30
MAX_STILL = 1.2
SPEED_LIMIT = 12.0
CUT_LIMIT = 30.0
MIN_SHOT = 2.0
results = []


def say(level, check, msg, **extra):
    results.append({"check": check, "level": level, "message": msg, **extra})
    print(f"{level:4}  {check:11} {msg}")


def frames(mp4):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", mp4, "-vf", f"fps={FPS},scale={W}:{H},format=gray", "-f", "rawvideo", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    mp4 = sys.argv[1]
    shots = None
    if "--shots" in sys.argv:
        shots = json.load(open(sys.argv[sys.argv.index("--shots") + 1]))

    a = frames(mp4)
    if len(a) < 3:
        say("FAIL", "decode", f"only {len(a)} frames decoded")
        return finish()
    diff = np.abs(a[1:] - a[:-1]).mean(axis=(1, 2))  # per-frame motion, 0..255

    # freeze
    still = diff < 0.12
    worst, start = (0.0, 0.0), None
    for i, q in enumerate(list(still) + [False]):
        if q and start is None:
            start = i
        elif not q and start is not None:
            if i < len(diff) - 2 and (i - start) / FPS > worst[0]:
                worst = ((i - start) / FPS, start / FPS)
            start = None
    say("FAIL" if worst[0] > MAX_STILL else "PASS", "freeze", f"longest still stretch {worst[0]:.2f}s at {worst[1]:.2f}s (limit {MAX_STILL}s)")

    # cut / snap
    cuts = [i for i in range(1, len(diff) - 1) if diff[i] > CUT_LIMIT and diff[i] > 2.5 * max(diff[i - 1], diff[i + 1], 0.1)]
    if cuts:
        say("FAIL", "cut", f"{len(cuts)} hard cut(s) at " + ", ".join(f"{c / FPS:.2f}s" for c in cuts[:8]), at=[round(c / FPS, 2) for c in cuts])
    else:
        say("PASS", "cut", "no single-frame cuts or snaps")

    # speed per quarter second
    q = FPS // 4
    quarters = [diff[i:i + q].mean() for i in range(0, len(diff) - q + 1, q)]
    fast = [(i * q / FPS, v) for i, v in enumerate(quarters) if v > SPEED_LIMIT]
    if fast:
        say("FAIL", "speed", f"{len(fast)} quarter-second(s) over {SPEED_LIMIT}: " + ", ".join(f"{t:.2f}s={v:.1f}" for t, v in fast[:8]), at=[round(t, 2) for t, _ in fast])
    else:
        say("PASS", "speed", f"camera never faster than {max(quarters):.1f} (limit {SPEED_LIMIT})")

    # freeze then jump, per second
    secs = [diff[i:i + FPS].mean() for i in range(0, len(diff) - FPS + 1, FPS)]
    jumps = [i + 1 for i in range(len(secs) - 1) if secs[i] < 1.0 and secs[i + 1] > 8.0]
    if jumps:
        say("WARN", "jump", "near-freeze then a jump at " + ", ".join(f"{j}s" for j in jumps))
    else:
        say("PASS", "jump", "no freeze-then-jump")

    # shot lengths
    if shots:
        short = [s for s in shots if (s.get("timestamp_end", 0) - s.get("timestamp_start", 0)) < MIN_SHOT]
        if short:
            say("WARN", "short_shot", f"{len(short)} shot(s) under {MIN_SHOT}s: " + ", ".join(str(s.get("order")) for s in short))
        else:
            say("PASS", "short_shot", f"every shot on screen at least {MIN_SHOT}s")

    return finish()


def finish():
    fails = sum(1 for r in results if r["level"] == "FAIL")
    if "--json" in sys.argv:
        print(json.dumps({"pass": fails == 0, "results": results}))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
