import * as httpm from "@actions/http-client";
import { Arch, OS, type Platform } from "./platform";
import { parse } from "./version";

const KNOWN_GOOD_VERSIONS_URL =
  "https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json";

const LAST_KNOWN_GOOD_VERSION =
  "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json";

export type PlatformString =
  | "linux64"
  | "mac-arm64"
  | "mac-x64"
  | "win32"
  | "win64"
  | "win-arm64";

export type LastKnownGoodVersionsJson = {
  timestamp: string;
  channels: {
    Stable: LastKnownGoodVersion;
    Beta: LastKnownGoodVersion;
    Dev: LastKnownGoodVersion;
    Canary: LastKnownGoodVersion;
  };
};

type LastKnownGoodVersion = {
  channel: "Stable" | "Beta" | "Dev" | "Canary";
  version: string;
  revision: string;
  downloads: {
    chrome?: Array<{
      platform: PlatformString;
      url: string;
    }>;
    chromedriver?: Array<{
      platform: PlatformString;
      url: string;
    }>;
  };
};

export type KnownGoodVersionsJson = {
  timestamp: string;
  versions: KnownGoodVersion[];
};

export type KnownGoodVersion = {
  version: string;
  revision: string;
  downloads: {
    chrome?: Array<{
      platform: PlatformString;
      url: string;
    }>;
    chromedriver?: Array<{
      platform: PlatformString;
      url: string;
    }>;
  };
};

const platformString = (platform: Platform): PlatformString => {
  if (platform.os === OS.LINUX && platform.arch === Arch.AMD64) {
    return "linux64";
  } else if (platform.os === OS.DARWIN && platform.arch === Arch.AMD64) {
    return "mac-x64";
  } else if (platform.os === OS.DARWIN && platform.arch === Arch.ARM64) {
    return "mac-arm64";
  } else if (platform.os === OS.WINDOWS && platform.arch === Arch.AMD64) {
    return "win64";
  } else if (platform.os === OS.WINDOWS && platform.arch === Arch.I686) {
    return "win32";
  } else if (platform.os === OS.WINDOWS && platform.arch === Arch.ARM64) {
    return "win-arm64";
  }
  throw new Error(`Unsupported platform: ${platform.os} ${platform.arch}`);
};

type BrowserOnlyResolvedVersion = {
  version: string;
  browserDownloadURL: string;
};

type ResolvedVersion = {
  version: string;
  browserDownloadURL: string;
  driverDownloadURL: string;
};

export class KnownGoodVersionResolver {
  private readonly http = new httpm.HttpClient("setup-chrome");

  private cache?: KnownGoodVersion[];

  public readonly platformString: PlatformString;

  constructor(platform: Platform) {
    this.platformString = platformString(platform);
  }

  async resolveBrowserOnly(
    version: string,
  ): Promise<BrowserOnlyResolvedVersion | undefined> {
    const spec = parse(version);
    const knownGoodVersions = await this.getKnownGoodVersions();
    for (const version of knownGoodVersions) {
      if (!spec.satisfies(version.version)) {
        continue;
      }
      const browser = version.downloads.chrome?.find(
        ({ platform }) => platform === this.platformString,
      );

      if (browser) {
        return {
          version: version.version,
          browserDownloadURL: browser.url,
        };
      }
    }
  }

  async resolveBrowserAndDriver(
    version: string,
  ): Promise<ResolvedVersion | undefined> {
    const spec = parse(version);
    const knownGoodVersions = await this.getKnownGoodVersions();
    for (const version of knownGoodVersions) {
      if (!spec.satisfies(version.version)) {
        continue;
      }
      const browser = version.downloads.chrome?.find(
        ({ platform }) => platform === this.platformString,
      );
      const driver = version.downloads.chromedriver?.find(
        ({ platform }) => platform === this.platformString,
      );

      if (browser && driver) {
        return {
          version: version.version,
          browserDownloadURL: browser.url,
          driverDownloadURL: driver.url,
        };
      }
    }
  }

  private async getKnownGoodVersions(): Promise<KnownGoodVersion[]> {
    if (this.cache) {
      return this.cache;
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

    resp.result.versions.reverse();

    this.cache = resp.result.versions;
    return resp.result.versions;
  }
}

export class LastKnownGoodVersionResolver {
  private readonly http = new httpm.HttpClient("setup-chrome");

  private cache?: LastKnownGoodVersionsJson;

  public readonly platformString: PlatformString;

  constructor(platform: Platform) {
    this.platformString = platformString(platform);
  }

  async resolve(version: string): Promise<ResolvedVersion | undefined> {
    const spec = parse(version);
    if (spec.value.type !== "channel") {
      throw new Error(`Unexpected version: ${version}`);
    }

    const lastKnownGoodVersions = await this.getLastKnownGoodVersions();
    const downloads = (() => {
      switch (spec.value.channel) {
        case "stable":
          return lastKnownGoodVersions.channels.Stable.downloads;
        case "beta":
          return lastKnownGoodVersions.channels.Beta.downloads;
        case "dev":
          return lastKnownGoodVersions.channels.Dev.downloads;
        case "canary":
          return lastKnownGoodVersions.channels.Canary.downloads;
      }
    })();

    const browser = downloads.chrome?.find(
      ({ platform }) => platform === this.platformString,
    );
    const driver = downloads.chromedriver?.find(
      ({ platform }) => platform === this.platformString,
    );

    if (browser && driver) {
      return {
        version: spec.value.channel,
        browserDownloadURL: browser.url,
        driverDownloadURL: driver.url,
      };
    }
  }

  private async getLastKnownGoodVersions(): Promise<LastKnownGoodVersionsJson> {
    if (this.cache) {
      return this.cache;
    }

    const resp = await this.http.getJson<LastKnownGoodVersionsJson>(
      LAST_KNOWN_GOOD_VERSION,
    );
    if (resp.statusCode !== httpm.HttpCodes.OK) {
      throw new Error(
        `Failed to get last known good versions: ${resp.statusCode}`,
      );
    }
    if (resp.result === null) {
      throw new Error("Failed to get last known good versions");
    }

    this.cache = resp.result;

    return resp.result;
  }
}
