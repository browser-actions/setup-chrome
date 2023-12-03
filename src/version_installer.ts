import * as tc from "@actions/tool-cache";
import * as httpm from "@actions/http-client";
import * as core from "@actions/core";
import path from "path";
import { Arch, OS, Platform } from "./platform";
import { StaticVersion, VersionSpec } from "./version";
import { Installer, DownloadResult, InstallResult } from "./installer";

const KNOWN_GOOD_VERSIONS_URL =
  "https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json";

export interface KnownGoodVersionsJson {
  timestamp: string;
  versions: KnownGoodVersion[];
}

export interface KnownGoodVersion {
  version: string;
  revision: string;
  downloads: {
    chrome: Array<{
      platform: "linux64" | "mac-arm64" | "mac-x64" | "win32" | "win64";
      url: string;
    }>;
  };
}

export class KnownGoodVersionsClient {
  private readonly http = new httpm.HttpClient("setup-chrome");

  async getKnownGoodVersions(): Promise<KnownGoodVersion[]> {
    const resp = await this.http.getJson<KnownGoodVersionsJson>(
      KNOWN_GOOD_VERSIONS_URL,
    );
    if (resp.statusCode !== httpm.HttpCodes.OK) {
      throw new Error(`Failed to get known good versions: ${resp.statusCode}`);
    }
    if (resp.result === null) {
      throw new Error(`Failed to get known good versions`);
    }

    return resp.result.versions;
  }
}

export class KnownGoodVersionInstaller implements Installer {
  private readonly versionsClient = new KnownGoodVersionsClient();
  private readonly platform: Platform;
  private readonly knownGoodVersionPlatform: string;

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
  }

  async checkInstalled(version: string): Promise<InstallResult | undefined> {
    const root = tc.find("chromium", version);
    if (root) {
      return { root, bin: "chrome" };
    }
  }

  async download(version: string): Promise<DownloadResult> {
    const spec = new VersionSpec(version);
    const knownGoodVersions = await this.versionsClient.getKnownGoodVersions();
    for (const version of knownGoodVersions) {
      const v = new StaticVersion(version.version);
      if (!spec.satisfies(v)) {
        continue;
      }
      const found = version.downloads.chrome.find(
        ({ platform }) => platform === this.knownGoodVersionPlatform,
      );
      if (found) {
        const archive = await tc.downloadTool(found.url);
        return { archive };
      }
    }
    throw new Error(`Version ${version} not found in known good versions`);
  }

  async install(version: string, archive: string): Promise<InstallResult> {
    const extPath = await tc.extractZip(archive);
    const extAppRoot = path.join(
      extPath,
      `chrome-${this.knownGoodVersionPlatform}`,
    );

    const root = await tc.cacheDir(extAppRoot, "chromium", version);
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
