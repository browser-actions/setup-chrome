import path from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as cache from "./cache";
import { KnownGoodVersionResolver } from "./chrome_for_testing";
import type { DownloadResult, InstallResult, Installer } from "./installer";
import { Arch, OS, type Platform } from "./platform";

export class KnownGoodVersionInstaller implements Installer {
  private readonly versionResolver: KnownGoodVersionResolver;
  private readonly platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;

    this.versionResolver = new KnownGoodVersionResolver(this.platform);
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
      `Acquiring ${resolved.version} from ${resolved.browserDownloadURL}`,
    );
    const archive = await tc.downloadTool(resolved.browserDownloadURL);
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
      `chrome-${this.versionResolver.platformString}`,
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

  async downloadDriver(version: string): Promise<DownloadResult> {
    const resolved = await this.versionResolver.resolve(version);
    if (!resolved) {
      throw new Error(`Version ${version} not found in known good versions`);
    }

    core.info(
      `Acquiring ${resolved.version} from ${resolved.driverDownloadURL}`,
    );
    const archive = await tc.downloadTool(resolved.driverDownloadURL);
    return { archive };
  }

  async installDriver(
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
      `chromedriver-${this.versionResolver.platformString}`,
    );

    const root = await cache.cacheDir(
      extAppRoot,
      "chromedriver",
      resolved.version,
    );
    core.info(`Successfully Installed chromedriver to ${root}`);
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
    return { root: root, bin };
  }
}
