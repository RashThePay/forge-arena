import { protocolId, type ProtocolId } from "../domain/ids";

export const APPEARANCE_SLOTS = {
  body: protocolId(701),
  skin: protocolId(702),
  hair: protocolId(703),
  hairColor: protocolId(704),
  facing: protocolId(705),
} as const;

export const APPEARANCE_ASSETS = {
  masculine: protocolId(801), feminine: protocolId(802),
  skinLight: protocolId(811), skinWarm: protocolId(812), skinDeep: protocolId(813),
  hairParted: protocolId(821), hairMessy: protocolId(822), hairNone: protocolId(823),
  hairBrown: protocolId(831), hairBlack: protocolId(832), hairAuburn: protocolId(833), hairAsh: protocolId(834),
  faceLeft: protocolId(841), faceRight: protocolId(842),
} as const;

export type AppearanceOption = { id: ProtocolId; label: string; swatch?: string };

export const APPEARANCE_OPTIONS = {
  body: [
    { id: APPEARANCE_ASSETS.masculine, label: "Masculine" },
    { id: APPEARANCE_ASSETS.feminine, label: "Feminine" },
  ],
  skin: [
    { id: APPEARANCE_ASSETS.skinLight, label: "Light", swatch: "#efb28e" },
    { id: APPEARANCE_ASSETS.skinWarm, label: "Warm", swatch: "#b76e48" },
    { id: APPEARANCE_ASSETS.skinDeep, label: "Deep", swatch: "#6f3f2d" },
  ],
  hair: [
    { id: APPEARANCE_ASSETS.hairParted, label: "Parted" },
    { id: APPEARANCE_ASSETS.hairMessy, label: "Messy" },
    { id: APPEARANCE_ASSETS.hairNone, label: "None" },
  ],
  hairColor: [
    { id: APPEARANCE_ASSETS.hairBrown, label: "Brown", swatch: "#6d3f28" },
    { id: APPEARANCE_ASSETS.hairBlack, label: "Black", swatch: "#211d20" },
    { id: APPEARANCE_ASSETS.hairAuburn, label: "Auburn", swatch: "#8f3428" },
    { id: APPEARANCE_ASSETS.hairAsh, label: "Ash", swatch: "#9b9188" },
  ],
  facing: [
    { id: APPEARANCE_ASSETS.faceLeft, label: "Face left" },
    { id: APPEARANCE_ASSETS.faceRight, label: "Face right" },
  ],
} as const;

export const DEFAULT_APPEARANCE: Readonly<Record<number, ProtocolId>> = {
  [APPEARANCE_SLOTS.body]: APPEARANCE_ASSETS.masculine,
  [APPEARANCE_SLOTS.skin]: APPEARANCE_ASSETS.skinWarm,
  [APPEARANCE_SLOTS.hair]: APPEARANCE_ASSETS.hairParted,
  [APPEARANCE_SLOTS.hairColor]: APPEARANCE_ASSETS.hairBrown,
  [APPEARANCE_SLOTS.facing]: APPEARANCE_ASSETS.faceRight,
};

export function appearanceValue(appearance: Readonly<Record<number, ProtocolId>>, slot: ProtocolId): ProtocolId {
  return appearance[slot] ?? DEFAULT_APPEARANCE[slot];
}
