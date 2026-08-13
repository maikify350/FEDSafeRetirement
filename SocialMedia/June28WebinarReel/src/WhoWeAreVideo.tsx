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
import type {ReactNode} from "react";

const FPS = 30;
const seconds = (value: number) => Math.round(value * FPS);

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const palette = {
  navy: "#07385f",
  deepNavy: "#061d32",
  red: "#c92712",
  gold: "#f2c45d",
  ice: "#eaf4fb",
  white: "#ffffff",
  ink: "#111827",
};

const BrandText = ({
  fontSize = 78,
  lineHeight = 1,
  justifyContent = "flex-start",
  onDark = false,
}: {
  fontSize?: number;
  lineHeight?: number;
  justifyContent?: "flex-start" | "center";
  onDark?: boolean;
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "baseline",
      justifyContent,
      gap: fontSize * 0.11,
      fontFamily: "Arial, sans-serif",
      fontSize,
      lineHeight,
      fontWeight: 900,
      letterSpacing: 0,
      textTransform: "uppercase",
    }}
  >
    <span
      style={{
        color: palette.red,
        textShadow: onDark ? "0 0 16px rgba(255,255,255,0.38)" : undefined,
        WebkitTextStroke: onDark ? "1px rgba(255,255,255,0.24)" : undefined,
      }}
    >
      FED
    </span>
    <span
      style={{
        color: onDark ? "#0f5f9b" : palette.navy,
        textShadow: onDark ? "0 0 18px rgba(255,255,255,0.44)" : undefined,
        WebkitTextStroke: onDark ? "1px rgba(255,255,255,0.28)" : undefined,
      }}
    >
      SAFE RETIREMENT
    </span>
  </span>
);

const EyebrowText = ({text}: {text: string}) => {
  if (text === "FedSafe Retirement") {
    return <BrandText fontSize={24} />;
  }

  if (text === "Why FedSafe Retirement Exists") {
    return (
      <span style={{display: "inline-flex", alignItems: "baseline", gap: 7}}>
        <span>WHY</span>
        <BrandText fontSize={24} />
        <span>EXISTS</span>
      </span>
    );
  }

  return <>{text}</>;
};

type StoryScene = {
  from: number;
  duration: number;
  image: string;
  eyebrow: string;
  headline: string;
  body?: string;
  bullets?: string[];
  align?: "left" | "right";
  badge?: boolean;
};

const scenes: StoryScene[] = [
  {
    from: 0,
    duration: 8,
    image: "who-home-hero.webp",
    eyebrow: "FedSafe Retirement",
    headline: "Federal Retirement Deserves Correct Answers",
    body: "A confident answer is not always a correct one.",
  },
  {
    from: 8,
    duration: 11,
    image: "who-retired-vet.webp",
    eyebrow: "The Details Matter",
    headline: "Eligibility. Timing. Annuity. Survivor Benefits.",
    body: "Every decision should be understood before it becomes hard to undo.",
    align: "right",
  },
  {
    from: 19,
    duration: 12,
    image: "who-decision-background.webp",
    eyebrow: "The Source Matters",
    headline: "Federal health benefits, TSP, and the retirement application all connect.",
    body: "Reliable guidance helps employees know what to verify, document, and ask before they act.",
  },
  {
    from: 31,
    duration: 11,
    image: "who-workshop.webp",
    eyebrow: "Why FedSafe Retirement Exists",
    headline: "We help federal and postal employees slow down and see the path clearly.",
    body: "The work starts with education, not pressure.",
    align: "right",
  },
  {
    from: 42,
    duration: 12,
    image: "who-mike-podium.webp",
    eyebrow: "Education First",
    headline: "Rules. Deadlines. Paperwork. Decision points.",
    bullets: ["What to verify", "What to document", "What questions to ask"],
  },
  {
    from: 54,
    duration: 12,
    image: "who-retired-mail.webp",
    eyebrow: "Better Information",
    headline: "No confusion as a sales tool. No rushed decisions.",
    body: "Just practical next steps for a retirement transition handled with seriousness.",
    align: "right",
  },
  {
    from: 66,
    duration: 8,
    image: "who-workshop.webp",
    eyebrow: "SAM.gov Registered Federal Contractor",
    headline: "Federal retirement education for employees, agencies, and postal teams.",
    body: "Retirement application guidance. Workforce retirement training. Education-first support.",
  },
];

