import * as fs from "node:fs";
import * as path from "node:path";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import * as cache from "./cache";
import { LastKnownGoodVersionResolver } from "./chrome_for_testing";
import type { DownloadResult, InstallResult, Installer } from "./installer";
import { Arch, type Platform } from "./platform";
import { type ReleaseChannelName, isReleaseChannelName } from "./version";

const isENOENT = (e: unknown): boolean => {
  return (
    typeof e === "object" && e !== null && "code" in e && e.code === "ENOENT"
  );
};

export class WindowsChannelInstaller implements Installer {
  private readonly platform: Platform;
  private readonly versionResolver: LastKnownGoodVersionResolver;

  constructor(platform: Platform) {
    if (platform.os !== "windows") {
      throw new Error(`Unexpected OS: ${platform.os}`);
    }

    this.platform = platform;
    this.versionResolver = new LastKnownGoodVersionResolver(platform);
  }

  async checkInstalled(version: string): Promise<InstallResult | undefined> {
    if (!isReleaseChannelName(version)) {
      throw new Error(`Unexpected version: ${version}`);
    }

    const root = this.rootDir(version);
    try {
      await fs.promises.stat(root);
    } catch (e) {
      if (isENOENT(e)) {
        return undefined;
      }
      throw e;
    }

    return { root, bin: "chrome.exe" };
  }

  async downloadBrowser(version: string): Promise<DownloadResult> {
    if (!isReleaseChannelName(version)) {
      throw new Error(`Unexpected version: ${version}`);
    }
    if (version === "canary" || this.platform.arch === Arch.ARM64) {
      throw new Error(
        `Chrome ${version} not supported for platform "${this.platform.os}" "${this.platform.arch}"`,
      );
    }

    const appguid = {
      stable: "{8A69D345-D564-463C-AFF1-A69D9E530F96}",
      beta: "{8237E44A-0054-442C-B6B6-EA0509993955}",
      dev: "{401C381F-E0DE-4B85-8BD8-3F3F14FBDA57}",
    };
    const iid = "{980B7082-EC04-6DFB-63B8-08C1EC45EB8E}";
    const lang = "en";
    const browser = "3";
    const usagestats = "0";
    const appname = {
      stable: "Google Chrome",
      beta: "Google Chrome Beta",
      dev: "Google Chrome Dev",
    };
    const needsadmin = "prefers";
    const ap = {
      [Arch.AMD64]: "-arch_x64-statsdef_1",
      [Arch.I686]: "-arch_x86-statsdef_1",
    };
    const installdataindex = "empty";
    const path = {
      [Arch.AMD64]: {
        stable: "chrome/install/ChromeStandaloneSetup64.exe",
        beta: "chrome/install/beta/ChromeBetaStandaloneSetup64.exe",
        dev: "chrome/install/dev/ChromeDevStandaloneSetup64.exe",
      },
      [Arch.I686]: {
        stable: "chrome/install/ChromeStandaloneSetup.exe",
        beta: "chrome/install/beta/ChromeBetaStandaloneSetup.exe",
        dev: "chrome/install/dev/ChromeDevStandaloneSetup.exe",
      },
    };

    const params = [
      ["appguid", appguid[version]],
      ["iid", iid],
      ["lang", lang],
      ["browser", browser],
      ["usagestats", usagestats],
      ["appname", encodeURIComponent(appname[version])],
      ["needsadmin", needsadmin],
      ["ap", ap[this.platform.arch]],
      ["installdataindex", installdataindex],
    ]
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const url = `https://dl.google.com/tag/s/${encodeURIComponent(params)}/${
      path[this.platform.arch][version]
    }`;

    core.info(`Acquiring ${version} from ${url}`);
    const archivePath = await tc.downloadTool(url);

    await fs.promises.rename(archivePath, `${archivePath}.exe`);
    return { archive: `${archivePath}.exe` };
  }

  async installBrowser(
    version: string,
    archive: string,
  ): Promise<InstallResult> {
    if (!isReleaseChannelName(version)) {
      throw new Error(`Unexpected version: ${version}`);
    }
    await exec.exec(archive, ["/silent", "/install"]);

    return { root: this.rootDir(version), bin: "chrome.exe" };
  }

  private rootDir(version: ReleaseChannelName) {
    switch (version) {
      case "stable":
        return "C:\\Program Files\\Google\\Chrome\\Application";
      case "beta":
        return "C:\\Program Files\\Google\\Chrome Beta\\Application";
      case "dev":
        return "C:\\Program Files\\Google\\Chrome Dev\\Application";
      case "canary":
        return "C:\\Program Files\\Google\\Chrome SxS\\Application";
    }
  }

  async downloadDriver(version: string): Promise<DownloadResult> {
    const resolved = await this.versionResolver.resolve(version);
    if (!resolved) {
      throw new Error(
        `Version ${version} not found in the known good versions`,
      );
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
    const extPath = await tc.extractZip(archive);
    const extAppRoot = path.join(
      extPath,
      `chromedriver-${this.versionResolver.platformString}`,
    );

    const root = await cache.cacheDir(extAppRoot, "chromedriver", version);
    core.info(`Successfully Installed chromedriver to ${root}`);
    return { root, bin: "chromedriver.exe" };
  }
}
