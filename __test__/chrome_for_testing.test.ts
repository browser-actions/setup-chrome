import fs from "node:fs";
import path from "node:path";
import * as httpm from "@actions/http-client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  KnownGoodVersionResolver,
  LastKnownGoodVersionResolver,
} from "../src/chrome_for_testing";

const getJsonSpy = vi.spyOn(httpm.HttpClient.prototype, "getJson");

afterEach(() => {
  vi.resetAllMocks();
});

describe("KnownGoodVersionResolver", () => {
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

  test.each`
    spec               | version            | browserURL                                                                                                | driverURL
    ${"120.0.6099.5"}  | ${"120.0.6099.5"}  | ${"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/120.0.6099.5/linux64/chrome-linux64.zip"}  | ${"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/120.0.6099.5/linux64/chromedriver-linux64.zip"}
    ${"120.0.6099.x"}  | ${"120.0.6099.56"} | ${"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/120.0.6099.56/linux64/chrome-linux64.zip"} | ${"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/120.0.6099.56/linux64/chromedriver-linux64.zip"}
    ${"1234.0.6099.x"} | ${undefined}       | ${undefined}                                                                                              | ${undefined}
  `(
    "should resolve known good versions for $spec",
    async ({ spec, version, browserURL, driverURL }) => {
      const resolver = new KnownGoodVersionResolver({
        os: "linux",
        arch: "amd64",
      });
      const resolved = await resolver.resolveBrowserAndDriver(spec);
      expect(resolved?.version).toEqual(version);
      expect(resolved?.browserDownloadURL).toEqual(browserURL);
      expect(resolved?.driverDownloadURL).toEqual(driverURL);
    },
  );

  test("should cache known good versions", async () => {
    const resolver = new KnownGoodVersionResolver({
      os: "linux",
      arch: "amd64",
    });
    await resolver.resolveBrowserAndDriver("120.0.6099.5");
    await resolver.resolveBrowserAndDriver("120.0.6099.18");
    expect(getJsonSpy).toHaveBeenCalledTimes(1);
  });

  test("should resolve only browser download URL", async () => {
    const resolver = new KnownGoodVersionResolver({
      os: "linux",
      arch: "amd64",
    });

    const resolved1 = await resolver.resolveBrowserAndDriver("113.0.5672.0");
    expect(resolved1).toBeUndefined();

    const resolved2 = await resolver.resolveBrowserOnly("113.0.5672.0");
    expect(resolved2?.version).toEqual("113.0.5672.0");
    expect(resolved2?.browserDownloadURL).toEqual(
      "https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/113.0.5672.0/linux64/chrome-linux64.zip",
    );
  });

  test("unsupported platform", async () => {
    expect(() => {
      new LastKnownGoodVersionResolver({
        os: "windows",
        arch: "arm64",
      });
    }).toThrow("Unsupported platform: windows arm64");
  });
});

describe("LastKnownGoodVersionResolver", () => {
  beforeEach(() => {
    const mockDataPath = path.join(
      __dirname,
      "data/last-known-good-versions-with-downloads.json",
    );

    getJsonSpy.mockImplementation(async () => {
      return {
        statusCode: 200,
        headers: {},
        result: JSON.parse(await fs.promises.readFile(mockDataPath, "utf-8")),
      };
    });
  });

  test("should resolve last known good versions", async () => {
    const resolver = new LastKnownGoodVersionResolver({
      os: "linux",
      arch: "amd64",
    });
    const resolved = await resolver.resolve("stable");
    expect(resolved?.browserDownloadURL).toEqual(
      "https://storage.googleapis.com/chrome-for-testing-public/125.0.6422.78/linux64/chrome-linux64.zip",
    );
    expect(resolved?.driverDownloadURL).toEqual(
      "https://storage.googleapis.com/chrome-for-testing-public/125.0.6422.78/linux64/chromedriver-linux64.zip",
    );
  });

  test("should cache known good versions", async () => {
    const resolver = new LastKnownGoodVersionResolver({
      os: "linux",
      arch: "amd64",
    });
    await resolver.resolve("stable");
    await resolver.resolve("beta");
    expect(getJsonSpy).toHaveBeenCalledTimes(1);
  });

  test("unsupported platform", async () => {
    expect(() => {
      new LastKnownGoodVersionResolver({
        os: "windows",
        arch: "arm64",
      });
    }).toThrow("Unsupported platform: windows arm64");
  });
});
