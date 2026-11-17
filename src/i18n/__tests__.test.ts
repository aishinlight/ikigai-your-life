import { describe, expect, it } from "vitest";
import en from "./en";
import uk from "./uk";

const shape = (o: unknown): unknown =>
  Array.isArray(o) ? o.map(shape) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v)])) : typeof o;

describe("translations", () => {
  it("Ukrainian has the same structure as English", () => expect(shape(uk)).toEqual(shape(en)));
  it("lists exactly the four specified services in order", () =>
    expect(en.services.map((s) => s.name)).toEqual(["Personal Ikigai Session", "Ikigai Journey Review", "Human Design Session", "All-in-One Coaching"]));
  it("has the spec's onboarding final choices", () =>
    expect(en.onboarding.choices.map((c) => c.l)).toEqual(["Explore with AI", "Connect with a Human Coach", "Combine Both", "Skip for now"]));
});
