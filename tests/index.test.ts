import { describe, expect, it } from "vitest";
import * as library from "../src/index.js";

describe("public library entrypoint", () => {
  it("exports API, config, formatter, and type-backed runtime surfaces", () => {
    expect(library.HomeAssistantClient).toBeTypeOf("function");
    expect(library.getConfig).toBeTypeOf("function");
    expect(library.formatOutput).toBeTypeOf("function");
  });
});
