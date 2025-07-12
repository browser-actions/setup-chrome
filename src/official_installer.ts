import * as fs from "node:fs";
import * as path from "node:path";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import type { DownloadResult, InstallResult, Installer } from "./installer";
import { OS, type Platform } from "./platform";
import { type ReleaseChannelName, isReleaseChannelName } from "./version";

const isENOENT = (
  e: unknown,
): e is NodeJS.ErrnoException & { code: "ENOENT" } => {
  return e instanceof Error && "code" in e && e.code === "ENOENT";
};

/**
 * Installs Chrome browser directly from Google's official website.
 * Used as a fallback installation method specifically for Windows ARM64 runners,
 * since Chrome for Testing distribution does not support Windows ARM64 architecture.
 */
export class OfficialInstaller implements Installer {
  private readonly platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
    if (platform.os !== OS.WINDOWS || platform.arch !== "arm64") {
      throw new Error("Official installer only supports Windows ARM64");
    }
  }

  async checkInstalledBrowser(
    version: string,
  ): Promise<InstallResult | undefined> {
    if (!isReleaseChannelName(version)) {
      throw new Error(`Unexpected version: ${version}`);
    }

    const root = this.browserRootDir(version);
    try {
      await fs.promises.stat(root);
    } catch (e) {
      if (isENOENT(e)) {
        return undefined;
      }
      throw e;
    }

    core.info(
      `Found installed chrome ${version} in ${root} but the action reinstalls the browser`,
    );
    return undefined;
  }

  async downloadBrowser(version: string): Promise<DownloadResult> {
    if (!isReleaseChannelName(version)) {
      throw new Error(`Unexpected version: ${version}`);
    }
    const appguid: Record<ReleaseChannelName, string> = {
      stable: "COM.GOOGLE.CHROME",
      beta: "{8237E44A-0054-442C-B6B6-EA0509993955}",
      dev: "{401C381F-E0DE-4B85-8BD8-3F3F14FBDA57}",
      canary: "{4EA16AC7-FD5A-47C3-875B-DBF4A2008C20}",
    };
    const iid = "{456B3F39-33E4-E5EE-BD34-523BB682139E}";
    const lang = "en";
    const browser = "3";
    const usagestats = "0";
    const appname = {
      stable: "Google Chrome",
      beta: "Google Chrome Beta",
      dev: "Google Chrome Dev",
      canary: "Google Chrome Canary",
    };
    const needsadmin = "prefers";
    const ap = "arm64-statsdef_1";
    const installdataindex = "empty";
    const key = "update2/installers/experimental/0/ChromeSetup.exe";

    const params = [
      ["appguid", appguid[version]],
      ["iid", iid],
      ["lang", lang],
      ["browser", browser],
      ["usagestats", usagestats],
      ["appname", encodeURIComponent(appname[version])],
      ["needsadmin", needsadmin],
      ["ap", ap],
      ["installdataindex", installdataindex],
    ]
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const url = `https://dl.google.com/tag/s/${encodeURIComponent(
      params,
    )}/${key}`;

    core.info(`Acquiring chrome ${version} from ${url}`);
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

    return { root: this.browserRootDir(version), bin: "chrome.exe" };
  }

  private browserRootDir(version: ReleaseChannelName) {
    switch (version) {
      case "stable":
        return "C:\\Program Files\\Google\\Chrome\\Application";
      case "beta":
        return "C:\\Program Files\\Google\\Chrome Beta\\Application";
      case "dev":
        return "C:\\Program Files\\Google\\Chrome Dev\\Application";
      case "canary":
        return "C:\\Program Files\\Google\\Chrome Canary\\Application";
    }
  }

  async checkInstalledDriver(
    version: string,
  ): Promise<InstallResult | undefined> {
    throw new Error(
      "Official installer doesn't support checking installed chromedriver",
    );
  }

  async downloadDriver(version: string): Promise<DownloadResult> {
    throw new Error(
      "Official installer doesn't support downloading chromedriver",
    );
  }

  async installDriver(
    _version: string,
    _archive: string,
  ): Promise<InstallResult> {
    throw new Error(
      "Official installer doesn't support installing chromedriver",
    );
  }
}
