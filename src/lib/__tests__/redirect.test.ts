import { describe, expect, it } from "vitest";
import { safeRedirect } from "../redirect";

describe("safeRedirect", () => {
  it.each([
    ["/map", "/map"],
    ["/explore/meaning?x=1#a", "/explore/meaning?x=1#a"],
    [null, "/dashboard"],
    ["https://evil.com", "/dashboard"],
    ["//evil.com", "/dashboard"],
    ["/\\evil.com", "/dashboard"],
    ["javascript:alert(1)", "/dashboard"],
    ["/login", "/dashboard"],
    ["map", "/dashboard"],
  ])("%s → %s", (input, out) => expect(safeRedirect(input as string | null)).toBe(out));
});
