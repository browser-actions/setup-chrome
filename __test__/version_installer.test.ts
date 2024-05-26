import fs from "node:fs";
import path from "node:path";
import * as httpm from "@actions/http-client";
import * as tc from "@actions/tool-cache";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as cache from "../src/cache";
import { KnownGoodVersionInstaller } from "../src/version_installer";

const getJsonSpy = vi.spyOn(httpm.HttpClient.prototype, "getJson");
const tcExtractZipSpy = vi.spyOn(tc, "extractZip");
const tcDownloadToolSpy = vi.spyOn(tc, "downloadTool");
const cacheFindSpy = vi.spyOn(cache, "find");
const cacheCacheDirSpy = vi.spyOn(cache, "cacheDir");

beforeEach(() => {
  const mockDataPath = path.join(
    __dirname,
    "data/known-good-versions-with-downloads.json",
  );

  getJsonSpy.mockImplementation(async () => {
    return {
      statusCode: 200,
      headers: {},
      result: JSON.parse(await fs.promises.readFile(mockDataPath, "utf-8")),
    };
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("KnownGoodVersionInstaller", () => {
  const installer = new KnownGoodVersionInstaller({
    os: "linux",
    arch: "amd64",
  });

  test("checkInstalledBrowser should return installed path if installed", async () => {
    cacheFindSpy.mockResolvedValue(
      "/opt/hostedtoolcache/setup-chrome/chromium/120.0.6099.56/x64",
    );

    const installed = await installer.checkInstalledBrowser("120.0.6099.x");
    expect(installed?.root).toEqual(
      "/opt/hostedtoolcache/setup-chrome/chromium/120.0.6099.56/x64",
    );
    expect(cacheFindSpy).toHaveBeenCalledWith("chromium", "120.0.6099.x");
  });

  test("downloadBrowser should download browser archive", async () => {
    tcDownloadToolSpy.mockImplementation(async () => "/tmp/chromium.zip");

    const downloaded = await installer.downloadBrowser("120.0.6099.x");
    expect(downloaded?.archive).toEqual("/tmp/chromium.zip");
    expect(tcDownloadToolSpy).toHaveBeenCalled();
  });

  test("installDriver should install browser", async () => {
    tcExtractZipSpy.mockImplementation(async () => "/tmp/extracted");
    cacheCacheDirSpy.mockImplementation(async () => "/path/to/chromium");

    const installed = await installer.installBrowser(
      "120.0.6099.x",
      "/tmp/chromium.zip",
    );
    expect(installed).toEqual({ root: "/path/to/chromium", bin: "chrome" });
    expect(cacheCacheDirSpy).toHaveBeenCalledWith(
      "/tmp/extracted/chrome-linux64",
      "chromium",
      "120.0.6099.56",
    );
  });

  test("checkInstalledDriver should return undefined if not installed", async () => {
    cacheFindSpy.mockResolvedValue(undefined);

    const installed = await installer.checkInstalledDriver("120.0.6099.x");
    expect(installed).toBeUndefined();
  });

  test("checkInstalledDriver should return installed path if installed", async () => {
    cacheFindSpy.mockResolvedValue(
      "/opt/hostedtoolcache/setup-chrome/chromedriver/120.0.6099.56/x64",
    );

    const installed = await installer.checkInstalledDriver("120.0.6099.x");
    expect(installed?.root).toEqual(
      "/opt/hostedtoolcache/setup-chrome/chromedriver/120.0.6099.56/x64",
    );
    expect(cacheFindSpy).toHaveBeenCalledWith("chromedriver", "120.0.6099.x");
  });

  test("downloadDriver should download driver archive", async () => {
    tcDownloadToolSpy.mockImplementation(async () => "/tmp/chromedriver.zip");

    const downloaded = await installer.downloadDriver("120.0.6099.x");
    expect(downloaded?.archive).toEqual("/tmp/chromedriver.zip");
    expect(tcDownloadToolSpy).toHaveBeenCalled();
  });

  test("installDriver should install driver", async () => {
    tcExtractZipSpy.mockImplementation(async () => "/tmp/extracted");
    cacheCacheDirSpy.mockImplementation(async () => "/path/to/chromedriver");

    const installed = await installer.installDriver(
      "120.0.6099.x",
      "/tmp/chromedriver.zip",
    );
    expect(installed).toEqual({
      root: "/path/to/chromedriver",
      bin: "chromedriver",
    });
    expect(cacheCacheDirSpy).toHaveBeenCalledWith(
      "/tmp/extracted/chromedriver-linux64",
      "chromedriver",
      "120.0.6099.56",
    );
  });
});
