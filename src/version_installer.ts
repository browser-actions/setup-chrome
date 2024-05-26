import path from "node:path";
import * as core from "@actions/core";
import * as httpm from "@actions/http-client";
import * as tc from "@actions/tool-cache";
import * as cache from "./cache";
import type { DownloadResult, InstallResult, Installer } from "./installer";
import { Arch, OS, type Platform } from "./platform";
import { parse } from "./version";

const KNOWN_GOOD_VERSIONS_URL =
  "https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json";

export type KnownGoodVersionsJson = {
  timestamp: string;
  versions: KnownGoodVersion[];
};

export type KnownGoodVersionPlatform =
  | "linux64"
  | "mac-arm64"
  | "mac-x64"
  | "win32"
  | "win64";

export type KnownGoodVersion = {
  version: string;
  revision: string;
  downloads: {
    chrome?: Array<{
      platform: KnownGoodVersionPlatform;
      url: string;
    }>;
  };
};

type ResolvedVersion = {
  version: string;
  chromeDownloadURL: string;
};

export class KnownGoodVersionResolver {
  private readonly http = new httpm.HttpClient("setup-chrome");

  private readonly platform: KnownGoodVersionPlatform;

  private knownGoodVersionsCache?: KnownGoodVersion[];

  constructor(platform: KnownGoodVersionPlatform) {
    this.platform = platform;
  }

  async resolve(version: string): Promise<ResolvedVersion | undefined> {
    const spec = parse(version);

    const knownGoodVersions = await this.getKnownGoodVersions();
    for (const version of knownGoodVersions) {
      if (spec.satisfies(version.version) && version.downloads.chrome) {
        const found = version.downloads.chrome.find(
          ({ platform }) => platform === this.platform,
        );
        if (found) {
          return { version: version.version, chromeDownloadURL: found.url };
        }
      }
    }
  }

  private async getKnownGoodVersions(): Promise<KnownGoodVersion[]> {
    if (this.knownGoodVersionsCache) {
      return this.knownGoodVersionsCache;
    }

    const resp = await this.http.getJson<KnownGoodVersionsJson>(
      KNOWN_GOOD_VERSIONS_URL,
    );
    if (resp.statusCode !== httpm.HttpCodes.OK) {
      throw new Error(`Failed to get known good versions: ${resp.statusCode}`);
    }
    if (resp.result === null) {
      throw new Error("Failed to get known good versions");
    }

    this.knownGoodVersionsCache = resp.result.versions.reverse();

    return resp.result.versions;
  }
}

export class KnownGoodVersionInstaller implements Installer {
  private readonly versionResolver: KnownGoodVersionResolver;
  private readonly platform: Platform;
  private readonly knownGoodVersionPlatform: KnownGoodVersionPlatform;

  constructor(platform: Platform) {
    this.platform = platform;
    if (platform.os === OS.LINUX && platform.arch === Arch.AMD64) {
      this.knownGoodVersionPlatform = "linux64";
    } else if (platform.os === OS.DARWIN && platform.arch === Arch.AMD64) {
      this.knownGoodVersionPlatform = "mac-x64";
    } else if (platform.os === OS.DARWIN && platform.arch === Arch.ARM64) {
      this.knownGoodVersionPlatform = "mac-arm64";
    } else if (platform.os === OS.WINDOWS && platform.arch === Arch.AMD64) {
      this.knownGoodVersionPlatform = "win64";
    } else if (platform.os === OS.WINDOWS && platform.arch === Arch.I686) {
      this.knownGoodVersionPlatform = "win32";
    } else {
      throw new Error(`Unsupported platform: ${platform.os} ${platform.arch}`);
    }

    this.versionResolver = new KnownGoodVersionResolver(
      this.knownGoodVersionPlatform,
    );
  }

  async checkInstalled(version: string): Promise<InstallResult | undefined> {
    const root = await cache.find("chromium", version);
    if (root) {
      return { root, bin: "chrome" };
    }
  }

  async downloadBrowser(version: string): Promise<DownloadResult> {
    const resolved = await this.versionResolver.resolve(version);
    if (!resolved) {
      throw new Error(`Version ${version} not found in known good versions`);
    }
    core.info(
      `Acquiring ${resolved.version} from ${resolved.chromeDownloadURL}`,
    );
    const archive = await tc.downloadTool(resolved.chromeDownloadURL);
    return { archive };
  }

  async installBrowser(
    version: string,
    archive: string,
  ): Promise<InstallResult> {
    const resolved = await this.versionResolver.resolve(version);
    if (!resolved) {
      throw new Error(`Version ${version} not found in known good versions`);
    }
    const extPath = await tc.extractZip(archive);
    const extAppRoot = path.join(
      extPath,
      `chrome-${this.knownGoodVersionPlatform}`,
    );

    const root = await cache.cacheDir(extAppRoot, "chromium", resolved.version);
    core.info(`Successfully Installed chromium to ${root}`);
    const bin = (() => {
      switch (this.platform.os) {
        case OS.DARWIN:
          return "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
        case OS.LINUX:
          return "chrome";
        case OS.WINDOWS:
          return "chrome.exe";
      }
    })();
    return { root: root, bin };
  }
}