const partners = [
  {
    name: "Ben Bailey",
    image: "who-ben-bailey.webp",
    role: "Founding Senior Partner",
    line: "Focused on clarity, mentorship, and informed decision-making.",
  },
  {
    name: "Daniel French",
    image: "who-daniel-french.webp",
    role: "Founding Senior Partner",
    line: "Three decades of disciplined retirement planning experience.",
  },
  {
    name: "Brian Westrich",
    image: "who-brian-westrich.webp",
    role: "Founding Senior Partner",
    line: "Known for precision income planning and practical strategy.",
  },
  {
    name: "Mike Zaino",
    image: "who-mike-zaino.webp",
    role: "Founding Senior Partner",
    line: "Turns retirement confusion into clarity and practical next steps.",
  },
];

const Panel = ({
  children,
  align = "left",
  opacity,
  lift,
}: {
  children: ReactNode;
  align?: "left" | "right";
  opacity: number;
  lift: number;
}) => (
  <div
    style={{
      position: "absolute",
      top: 250,
      left: align === "left" ? 118 : undefined,
      right: align === "right" ? 118 : undefined,
      width: 760,
      minHeight: 548,
      borderRadius: 8,
      padding: "54px 58px",
      background: "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(234,244,251,0.88))",
      boxShadow: "0 32px 80px rgba(0,0,0,0.34)",
      opacity,
      transform: `translateY(${lift}px)`,
    }}
  >
    {children}
  </div>
);

const BrandBug = ({light = false, timelineSeconds = 0}: {light?: boolean; timelineSeconds?: number}) => {
  const pulseActive = timelineSeconds >= 66 && timelineSeconds <= 74;
  const pulse = pulseActive ? Math.sin((timelineSeconds - 66) * Math.PI * 2.3) : 0;
  const glow = pulseActive ? 0.58 + Math.max(0, pulse) * 0.42 : 0;
  const samScale = pulseActive ? 1 + Math.max(0, pulse) * 0.045 : 1;

  return (
    <div
      style={{
        position: "absolute",
        top: 26,
        left: 52,
        width: 610,
        height: 214,
        borderRadius: 8,
        backgroundColor: "transparent",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        gap: 12,
        filter: light ? "drop-shadow(0 16px 28px rgba(0,0,0,0.34))" : "none",
      }}
    >
      <Img src={staticFile("who-logo.webp")} style={{height: 196, width: "auto", objectFit: "contain"}} />
      <div
        style={{
          width: "auto",
          height: 196,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          borderRadius: 8,
          transformOrigin: "top center",
          transform: `scale(${samScale})`,
        }}
      >
        <Img
          src={staticFile("who-sam-badge.webp")}
          style={{
            height: 196,
            width: "auto",
            objectFit: "contain",
            filter: pulseActive
              ? `drop-shadow(0 0 ${18 + glow * 10}px rgba(242,196,93,${0.52 + glow * 0.26})) drop-shadow(0 0 ${28 + glow * 18}px rgba(255,255,255,${0.22 + glow * 0.22}))`
              : "none",
          }}
        />
      </div>
    </div>
  );
};

