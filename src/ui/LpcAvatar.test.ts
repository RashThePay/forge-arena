import { describe, expect, it } from "vitest";
import { APPEARANCE_ASSETS, APPEARANCE_SLOTS } from "../content/appearance";
import { resolveLpcLayers } from "./LpcAvatar";

describe("LPC appearance mapping", () => {
  it("resolves a compact appearance record into stable LPC layers", () => {
    expect(resolveLpcLayers({
      [APPEARANCE_SLOTS.body]: APPEARANCE_ASSETS.feminine,
      [APPEARANCE_SLOTS.hair]: APPEARANCE_ASSETS.hairMessy,
      [APPEARANCE_SLOTS.facing]: APPEARANCE_ASSETS.faceLeft,
    })).toMatchObject({ body: "feminine", hair: "messy", facing: "left" });
  });

  it("uses protocol-stable defaults for missing appearance slots", () => {
    expect(resolveLpcLayers({})).toMatchObject({ body: "masculine", hair: "parted", facing: "right" });
  });
});
