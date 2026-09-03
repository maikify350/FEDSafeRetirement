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
 * FegliShockReel — 35-second Instagram Reel / TikTok
 *
 * Focus: FEGLI Option B Age-65 Cost Spike Shock & Risk Prevention
 * Visuals: Photorealistic AI images + Animated Typography + ElevenLabs Narration
 */

export const FPS = 30;
const DURATION_SECONDS = 35;
const DURATION_FRAMES = DURATION_SECONDS * FPS;

const phoneNumber = "(774) 273 8473";

const scenes = [
  {
    from: 0,
    duration: 5,
    eyebrow: "Federal & Postal Retirees",
    headline: "The FEGLI Cost Shock at 65",
    body: "Option B premiums can increase by over 500% virtually overnight.",
    image: "fegli-rate-spike-shock.jpg",
    accent: "red" as const,
  },
  {
    from: 5,
    duration: 10,
    eyebrow: "Unexpected Pension Deductions",
    headline: "Hundreds deducted from your monthly annuity.",
    body: "Many retirees don't realize until it begins eating into their income.",
    image: "agency-benefits.png",
    accent: "gold" as const,
  },
  {
    from: 15,
    duration: 11,
    eyebrow: "Before You Finalize Retirement",
    headline: "Review your options before you file.",
    body: "We coordinate FEGLI, Survivor Benefits, & TSP so there are no surprises.",
    image: "federal-advisor-consultation.jpg",
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
        FEGLI ALERT
      </div>
    </div>
  );
};

export const FegliShockReel = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      {/* Voiceover */}
      <Audio src={staticFile("fegli-shock-narration.mp3")} volume={1.8} />
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
        from={Math.round(26 * FPS)}
        durationInFrames={Math.round(9 * FPS)}
      >
        <AbsoluteFill>
          <AnimatedBackground image="federal-advisor-consultation.jpg" localFrame={0} />
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
            label="Schedule Free Benefit Analysis"
            phone={phoneNumber}
            website="FedSafeRetirement.com"
          />
        </AbsoluteFill>
      </Sequence>

      <ProgressBar totalFrames={DURATION_FRAMES} />
    </AbsoluteFill>
  );
};
