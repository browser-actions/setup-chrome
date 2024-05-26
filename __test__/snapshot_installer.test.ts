import * as tc from "@actions/tool-cache";
import { afterEach, describe, expect, test, vi } from "vitest";
import * as cache from "../src/cache";
import { SnapshotInstaller } from "../src/snapshot_installer";

const cacheFindSpy = vi.spyOn(cache, "find");
const cacheCacheDirSpy = vi.spyOn(cache, "cacheDir");
const tcDownloadToolSpy = vi.spyOn(tc, "downloadTool");
const tcExtractZipSpy = vi.spyOn(tc, "extractZip");

afterEach(() => {
  vi.resetAllMocks();
});

describe("SnapshotInstaller", () => {
  const installer = new SnapshotInstaller({ os: "linux", arch: "amd64" });

  describe("checkInstalledBrowser", () => {
    test("returns undefined if not installed", async () => {
      cacheFindSpy.mockResolvedValue(undefined);

      const result = await installer.checkInstalledBrowser("123456");
      expect(result).toBe(undefined);
    });

    test("returns install result if installed", async () => {
      cacheFindSpy.mockResolvedValue("/path/to/chromium");

      const result = await installer.checkInstalledBrowser("123456");
      expect(result).toEqual({ root: "/path/to/chromium", bin: "chrome" });
    });
  });

  describe("downloadBrowser", () => {
    test("downloads the browser", async () => {
      tcDownloadToolSpy.mockResolvedValue("/tmp/chrome.zip");

      const result = await installer.downloadBrowser("123456");
      expect(result).toEqual({ archive: "/tmp/chrome.zip" });
      expect(tcDownloadToolSpy).toHaveBeenCalled();
    });
  });

  describe("installBrowser", () => {
    test("installs the browser", async () => {
      tcExtractZipSpy.mockResolvedValue("/path/to/ext");
      cacheCacheDirSpy.mockResolvedValue("/path/to/chromium");

      const result = await installer.installBrowser(
        "123456",
        "/tmp/chrome.zip",
      );
      expect(result).toEqual({ root: "/path/to/chromium", bin: "chrome" });
      expect(tcExtractZipSpy).toHaveBeenCalled();
      expect(cacheCacheDirSpy).toHaveBeenCalled();
    });
  });

  describe("checkInstalledDriver", () => {
    test("returns undefined if not installed", async () => {
      cacheFindSpy.mockResolvedValue(undefined);

      const result = await installer.checkInstalledDriver("123456");
      expect(result).toBe(undefined);
    });

    test("returns install result if installed", async () => {
      cacheFindSpy.mockResolvedValue("/path/to/chromedriver");

      const result = await installer.checkInstalledDriver("123456");
      expect(result).toEqual({
        root: "/path/to/chromedriver",
        bin: "chromedriver",
      });
    });
  });

  describe("downloadDriver", () => {
    test("downloads the driver", async () => {
      tcDownloadToolSpy.mockResolvedValue("/tmp/chromedriver.zip");

      const result = await installer.downloadDriver("123456");
      expect(result).toEqual({ archive: "/tmp/chromedriver.zip" });
      expect(tcDownloadToolSpy).toHaveBeenCalled();
    });
  });

  describe("installDriver", () => {
    test("installs the driver", async () => {
      tcExtractZipSpy.mockResolvedValue("/path/to/ext");
      cacheCacheDirSpy.mockResolvedValue("/path/to/chromedriver");

      const result = await installer.installDriver(
        "123456",
        "/tmp/chromedriver.zip",
      );
      expect(result).toEqual({
        root: "/path/to/chromedriver",
        bin: "chromedriver",
      });
      expect(tcExtractZipSpy).toHaveBeenCalled();
      expect(cacheCacheDirSpy).toHaveBeenCalled();
    });
  });
});
