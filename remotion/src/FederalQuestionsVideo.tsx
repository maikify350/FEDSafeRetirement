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
import type { ReactNode } from "react";

const FPS = 30;
const seconds = (val: number) => Math.round(val * FPS);

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
  paper: "#f6f1e8",
};

const phoneNumber = "(774) 273 8473";
const websiteUrl = "FedSafeRetirement.com";

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
      }}
    >
      FED
    </span>
    <span
      style={{
        color: onDark ? "#0f5f9b" : palette.navy,
        textShadow: onDark ? "0 0 18px rgba(255,255,255,0.44)" : undefined,
      }}
    >
      SAFE RETIREMENT
    </span>
  </span>
);

const BrandBug = ({ timelineSeconds = 0 }: { timelineSeconds?: number }) => {
  const pulseActive = timelineSeconds >= 48 && timelineSeconds <= 58;
  const pulse = pulseActive ? Math.sin((timelineSeconds - 48) * Math.PI * 2.3) : 0;
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
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        filter: "drop-shadow(0 16px 28px rgba(0,0,0,0.34))",
        zIndex: 20,
      }}
    >
      <Img src={staticFile("who-logo.webp")} style={{ height: 196, width: "auto", objectFit: "contain" }} />
      <div
        style={{
          height: 196,
          display: "flex",
          alignItems: "flex-start",
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
              ? `drop-shadow(0 0 ${18 + glow * 10}px rgba(242,196,93,${0.52 + glow * 0.26}))`
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
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy, overflow: "hidden" }}>
      <Img
        src={staticFile(image)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translateX(${x}px) scale(${scale})`,
          filter: "brightness(1.12) saturate(1.15) contrast(1.15)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(6,29,50,0.78) 0%, rgba(6,29,50,0.35) 44%, rgba(6,29,50,0.82) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(7,56,95,0.12) 0%, rgba(6,29,50,0.12) 46%, rgba(6,29,50,0.75) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

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
      width: 780,
      minHeight: 520,
      borderRadius: 12,
      padding: "50px 56px",
      background: "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(234,244,251,0.92))",
      boxShadow: "0 32px 80px rgba(0,0,0,0.38)",
      opacity,
      transform: `translateY(${lift}px)`,
    }}
  >
    {children}
  </div>
);

type StoryScene = {
  from: number;
  duration: number;
  image: string;
  eyebrow: string;
  headline: string;
  body?: string;
  bullets?: string[];
  align?: "left" | "right";
};

const storyScenes: StoryScene[] = [
  {
    from: 0,
    duration: 8,
    image: "who-home-hero.webp",
    eyebrow: "Federal & Postal Retirement",
    headline: "The Questions That Matter Most",
    body: "When approaching federal retirement, a confident answer is not always a correct one.",
  },
  {
    from: 8,
    duration: 12,
    image: "who-retired-vet.webp",
    eyebrow: "Question #1: Timing & Dates",
    headline: "When is the exact best day for you to retire?",
    body: "FERS High-3 calculations, unused annual leave payouts, and end-of-month timing directly impact your pension.",
    align: "right",
  },
  {
    from: 20,
    duration: 13,
    image: "pshb-healthcare-review.jpg",
    eyebrow: "Question #2: True Take-Home Income",
    headline: "What will your net check look like after deductions?",
    body: "FEHB/PSHB health premiums, survivor benefit costs, and tax withholdings reduce your gross annuity.",
  },
  {
    from: 47,
    duration: 11,
    image: "who-workshop.webp",
    eyebrow: "Why FedSafe Exists",
    headline: "We help federal employees slow down and verify before they file.",
    body: "No generalists. No sales pressure. 100% focused on federal & postal benefits.",
    align: "right",
  },
  {
    from: 78,
    duration: 8,
    image: "who-mike-podium.webp",
    eyebrow: "Education First",
    headline: "Rules. Deadlines. Paperwork. Decision Points.",
    bullets: ["What to verify on your ORA application", "What benefit deductions to coordinate", "What questions to ask before you submit"],
  },
];

const DecisionGrid = () => {
  const frame = useCurrentFrame();
  const questions = [
    "When is my optimal retirement date?",
    "How do I draw safe monthly income from TSP?",
    "How does PSHB coordinate with Medicare Part B?",
    "Which Survivor Benefit election protects my spouse?",
    "How do I prevent the age-65 FEGLI rate spike?",
    "Does military service buyback make financial sense?",
  ];

  return (
    <AbsoluteFill>
      <Background image="who-decision-background.webp" localFrame={frame} align="right" />
      <BrandBug timelineSeconds={33 + frame / FPS} />
      <div
        style={{
          position: "absolute",
          left: 118,
          right: 118,
          top: 180,
          paddingLeft: 300,
          color: palette.white,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 900, color: palette.gold, textTransform: "uppercase" }}>
          Real Questions Federal Employees Face
        </div>
        <div style={{ fontSize: 64, lineHeight: 1.05, fontWeight: 900, width: 1100, marginTop: 16 }}>
          Every decision connects. Get clarity before you sign.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 90,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {questions.map((q, index) => {
          const opacity = interpolate(frame, [15 + index * 5, 25 + index * 5], [0, 1], clamp);
          const y = interpolate(frame, [15 + index * 5, 28 + index * 5], [24, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <div
              key={q}
              style={{
                minHeight: 130,
                borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.94)",
                borderTop: `6px solid ${index % 2 === 0 ? palette.red : palette.gold}`,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                boxShadow: "0 18px 40px rgba(0,0,0,0.3)",
                opacity,
                transform: `translateY(${y}px)`,
              }}
            >
              <div style={{ fontFamily: "Arial, sans-serif", fontSize: 24, lineHeight: 1.15, fontWeight: 900, color: palette.navy }}>
                {q}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const partners = [
  { name: "Ben Bailey", image: "who-ben-bailey.webp", role: "Founding Senior Partner", line: "Simplifies complex benefit rules so you decide with confidence." },
  { name: "Daniel French", image: "who-daniel-french.webp", role: "Founding Senior Partner", line: "Three decades of disciplined retirement income strategy." },
  { name: "Brian Westrich", image: "who-brian-westrich.webp", role: "Founding Senior Partner", line: "Known for precision pension calculations & TSP income planning." },
  { name: "Mike Zaino", image: "who-mike-zaino.webp", role: "Founding Senior Partner", line: "Former fed & Army vet turning confusion into practical next steps." },
];

const PartnerRotator = () => {
  const frame = useCurrentFrame();
  const finalPositions = [
    { x: 112, y: 392, r: -4 },
    { x: 522, y: 332, r: 3 },
    { x: 932, y: 392, r: -2 },
    { x: 1342, y: 332, r: 4 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy, overflow: "hidden" }}>
      <Img src={staticFile("who-workshop.webp")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(1.12) contrast(1.15)", transform: "scale(1.1)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,29,50,0.85), rgba(7,56,95,0.75))" }} />
      <BrandBug timelineSeconds={58 + frame / FPS} />
      <div style={{ position: "absolute", top: 124, left: 118, right: 118, color: palette.white, fontFamily: "Arial, sans-serif" }}>
        <div style={{ marginLeft: 300, fontSize: 26, fontWeight: 900, color: palette.gold, textTransform: "uppercase" }}>
          Meet the Experts Behind the Answers
        </div>
        <div style={{ marginLeft: 300, fontSize: 56, lineHeight: 1.05, fontWeight: 900, marginTop: 14 }}>
          Over 80 Combined Years of Dedicated Federal Experience.
        </div>
      </div>
      {partners.map((partner, index) => {
        const start = index * 30;
        const local = frame - start;
        const pos = finalPositions[index];
        const opacity = interpolate(local, [0, 15], [0, 1], clamp);
        const y = interpolate(local, [0, 24], [pos.y + 60, pos.y], { ...clamp, easing: Easing.out(Easing.cubic) });

        return (
          <div
            key={partner.name}
            style={{
              position: "absolute",
              left: pos.x,
              top: y,
              width: 346,
              height: 500,
              borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.96)",
              boxShadow: "0 28px 70px rgba(0,0,0,0.35)",
              overflow: "hidden",
              opacity,
              transform: `rotate(${pos.r}deg)`,
            }}
          >
            <div style={{ height: 300, overflow: "hidden", backgroundColor: palette.ice }}>
              <Img src={staticFile(partner.image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ padding: "20px 22px" }}>
              <div style={{ fontFamily: "Arial, sans-serif", fontSize: 16, fontWeight: 900, textTransform: "uppercase", color: palette.red, marginBottom: 8 }}>
                {partner.role}
              </div>
              <div style={{ fontFamily: "Arial, sans-serif", fontSize: 32, fontWeight: 900, color: palette.navy, lineHeight: 1 }}>
                {partner.name}
              </div>
              <div style={{ marginTop: 10, fontFamily: "Arial, sans-serif", fontSize: 19, fontWeight: 700, lineHeight: 1.2, color: palette.ink }}>
                {partner.line}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const ClosingScene = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: -160, background: "radial-gradient(circle at 30% 20%, rgba(242,196,93,0.22), transparent 30%), radial-gradient(circle at 72% 58%, rgba(201,39,18,0.24), transparent 34%)" }} />
      <div style={{ position: "absolute", top: 60, left: 0, right: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 60, opacity }}>
        <Img src={staticFile("who-logo.webp")} style={{ height: 300, width: "auto", objectFit: "contain", filter: "drop-shadow(0 26px 42px rgba(0,0,0,0.4))" }} />
        <Img src={staticFile("who-sam-badge.webp")} style={{ height: 300, width: "auto", objectFit: "contain", filter: "drop-shadow(0 26px 42px rgba(0,0,0,0.4))" }} />
      </div>

      <div style={{ position: "absolute", left: 160, right: 160, bottom: 90, textAlign: "center", opacity, color: palette.white, fontFamily: "Arial, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", backgroundColor: palette.white, borderRadius: 999, padding: "20px 60px", boxShadow: "0 18px 48px rgba(0,0,0,0.38)" }}>
            <BrandText fontSize={64} justifyContent="center" />
          </div>
        </div>

        <div style={{ fontSize: 34, fontWeight: 900, color: palette.gold, textTransform: "uppercase", marginBottom: 20 }}>
          "The Future Favors the Prepared"
        </div>

        {/* CTA Bar with Phone & Website */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 40, backgroundColor: palette.red, padding: "18px 50px", borderRadius: 18, boxShadow: "0 20px 48px rgba(0,0,0,0.45)" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, textTransform: "uppercase", color: palette.white }}>Call to Schedule Free Review</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: palette.white }}>{phoneNumber}</div>
          </div>
          <div style={{ width: 3, height: 60, backgroundColor: "rgba(255,255,255,0.4)" }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, textTransform: "uppercase", color: palette.white }}>Online Booking</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: palette.gold }}>{websiteUrl}</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const FederalQuestionsVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      {/* Background soundtrack */}
      <Sequence durationInFrames={seconds(96)}>
        <Audio src={staticFile("who-background.mp3")} volume={0.06} />
      </Sequence>

      {/* Synchronized 3-part voiceovers */}
      <Sequence from={seconds(1)} durationInFrames={seconds(32)}>
        <Audio src={staticFile("questions-video-part1.mp3")} volume={1.75} />
      </Sequence>
      <Sequence from={seconds(47)} durationInFrames={seconds(31)}>
        <Audio src={staticFile("questions-video-part2.mp3")} volume={1.75} />
      </Sequence>
      <Sequence from={seconds(78)} durationInFrames={seconds(18)}>
        <Audio src={staticFile("questions-video-part3.mp3")} volume={1.75} />
      </Sequence>

      {/* Story scenes */}
      {storyScenes.map((scene) => {
        return (
          <Sequence key={scene.headline} from={seconds(scene.from)} durationInFrames={seconds(scene.duration)}>
            <AbsoluteFill>
              <Background image={scene.image} localFrame={0} align={scene.align} />
              <BrandBug timelineSeconds={scene.from} />
              <Panel align={scene.align} opacity={1} lift={0}>
                <div style={{ fontFamily: "Arial, sans-serif", fontSize: 24, fontWeight: 900, color: palette.red, textTransform: "uppercase" }}>
                  {scene.eyebrow}
                </div>
                <div style={{ width: 140, height: 6, backgroundColor: palette.gold, marginTop: 18, marginBottom: 28 }} />
                <div style={{ fontFamily: "Arial, sans-serif", fontSize: scene.headline.length > 55 ? 48 : 56, lineHeight: 1.05, fontWeight: 900, color: palette.navy }}>
                  {scene.headline}
                </div>
                {scene.body ? (
                  <div style={{ marginTop: 24, fontFamily: "Arial, sans-serif", fontSize: 28, lineHeight: 1.3, fontWeight: 700, color: palette.ink }}>
                    {scene.body}
                  </div>
                ) : null}
                {scene.bullets ? (
                  <div style={{ display: "flex", gap: 16, flexDirection: "column", marginTop: 28 }}>
                    {scene.bullets.map((b) => (
                      <div key={b} style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: "Arial, sans-serif", fontSize: 28, fontWeight: 900, color: palette.ink }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: palette.red }} />
                        {b}
                      </div>
                    ))}
                  </div>
                ) : null}
              </Panel>
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Interactive questions grid */}
      <Sequence from={seconds(33)} durationInFrames={seconds(14)}>
        <DecisionGrid />
      </Sequence>

      {/* Partner rotator */}
      <Sequence from={seconds(58)} durationInFrames={seconds(20)}>
        <PartnerRotator />
      </Sequence>

      {/* Closing CTA */}
      <Sequence from={seconds(86)} durationInFrames={seconds(10)}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
