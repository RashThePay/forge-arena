import type { CSSProperties } from "react";
import { APPEARANCE_ASSETS, APPEARANCE_SLOTS, appearanceValue } from "../content/appearance";
import type { ProtocolId } from "../domain/ids";

type Props = { appearance: Readonly<Record<number, ProtocolId>>; className?: string };

export function resolveLpcLayers(appearance: Props["appearance"]) {
  const feminine = appearanceValue(appearance, APPEARANCE_SLOTS.body) === APPEARANCE_ASSETS.feminine;
  const hair = appearanceValue(appearance, APPEARANCE_SLOTS.hair);
  return {
    body: feminine ? "feminine" : "masculine",
    facing: appearanceValue(appearance, APPEARANCE_SLOTS.facing) === APPEARANCE_ASSETS.faceLeft ? "left" : "right",
    skin: appearanceValue(appearance, APPEARANCE_SLOTS.skin),
    hair: hair === APPEARANCE_ASSETS.hairNone ? null : hair === APPEARANCE_ASSETS.hairMessy ? "messy" : "parted",
    hairColor: appearanceValue(appearance, APPEARANCE_SLOTS.hairColor),
  } as const;
}

export function LpcAvatar({ appearance, className = "" }: Props) {
  const model = resolveLpcLayers(appearance);
  const skinClass = model.skin === APPEARANCE_ASSETS.skinDeep ? "skin-deep" : model.skin === APPEARANCE_ASSETS.skinWarm ? "skin-warm" : "skin-light";
  const hairClass = model.hairColor === APPEARANCE_ASSETS.hairBlack ? "hair-black" : model.hairColor === APPEARANCE_ASSETS.hairAuburn ? "hair-auburn" : model.hairColor === APPEARANCE_ASSETS.hairAsh ? "hair-ash" : "hair-brown";
  const path = "/assets/lpc";
  const layer = (name: string, source: string, extra = "") => <span aria-hidden="true" className={`lpc-layer ${name} ${extra}`} style={{ "--sprite": `url(${source})` } as CSSProperties} />;

  return <div className={`lpc-avatar facing-${model.facing} ${className}`} role="img" aria-label={`LPC champion facing ${model.facing}`}>
    {layer("lpc-body", `${path}/body/${model.body}.png`, skinClass)}
    {layer("lpc-head", `${path}/head/${model.body}.png`, skinClass)}
    {layer("lpc-eyes", `${path}/eyes/default.png`)}
    {layer("lpc-torso", `${path}/torso/${model.body}.png`)}
    {layer("lpc-legs", `${path}/legs/${model.body}.png`)}
    {layer("lpc-feet", `${path}/feet/${model.body}.png`)}
    {model.hair && layer("lpc-hair", `${path}/hair/${model.hair}.png`, hairClass)}
  </div>;
}
