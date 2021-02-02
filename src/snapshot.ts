import { Platform, OS, Arch } from "./platform";
import * as tc from "@actions/tool-cache";
import * as httpm from "@actions/http-client";
import * as core from "@actions/core";

export class SnapshotDownloader {
  private readonly http = new httpm.HttpClient("setup-chromium");

  constructor(private readonly platform: Platform) {}

  async downloadSnapshot(commitPosition: string): Promise<string> {
    const url = `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${makePlatformPart(
      this.platform
    )}%2F${commitPosition}%2F${makeBasename(this.platform)}?alt=media`;

    core.info(`Acquiring ${commitPosition} from ${url}`);
    return tc.downloadTool(url);
  }

  async downloadLatest(): Promise<string> {
    const latestVersionURL = `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${makePlatformPart(
      this.platform
    )}%2FLAST_CHANGE?alt=media`;
    const resp = await this.http.get(latestVersionURL);
    if (resp.message.statusCode !== httpm.HttpCodes.OK) {
      throw new Error(
        `Failed to get latest version: server returns ${resp.message.statusCode}`
      );
    }
    const version = await resp.readBody();

    return this.downloadSnapshot(version);
  }
}

const makeBasename = ({ os }: Platform): string => {
  switch (os) {
    case OS.DARWIN:
      return "chrome-mac.zip";
    case OS.LINUX:
      return "chrome-linux.zip";
    case OS.WINDOWS:
      return "chrome-win.zip";
  }
};

const makePlatformPart = ({ os, arch }: Platform): string => {
  if (os === OS.DARWIN && arch === Arch.AMD64) {
    return "Mac";
  } else if (os === OS.LINUX && arch === Arch.I686) {
    return "Linux";
  } else if (os === OS.LINUX && arch === Arch.AMD64) {
    return "Linux_x64";
  } else if (os === OS.WINDOWS && arch === Arch.I686) {
    return "Win";
  } else if (os === OS.WINDOWS && arch === Arch.AMD64) {
    return "Win_x64";
  }
  throw new Error(`Unsupported platform "${os}" "${arch}"`);
};
