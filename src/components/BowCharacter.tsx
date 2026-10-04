import type { CharacterId, Pose } from "../types";
import { CHARACTERS } from "../data/characters";
import { cn } from "../utils/cn";

const ANGLE: Record<Pose, string> = {
  idle: "",
  "15": "15°",
  "45": "45°",
  "90": "90°",
  dogeza: "土下座",
};

export function BowCharacter({
  character,
  pose,
  emotion,
}: {
  character: CharacterId;
  pose: Pose;
  emotion: "idle" | "focused" | "panicked" | "sorry";
}) {
  const def = CHARACTERS.find((c) => c.id === character)!;
  return (
    <div className="bc-stage">
      <div className="bc-spot" />
      <div className={cn("bc-figure", `char-${character}`, `pose-${pose}`, `emo-${emotion}`)}>
        <div className="bc-legs">
          <div className="bc-leg">
            <div className="bc-shoe" />
          </div>
          <div className="bc-leg">
            <div className="bc-shoe" />
          </div>
        </div>
        <div className="bc-upper">
          <div className="bc-arm bc-arm-l" />
          <div className="bc-torso">
            <div className="bc-hoodie" />
            <div className="bc-shirt" />
            <div className="bc-tie" />
          </div>
          <div className="bc-arm bc-arm-r" />
          <div className="bc-head">
            <div className="bc-hair" />
            <div className="bc-face">
              <div className="bc-glasses" />
              <div className="bc-brow-l" />
              <div className="bc-brow-r" />
              <div className="bc-eye-l" />
              <div className="bc-eye-r" />
              <div className="bc-visor" />
              <div className="bc-mouth" />
            </div>
            <div className="bc-sweat" />
          </div>
          <div className="bc-angle-tag">{ANGLE[pose]}</div>
        </div>
      </div>
      <div className="bc-shadow" />
      <div className="bc-podium">
        <div className="bc-mics">
          <span className="bc-mic" />
          <span className="bc-mic" />
          <span className="bc-mic" />
          <span className="bc-mic" />
          <span className="bc-mic" />
        </div>
        <div className="bc-plate">{def.plate}</div>
      </div>
    </div>
  );
}
