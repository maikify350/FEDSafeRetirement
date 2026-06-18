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
import {DURATION_FRAMES, FPS} from "./Root";

type Scene = {
  from: number;
  duration: number;
  eyebrow: string;
  headline: string;
  body?: string;
  image: string;
  accent?: "red" | "blue";
  badge?: boolean;
};

const phoneNumber = "(774) 273 8473";
const webinarDate = "Sunday June 28th";

const scenes: Scene[] = [
  {
    from: 0,
    duration: 5.8,
    eyebrow: "Federal & Postal Employees",
    headline: "Nearing retirement?",
    body: "Listen carefully.",
    image: "agency-education.png",
    accent: "blue",
  },
  {
    from: 5.8,
    duration: 7.2,
    eyebrow: "Free Online Webinar",
    headline: "Sunday, June 28",
    body: "FedSafe Retirement is hosting a focused federal retirement session.",
    image: "advisor-classroom.png",
    accent: "red",
  },
  {
    from: 13,
    duration: 9,
    eyebrow: "The hard truth",
    headline: "You get one shot at federal retirement.",
    body: "One wrong decision can cost tens of thousands.",
    image: "retired-airforce.webp",
    accent: "red",
  },
  {
    from: 22,
    duration: 10,
    eyebrow: "Common costly mistakes",
    headline: "FEGLI. Survivor benefits. Healthcare eligibility.",
    body: "Some elections can permanently affect costs and income.",
    image: "agency-benefits.png",
    accent: "blue",
  },
  {
    from: 32,
    duration: 10,
    eyebrow: "SAM.gov registered contractor",
    headline: "Federal and postal benefits are all we do.",
    body: "Specialized guidance for the decisions that matter.",
    image: "seminar-hero.webp",
    accent: "blue",
    badge: true,
  },
  {
    from: 42,
    duration: 11,
    eyebrow: "What you will learn",
    headline: "Pension. TSP. Healthcare. Survivor benefits.",
    body: "Build clarity around income, timing, and next steps.",
    image: "advisor-session.png",
    accent: "red",
  },
  {
    from: 53,
    duration: 8,
    eyebrow: "Complimentary consultation",
    headline: "You may qualify for a one-on-one review.",
    body: "Share this with a friend or loved one who is nearing retirement.",
    image: "mail-carrier.webp",
    accent: "blue",
  },
  {
    from: 61,
    duration: 18.224,
    eyebrow: "Reserve your spot",
    headline: "Call the number below",
    body: "Or register through the link in the post.",
    image: "retired-airforce.webp",
    accent: "red",
  },
];

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const palette = {
  navy: "#002f57",
  deepNavy: "#061d32",
  red: "#c1260d",
  gold: "#f4c95d",
  white: "#ffffff",
  paper: "#f6f1e8",
};

const fitText = (text: string, base: number) => {
  if (text.length > 56) {
    return base - 12;
  }

  if (text.length > 42) {
    return base - 7;
  }

  return base;
};

