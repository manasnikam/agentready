import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { FPS, HAS_AUDIO, INSERT_AUDIO, scenes } from "./scenes";
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
            {HAS_AUDIO
              ? (INSERT_AUDIO[scene.id] ?? []).map((ins) => (
                  <Sequence key={ins.file} from={ins.at} name={ins.file}>
                    <Audio src={staticFile(ins.file)} />
                  </Sequence>
                ))
              : null}
          </Sequence>
        );
        from += durationInFrames;
        return seq;
      })}
    </AbsoluteFill>
  );
};
