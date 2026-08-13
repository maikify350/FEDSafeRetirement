import {Composition} from "remotion";
import {WebinarReel} from "./WebinarReel";
import {WhoWeAreVideo} from "./WhoWeAreVideo";

export const FPS = 30;
export const DURATION_SECONDS = 79.224;
export const DURATION_FRAMES = Math.ceil(DURATION_SECONDS * FPS);
export const WHO_WE_ARE_DURATION_SECONDS = 106;
export const WHO_WE_ARE_DURATION_FRAMES = WHO_WE_ARE_DURATION_SECONDS * FPS;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="WebinarReel"
        component={WebinarReel}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="WhoWeAreVideo"
        component={WhoWeAreVideo}
        durationInFrames={WHO_WE_ARE_DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
