import * as tc from "@actions/tool-cache";
import * as httpm from "@actions/http-client";
import * as core from "@actions/core";
import path from "path";
import { Arch, OS, Platform } from "./platform";
import { parse } from "./version";
import { Installer, DownloadResult, InstallResult } from "./installer";

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
    chrome: Array<{
      platform: KnownGoodVersionPlatform;
      url: string;
    }>;
  };
};

export class KnownGoodVersionResolver {
  private readonly http = new httpm.HttpClient("setup-chrome");

  private readonly platform: KnownGoodVersionPlatform;

  private knownGoodVersionsCache?: KnownGoodVersion[];

  private readonly resolvedVersions = new Map<string, string>();

  constructor(platform: KnownGoodVersionPlatform) {
    this.platform = platform;
  }

  async resolve(version: string): Promise<string | undefined> {
    const spec = parse(version);
    if (this.resolvedVersions.has(spec.toString())) {
      return this.resolvedVersions.get(spec.toString())!;
    }

    const knownGoodVersions = await this.getKnownGoodVersions();
    for (const version of knownGoodVersions) {
      if (!spec.satisfies(version.version)) {
        continue;
      }
      const found = version.downloads.chrome.find(
        ({ platform }) => platform === this.platform,
      );
      if (found) {
        this.resolvedVersions.set(spec.toString(), version.version);
        return version.version;
      }
    }
    return undefined;
  }

  async resolveUrl(version: string): Promise<string | undefined> {
    const resolved = await this.resolve(version);
    if (!resolved) {
      return undefined;
    }

    const knownGoodVersions = await this.getKnownGoodVersions();
    const knownGoodVersion = knownGoodVersions.find(
      (v) => v.version === resolved.toString(),
    );
    if (!knownGoodVersion) {
      return undefined;
    }

    const found = knownGoodVersion.downloads.chrome.find(
      ({ platform }) => platform === this.platform,
    );
    if (!found) {
      return undefined;
    }
    return found.url;
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
      throw new Error(`Failed to get known good versions`);
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
    const resolved = await this.versionResolver.resolve(version);
    if (!resolved) {
      return undefined;
    }

    const root = tc.find("chromium", resolved.toString());
    if (root) {
      return { root, bin: "chrome" };
    }
  }

  async download(version: string): Promise<DownloadResult> {
    const resolved = await this.versionResolver.resolve(version);
    if (!resolved) {
      throw new Error(`Version ${version} not found in known good versions`);
    }

    const url = await this.versionResolver.resolveUrl(version);
    if (!url) {
      throw new Error(`Version ${version} not found in known good versions`);
    }
    const archive = await tc.downloadTool(url);
    core.info(`Acquiring ${resolved} from ${url}`);
    return { archive };
  }

  async install(version: string, archive: string): Promise<InstallResult> {
    const resolved = await this.versionResolver.resolve(version);
    if (!resolved) {
      throw new Error(`Version ${version} not found in known good versions`);
    }
    const extPath = await tc.extractZip(archive);
    const extAppRoot = path.join(
      extPath,
      `chrome-${this.knownGoodVersionPlatform}`,
    );

    const root = await tc.cacheDir(extAppRoot, "chromium", resolved.toString());
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
