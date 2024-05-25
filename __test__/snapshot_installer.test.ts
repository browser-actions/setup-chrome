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

  describe("checkInstalled", () => {
    test("returns undefined if not installed", async () => {
      cacheFindSpy.mockResolvedValue(undefined);

      const result = await installer.checkInstalled("123");
      expect(result).toBe(undefined);
    });

    test("returns install result if installed", async () => {
      cacheFindSpy.mockResolvedValue("/path/to/chromium");

      const result = await installer.checkInstalled("123");
      expect(result).toEqual({ root: "/path/to/chromium", bin: "chrome" });
    });
  });

  describe("downloadBrowser", () => {
    test("downloads the browser", async () => {
      tcDownloadToolSpy.mockResolvedValue("/path/to/downloaded.zip");

      const result = await installer.downloadBrowser("123456");
      expect(result).toEqual({ archive: "/path/to/downloaded.zip" });
      expect(tcDownloadToolSpy).toHaveBeenCalled();
    });
  });

  describe("installBrowser", () => {
    test("installs the browser", async () => {
      tcExtractZipSpy.mockResolvedValue("/path/to/ext");
      cacheCacheDirSpy.mockResolvedValue("/path/to/chromium");

      const result = await installer.installBrowser(
        "123456",
        "/path/to/archive",
      );
      expect(result).toEqual({ root: "/path/to/chromium", bin: "chrome" });
      expect(tcExtractZipSpy).toHaveBeenCalled();
      expect(cacheCacheDirSpy).toHaveBeenCalled();
    });
  });
});
