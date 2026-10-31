import {Composition} from "remotion";
import {WebinarReel} from "./WebinarReel";
import {WhoWeAreVideo} from "./WhoWeAreVideo";
import {DidYouKnowReel} from "./DidYouKnowReel";
import {PartnerSpotlightReel} from "./PartnerSpotlightReel";
import {PostalRetirementReel} from "./PostalRetirementReel";
import {FegliShockReel} from "./FegliShockReel";
import {
  FersSupplementReel,
  TspMistakesReel,
  SurvivorBenefitReel,
  FehbFiveYearRuleReel,
  HighThreePensionReel,
  MilitaryBuybackReel,
  WhyFedSafeReel,
} from "./FedSafeReelCollection";

import {FederalQuestionsVideo} from "./FederalQuestionsVideo";
import {DynamicScriptReel} from "./DynamicScriptReel";
import {ExplainerReel, calculateExplainerMetadata, EXPLAINER_FPS} from "./ExplainerReel";

export const FPS = 30;
export const DURATION_SECONDS = 79.224;
export const DURATION_FRAMES = Math.ceil(DURATION_SECONDS * FPS);
export const WHO_WE_ARE_DURATION_SECONDS = 106;
export const WHO_WE_ARE_DURATION_FRAMES = WHO_WE_ARE_DURATION_SECONDS * FPS;

export const RemotionRoot = () => {
  return (
    <>
      {/* ── Explainer Studio (size/duration from props; 16:9, 9:16 or 4:5) ── */}
      <Composition
        id="ExplainerReel"
        component={ExplainerReel}
        durationInFrames={60 * EXPLAINER_FPS}
        fps={EXPLAINER_FPS}
        width={1080}
        height={1920}
        defaultProps={{
          title: "Explainer",
          width: 1080,
          height: 1920,
          durationSec: 12,
          scenes: [
            {narration: "Here is the story of trains, and why it changed everything.", onscreenText: "The Evolution of Trains", era: "1829", cameraMotion: "push_forward", transition: "fade", durationSec: 4, animationMode: "3d_threejs"},
            {narration: "Steam gave way to diesel, then to electricity.", onscreenText: "Steam → Diesel → Electric", era: "1930s", cameraMotion: "orbit", transition: "slide_left", durationSec: 4, animationMode: "3d_threejs"},
            {narration: "Then Japan rewrote the rules at 210 kilometres an hour.", onscreenText: "Shinkansen", era: "1964", cameraMotion: "fly_by_right", transition: "zoom_in", durationSec: 4, animationMode: "3d_threejs"},
          ],
        }}
        calculateMetadata={calculateExplainerMetadata}
      />

      {/* ── 16:9 Widescreen Brand & Homepage Videos ── */}
      <Composition
        id="FederalQuestionsVideo"
        component={FederalQuestionsVideo}
        durationInFrames={96 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="WhoWeAreVideo"
        component={WhoWeAreVideo}
        durationInFrames={WHO_WE_ARE_DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* ── 1. Postal Service & PSHB ── */}
      <Composition
        id="PostalRetirementReel"
        component={PostalRetirementReel}
        durationInFrames={45 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ── 2. FEGLI Option B Rate Spike ── */}
      <Composition
        id="FegliShockReel"
        component={FegliShockReel}
        durationInFrames={35 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ── 3. FERS Special Supplement ── */}
      <Composition
        id="FersSupplementReel"
        component={FersSupplementReel}
        durationInFrames={30 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ── 4. TSP Withdrawal Mistakes ── */}
      <Composition
        id="TspMistakesReel"
        component={TspMistakesReel}
        durationInFrames={35 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ── 5. Survivor Benefit Plan (SBP) ── */}
      <Composition
        id="SurvivorBenefitReel"
        component={SurvivorBenefitReel}
        durationInFrames={35 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ── 6. FEHB 5-Year Rule ── */}
      <Composition
        id="FehbFiveYearRuleReel"
        component={FehbFiveYearRuleReel}
        durationInFrames={30 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ── 7. High-3 Pension Calculation ── */}
      <Composition
        id="HighThreePensionReel"
        component={HighThreePensionReel}
        durationInFrames={30 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ── 8. Military Service Buyback ── */}
      <Composition
        id="MilitaryBuybackReel"
        component={MilitaryBuybackReel}
        durationInFrames={35 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ── 9. Partner Spotlight - Mike Zaino ── */}
      <Composition
        id="PartnerSpotlightReel"
        component={PartnerSpotlightReel}
        durationInFrames={45 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ── 10. Why FedSafe Exists / Mission ── */}
      <Composition
        id="WhyFedSafeReel"
        component={WhyFedSafeReel}
        durationInFrames={35 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ── "Did You Know?" Quick Fact ── */}
      <Composition
        id="DidYouKnowReel"
        component={DidYouKnowReel}
        durationInFrames={30 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ── Dynamic Script Library V2 Reel (Parameterized) ── */}
      <Composition
        id="DynamicScriptReel"
        component={DynamicScriptReel}
        durationInFrames={90 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
