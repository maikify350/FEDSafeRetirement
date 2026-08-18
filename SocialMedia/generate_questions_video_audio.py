import os
import requests

env_path = r"c:\WIP\FEDSafeRetirement\SocialMedia\.env"
eleven_key = None
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("ELEVENLABS_API_KEY="):
            eleven_key = line.strip().split("=", 1)[1]

VOICE_ID = "pNInz6obpgDQGcFmaJgB" # Adam (Authoritative, calm, trustworthy)

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

headers = {
    "Accept": "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": eleven_key
}

# 3-part synchronized narration matching scenes
parts = {
    "questions-video-part1.mp3": (
        "When federal and postal employees approach retirement, the questions start piling up. "
        "When is the exact best day for me to retire to maximize my pension annuity? "
        "How much will I actually take home after health insurance, taxes, and survivor benefit deductions? "
        "What is the smartest way to draw monthly income from my TSP without taking unnecessary market risk? "
        "And for postal workers, how do the new PSHB and Medicare Part B rules impact your healthcare?"
    ),
    "questions-video-part2.mp3": (
        "These are not questions you want to guess on. A confident answer is not always a correct one. "
        "At FedSafe Retirement, this is all we do. "
        "We are a SAM dot gov registered federal contractor with over eighty combined years of federal benefits experience. "
        "Our founding partners, Ben Bailey, Daniel French, Brian Westrich, and Mike Zaino, work exclusively with federal civil service and postal personnel."
    ),
    "questions-video-part3.mp3": (
        "We help you slow down, verify your numbers, and see your path clearly before you submit your online application. "
        "No generalists. No sales pressure. Just the answers you need to retire with confidence. "
        "The future favors the prepared. Call the number on your screen or visit FedSafe Retirement dot com to schedule your complimentary retirement analysis."
    )
}

output_dir = r"c:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\public"

for fname, text in parts.items():
    out_path = os.path.join(output_dir, fname)
    print(f"Generating: {fname}...")
    data = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.8,
            "style": 0.2,
            "use_speaker_boost": True
        }
    }
    res = requests.post(url, json=data, headers=headers)
    if res.status_code == 200:
        with open(out_path, "wb") as f:
            f.write(res.content)
        print(f"Successfully created {out_path} ({len(res.content)} bytes)")
    else:
        print(f"Error {fname}: {res.status_code} {res.text}")
