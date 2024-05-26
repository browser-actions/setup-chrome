import fs from "node:fs";
import path from "node:path";
import * as httpm from "@actions/http-client";
import * as tc from "@actions/tool-cache";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as cache from "../src/cache";
import {
  KnownGoodVersionInstaller,
  KnownGoodVersionResolver,
} from "../src/version_installer";

const getJsonSpy = vi.spyOn(httpm.HttpClient.prototype, "getJson");

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

describe("VersionResolver", () => {
  test.each`
    spec               | version            | url
    ${"120.0.6099.5"}  | ${"120.0.6099.5"}  | ${"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/120.0.6099.5/linux64/chrome-linux64.zip"}
    ${"120.0.6099.x"}  | ${"120.0.6099.56"} | ${"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/120.0.6099.56/linux64/chrome-linux64.zip"}
    ${"1234.0.6099.x"} | ${undefined}       | ${undefined}
  `("should resolve known good versions for $spec", async ({ spec, version, url }) => {
    const resolver = new KnownGoodVersionResolver("linux64");
    const resolved = await resolver.resolve(spec);
    expect(resolved?.version).toEqual(version);
    expect(resolved?.chromeDownloadURL).toEqual(url);
  });

  test("should cache known good versions", async () => {
    const resolver = new KnownGoodVersionResolver("linux64");
    await resolver.resolve("120.0.6099.5");
    await resolver.resolve("120.0.6099.18");
    expect(getJsonSpy).toHaveBeenCalledTimes(1);
  });
});

describe("KnownGoodVersionInstaller", () => {
  const tcFindSpy = vi.spyOn(cache, "find");
  const tcDownloadToolSpy = vi.spyOn(tc, "downloadTool");

  test("should return installed path if installed", async () => {
    tcFindSpy.mockResolvedValue("/opt/hostedtoolcache/setup-chrome/chromium/120.0.6099.56/x64");

    const installer = new KnownGoodVersionInstaller({
      os: "linux",
      arch: "amd64",
    });
    const installed = await installer.checkInstalled("120.0.6099.x");
    expect(installed?.root).toEqual(
      "/opt/hostedtoolcache/setup-chrome/chromium/120.0.6099.56/x64",
    );
    expect(tcFindSpy).toHaveBeenCalledWith("chromium", "120.0.6099.x");
  });

  test("should download zip archive", async () => {
    tcDownloadToolSpy.mockImplementation(async () => "/tmp/chromium.zip");
    const installer = new KnownGoodVersionInstaller({
      os: "linux",
      arch: "amd64",
    });
    const downloaded = await installer.downloadBrowser("120.0.6099.x");
    expect(downloaded?.archive).toEqual("/tmp/chromium.zip");
  });
});
