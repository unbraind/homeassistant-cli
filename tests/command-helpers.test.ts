import { describe, expect, it } from "vitest";
import { parseLimit } from "../src/utils/command-helpers.js";

describe("command helper parsing", () => {
  it("parses optional positive limits", () => {
    expect(parseLimit()).toBeUndefined();
    expect(parseLimit("12")).toBe(12);
  });

  it("rejects non-positive and non-numeric limits", () => {
    expect(() => parseLimit("0")).toThrow("positive integer");
    expect(() => parseLimit("invalid")).toThrow("positive integer");
  });
});
