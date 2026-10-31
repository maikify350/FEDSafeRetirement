#!/usr/bin/env python3
"""Loudness check for a finished render, at the level short-video apps play: -14 LUFS integrated, true peak ≤ -1.5 dBTP.

usage: loudness.py <mp4>          measure, print PASS or FAIL, exit 1 on FAIL
       loudness.py <mp4> --fix    write <name>.loud.mp4 next to it (two-pass loudnorm, video stream copied)
"""
import json
import re
import subprocess
import sys
from pathlib import Path

TARGET, PEAK, TOL = -14.0, -1.5, 1.0


def measure(mp4, extra=""):
    err = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(mp4), "-af", f"loudnorm=I={TARGET}:TP={PEAK}:LRA=11{extra}:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    blobs = re.findall(r"\{[^{}]+\}", err)
    if not blobs:
        sys.exit("loudness: ffmpeg returned no measurement (no audio stream?)")
    return json.loads(blobs[-1])


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    mp4 = Path(sys.argv[1])
    m = measure(mp4)
    i, tp = float(m["input_i"]), float(m["input_tp"])
    ok = abs(i - TARGET) <= TOL and tp <= PEAK
    print(f"{'PASS' if ok else 'FAIL'}  loudness    {i:.1f} LUFS (target {TARGET} ±{TOL}), true peak {tp:.1f} dBTP (max {PEAK})")
    if "--fix" in sys.argv:
        out = mp4.with_suffix(".loud.mp4")
        extra = f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp4), "-af", f"loudnorm=I={TARGET}:TP={PEAK - 0.5}:LRA=11{extra}", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", str(out)], check=True)
        m2 = measure(out)
        print(f"fixed → {out.name}: {float(m2['input_i']):.1f} LUFS, {float(m2['input_tp']):.1f} dBTP")
        sys.exit(0)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
