import * as fs from "node:fs";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import { afterEach, describe, expect, test, vi } from "vitest";
import * as cache from "../src/cache";
import { LinuxChannelInstaller } from "../src/channel_linux";

const cacheFindSpy = vi.spyOn(cache, "find");
const cacheCacheDirSpy = vi.spyOn(cache, "cacheDir");
const tcDownloadToolSpy = vi.spyOn(tc, "downloadTool");
const tcExtractZipSpy = vi.spyOn(tc, "extractZip");
const execSpy = vi.spyOn(exec, "exec");
const fsMkdtempSpy = vi.spyOn(fs.promises, "mkdtemp");
const fsUnlinkSpy = vi.spyOn(fs.promises, "unlink");

afterEach(() => {
  vi.resetAllMocks();
});

describe("LinuxChannelInstaller", () => {
  const installer = new LinuxChannelInstaller({ os: "linux", arch: "amd64" });

  describe("checkInstalledBrowser", () => {
    test("return undefined if not installed", async () => {
      cacheFindSpy.mockResolvedValue(undefined);

      const result = await installer.checkInstalledBrowser("stable");

      expect(result).toBeUndefined();
    });

    test("return install result if installed", async () => {
      cacheFindSpy.mockResolvedValue("/path/to/chromium");

      const result = await installer.checkInstalledBrowser("stable");

      expect(result).toEqual({ root: "/path/to/chromium", bin: "chrome" });
    });
  });

  describe("downloadBrowser", () => {
    test("throw error if version is not release channel", async () => {
      await expect(installer.downloadBrowser("foo")).rejects.toThrowError(
        "Unexpected version: foo",
      );
    });

    test("throw error if version is canary", async () => {
      await expect(installer.downloadBrowser("canary")).rejects.toThrowError(
        "Chrome canary not supported for platform linux amd64",
      );
    });

    test("download stable version", async () => {
      tcDownloadToolSpy.mockResolvedValue("/path/to/downloaded.deb");

      const result = await installer.downloadBrowser("stable");

      expect(result).toEqual({ archive: "/path/to/downloaded.deb" });
      expect(tcDownloadToolSpy).toHaveBeenCalled();
    });
  });

  describe("installBrowser", () => {
    test("throw error if version is not release channel", async () => {
      await expect(
        installer.installBrowser("foo", "/path/to/downloaded.deb"),
      ).rejects.toThrowError("Unexpected version: foo");
    });

    test("throw error if version is canary", async () => {
      await expect(
        installer.installBrowser("canary", "/path/to/downloaded.deb"),
      ).rejects.toThrowError("Chrome canary not supported for Linux");
    });

    test("install stable version", async () => {
      fsMkdtempSpy.mockResolvedValue("/deb-abcdef");
      fsUnlinkSpy.mockResolvedValue(undefined);
      execSpy.mockResolvedValue(0);
      cacheCacheDirSpy.mockResolvedValue("/path/to/chromium");

      const result = await installer.installBrowser(
        "stable",
        "/path/to/downloaded.deb",
      );

      expect(result).toEqual({ root: "/path/to/chromium", bin: "chrome" });
      expect(cacheCacheDirSpy).toHaveBeenCalledWith(
        "/deb-abcdef",
        "chromium",
        "stable",
      );
    });
  });

  describe("checkInstalledDriver", () => {
    test("return undefined if not installed", async () => {
      cacheFindSpy.mockResolvedValue(undefined);

      const result = await installer.checkInstalledDriver("stable");
      expect(result).toBeUndefined();
    });

    test("return install result if installed", async () => {
      cacheFindSpy.mockResolvedValue("/path/to/chromedriver");

      const result = await installer.checkInstalledDriver("stable");
      expect(result).toEqual({
        root: "/path/to/chromedriver",
        bin: "chromedriver",
      });
    });
  });

  describe("downloadDriver", () => {
    test("throw error if version is not release channel", async () => {
      await expect(installer.downloadDriver("foo")).rejects.toThrowError(
        "Invalid version: foo",
      );
    });

    test("download stable version", async () => {
      tcDownloadToolSpy.mockResolvedValue("/tmp/chromedirver.zip");

      const result = await installer.downloadDriver("stable");

      expect(result).toEqual({ archive: "/tmp/chromedirver.zip" });
      expect(tcDownloadToolSpy).toHaveBeenCalled();
    });
  });

  describe("installDriver", () => {
    test("install stable version", async () => {
      tcExtractZipSpy.mockResolvedValue("/tmp/chromedriver");
      cacheCacheDirSpy.mockResolvedValue("/path/to/chromedriver");

      const result = await installer.installDriver(
        "stable",
        "/path/to/downloaded.deb",
      );

      expect(result).toEqual({
        root: "/path/to/chromedriver",
        bin: "chromedriver",
      });
      expect(cacheCacheDirSpy).toHaveBeenCalledWith(
        "/tmp/chromedriver/chromedriver-linux64",
        "chromedriver",
        "stable",
      );
    });
  });
});
