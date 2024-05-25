import * as path from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as cache from "./cache";
import type { DownloadResult, InstallResult, Installer } from "./installer";
import { OS, type Platform } from "./platform";
import { downloadURL } from "./snapshot_bucket";

export class SnapshotInstaller implements Installer {
  constructor(private readonly platform: Platform) {}

  async checkInstalled(version: string): Promise<InstallResult | undefined> {
    const root = await cache.find("chromium", version);
    if (root) {
      return { root, bin: "chrome" };
    }
  }

  async downloadBrowser(version: string): Promise<DownloadResult> {
    const url = downloadURL(this.platform, version);
    core.info(`Acquiring ${version} from ${url}`);
    const archive = await tc.downloadTool(url);
    return { archive };
  }

  async installBrowser(
    version: string,
    archive: string,
  ): Promise<InstallResult> {
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

    root = await cache.cacheDir(root, "chromium", version);
    core.info(`Successfully Installed chromium to ${root}`);

    return { root, bin };
  }
}
