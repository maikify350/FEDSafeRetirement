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
  palette,
  PartnerCard,
  type Partner,
} from "./components/SharedComponents";

/**
 * PartnerSpotlightReel — 45-second Instagram Reel / TikTok
 *
 * Structure:
 *   0-5s    Partner photo reveal with name
 *   5-35s   3 expertise points animated in sequence
 *  35-45s   CTA + brand close
 *
 * Usage: update the `partner` and `expertise` objects below.
 * Audio: add an ElevenLabs narration file to public/ and reference it.
 */

export const FPS = 30;
const DURATION_SECONDS = 45;
const DURATION_FRAMES = DURATION_SECONDS * FPS;

const partner: Partner = {
  name: "Mike Zaino",
  image: "who-mike-zaino.webp",
  role: "Founding Senior Partner",
  line: "Turns retirement confusion into clarity and practical next steps.",
};

const expertise = [
  "FERS/CSRS coordination & calculations",
  "FEGLI/FEHB evaluation & planning",
  "TSP retirement income strategies",
];

const phoneNumber = "(774) 273 8473";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const PartnerReveal = () => {
  const frame = useCurrentFrame();
  const photoScale = interpolate(frame, [0, 30], [1.15, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const photoOpacity = interpolate(frame, [0, 18], [0, 1], clamp);
  const nameOpacity = interpolate(frame, [20, 38], [0, 1], clamp);
  const nameY = interpolate(frame, [20, 38], [30, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.deepNavy,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 500,
          height: 500,
          borderRadius: "50%",
          overflow: "hidden",
          border: `6px solid ${palette.gold}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          opacity: photoOpacity,
        }}
      >
        <Img
          src={staticFile(partner.image)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${photoScale})`,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 48,
          textAlign: "center",
          opacity: nameOpacity,
          transform: `translateY(${nameY}px)`,
        }}
      >
        <div
          style={{
            color: palette.gold,
            fontFamily: "Arial, sans-serif",
            fontWeight: 900,
            fontSize: 26,
            textTransform: "uppercase",
            letterSpacing: 0,
            marginBottom: 16,
          }}
        >
          {partner.role}
        </div>
        <div
          style={{
            color: palette.white,
            fontFamily: "Arial, sans-serif",
            fontWeight: 900,
            fontSize: 64,
            lineHeight: 1,
          }}
        >
          {partner.name}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ExpertiseList = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      {/* Background gradient */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(242,196,93,0.14), transparent 40%), radial-gradient(circle at 72% 58%, rgba(193,38,13,0.18), transparent 40%)",
        }}
      />

      {/* Logo header */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <Img
          src={staticFile("fedsafe-logo-only.webp")}
          style={{ width: 120, height: "auto", margin: "0 auto" }}
        />
      </div>

      {/* Eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 340,
          left: 70,
          right: 70,
          color: palette.gold,
          fontFamily: "Arial, sans-serif",
          fontWeight: 900,
          fontSize: 28,
          textTransform: "uppercase",
        }}
      >
        {partner.name} specializes in:
      </div>

      {/* Expertise bullets */}
      <div
        style={{
          position: "absolute",
          top: 440,
          left: 70,
          right: 70,
          display: "flex",
          flexDirection: "column",
          gap: 48,
        }}
      >
        {expertise.map((item, index) => {
          const itemOpacity = interpolate(
            frame,
            [index * 30 + 10, index * 30 + 28],
            [0, 1],
            clamp
          );
          const itemY = interpolate(
            frame,
            [index * 30 + 10, index * 30 + 28],
            [40, 0],
            { ...clamp, easing: Easing.out(Easing.cubic) }
          );

          return (
            <div
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                opacity: itemOpacity,
                transform: `translateY(${itemY}px)`,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  backgroundColor: palette.red,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  color: palette.white,
                  fontFamily: "Arial, sans-serif",
                  fontWeight: 900,
                  fontSize: 42,
                  lineHeight: 1.15,
                }}
              >
                {item}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quote */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          left: 70,
          right: 70,
          opacity: interpolate(frame, [250, 270], [0, 1], clamp),
        }}
      >
        <div
          style={{
            color: palette.paper,
            fontFamily: "Arial, sans-serif",
            fontWeight: 700,
            fontSize: 34,
            lineHeight: 1.3,
            fontStyle: "italic",
          }}
        >
          "{partner.line}"
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ClosingCTA = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], clamp);
  const pulse = interpolate(Math.sin(frame / 16), [-1, 1], [0.96, 1.02]);

  return (
    <AbsoluteFill
      style={{ backgroundColor: palette.deepNavy, opacity }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(242,196,93,0.18), transparent 50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <Img
          src={staticFile("fedsafe-logo-only.webp")}
          style={{ width: 180, height: "auto", margin: "0 auto" }}
        />
        <div
          style={{
            marginTop: 32,
            color: palette.white,
            fontFamily: "Arial, sans-serif",
            fontWeight: 900,
            fontSize: 36,
            textTransform: "uppercase",
          }}
        >
          FedSafe Retirement
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 46,
          right: 46,
          bottom: 160,
          height: 220,
          borderRadius: 20,
          backgroundColor: palette.red,
          boxShadow: "0 22px 48px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 24px",
          transform: `scale(${pulse})`,
        }}
      >
        <div
          style={{
            color: palette.white,
            fontFamily: "Arial, sans-serif",
            fontWeight: 900,
            fontSize: 26,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Schedule Free Consultation
        </div>
        <div
          style={{
            color: palette.white,
            fontFamily: "Arial, sans-serif",
            fontWeight: 900,
            fontSize: 60,
            lineHeight: 1,
            marginBottom: 10,
          }}
        >
          {phoneNumber}
        </div>
        <div
          style={{
            color: palette.gold,
            fontFamily: "Arial, sans-serif",
            fontWeight: 900,
            fontSize: 32,
            lineHeight: 1,
            textTransform: "uppercase",
            textShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          FedSafeRetirement.com
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const PartnerSpotlightReel = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      {/* Audio — replace with ElevenLabs narration */}
      {/* <Audio src={staticFile("spotlight-mike-narration.mp3")} volume={1.5} /> */}

      <Sequence durationInFrames={Math.round(5 * FPS)}>
        <PartnerReveal />
      </Sequence>

      <Sequence from={Math.round(5 * FPS)} durationInFrames={Math.round(30 * FPS)}>
        <ExpertiseList />
      </Sequence>

      <Sequence from={Math.round(35 * FPS)} durationInFrames={Math.round(10 * FPS)}>
        <ClosingCTA />
      </Sequence>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 12,
          backgroundColor: "rgba(255,255,255,0.16)",
        }}
      >
        <div
          style={{
            width: "0%",
            height: "100%",
            backgroundColor: palette.gold,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
