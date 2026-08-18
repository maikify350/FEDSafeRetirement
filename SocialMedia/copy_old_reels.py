import shutil
import os

src1 = r"c:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\out\fedsafe-june28-webinar-reel-final-vocalfocus-music05.mp4"
dst1 = r"G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Social\fedsafe-june28-webinar-reel_old.mp4"

src2 = r"c:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\out\fedsafe-who-we-are-homepage-video.mp4"
dst2 = r"G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Social\fedsafe-who-we-are-homepage-video_old.mp4"

print("Copying old reel...")
shutil.copy2(src1, dst1)
print(f"Copied {dst1} ({os.path.getsize(dst1)} bytes)")

print("Copying old brand video...")
shutil.copy2(src2, dst2)
print(f"Copied {dst2} ({os.path.getsize(dst2)} bytes)")
