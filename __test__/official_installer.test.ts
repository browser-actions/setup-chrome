import * as fs from "node:fs";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { OfficialInstaller } from "../src/official_installer";
import { OS } from "../src/platform";

const fsStatSpy = vi.spyOn(fs.promises, "stat");
const fsRenameSpy = vi.spyOn(fs.promises, "rename");
const tcDownloadToolSpy = vi.spyOn(tc, "downloadTool");
const execExecSpy = vi.spyOn(exec, "exec");

describe("OfficialInstaller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("checkInstalledBrowser", () => {
    const installer = new OfficialInstaller({ os: OS.WINDOWS, arch: "arm64" });

    test("returns undefined when browser is not installed", async () => {
      fsStatSpy.mockRejectedValue(
        Object.assign(new Error(), { code: "ENOENT" }),
      );

      const result = await installer.checkInstalledBrowser("stable");

      expect(result).toBe(undefined);
      expect(fsStatSpy).toHaveBeenCalledWith(
        "C:\\Program Files\\Google\\Chrome\\Application",
      );
    });

    test("returns undefined when browser is installed (with info message)", async () => {
      fsStatSpy.mockResolvedValue({} as fs.Stats);

      const result = await installer.checkInstalledBrowser("stable");

      expect(result).toBe(undefined);
    });

    test("throws error for non-ENOENT file system errors", async () => {
      const fsError = new Error("Permission denied");
      fsStatSpy.mockRejectedValue(fsError);

      await expect(installer.checkInstalledBrowser("stable")).rejects.toThrow(
        "Permission denied",
      );
    });

    test("throws error for invalid version", async () => {
      await expect(installer.checkInstalledBrowser("invalid")).rejects.toThrow(
        "Unexpected version: invalid",
      );
    });
  });

  describe("downloadBrowser", () => {
    const installer = new OfficialInstaller({ os: OS.WINDOWS, arch: "arm64" });

    test("downloads stable version", async () => {
      tcDownloadToolSpy.mockResolvedValue("/tmp/chrome-setup.exe");
      fsRenameSpy.mockResolvedValue(undefined);

      const result = await installer.downloadBrowser("stable");

      expect(result).toEqual({ archive: "/tmp/chrome-setup.exe.exe" });
      expect(tcDownloadToolSpy).toHaveBeenCalledWith(
        expect.stringContaining("https://dl.google.com/tag/s/"),
      );
    });
  });

  describe("installBrowser", () => {
    const installer = new OfficialInstaller({ os: OS.WINDOWS, arch: "arm64" });

    test("installs stable version correctly", async () => {
      execExecSpy.mockResolvedValue(0);

      const result = await installer.installBrowser(
        "stable",
        "/tmp/chrome-setup.exe",
      );

      expect(result).toEqual({
        root: "C:\\Program Files\\Google\\Chrome\\Application",
        bin: "chrome.exe",
      });
      expect(execExecSpy).toHaveBeenCalledWith("/tmp/chrome-setup.exe", [
        "/silent",
        "/install",
      ]);
    });
  });

  describe("checkInstalledDriver", () => {
    const installer = new OfficialInstaller({ os: OS.WINDOWS, arch: "arm64" });

    test("throws error", async () => {
      await expect(installer.checkInstalledDriver("stable")).rejects.toThrow(
        "Official installer doesn't support checking installed chromedriver",
      );
    });
  });

  describe("downloadDriver", () => {
    const installer = new OfficialInstaller({ os: OS.WINDOWS, arch: "arm64" });

    test("throws error", async () => {
      await expect(installer.downloadDriver("stable")).rejects.toThrow(
        "Official installer doesn't support downloading chromedriver",
      );
    });
  });

  describe("installDriver", () => {
    const installer = new OfficialInstaller({ os: OS.WINDOWS, arch: "arm64" });

    test("throws error", async () => {
      await expect(
        installer.installDriver("stable", "/tmp/chromedriver.zip"),
      ).rejects.toThrow(
        "Official installer doesn't support installing chromedriver",
      );
    });
  });
});
