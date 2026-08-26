import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  AnimatedBackground,
  CallToAction,
  palette,
  ProgressBar,
  TextReveal,
} from "./components/SharedComponents";

export const FPS = 30;

export interface DynamicScene {
  image: string;
  eyebrow?: string;
  headline?: string;
  body: string;
  durationSec: number;
}

export interface DynamicScriptReelProps {
  title?: string;
  badgeText?: string;
  narrationAudio?: string;
  backgroundMusic?: string;
  spokenCta?: string;
  ctaPhone?: string;
  ctaWebsite?: string;
  scenes?: DynamicScene[];
  durationSec?: number;
}

const HeaderBug = ({ badgeText = "FEDERAL RETIREMENT" }: { badgeText?: string }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 90,
        left: 70,
        right: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity,
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 18px",
          borderRadius: 14,
          backgroundColor: "rgba(6,29,50,0.85)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 14px 32px rgba(0,0,0,0.35)",
        }}
      >
        <Img
          src={staticFile("fedsafe-shield-logo-transparent.webp")}
          style={{ height: 80, width: "auto", objectFit: "contain" }}
        />
      </div>
      <div
        style={{
          color: palette.white,
          border: `3px solid ${palette.gold}`,
          borderRadius: 999,
          padding: "10px 22px",
          fontFamily: "Arial, sans-serif",
          fontSize: 22,
          fontWeight: 900,
          backgroundColor: "rgba(6,29,50,0.88)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}
      >
        {badgeText}
      </div>
    </div>
  );
};

export const DynamicScriptReel = ({
  title = "Federal Retirement Brief",
  badgeText = "FEDERAL RETIREMENT",
  narrationAudio,
  backgroundMusic = "who-background.mp3",
  spokenCta = "Before you pick a retirement date, review your numbers.",
  ctaPhone = "(774) 273 8473",
  ctaWebsite = "FedSafeRetirement.com",
  scenes = [
    {
      image: "federal-advisor-consultation.jpg",
      eyebrow: "Federal Retirement Planning",
      headline: "Eligibility Is Not Affordability",
      body: "Just because you are eligible to retire doesn't mean you're financially ready.",
      durationSec: 8,
    },
    {
      image: "federal-couple-happy.jpg",
      eyebrow: "Understand Your Deductions",
      headline: "Gross vs Net Pension",
      body: "Taxes, FEHB, and survivor benefits significantly change your take-home pay.",
      durationSec: 10,
    },
    {
      image: "who-retired-vet.webp",
      eyebrow: "FedSafe Advisory",
      headline: "Know Your Numbers",
      body: "Schedule your complimentary federal retirement readiness review today.",
      durationSec: 12,
    },
  ],
  durationSec = 30,
}: DynamicScriptReelProps) => {
  const totalFrames = Math.round(durationSec * FPS);

  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      {narrationAudio && <Audio src={staticFile(narrationAudio)} volume={1.8} />}
      {backgroundMusic && <Audio src={staticFile(backgroundMusic)} volume={0.06} />}

      <HeaderBug badgeText={badgeText} />

      {(() => {
        let currentFrameOffset = 0;
        return scenes.map((scene, idx) => {
          const segFrames = Math.round((scene.durationSec || (durationSec / scenes.length)) * FPS);
          const fromFrame = currentFrameOffset;
          currentFrameOffset += segFrames;

          return (
            <Sequence key={idx} from={fromFrame} durationInFrames={segFrames}>
              <AbsoluteFill>
                <AnimatedBackground image={scene.image} localFrame={0} durationFrames={segFrames} />
                <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
                  <TextReveal
                    eyebrow={scene.eyebrow || title}
                    headline={scene.headline || `Key Point #${idx + 1}`}
                    body={scene.body ? scene.body.replace(/\*\*/g, '').replace(/\/+/g, '').replace(/<[^>]*>/g, '').trim() : ''}
                    accentColor={palette.gold}
                  />
                </div>
              </AbsoluteFill>
            </Sequence>
          );
        });
      })()}

      <CallToAction
        label={spokenCta}
        phone={ctaPhone}
        website={ctaWebsite}
        color={palette.red}
      />

      <ProgressBar totalFrames={totalFrames} color={palette.gold} />
    </AbsoluteFill>
  );
};
