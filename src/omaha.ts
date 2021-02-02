import { Platform, OS, Arch } from "./platform";
import * as httpm from "@actions/http-client";

type VersionJSON = {
  branch_commit: string;
  branch_base_position: string;
  skia_commit: string;
  v8_version: string;
  previous_version: string;
  v8_commit: string;
  true_branch: string;
  previous_reldate: string;
  branch_base_commit: string;
  version: string;
  current_reldate: string;
  current_version: string;
  os: string;
  channel: string;
  chromium_commit: string;
};

export type PlatformVersionJSON = {
  os: string;
  versions: VersionJSON[];
};

export type PlatformVersionsJSON = PlatformVersionJSON[];

export class Versions {
  constructor(private readonly json: VersionJSON[]) {}

  findByChannel(
    channel: "beta" | "dev" | "canary" | "stable"
  ): VersionJSON | undefined {
    return this.json.find((o) => o.channel == channel);
  }
}

export class PlatformVersions {
  constructor(private readonly json: PlatformVersionsJSON) {}

  findVersion({ os, arch }: Platform): Versions | undefined {
    const osName = (() => {
      if (os === OS.DARWIN && arch === Arch.AMD64) {
        return "mac";
      } else if (os === OS.DARWIN && arch === Arch.ARM64) {
        return "mac_arm64";
      } else if (os === OS.LINUX && arch === Arch.AMD64) {
        return "linux";
      } else if (os === OS.WINDOWS && arch === Arch.I686) {
        return "win";
      } else if (os === OS.WINDOWS && arch === Arch.AMD64) {
        return "win64";
      }
    })();

    const versions = this.json.find((o) => o.os === osName);
    if (!versions) {
      return undefined;
    }
    return new Versions(versions.versions);
  }
}

export class RecentReleaseClient {
  private readonly http = new httpm.HttpClient("setup-chromium");

  async getChannelReleases(): Promise<PlatformVersions> {
    const url = `http://omahaproxy.appspot.com/all.json`;
    const resp = await this.http.getJson<PlatformVersionsJSON>(url);
    if (resp.statusCode !== httpm.HttpCodes.OK) {
      throw new Error(
        `Failed to get channel versions: server returns ${resp.statusCode}`
      );
    }
    if (resp.result === null) {
      throw new Error(
        `Failed to get channel versions: server returns empty body`
      );
    }

    return new PlatformVersions(resp.result);
  }
}
