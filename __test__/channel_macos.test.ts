import * as fs from "node:fs";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import { afterEach, describe, expect, test, vi } from "vitest";
import * as cache from "../src/cache";
import { MacOSChannelInstaller } from "../src/channel_macos";

const cacheFindSpy = vi.spyOn(cache, "find");
const cacheCacheDirSpy = vi.spyOn(cache, "cacheDir");
const tcDownloadToolSpy = vi.spyOn(tc, "downloadTool");
const tcExtractZipSpy = vi.spyOn(tc, "extractZip");
const fsSymlinkSpy = vi.spyOn(fs.promises, "symlink");
const execSpy = vi.spyOn(exec, "exec");

afterEach(() => {
  vi.resetAllMocks();
});

describe("MacOSChannelInstaller", () => {
  const installer = new MacOSChannelInstaller({
    os: "darwin",
    arch: "amd64",
  });

  describe("checkInstalled", () => {
    test("return undefined if not installed", async () => {
      cacheFindSpy.mockResolvedValue(undefined);

      const result = await installer.checkInstalled("stable");

      expect(result).toBeUndefined();
    });

    test("return install result if installed", async () => {
      cacheFindSpy.mockResolvedValue("/path/to/Chromium.app");

      const result = await installer.checkInstalled("stable");

      expect(result).toEqual({
        root: "/path/to/Chromium.app",
        bin: "Contents/MacOS/chrome",
      });
    });
  });

  describe("downloadBrowser", () => {
    test("throw error if version is not release channel", async () => {
      await expect(installer.downloadBrowser("foo")).rejects.toThrowError(
        "Unexpected version: foo",
      );
    });

    test("download stable version", async () => {
      tcDownloadToolSpy.mockResolvedValue("/path/to/downloaded.dmg");

      const result = await installer.downloadBrowser("stable");

      expect(result).toEqual({ archive: "/path/to/downloaded.dmg" });
    });
  });

  describe("installBrowser", () => {
    test("throw error if version is not release channel", async () => {
      await expect(
        installer.installBrowser("foo", "/path/to/downloaded.dmg"),
      ).rejects.toThrowError("Unexpected version: foo");
    });

    test("install stable version", async () => {
      execSpy.mockResolvedValue(0);
      fsSymlinkSpy.mockResolvedValue();
      cacheCacheDirSpy.mockResolvedValue("/path/to/Chromium.app");

      const result = await installer.installBrowser(
        "stable",
        "/path/to/downloaded.dmg",
      );

      expect(result).toEqual({
        root: "/path/to/Chromium.app",
        bin: "Contents/MacOS/chrome",
      });
      expect(cacheCacheDirSpy).toHaveBeenCalledWith(
        "/Volumes/downloaded.dmg/Google Chrome.app",
        "chromium",
        "stable",
      );
    });
  });

  describe("downloadDriver", () => {
    test("throw error if version is not release channel", async () => {
      await expect(installer.downloadDriver("foo")).rejects.toThrowError(
        "Invalid version: foo",
      );
    });

    test("download driver", async () => {
      tcDownloadToolSpy.mockResolvedValue("/path/to/downloaded.zip");

      const result = await installer.downloadDriver("stable");

      expect(result).toEqual({ archive: "/path/to/downloaded.zip" });
    });
  });

  describe("installDriver", () => {
    test("install driver", async () => {
      cacheCacheDirSpy.mockResolvedValue("/path/to/chromedriver");
      tcExtractZipSpy.mockResolvedValue("/path/to/chromedriver");

      const result = await installer.installDriver(
        "stable",
        "/path/to/chromedriver.zip",
      );

      expect(result).toEqual({
        root: "/path/to/chromedriver",
        bin: "chromedriver",
      });
      expect(cacheCacheDirSpy).toHaveBeenCalledWith(
        "/path/to/chromedriver/chromedriver-mac-x64",
        "chromedriver",
        "stable",
      );
    });
  });
});
