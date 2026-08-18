import {
  AbsoluteFill,
  Audio,
  Easing,
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
  SamBadge,
} from "./components/SharedComponents";

/**
 * PostalRetirementReel — 45-second Instagram Reel / TikTok for USPS Employees
 * Features:
 *   - AI photorealistic USPS imagery (carrier sunset, PSHB review, retirement advisor)
 *   - Synchronized ElevenLabs professional voiceover (Adam) + background audio
 *   - SAM.gov badge & FedSafe branding
 *   - Tagline: "The Future Favors the Prepared"
 */

export const FPS = 30;
const DURATION_SECONDS = 45;
const DURATION_FRAMES = DURATION_SECONDS * FPS;

const phoneNumber = "(774) 273 8473";

const scenes = [
  {
    from: 0,
    duration: 5,
    eyebrow: "Attention USPS Employees",
    headline: "Planning your Postal Retirement?",
    body: "Critical decisions for Letter Carriers, Clerks, & Mail Handlers.",
    image: "usps-mail-carrier-sunset.jpg",
    accent: "gold" as const,
  },
  {
    from: 5,
    duration: 11,
    eyebrow: "PSHB Healthcare Transition",
    headline: "The new PSHB rules change your healthcare choices.",
    body: "Medicare Part B coordination can affect your monthly retirement income.",
    image: "pshb-healthcare-review.jpg",
    accent: "red" as const,
  },
  {
    from: 16,
    duration: 11,
    eyebrow: "FERS Special Supplement",
    headline: "Don't leave thousands in bridge payments behind.",
    body: "Retiring at MRA with 30 years? Verify your annuity supplement before filing ORA.",
    image: "usps-retirement-guide.jpg",
    accent: "gold" as const,
  },
  {
    from: 27,
    duration: 9,
    eyebrow: "SAM.gov Registered Contractor",
    headline: "Exclusively Federal & Postal Benefits.",
    body: "No generalists. Experience and expertise dedicated to postal personnel.",
    image: "who-workshop.webp",
    accent: "red" as const,
    badge: true,
  },
];

const HeaderBug = () => {
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
          width: 220,
          height: 120,
          borderRadius: 14,
          backgroundColor: "rgba(255,255,255,0.95)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 14px 32px rgba(0,0,0,0.3)",
        }}
      >
        <Img
          src={staticFile("fedsafe-logo-only.webp")}
          style={{ width: 110, height: "auto", objectFit: "contain" }}
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
        USPS RETIREMENT
      </div>
    </div>
  );
};

export const PostalRetirementReel = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      {/* ElevenLabs Voiceover Audio */}
      <Audio src={staticFile("usps-narration-v1.mp3")} volume={1.8} />

      {/* Subtle Background Music */}
      <Audio src={staticFile("who-background.mp3")} volume={0.06} />

      <HeaderBug />

      {scenes.map((scene) => {
        const accentColor = scene.accent === "red" ? palette.red : palette.gold;
        return (
          <Sequence
            key={scene.headline}
            from={Math.round(scene.from * FPS)}
            durationInFrames={Math.round(scene.duration * FPS)}
          >
            <AbsoluteFill>
              <AnimatedBackground
                image={scene.image}
                localFrame={0}
                durationFrames={Math.round(scene.duration * FPS)}
              />
              <div
                style={{
                  position: "absolute",
                  left: 70,
                  right: 70,
                  top: 380,
                }}
              >
                <TextReveal
                  eyebrow={scene.eyebrow}
                  headline={scene.headline}
                  body={scene.body}
                  accentColor={accentColor}
                  headlineFontSize={72}
                />
              </div>

              {scene.badge ? (
                <div
                  style={{
                    position: "absolute",
                    left: 70,
                    bottom: 270,
                    transform: "scale(0.9)",
                    transformOrigin: "bottom left",
                  }}
                >
                  <SamBadge size="small" />
                </div>
              ) : null}
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Closing CTA */}
      <Sequence
        from={Math.round(36 * FPS)}
        durationInFrames={Math.round(9 * FPS)}
      >
        <AbsoluteFill>
          <AnimatedBackground image="usps-mail-carrier-sunset.jpg" localFrame={0} />
          <div
            style={{
              position: "absolute",
              top: 290,
              left: 70,
              right: 70,
              textAlign: "center",
              color: palette.gold,
              fontFamily: "Arial, sans-serif",
              fontSize: 34,
              fontWeight: 900,
              textTransform: "uppercase",
              textShadow: "0 4px 18px rgba(0,0,0,0.6)",
            }}
          >
            "The Future Favors the Prepared"
          </div>
          <CallToAction
            label="Schedule Free Postal Benefit Review"
            phone={phoneNumber}
            website="FedSafeRetirement.com"
          />
        </AbsoluteFill>
      </Sequence>

      <ProgressBar totalFrames={DURATION_FRAMES} />
    </AbsoluteFill>
  );
};
