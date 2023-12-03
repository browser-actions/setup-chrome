import {
  KnownGoodVersionResolver,
  KnownGoodVersionInstaller,
} from "../src/version_installer";
import { VersionSpec } from "../src/version";
import * as httpm from "@actions/http-client";
import * as tc from "@actions/tool-cache";
import fs from "fs";
import path from "path";

describe("VersionResolver", () => {
  const getJsonSpy = jest.spyOn(httpm.HttpClient.prototype, "getJson");

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
    spec               | resolved
    ${"120.0.6099.5"}  | ${"120.0.6099.5"}
    ${"120.0.6099.x"}  | ${"120.0.6099.56"}
    ${"1234.0.6099.x"} | ${undefined}
  `("should resolve known good versions", async ({ spec, resolved }) => {
    const resolver = new KnownGoodVersionResolver("linux64");
    const version = await resolver.resolve(new VersionSpec(spec));
    expect(version?.toString()).toEqual(resolved);
  });

  test("should resolve an url for a known good version", async () => {
    const resolver = new KnownGoodVersionResolver("linux64");
    const url = await resolver.resolveUrl(new VersionSpec("120.0.6099.x"));
    expect(url).toEqual(
      "https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/120.0.6099.56/linux64/chrome-linux64.zip",
    );
  });

  test("should cache known good versions", async () => {
    const resolver = new KnownGoodVersionResolver("linux64");
    await resolver.resolve(new VersionSpec("120.0.6099.5"));
    await resolver.resolve(new VersionSpec("120.0.6099.18"));
    expect(getJsonSpy).toHaveBeenCalledTimes(1);
  });
});

describe("KnownGoodVersionInstaller", () => {
  const tcFindSpy = jest.spyOn(tc, "find");
  const tcDownloadToolSpy = jest.spyOn(tc, "downloadTool");

  test("should return true if installed", async () => {
    tcFindSpy.mockImplementation((name: string, version: string) => {
      return `/opt/hostedtoolcache/${name}/${version}`;
    });

    const installer = new KnownGoodVersionInstaller({
      os: "linux",
      arch: "amd64",
    });
    const installed = await installer.checkInstalled("120.0.6099.x");
    expect(installed?.root).toEqual(
      "/opt/hostedtoolcache/chromium/120.0.6099.56",
    );
    expect(tcFindSpy).toHaveBeenCalledWith("chromium", "120.0.6099.56");
  });

  test("should download zip archive", async () => {
    tcDownloadToolSpy.mockImplementation(async () => "/tmp/chromium.zip");
    const installer = new KnownGoodVersionInstaller({
      os: "linux",
      arch: "amd64",
    });
    const downloaded = await installer.download("120.0.6099.x");
    expect(downloaded?.archive).toEqual("/tmp/chromium.zip");
  });
});
