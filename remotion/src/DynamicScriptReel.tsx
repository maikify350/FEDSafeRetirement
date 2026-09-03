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
  SamBadge,
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
  // Logo toggles (controlled from Video Studio metadata)
  showShieldLogo?: boolean;
  showSamBadge?: boolean;
  showDoubleLogo?: boolean;
  logoSize?: string;
  logoOpacity?: number;
}

const LOGO_SIZE_MAP: Record<string, number> = {
  xs: 32,
  small: 44,
  medium: 56,
  large: 72,
  xl: 90,
};

const HeaderBug = ({
  showShieldLogo = true,
  logoOpacity = 0.9,
  logoSize = "medium",
}: {
  showShieldLogo?: boolean;
  logoOpacity?: number;
  logoSize?: string;
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (!showShieldLogo) return null;

  const h = LOGO_SIZE_MAP[logoSize] || LOGO_SIZE_MAP.medium;

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 46,
        display: "flex",
        alignItems: "center",
        opacity: opacity * logoOpacity,
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 14px",
          borderRadius: 14,
          backgroundColor: "rgba(6,29,50,0.80)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 10px 28px rgba(0,0,0,0.30)",
        }}
      >
        <Img
          src={staticFile("fedsafe-shield-logo-transparent.webp")}
          style={{ height: h, width: "auto", objectFit: "contain" }}
        />
      </div>
    </div>
  );
};

const SamBadgeOverlay = ({
  showSamBadge = false,
  logoOpacity = 0.9,
}: {
  showSamBadge?: boolean;
  logoOpacity?: number;
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (!showSamBadge) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 280,
        right: 46,
        opacity: opacity * logoOpacity,
        zIndex: 10,
      }}
    >
      <SamBadge size="small" />
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
  showShieldLogo = true,
  showSamBadge = false,
  showDoubleLogo = false,
  logoSize = "medium",
  logoOpacity = 0.9,
}: DynamicScriptReelProps) => {
  const totalFrames = Math.round(durationSec * FPS);

  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      {narrationAudio && <Audio src={staticFile(narrationAudio)} volume={1.8} />}
      {backgroundMusic && <Audio src={staticFile(backgroundMusic)} volume={0.06} />}

      <HeaderBug
        showShieldLogo={showShieldLogo}
        logoOpacity={logoOpacity}
        logoSize={logoSize}
      />

      <SamBadgeOverlay showSamBadge={showSamBadge} logoOpacity={logoOpacity} />

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