const Background = ({image, sceneFrame}: {image: string; sceneFrame: number}) => {
  const scale = interpolate(sceneFrame, [0, 240], [1.08, 1.16], clamp);

  return (
    <AbsoluteFill style={{backgroundColor: palette.deepNavy, overflow: "hidden"}}>
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
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(193,38,13,0.32) 0%, rgba(0,47,87,0) 45%, rgba(0,47,87,0.42) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const SceneCard = ({scene}: {scene: Scene}) => {
  const frame = useCurrentFrame();
  const sceneFrame = frame;
  const enter = interpolate(sceneFrame, [0, 18], [50, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(sceneFrame, [0, 14], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const accentColor = scene.accent === "red" ? palette.red : palette.gold;
  const headlineSize = fitText(scene.headline, 78);

  return (
    <AbsoluteFill>
      <Background image={scene.image} sceneFrame={sceneFrame} />
      <div
        style={{
          position: "absolute",
          top: 112,
          left: 70,
          right: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity,
        }}
      >
        <div
          style={{
            width: 250,
            height: 150,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 14px 32px rgba(0,0,0,0.22)",
          }}
        >
          <Img
            src={staticFile("fedsafe-logo-only.webp")}
            style={{width: 118, height: "auto", objectFit: "contain"}}
          />
        </div>
        <div
          style={{
            color: palette.white,
            border: `3px solid ${palette.gold}`,
            borderRadius: 999,
            padding: "12px 22px",
            fontFamily: "Arial, sans-serif",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: 0,
            backgroundColor: "rgba(6,29,50,0.74)",
          }}
        >
          FREE WEBINAR
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 405,
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
          {scene.eyebrow}
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
            fontSize: headlineSize,
            lineHeight: 1.02,
            letterSpacing: 0,
            textShadow: "0 5px 24px rgba(0,0,0,0.42)",
          }}
        >
          {scene.headline}
        </div>
        {scene.body ? (
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
            {scene.body}
          </div>
        ) : null}
      </div>
      {scene.badge ? <BadgePanel sceneFrame={sceneFrame} /> : null}
    </AbsoluteFill>
  );
};

const BadgePanel = ({sceneFrame}: {sceneFrame: number}) => {
  const opacity = interpolate(sceneFrame, [16, 32], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const y = interpolate(sceneFrame, [16, 32], [32, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 78,
        bottom: 270,
        width: 365,
        minHeight: 258,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.92)",
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "24px 24px",
        opacity,
        transform: `translateY(${y}px)`,
        boxShadow: "0 18px 40px rgba(0,0,0,0.32)",
      }}
    >
      <Img
        src={staticFile("fedsafe-sam-badge.webp")}
        style={{width: 122, height: 155, objectFit: "contain"}}
      />
      <div
        style={{
          color: palette.navy,
          fontFamily: "Arial, sans-serif",
          fontWeight: 900,
          fontSize: 28,
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

const OpeningLogo = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 74, 92], [1, 1, 1, 0], clamp);
  const scale = interpolate(frame, [0, 36, 92], [0.9, 1, 1.08], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  if (frame > 92) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #f6f1e8 100%)",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <Img
        src={staticFile("fedsafe-logo-only.webp")}
        style={{
          width: 360,
          height: "auto",
          objectFit: "contain",
          transform: `scale(${scale})`,
        }}
      />
      <div
        style={{
          marginTop: 34,
          color: palette.navy,
          fontFamily: "Arial, sans-serif",
          fontWeight: 900,
          fontSize: 44,
          letterSpacing: 0,
          textTransform: "uppercase",
        }}
      >
        FedSafe Retirement
      </div>
    </AbsoluteFill>
  );
};

const BottomPhone = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 16), [-1, 1], [0.96, 1.02]);

  return (
    <div
      style={{
        position: "absolute",
        left: 46,
        right: 46,
        bottom: 44,
        height: 178,
        borderRadius: 18,
        backgroundColor: palette.red,
        boxShadow: "0 20px 42px rgba(0,0,0,0.34)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${pulse})`,
      }}
    >
      <div
        style={{
          color: palette.white,
          fontFamily: "Arial, sans-serif",
          fontWeight: 900,
          fontSize: 27,
          textTransform: "uppercase",
          letterSpacing: 0,
          marginBottom: 8,
        }}
      >
        Call to book your spot
      </div>
      <div
        style={{
          color: palette.white,
          fontFamily: "Arial, sans-serif",
          fontWeight: 900,
          fontSize: 68,
          lineHeight: 1,
          letterSpacing: 0,
        }}
      >
        {phoneNumber}
      </div>
    </div>
  );
};

const DateBadge = () => {
  return (
    <div
      style={{
        position: "absolute",
        top: 124,
        left: "50%",
        transform: "translateX(-50%)",
        width: 360,
        height: 70,
        borderRadius: 999,
        border: `3px solid ${palette.gold}`,
        backgroundColor: "rgba(6,29,50,0.82)",
        color: palette.white,
        fontFamily: "Arial, sans-serif",
        fontWeight: 900,
        fontSize: 30,
        letterSpacing: 0,
        textTransform: "uppercase",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 14px 30px rgba(0,0,0,0.24)",
      }}
    >
      {webinarDate}
    </div>
  );
};

const ProgressBar = () => {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [0, DURATION_FRAMES], [0, 100], clamp);

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
          backgroundColor: palette.gold,
        }}
      />
    </div>
  );
};

export const WebinarReel = () => {
  return (
    <AbsoluteFill style={{backgroundColor: palette.deepNavy}}>
      <Audio src={staticFile("Sound_Script_01_vocalfocus-music05.mp3")} />
      {scenes.map((scene) => (
        <Sequence
          key={`${scene.from}-${scene.headline}`}
          from={Math.round(scene.from * FPS)}
          durationInFrames={Math.round(scene.duration * FPS)}
        >
          <SceneCard scene={scene} />
        </Sequence>
      ))}
      <OpeningLogo />
      <DateBadge />
      <BottomPhone />
      <ProgressBar />
    </AbsoluteFill>
  );
};
