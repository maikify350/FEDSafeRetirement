import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const palette = {
  navy: "#002f57",
  deepNavy: "#061d32",
  red: "#c1260d",
  gold: "#f4c95d",
  white: "#ffffff",
  paper: "#f6f1e8",
  ice: "#eaf4fb",
  ink: "#111827",
};

/* ─── Brand Bug (Logo + SAM badge header) ─── */

export const BrandBug = ({
  light = false,
  size = "default",
}: {
  light?: boolean;
  size?: "default" | "small";
}) => {
  const logoHeight = size === "small" ? 100 : 150;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        filter: light ? "drop-shadow(0 16px 28px rgba(0,0,0,0.34))" : "none",
      }}
    >
      <Img
        src={staticFile("fedsafe-logo-only.webp")}
        style={{ height: logoHeight, width: "auto", objectFit: "contain" }}
      />
    </div>
  );
};

/* ─── Animated Background with Ken Burns ─── */

export const AnimatedBackground = ({
  image,
  localFrame,
  durationFrames = 240,
}: {
  image: string;
  localFrame: number;
  durationFrames?: number;
}) => {
  const scale = interpolate(
    localFrame,
    [0, durationFrames],
    [1.08, 1.16],
    clamp
  );

  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy, overflow: "hidden" }}>
      <Img
        src={staticFile(image)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          filter: "saturate(0.95) contrast(1.08)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,47,87,0.88) 0%, rgba(0,47,87,0.58) 35%, rgba(6,29,50,0.94) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/* ─── Pulsing CTA Bar (Always Phone Number + Website URL) ─── */

export const CallToAction = ({
  label = "Call or Visit to Book Your Spot",
  phone = "(774) 273 8473",
  website = "FedSafeRetirement.com",
  color = palette.red,
}: {
  label?: string;
  phone?: string;
  website?: string;
  color?: string;
}) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 16), [-1, 1], [0.97, 1.02]);

  return (
    <div
      style={{
        position: "absolute",
        left: 46,
        right: 46,
        bottom: 40,
        height: 220,
        borderRadius: 20,
        backgroundColor: color,
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
          letterSpacing: 0,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: palette.white,
          fontFamily: "Arial, sans-serif",
          fontWeight: 900,
          fontSize: 60,
          lineHeight: 1,
          letterSpacing: 0,
          marginBottom: 10,
        }}
      >
        {phone}
      </div>
      <div
        style={{
          color: palette.gold,
          fontFamily: "Arial, sans-serif",
          fontWeight: 900,
          fontSize: 32,
          lineHeight: 1,
          letterSpacing: 0,
          textTransform: "uppercase",
          textShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        {website}
      </div>
    </div>
  );
};

/* ─── Text Reveal Animation ─── */

export const TextReveal = ({
  eyebrow,
  headline,
  body,
  accentColor = palette.red,
  headlineFontSize = 78,
}: {
  eyebrow: string;
  headline: string;
  body?: string;
  accentColor?: string;
  headlineFontSize?: number;
}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 18], [50, 0], {
    ...clamp,
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
  });
  const opacity = interpolate(frame, [0, 14], [0, 1], clamp);

  const fitSize =
    headline.length > 56
      ? headlineFontSize - 12
      : headline.length > 42
        ? headlineFontSize - 7
        : headlineFontSize;

  return (
    <div
      style={{
        transform: `translateY(${enter}px)`,
        opacity,
      }}
    >
      <div
        style={{
          color: accentColor,
          fontFamily: "Arial, sans-serif",
          fontWeight: 900,
          fontSize: 31,
          textTransform: "uppercase",
          letterSpacing: 0,
          marginBottom: 24,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          width: 118,
          height: 8,
          backgroundColor: accentColor,
          marginBottom: 32,
        }}
      />
      <div
        style={{
          color: palette.white,
          fontFamily: "Arial, sans-serif",
          fontWeight: 900,
          fontSize: fitSize,
          lineHeight: 1.02,
          letterSpacing: 0,
          textShadow: "0 5px 24px rgba(0,0,0,0.42)",
        }}
      >
        {headline}
      </div>
      {body ? (
        <div
          style={{
            marginTop: 32,
            maxWidth: 860,
            color: palette.paper,
            fontFamily: "Arial, sans-serif",
            fontWeight: 700,
            fontSize: 39,
            lineHeight: 1.17,
            letterSpacing: 0,
            textShadow: "0 4px 18px rgba(0,0,0,0.35)",
          }}
        >
          {body}
        </div>
      ) : null}
    </div>
  );
};

/* ─── Progress Bar ─── */

export const ProgressBar = ({
  totalFrames,
  color = palette.gold,
}: {
  totalFrames: number;
  color?: string;
}) => {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [0, totalFrames], [0, 100], clamp);

  return (
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
          width: `${width}%`,
          height: "100%",
          backgroundColor: color,
        }}
      />
    </div>
  );
};

/* ─── Partner Card ─── */

export type Partner = {
  name: string;
  image: string;
  role: string;
  line: string;
};

export const PartnerCard = ({
  partner,
  style,
}: {
  partner: Partner;
  style?: React.CSSProperties;
}) => {
  return (
    <div
      style={{
        width: 346,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.96)",
        boxShadow: "0 28px 70px rgba(0,0,0,0.34)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div style={{ height: 318, overflow: "hidden", backgroundColor: palette.ice }}>
        <Img
          src={staticFile(partner.image)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div style={{ padding: "22px 24px 24px" }}>
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 17,
            lineHeight: 1,
            fontWeight: 900,
            textTransform: "uppercase",
            color: palette.red,
            letterSpacing: 0,
            marginBottom: 10,
          }}
        >
          {partner.role}
        </div>
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 34,
            fontWeight: 900,
            color: palette.navy,
            lineHeight: 1,
          }}
        >
          {partner.name}
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: "Arial, sans-serif",
            fontSize: 21,
            fontWeight: 700,
            lineHeight: 1.2,
            color: palette.ink,
          }}
        >
          {partner.line}
        </div>
      </div>
    </div>
  );
};

/* ─── SAM.gov Badge Panel ─── */

export const SamBadge = ({
  size = "default",
}: {
  size?: "default" | "small";
}) => {
  const badgeWidth = size === "small" ? 90 : 122;
  const badgeHeight = size === "small" ? 114 : 155;

  return (
    <div
      style={{
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.92)",
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "24px 24px",
        boxShadow: "0 18px 40px rgba(0,0,0,0.32)",
      }}
    >
      <Img
        src={staticFile("fedsafe-sam-badge.webp")}
        style={{ width: badgeWidth, height: badgeHeight, objectFit: "contain" }}
      />
      <div
        style={{
          color: palette.navy,
          fontFamily: "Arial, sans-serif",
          fontWeight: 900,
          fontSize: size === "small" ? 22 : 28,
          lineHeight: 1.04,
          letterSpacing: 0,
        }}
      >
        SAM.gov
        <br />
        registered
        <br />
        federal
        <br />
        contractor
      </div>
    </div>
  );
};
