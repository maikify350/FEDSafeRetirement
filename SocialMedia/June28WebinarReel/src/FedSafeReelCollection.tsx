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
  SamBadge,
} from "./components/SharedComponents";

export const FPS = 30;
const phoneNumber = "(774) 273 8473";
const websiteUrl = "FedSafeRetirement.com";

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

/* ═══════════════════════════════════════════════════════════════
   3. FERS Special Supplement Reel (30s)
   ═══════════════════════════════════════════════════════════════ */
export const FersSupplementReel = () => {
  const DURATION_FRAMES = 30 * FPS;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      <Audio src={staticFile("fers-supplement-narration.mp3")} volume={1.8} />
      <Audio src={staticFile("who-background.mp3")} volume={0.06} />
      <HeaderBug badgeText="FERS SUPPLEMENT" />

      <Sequence from={0} durationInFrames={5 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="who-retired-vet.webp" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="Retiring Before 62?"
              headline="The FERS Bridge Payment"
              body="Did you know you could qualify for monthly income before Social Security starts?"
              accentColor={palette.gold}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={5 * FPS} durationInFrames={16 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="usps-retirement-guide.jpg" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="Earned Through 30 Years"
              headline="Worth Thousands in Early Retirement"
              body="Retiring at MRA with 30 years? Calculate your exact supplement bridge payment."
              accentColor={palette.red}
            />
          </div>
          <div style={{ position: "absolute", left: 70, bottom: 270 }}>
            <SamBadge size="small" />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={21 * FPS} durationInFrames={9 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="federal-couple-happy.jpg" localFrame={0} />
          <div style={{ position: "absolute", top: 280, left: 70, right: 70, textAlign: "center", color: palette.gold, fontFamily: "Arial", fontSize: 34, fontWeight: 900, textTransform: "uppercase", textShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>
            "The Future Favors the Prepared"
          </div>
          <CallToAction label="Calculate Your Bridge Payment" phone={phoneNumber} website={websiteUrl} />
        </AbsoluteFill>
      </Sequence>
      <ProgressBar totalFrames={DURATION_FRAMES} />
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════════════
   4. TSP Withdrawal Mistakes Reel (35s)
   ═══════════════════════════════════════════════════════════════ */
export const TspMistakesReel = () => {
  const DURATION_FRAMES = 35 * FPS;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      <Audio src={staticFile("tsp-mistakes-narration.mp3")} volume={1.8} />
      <Audio src={staticFile("who-background.mp3")} volume={0.06} />
      <HeaderBug badgeText="TSP STRATEGY" />

      <Sequence from={0} durationInFrames={5 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="tsp-retirement-growth.jpg" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="Thrift Savings Plan"
              headline="3 Critical TSP Mistakes"
              body="Avoid the traps that drain federal retirement savings."
              accentColor={palette.red}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={5 * FPS} durationInFrames={20 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="agency-benefits.png" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="Taxes & Allocation"
              headline="Coordinate TSP With Your Pension"
              body="Lump sum tax penalties, bad fund allocation, and lack of income planning can cost you."
              accentColor={palette.gold}
            />
          </div>
          <div style={{ position: "absolute", left: 70, bottom: 270 }}>
            <SamBadge size="small" />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={25 * FPS} durationInFrames={10 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="federal-advisor-consultation.jpg" localFrame={0} />
          <div style={{ position: "absolute", top: 280, left: 70, right: 70, textAlign: "center", color: palette.gold, fontFamily: "Arial", fontSize: 34, fontWeight: 900, textTransform: "uppercase", textShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>
            "The Future Favors the Prepared"
          </div>
          <CallToAction label="Schedule Free TSP Review" phone={phoneNumber} website={websiteUrl} />
        </AbsoluteFill>
      </Sequence>
      <ProgressBar totalFrames={DURATION_FRAMES} />
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════════════
   5. Survivor Benefit Plan Reel (35s)
   ═══════════════════════════════════════════════════════════════ */
export const SurvivorBenefitReel = () => {
  const DURATION_FRAMES = 35 * FPS;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      <Audio src={staticFile("sbp-election-narration.mp3")} volume={1.8} />
      <Audio src={staticFile("who-background.mp3")} volume={0.06} />
      <HeaderBug badgeText="SURVIVOR BENEFIT" />

      <Sequence from={0} durationInFrames={5 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="federal-couple-happy.jpg" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="Survivor Benefit Plan (SBP)"
              headline="25% vs 50% Election"
              body="This choice is permanent and cannot be easily changed."
              accentColor={palette.gold}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={5 * FPS} durationInFrames={20 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="who-workshop.webp" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="Protecting Your Spouse"
              headline="Healthcare & Lifetime Income"
              body="A wrong election could eliminate your spouse's FEHB health coverage."
              accentColor={palette.red}
            />
          </div>
          <div style={{ position: "absolute", left: 70, bottom: 270 }}>
            <SamBadge size="small" />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={25 * FPS} durationInFrames={10 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="federal-advisor-consultation.jpg" localFrame={0} />
          <div style={{ position: "absolute", top: 280, left: 70, right: 70, textAlign: "center", color: palette.gold, fontFamily: "Arial", fontSize: 34, fontWeight: 900, textTransform: "uppercase", textShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>
            "The Future Favors the Prepared"
          </div>
          <CallToAction label="Get SBP Clarity Before You Sign" phone={phoneNumber} website={websiteUrl} />
        </AbsoluteFill>
      </Sequence>
      <ProgressBar totalFrames={DURATION_FRAMES} />
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════════════
   6. FEHB 5-Year Rule Reel (30s)
   ═══════════════════════════════════════════════════════════════ */
export const FehbFiveYearRuleReel = () => {
  const DURATION_FRAMES = 30 * FPS;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      <Audio src={staticFile("fehb-five-year-narration.mp3")} volume={1.8} />
      <Audio src={staticFile("who-background.mp3")} volume={0.06} />
      <HeaderBug badgeText="FEHB HEALTHCARE" />

      <Sequence from={0} durationInFrames={5 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="pshb-healthcare-review.jpg" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="FEHB Healthcare in Retirement"
              headline="The Strict 5-Year Rule"
              body="A single gap in coverage can cost you lifetime health benefits."
              accentColor={palette.red}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={5 * FPS} durationInFrames={16 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="who-mike-podium.webp" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="Continuous Enrollment"
              headline="5 Consecutive Years Required"
              body="Verify your enrollment record before you submit your retirement package."
              accentColor={palette.gold}
            />
          </div>
          <div style={{ position: "absolute", left: 70, bottom: 270 }}>
            <SamBadge size="small" />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={21 * FPS} durationInFrames={9 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="federal-couple-happy.jpg" localFrame={0} />
          <div style={{ position: "absolute", top: 280, left: 70, right: 70, textAlign: "center", color: palette.gold, fontFamily: "Arial", fontSize: 34, fontWeight: 900, textTransform: "uppercase", textShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>
            "The Future Favors the Prepared"
          </div>
          <CallToAction label="Verify Your FEHB Eligibility" phone={phoneNumber} website={websiteUrl} />
        </AbsoluteFill>
      </Sequence>
      <ProgressBar totalFrames={DURATION_FRAMES} />
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════════════
   7. High-3 Pension Calculation Myths (30s)
   ═══════════════════════════════════════════════════════════════ */
export const HighThreePensionReel = () => {
  const DURATION_FRAMES = 30 * FPS;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      <Audio src={staticFile("high-three-narration.mp3")} volume={1.8} />
      <Audio src={staticFile("who-background.mp3")} volume={0.06} />
      <HeaderBug badgeText="PENSION FORMULA" />

      <Sequence from={0} durationInFrames={5 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="agency-education.png" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="FERS Pension Math"
              headline="High-3 Salary Myths"
              body="It is NOT based simply on your final calendar year."
              accentColor={palette.gold}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={5 * FPS} durationInFrames={16 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="usps-retirement-guide.jpg" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="36 Consecutive Months"
              headline="Includes Locality Pay"
              body="Timing your retirement date correctly can maximize your lifetime pension annuity."
              accentColor={palette.red}
            />
          </div>
          <div style={{ position: "absolute", left: 70, bottom: 270 }}>
            <SamBadge size="small" />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={21 * FPS} durationInFrames={9 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="federal-advisor-consultation.jpg" localFrame={0} />
          <div style={{ position: "absolute", top: 280, left: 70, right: 70, textAlign: "center", color: palette.gold, fontFamily: "Arial", fontSize: 34, fontWeight: 900, textTransform: "uppercase", textShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>
            "The Future Favors the Prepared"
          </div>
          <CallToAction label="Calculate Your High-3 Pension" phone={phoneNumber} website={websiteUrl} />
        </AbsoluteFill>
      </Sequence>
      <ProgressBar totalFrames={DURATION_FRAMES} />
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════════════
   8. Military Service Buyback Reel (35s)
   ═══════════════════════════════════════════════════════════════ */
export const MilitaryBuybackReel = () => {
  const DURATION_FRAMES = 35 * FPS;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      <Audio src={staticFile("military-buyback-narration.mp3")} volume={1.8} />
      <Audio src={staticFile("who-background.mp3")} volume={0.06} />
      <HeaderBug badgeText="MILITARY BUYBACK" />

      <Sequence from={0} durationInFrames={5 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="military-buyback-desk.jpg" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="Prior Military Service?"
              headline="Boost Your Federal Pension"
              body="Buying back military time can add hundreds to your monthly pension."
              accentColor={palette.gold}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={5 * FPS} durationInFrames={20 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="who-mike-podium.webp" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="Return on Investment"
              headline="DD214 Calculation Review"
              body="We calculate your military buyback deposit to see if it makes financial sense."
              accentColor={palette.red}
            />
          </div>
          <div style={{ position: "absolute", left: 70, bottom: 270 }}>
            <SamBadge size="small" />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={25 * FPS} durationInFrames={10 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="military-buyback-desk.jpg" localFrame={0} />
          <div style={{ position: "absolute", top: 280, left: 70, right: 70, textAlign: "center", color: palette.gold, fontFamily: "Arial", fontSize: 34, fontWeight: 900, textTransform: "uppercase", textShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>
            "The Future Favors the Prepared"
          </div>
          <CallToAction label="Review Your Military Buyback" phone={phoneNumber} website={websiteUrl} />
        </AbsoluteFill>
      </Sequence>
      <ProgressBar totalFrames={DURATION_FRAMES} />
    </AbsoluteFill>
  );
};

/* ═══════════════════════════════════════════════════════════════
   10. Why FedSafe Exists / Brand Mission Reel (35s)
   ═══════════════════════════════════════════════════════════════ */
export const WhyFedSafeReel = () => {
  const DURATION_FRAMES = 35 * FPS;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.deepNavy }}>
      <Audio src={staticFile("why-fedsafe-narration.mp3")} volume={1.8} />
      <Audio src={staticFile("who-background.mp3")} volume={0.06} />
      <HeaderBug badgeText="FEDSAFE RETIREMENT" />

      <Sequence from={0} durationInFrames={5 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="who-workshop.webp" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="Experience & Expertise"
              headline="100% Exclusively Federal"
              body="No generalists. No side practices."
              accentColor={palette.gold}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={5 * FPS} durationInFrames={20 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="federal-advisor-consultation.jpg" localFrame={0} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 380 }}>
            <TextReveal
              eyebrow="SAM.gov Registered Contractor"
              headline="80+ Years Combined Experience"
              body="Specialized guidance for FERS, CSRS, TSP, FEGLI, and Postal transitions."
              accentColor={palette.red}
            />
          </div>
          <div style={{ position: "absolute", left: 70, bottom: 270 }}>
            <SamBadge size="small" />
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={25 * FPS} durationInFrames={10 * FPS}>
        <AbsoluteFill>
          <AnimatedBackground image="who-home-hero.webp" localFrame={0} />
          <div style={{ position: "absolute", top: 280, left: 70, right: 70, textAlign: "center", color: palette.gold, fontFamily: "Arial", fontSize: 34, fontWeight: 900, textTransform: "uppercase", textShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>
            "The Future Favors the Prepared"
          </div>
          <CallToAction label="Schedule Free Benefit Analysis" phone={phoneNumber} website={websiteUrl} />
        </AbsoluteFill>
      </Sequence>
      <ProgressBar totalFrames={DURATION_FRAMES} />
    </AbsoluteFill>
  );
};
