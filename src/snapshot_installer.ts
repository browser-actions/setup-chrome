import * as path from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as cache from "./cache";
import type { DownloadResult, InstallResult, Installer } from "./installer";
import { Arch, OS, type Platform } from "./platform";
import { browserDownloadURL, driverDownloadURL } from "./snapshot_bucket";

export class SnapshotInstaller implements Installer {
  constructor(private readonly platform: Platform) {}

  async checkInstalledBrowser(
    version: string,
  ): Promise<InstallResult | undefined> {
    const root = await cache.find("chrome", version);
    if (root) {
      return { root, bin: "chrome" };
    }
  }

  async downloadBrowser(version: string): Promise<DownloadResult> {
    const url = browserDownloadURL(this.platform, version);
    core.info(`Acquiring chrome ${version} from ${url}`);
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

    root = await cache.cacheDir(root, "chrome", version);
    core.info(`Successfully Installed chrome to ${root}`);

    return { root, bin };
  }

  async checkInstalledDriver(
    version: string,
  ): Promise<InstallResult | undefined> {
    const root = await cache.find("chromedriver", version);
    if (root) {
      return { root, bin: "chromedriver" };
    }
  }

  async downloadDriver(version: string): Promise<DownloadResult> {
    const url = driverDownloadURL(this.platform, version);
    core.info(`Acquiring chromedriver ${version} from ${url}`);
    const archive = await tc.downloadTool(url);
    return { archive };
  }

  async installDriver(
    version: string,
    archive: string,
  ): Promise<InstallResult> {
    const extPath = await tc.extractZip(archive);
    let root = (() => {
      switch (this.platform.os) {
        case OS.DARWIN:
          return path.join(extPath, "chromedriver_mac64");
        case OS.LINUX:
          return path.join(extPath, "chromedriver_linux64");
        case OS.WINDOWS:
          return this.platform.arch === Arch.ARM64
            ? path.join(extPath, "chromedriver_win64")
            : path.join(extPath, "chromedriver_win32");
      }
    })();
    const bin = (() => {
      switch (this.platform.os) {
        case OS.DARWIN:
          return "chromedriver";
        case OS.LINUX:
          return "chromedriver";
        case OS.WINDOWS:
          return "chromedriver.exe";
      }
    })();

    root = await cache.cacheDir(root, "chromedriver", version);
    core.info(`Successfully Installed chromedriver to ${root}`);

    return { root, bin };
  }
}
