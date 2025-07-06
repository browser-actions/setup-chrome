import * as fs from "node:fs";
import * as tc from "@actions/tool-cache";
import { afterEach, describe, expect, test, vi } from "vitest";
import * as cache from "../src/cache";
import { WindowsChannelInstaller } from "../src/channel_windows";

const fsRenameSpy = vi.spyOn(fs.promises, "rename");
const tcDownloadToolSpy = vi.spyOn(tc, "downloadTool");
const tcExtractZipSpy = vi.spyOn(tc, "extractZip");
const cacheFindSpy = vi.spyOn(cache, "find");
const cacheCacheDirSpy = vi.spyOn(cache, "cacheDir");

afterEach(() => {
  vi.resetAllMocks();
});

describe("WindowsChannelInstaller", () => {
  const installer = new WindowsChannelInstaller({
    os: "windows",
    arch: "amd64",
  });

  describe("checkInstalledBrowser", () => {
    test("returns undefined if the root directory does not exist", async () => {
      cacheFindSpy.mockResolvedValue(undefined);

      const result = await installer.checkInstalledBrowser("stable");
      expect(result).toBe(undefined);
    });

    test("returns the root directory and bin path if the root directory exists", async () => {
      cacheFindSpy.mockResolvedValue("C:\\path\\to\\chrome");

      const result = await installer.checkInstalledBrowser("stable");
      expect(result).toEqual({
        root: "C:\\path\\to\\chrome",
        bin: "chrome.exe",
      });
    });
  });

  describe("downloadBrowser", () => {
    test("throws an error if the version is not a release channel name", async () => {
      await expect(installer.downloadBrowser("foo")).rejects.toThrow(
        "Unexpected version: foo",
      );
    });

    test("downloads the stable version of Chrome", async () => {
      tcDownloadToolSpy.mockResolvedValue("C:\\path\\to\\downloaded\\file");
      fsRenameSpy.mockResolvedValue(undefined);

      await installer.downloadBrowser("stable");
      expect(tcDownloadToolSpy).toHaveBeenCalled();
    });
  });

  describe("installBrowser", () => {
    test("throws an error if the version is not a release channel name", async () => {
      expect(() =>
        installer.installBrowser(
          "foo",
          "C:\\path\\to\\downloaded\\installer.exe",
        ),
      ).rejects.toThrow("Unexpected version: foo");
    });

    test("install the stable version of Chrome", async () => {
      tcExtractZipSpy.mockResolvedValue("C:\\path\\to\\extract\\directory");
      cacheCacheDirSpy.mockResolvedValue("C:\\path\\to\\chrome");

      const result = await installer.installBrowser(
        "stable",
        "C:\\path\\to\\downloaded\\file.zip",
      );
      expect(result).toEqual({
        root: "C:\\path\\to\\chrome",
        bin: "chrome.exe",
      });
    });
  });

  describe("checkInstalledDriver", () => {
    test("return undefined if not installed", async () => {
      cacheFindSpy.mockResolvedValue(undefined);

      const result = await installer.checkInstalledDriver("stable");
      expect(result).toBeUndefined();
    });

    test("return install result if installed", async () => {
      cacheFindSpy.mockResolvedValue("C:\\path\\to\\chromedriver");

      const result = await installer.checkInstalledDriver("stable");
      expect(result).toEqual({
        root: "C:\\path\\to\\chromedriver",
        bin: "chromedriver",
      });
    });
  });

  describe("downloadDriver", () => {
    test("downloads the stable chromedriver", async () => {
      tcDownloadToolSpy.mockResolvedValue("C:\\path\\to\\downloaded\\file.zip");

      const result = await installer.downloadDriver("stable");
      expect(result).toEqual({ archive: "C:\\path\\to\\downloaded\\file.zip" });
    });
  });

  describe("installDriver", () => {
    test("installs the stable chromedriver", async () => {
      tcExtractZipSpy.mockResolvedValue("C:\\path\\to\\extract\\directory");
      cacheCacheDirSpy.mockResolvedValue("C:\\path\\to\\chromedriver");

      const result = await installer.installDriver(
        "stable",
        "C:\\path\\to\\downloaded\\file.zip",
      );
      expect(result).toEqual({
        root: "C:\\path\\to\\chromedriver",
        bin: "chromedriver.exe",
      });
    });
  });
});
