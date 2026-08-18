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
} from "./components/SharedComponents";

/**
 * DidYouKnowReel — 30-second TikTok / Instagram Reel
 *
 * Structure:
 *   0-3s   Logo intro
 *   3-25s  Fact presentation (animated text over background)
 *  25-30s  CTA with phone number
 *
 * Usage: update the `fact` object below for each new fact.
 * Audio: add an ElevenLabs narration file to public/ and reference it.
 */

export const FPS = 30;
const DURATION_SECONDS = 30;
const DURATION_FRAMES = DURATION_SECONDS * FPS;

const fact = {
  eyebrow: "Did you know?",
  headline: "Your FEGLI costs can increase up to 5x after age 65.",
  body: "Most employees don't realize until it's too late to change.",
  image: "agency-benefits.png",
  accent: "red" as const,
};

const phoneNumber = "(774) 273 8473";

const LogoIntro = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, 70, 90], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, 30], [0.88, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f6f1e8 100%)",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <Img
        src={staticFile("fedsafe-logo-only.webp")}
        style={{
          width: 280,
          height: "auto",
          objectFit: "contain",
          transform: `scale(${scale})`,
        }}
      />
      <div
        style={{
          marginTop: 28,
          color: palette.navy,
          fontFamily: "Arial, sans-serif",
          fontWeight: 900,
          fontSize: 36,
          textTransform: "uppercase",
        }}
      >
        FedSafe Retirement
      </div>
    </AbsoluteFill>
  );
};

export const DidYouKnowReel = () => {
  const accentColor = fact.accent === "red" ? palette.red : palette.gold;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      {/* Background audio — replace with your narration file */}
      {/* <Audio src={staticFile("dyk-narration-01.mp3")} volume={1.5} /> */}

      {/* Logo intro */}
      <Sequence durationInFrames={Math.round(3 * FPS)}>
        <LogoIntro />
      </Sequence>

      {/* Main fact presentation */}
      <Sequence from={Math.round(3 * FPS)} durationInFrames={Math.round(22 * FPS)}>
        <AbsoluteFill>
          <AnimatedBackground
            image={fact.image}
            localFrame={0}
            durationFrames={Math.round(22 * FPS)}
          />
          <div
            style={{
              position: "absolute",
              left: 70,
              right: 70,
              top: 400,
            }}
          >
            <TextReveal
              eyebrow={fact.eyebrow}
              headline={fact.headline}
              body={fact.body}
              accentColor={accentColor}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* CTA */}
      <Sequence from={Math.round(25 * FPS)} durationInFrames={Math.round(5 * FPS)}>
        <AbsoluteFill>
          <AnimatedBackground image={fact.image} localFrame={0} />
          <CallToAction
            label="Schedule Free Consultation"
            phone={phoneNumber}
            website="FedSafeRetirement.com"
          />
        </AbsoluteFill>
      </Sequence>

      <ProgressBar totalFrames={DURATION_FRAMES} />
    </AbsoluteFill>
  );
};