const Background = ({
  image,
  localFrame,
  align = "left",
}: {
  image: string;
  localFrame: number;
  align?: "left" | "right";
}) => {
  const scale = interpolate(localFrame, [0, 360], [1.05, 1.15], clamp);
  const x = interpolate(localFrame, [0, 360], [align === "left" ? 0 : -28, align === "left" ? -34 : 12], clamp);

  return (
    <AbsoluteFill style={{backgroundColor: palette.deepNavy, overflow: "hidden"}}>
      <Img
        src={staticFile(image)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translateX(${x}px) scale(${scale})`,
          filter: "brightness(1.16) saturate(1.18) contrast(1.16)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(6,29,50,0.72) 0%, rgba(6,29,50,0.28) 44%, rgba(6,29,50,0.78) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(7,56,95,0.08) 0%, rgba(6,29,50,0.08) 46%, rgba(6,29,50,0.7) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: align === "left" ? 1030 : 110,
          top: 116,
          width: 620,
          height: 620,
          border: `4px solid rgba(242,196,93,0.42)`,
          borderRadius: "50%",
          opacity: 0.7,
        }}
      />
    </AbsoluteFill>
  );
};

const Scene = ({scene}: {scene: StoryScene}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18, seconds(scene.duration) - 18, seconds(scene.duration)], [0, 1, 1, 0], clamp);
  const lift = interpolate(frame, [0, 24], [36, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const lineWidth = interpolate(frame, [10, 34], [0, 158], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const timelineSeconds = scene.from + frame / FPS;

  return (
    <AbsoluteFill>
      <Background image={scene.image} localFrame={frame} align={scene.align} />
      <BrandBug light timelineSeconds={timelineSeconds} />
      {scene.badge ? (
        <div
          style={{
            position: "absolute",
            right: 116,
            top: 104,
            width: 186,
            height: 236,
            borderRadius: 8,
            backgroundColor: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: "drop-shadow(0 22px 34px rgba(0,0,0,0.34))",
            opacity,
          }}
        >
          <Img src={staticFile("who-sam-badge.webp")} style={{height: 162, width: "auto", objectFit: "contain"}} />
        </div>
      ) : null}
      <Panel align={scene.align} opacity={opacity} lift={lift}>
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 24,
            lineHeight: 1.1,
            fontWeight: 900,
            color: palette.red,
            textTransform: "uppercase",
            letterSpacing: 0,
          }}
        >
          <EyebrowText text={scene.eyebrow} />
        </div>
        <div style={{width: lineWidth, height: 7, backgroundColor: palette.gold, marginTop: 22, marginBottom: 34}} />
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: scene.headline.length > 62 ? 54 : 62,
            lineHeight: 1.04,
            fontWeight: 900,
            color: palette.navy,
            letterSpacing: 0,
          }}
        >
          {scene.headline}
        </div>
        {scene.body ? (
          <div
            style={{
              marginTop: 28,
              fontFamily: "Arial, sans-serif",
              fontSize: 30,
              lineHeight: 1.32,
              fontWeight: 700,
              color: palette.ink,
              letterSpacing: 0,
            }}
          >
            {scene.body}
          </div>
        ) : null}
        {scene.bullets ? (
          <div style={{display: "flex", gap: 18, flexDirection: "column", marginTop: 32}}>
            {scene.bullets.map((bullet, index) => {
              const bulletOpacity = interpolate(frame, [34 + index * 10, 46 + index * 10], [0, 1], clamp);
              return (
                <div
                  key={bullet}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    opacity: bulletOpacity,
                    fontFamily: "Arial, sans-serif",
                    fontSize: 32,
                    lineHeight: 1.16,
                    fontWeight: 900,
                    color: palette.ink,
                  }}
                >
                  <div style={{width: 18, height: 18, borderRadius: "50%", backgroundColor: palette.red}} />
                  {bullet}
                </div>
              );
            })}
          </div>
        ) : null}
      </Panel>
    </AbsoluteFill>
  );
};

const DecisionGrid = () => {
  const frame = useCurrentFrame();
  const items = ["Eligibility", "Timing", "Annuity", "Survivor Benefits", "Health Benefits", "TSP", "Application"];

  return (
    <AbsoluteFill>
      <Background image="who-decision-background.webp" localFrame={frame} align="right" />
      <BrandBug light timelineSeconds={12 + frame / FPS} />
      <div
        style={{
          position: "absolute",
          left: 118,
          right: 118,
          top: 190,
          paddingLeft: 300,
          color: palette.white,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{fontSize: 34, fontWeight: 900, color: palette.gold, textTransform: "uppercase", letterSpacing: 0}}>
          Retirement decisions come in stages
        </div>
        <div style={{fontSize: 76, lineHeight: 1.02, fontWeight: 900, width: 980, marginTop: 22, letterSpacing: 0}}>
          One decision can affect the next.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 118,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {items.map((item, index) => {
          const opacity = interpolate(frame, [24 + index * 6, 36 + index * 6], [0, 1], clamp);
          const y = interpolate(frame, [24 + index * 6, 38 + index * 6], [32, 0], {
            ...clamp,
            easing: Easing.out(Easing.cubic),
          });
          return (
            <div
              key={item}
              style={{
                minHeight: 140,
                borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.92)",
                borderTop: `8px solid ${index % 2 === 0 ? palette.red : palette.gold}`,
                padding: "26px 34px",
                display: "flex",
                alignItems: "center",
                boxShadow: "0 22px 54px rgba(0,0,0,0.28)",
                opacity,
                transform: `translateY(${y}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: 34,
                  lineHeight: 1.08,
                  fontWeight: 900,
                  color: palette.navy,
                  letterSpacing: 0,
                }}
              >
                {item}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const PartnerCard = ({
  partner,
  index,
}: {
  partner: (typeof partners)[number];
  index: number;
}) => {
  const frame = useCurrentFrame();
  const start = index * 36;
  const local = frame - start;
  const finalPositions = [
    {x: 112, y: 392, r: -4},
    {x: 522, y: 332, r: 3},
    {x: 932, y: 392, r: -2},
    {x: 1342, y: 332, r: 4},
  ];
  const pos = finalPositions[index];
  const opacityIn = interpolate(local, [0, 12], [0, 1], clamp);
  const opacityOut = interpolate(frame, [590, 650], [1, 0], clamp);
  const opacity = opacityIn * opacityOut;
  const x = interpolate(local, [0, 28], [pos.x + (index < 2 ? -360 : 360), pos.x], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const y = interpolate(local, [0, 28], [pos.y + 86, pos.y], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const rotate = interpolate(local, [0, 30], [index % 2 === 0 ? -54 : 54, pos.r], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const scale = interpolate(local, [0, 28], [0.8, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 346,
        height: 514,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.96)",
        boxShadow: "0 28px 70px rgba(0,0,0,0.34)",
        overflow: "hidden",
        opacity,
        transform: `rotate(${rotate}deg) scale(${scale})`,
        transformOrigin: "50% 52%",
      }}
    >
      <div style={{height: 318, overflow: "hidden", backgroundColor: palette.ice}}>
        <Img src={staticFile(partner.image)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
      </div>
      <div style={{padding: "22px 24px 24px"}}>
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
        <div style={{fontFamily: "Arial, sans-serif", fontSize: 34, fontWeight: 900, color: palette.navy, lineHeight: 1}}>
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

const PartnerRotator = () => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], clamp);
  const titleY = interpolate(frame, [0, 22], [30, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{backgroundColor: palette.deepNavy, overflow: "hidden"}}>
      <Img
        src={staticFile("who-workshop.webp")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(1.15) saturate(1.12) contrast(1.15)",
          transform: "scale(1.1)",
        }}
      />
      <AbsoluteFill style={{background: "linear-gradient(180deg, rgba(6,29,50,0.82), rgba(7,56,95,0.72))"}} />
      <BrandBug light timelineSeconds={74 + frame / FPS} />
      <div
        style={{
          position: "absolute",
          top: 124,
          left: 118,
          right: 118,
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          color: palette.white,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            marginLeft: 300,
            fontSize: 27,
            fontWeight: 900,
            color: palette.gold,
            textTransform: "uppercase",
            letterSpacing: 0,
          }}
        >
          Meet the experts behind the guidance
        </div>
        <div style={{marginLeft: 300, fontSize: 60, lineHeight: 1, fontWeight: 900, marginTop: 20, letterSpacing: 0}}>
          Calm, capable specialists helping employees move forward.
        </div>
      </div>
      {partners.map((partner, index) => (
        <PartnerCard key={partner.name} partner={partner} index={index} />
      ))}
      <div
        style={{
          position: "absolute",
          left: 118,
          right: 118,
          bottom: 78,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: interpolate(frame, [150, 184], [0, 1], clamp),
        }}
      >
        <div style={{fontFamily: "Arial, sans-serif", fontSize: 32, fontWeight: 900, color: palette.white}}>
          Federal retirement education. Application guidance. Workforce training.
        </div>
        <div style={{width: 128, height: 7, backgroundColor: palette.gold}} />
      </div>
    </AbsoluteFill>
  );
};

const Closing = () => {
  const frame = useCurrentFrame();
  const logoScale = interpolate(frame, [0, 36], [0.84, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(frame, [0, 24], [0, 1], clamp);

  return (
    <AbsoluteFill style={{backgroundColor: palette.deepNavy, overflow: "hidden"}}>
      <div
        style={{
          position: "absolute",
          inset: -160,
          background:
            "radial-gradient(circle at 30% 20%, rgba(242,196,93,0.22), transparent 30%), radial-gradient(circle at 72% 58%, rgba(201,39,18,0.24), transparent 34%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 72,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 86,
          opacity,
        }}
      >
        <div
          style={{
            width: 420,
            height: 420,
            borderRadius: 8,
            backgroundColor: "transparent",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            transform: `scale(${logoScale})`,
            filter: "drop-shadow(0 26px 42px rgba(0,0,0,0.38))",
          }}
        >
          <Img src={staticFile("who-logo.webp")} style={{height: 360, width: "auto", objectFit: "contain"}} />
        </div>
        <div
          style={{
            width: 420,
            height: 420,
            borderRadius: 8,
            backgroundColor: "transparent",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            transform: `scale(${logoScale})`,
            filter: "drop-shadow(0 26px 42px rgba(0,0,0,0.38))",
          }}
        >
          <Img
            src={staticFile("who-sam-badge.webp")}
            style={{height: 360, width: "auto", objectFit: "contain", transform: "translateY(8px)"}}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 210,
          right: 210,
          bottom: 172,
          textAlign: "center",
          opacity,
          color: palette.white,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{display: "flex", justifyContent: "center"}}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.white,
              borderRadius: 999,
              padding: "26px 72px",
              boxShadow: "0 18px 48px rgba(0,0,0,0.38)",
            }}
          >
            <BrandText fontSize={78} justifyContent="center" />
          </div>
        </div>
        <div
          style={{
            width: 180,
            height: 8,
            backgroundColor: palette.gold,
            margin: "34px auto",
          }}
        />
        <div style={{fontSize: 36, lineHeight: 1.28, fontWeight: 800, letterSpacing: 0}}>
          Federal Retirement Education | Retirement Application Guidance | Workforce Retirement Training
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const WhoWeAreVideo = () => {
  return (
    <AbsoluteFill style={{backgroundColor: palette.deepNavy}}>
      <Sequence durationInFrames={seconds(48)}>
        <Audio src={staticFile("who-background.mp3")} volume={0.07} />
      </Sequence>
      <Sequence from={seconds(48)} durationInFrames={seconds(46)}>
        <Audio src={staticFile("who-background.mp3")} volume={0.06} />
      </Sequence>
      <Sequence from={seconds(94)} durationInFrames={seconds(12)}>
        <Audio src={staticFile("who-background.mp3")} volume={0.05} />
      </Sequence>
      <Sequence from={seconds(1)} durationInFrames={seconds(77)}>
        <Audio src={staticFile("who-eleven-main.mp3")} volume={1.65} />
      </Sequence>
      <Sequence from={seconds(74)} durationInFrames={seconds(20)}>
        <Audio src={staticFile("who-eleven-partners-female.mp3")} volume={1.65} />
      </Sequence>
      <Sequence from={seconds(96)} durationInFrames={seconds(6)}>
        <Audio src={staticFile("who-eleven-closing-male.mp3")} volume={1.65} />
      </Sequence>
      {scenes.map((scene) => (
        <Sequence key={scene.headline} from={seconds(scene.from)} durationInFrames={seconds(scene.duration)}>
          <Scene scene={scene} />
        </Sequence>
      ))}
      <Sequence from={seconds(12)} durationInFrames={seconds(14)}>
        <DecisionGrid />
      </Sequence>
      <Sequence from={seconds(74)} durationInFrames={seconds(20)}>
        <PartnerRotator />
      </Sequence>
      <Sequence from={seconds(94)} durationInFrames={seconds(12)}>
        <Closing />
      </Sequence>
    </AbsoluteFill>
  );
};
