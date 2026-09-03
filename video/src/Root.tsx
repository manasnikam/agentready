import React from "react";
import { Composition } from "remotion";
import { AgentReadyDemo } from "./AgentReadyDemo";
import { FPS, HEIGHT, WIDTH, totalDurationInFrames } from "./scenes";

export const Root: React.FC = () => {
  return (
    <Composition
      id="AgentReadyDemo"
      component={AgentReadyDemo}
      durationInFrames={totalDurationInFrames}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
