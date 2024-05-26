import * as tc from "@actions/tool-cache";
import { afterEach, describe, expect, test, vi } from "vitest";
import * as cache from "../src/cache";
import { LatestInstaller } from "../src/latest_installer";

const cacheFindSpy = vi.spyOn(cache, "find");
const cacheCacheDirSpy = vi.spyOn(cache, "cacheDir");
const tcDownloadToolSpy = vi.spyOn(tc, "downloadTool");
const tcExtractZipSpy = vi.spyOn(tc, "extractZip");
vi.mock("../src/snapshot_bucket", () => ({
  resolveLatestVersion: () => Promise.resolve("123456"),
  browserDownloadURL: () => "https://example.com/chrome.zip",
  driverDownloadURL: () => "https://example.com/chromedriver.zip",
}));

afterEach(() => {
  vi.resetAllMocks();
});

describe("LatestInstaller", () => {
  const installer = new LatestInstaller({ os: "linux", arch: "amd64" });

  describe("checkInstalled", () => {
    test("returns undefined if not installed", async () => {
      cacheFindSpy.mockResolvedValue(undefined);

      const result = await installer.checkInstalled("latest");
      expect(result).toBe(undefined);
      expect(cacheFindSpy).toHaveBeenCalledWith("chromium", "123456");
    });

    test("returns install result if installed", async () => {
      cacheFindSpy.mockResolvedValue("/path/to/chromium");

      const result = await installer.checkInstalled("latest");
      expect(result).toEqual({ root: "/path/to/chromium", bin: "chrome" });
    });
  });

  describe("downloadBrowser", () => {
    test("downloads the browser", async () => {
      tcDownloadToolSpy.mockResolvedValue("/tmp/chrome.zip");

      const result = await installer.downloadBrowser("latest");
      expect(result).toEqual({ archive: "/tmp/chrome.zip" });
      expect(tcDownloadToolSpy).toHaveBeenCalledWith(
        "https://example.com/chrome.zip",
      );
    });
  });

  describe("installBrowser", () => {
    test("installs the browser", async () => {
      tcExtractZipSpy.mockResolvedValue("/path/to/ext");
      cacheCacheDirSpy.mockResolvedValue("/path/to/chromium");

      const result = await installer.installBrowser(
        "latest",
        "/tmp/chrome.zip",
      );
      expect(result).toEqual({ root: "/path/to/chromium", bin: "chrome" });
      expect(tcExtractZipSpy).toHaveBeenCalled();
      expect(cacheCacheDirSpy).toHaveBeenCalledWith(
        "/path/to/ext/chrome-linux",
        "chromium",
        "123456",
      );
    });
  });

  describe("downloadDriver", () => {
    test("downloads the driver", async () => {
      tcDownloadToolSpy.mockResolvedValue("/tmp/chromedriver.zip");

      const result = await installer.downloadDriver("latest");
      expect(result).toEqual({ archive: "/tmp/chromedriver.zip" });
      expect(tcDownloadToolSpy).toHaveBeenCalledWith(
        "https://example.com/chromedriver.zip",
      );
    });
  });

  describe("installDriver", () => {
    test("installs the driver", async () => {
      tcExtractZipSpy.mockResolvedValue("/path/to/ext");
      cacheCacheDirSpy.mockResolvedValue("/path/to/chromedriver");

      const result = await installer.installDriver(
        "latest",
        "/tmp/chromedriver.zip",
      );
      expect(result).toEqual({
        root: "/path/to/chromedriver",
        bin: "chromedriver",
      });
      expect(tcExtractZipSpy).toHaveBeenCalled();
      expect(cacheCacheDirSpy).toHaveBeenCalledWith(
        "/path/to/ext/chromedriver_linux64",
        "chromedriver",
        "123456",
      );
    });
  });
});
