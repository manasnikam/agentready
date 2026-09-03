import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { FPS, HAS_AUDIO, scenes } from "./scenes";
import { SceneShell } from "./components/SceneShell";
import { CloseCard } from "./components/CloseCard";
import { HookCard } from "./components/HookCard";

export const AgentReadyDemo: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0e14" }}>
      {scenes.map((scene) => {
        const durationInFrames = scene.durationInSeconds * FPS;
        const seq = (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={durationInFrames}
            name={scene.title}
          >
            {scene.id === "hook" ? (
              <HookCard scene={scene} />
            ) : scene.id === "close" ? (
              <CloseCard scene={scene} />
            ) : (
              <SceneShell scene={scene} />
            )}
            {HAS_AUDIO ? (
              <Audio src={staticFile(`audio/${scene.id}.wav`)} />
            ) : null}
          </Sequence>
        );
        from += durationInFrames;
        return seq;
      })}
    </AbsoluteFill>
  );
};
