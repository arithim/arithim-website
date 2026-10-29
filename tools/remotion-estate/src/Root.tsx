import { Composition } from "remotion";
import { Estate, W, H, FPS, DURATION } from "./Estate";

export const RemotionRoot: React.FC = () => {
  return <Composition id="EstateHero" component={Estate} durationInFrames={DURATION} fps={FPS} width={W} height={H} />;
};
