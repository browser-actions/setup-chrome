import { Platform, OS, Arch } from "./platform";
import { Installer, DownloadResult, InstallResult } from "./installer";
import * as tc from "@actions/tool-cache";
import * as httpm from "@actions/http-client";
import * as core from "@actions/core";
import path from "path";

export class SnapshotInstaller implements Installer {
  constructor(private readonly platform: Platform) {}

  async checkInstalled(version: string): Promise<InstallResult | undefined> {
    const root = tc.find("chromium", version);
    if (root) {
      return { root, bin: "chrome" };
    }
  }

  async download(version: string): Promise<DownloadResult> {
    const url = `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${makePlatformPart(
      this.platform,
    )}%2F${version}%2F${makeBasename(this.platform)}?alt=media`;

    core.info(`Acquiring ${version} from ${url}`);
    const archive = await tc.downloadTool(url);
    return { archive };
  }

  async install(version: string, archive: string): Promise<InstallResult> {
    const extPath = await tc.extractZip(archive);
    let root = (() => {
      switch (this.platform.os) {
        case OS.DARWIN:
          return path.join(extPath, "chrome-mac");
        case OS.LINUX:
          return path.join(extPath, "chrome-linux");
        case OS.WINDOWS:
          return path.join(extPath, "chrome-win");
      }
    })();
    const bin = (() => {
      switch (this.platform.os) {
        case OS.DARWIN:
          return "Chromium.app/Contents/MacOS/Chromium";
        case OS.LINUX:
          return "chrome";
        case OS.WINDOWS:
          return "chrome.exe";
      }
    })();

    root = await tc.cacheDir(root, "chromium", version);
    core.info(`Successfully Installed chromium to ${root}`);

    return { root, bin };
  }
}

export class LatestInstaller implements Installer {
  private readonly http = new httpm.HttpClient("setup-chrome");

  private readonly snapshotInstaller = new SnapshotInstaller(this.platform);

  constructor(private readonly platform: Platform) {}

  async checkInstalled(version: string): Promise<InstallResult | undefined> {
    const root = tc.find("chromium", version);
    if (root) {
      return { root, bin: "chrome" };
    }
  }

  async download(_version: string): Promise<DownloadResult> {
    const latestVersionURL = `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${makePlatformPart(
      this.platform,
    )}%2FLAST_CHANGE?alt=media`;
    const resp = await this.http.get(latestVersionURL);
    if (resp.message.statusCode !== httpm.HttpCodes.OK) {
      throw new Error(
        `Failed to get latest version: server returns ${resp.message.statusCode}`,
      );
    }
    const version = await resp.readBody();

    return this.snapshotInstaller.download(version);
  }

  async install(version: string, archive: string): Promise<InstallResult> {
    return this.snapshotInstaller.install(version, archive);
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
  } else if (os === OS.DARWIN && arch === Arch.ARM64) {
    return "Mac_Arm";
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
