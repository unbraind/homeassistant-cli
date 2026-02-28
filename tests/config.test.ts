import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getConfig, saveConfig } from "../src/config/loader.js";

describe("Config Loader", () => {
  let tempDir: string;
  let configPath: string;
  const originalEnv = process.env;

  beforeEach(() => {
    tempDir = join(tmpdir(), `hassio-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    configPath = join(tempDir, "settings.json");
    process.env = { ...originalEnv };
    delete process.env.HASSIO_URL;
    delete process.env.HASSIO_TOKEN;
    delete process.env.HOMEASSISTANT_URL;
    delete process.env.HOMEASSISTANT_TOKEN;
    delete process.env.HASSIO_FORMAT;
    delete process.env.HASSIO_TIMEOUT;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  describe("getConfig", () => {
    it("should throw error when no URL is provided", () => {
      expect(() => getConfig({ configPath })).toThrow(
        "Home Assistant URL is required"
      );
    });

    it("should throw error when no token is provided", () => {
      expect(() => getConfig({ url: "http://localhost:8123", configPath })).toThrow(
        "Home Assistant token is required"
      );
    });

    it("should use options URL and token", () => {
      const config = getConfig({
        url: "http://localhost:8123",
        token: "test-token",
        configPath,
      });
      expect(config.url).toBe("http://localhost:8123");
      expect(config.token).toBe("test-token");
    });

    it("should strip trailing slash from URL", () => {
      const config = getConfig({
        url: "http://localhost:8123/",
        token: "test-token",
        configPath,
      });
      expect(config.url).toBe("http://localhost:8123");
    });

    it("should use environment variables", () => {
      process.env.HASSIO_URL = "http://env-url:8123";
      process.env.HASSIO_TOKEN = "env-token";
      const config = getConfig({ configPath });
      expect(config.url).toBe("http://env-url:8123");
      expect(config.token).toBe("env-token");
    });

    it("should use alternative environment variables", () => {
      process.env.HOMEASSISTANT_URL = "http://alt-url:8123";
      process.env.HOMEASSISTANT_TOKEN = "alt-token";
      const config = getConfig({ configPath });
      expect(config.url).toBe("http://alt-url:8123");
      expect(config.token).toBe("alt-token");
    });

    it("should prefer options over environment variables", () => {
      process.env.HASSIO_URL = "http://env-url:8123";
      process.env.HASSIO_TOKEN = "env-token";
      const config = getConfig({
        url: "http://opt-url:8123",
        token: "opt-token",
        configPath,
      });
      expect(config.url).toBe("http://opt-url:8123");
      expect(config.token).toBe("opt-token");
    });

    it("should load config from file", () => {
      writeFileSync(
        configPath,
        JSON.stringify({
          url: "http://file-url:8123",
          token: "file-token",
          outputFormat: "json",
          timeout: 60000,
        })
      );
      const config = getConfig({ configPath });
      expect(config.url).toBe("http://file-url:8123");
      expect(config.token).toBe("file-token");
      expect(config.outputFormat).toBe("json");
      expect(config.timeout).toBe(60000);
    });

    it("should use default output format as toon", () => {
      const config = getConfig({
        url: "http://localhost:8123",
        token: "test-token",
        configPath,
      });
      expect(config.outputFormat).toBe("toon");
    });

    it("should use default timeout as 30000", () => {
      const config = getConfig({
        url: "http://localhost:8123",
        token: "test-token",
        configPath,
      });
      expect(config.timeout).toBe(30000);
    });

    it("should use format from environment variable", () => {
      process.env.HASSIO_FORMAT = "json";
      process.env.HASSIO_URL = "http://localhost:8123";
      process.env.HASSIO_TOKEN = "test-token";
      const config = getConfig({ configPath });
      expect(config.outputFormat).toBe("json");
    });

    it("should use timeout from environment variable", () => {
      process.env.HASSIO_TIMEOUT = "45000";
      process.env.HASSIO_URL = "http://localhost:8123";
      process.env.HASSIO_TOKEN = "test-token";
      const config = getConfig({ configPath });
      expect(config.timeout).toBe(45000);
    });
  });

  describe("saveConfig", () => {
    it("should save config to file", () => {
      saveConfig(
        {
          url: "http://saved-url:8123",
          token: "saved-token",
        },
        configPath
      );
      expect(existsSync(configPath)).toBe(true);
      const config = getConfig({ configPath });
      expect(config.url).toBe("http://saved-url:8123");
      expect(config.token).toBe("saved-token");
    });

    it("should merge with existing config", () => {
      writeFileSync(
        configPath,
        JSON.stringify({
          url: "http://original:8123",
          token: "original-token",
        })
      );
      saveConfig({ outputFormat: "yaml" }, configPath);
      const config = getConfig({ configPath });
      expect(config.url).toBe("http://original:8123");
      expect(config.token).toBe("original-token");
      expect(config.outputFormat).toBe("yaml");
    });
  });
});
