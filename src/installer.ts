import { Platform, OS } from "./platform";
import * as core from "@actions/core";
import path from "path";
import { SnapshotInstaller, LatestInstaller } from "./snapshot";
import { LinuxChannelInstaller } from "./channel_linux";
import { MacOSChannelInstaller } from "./channel_macos";
import { WindowsChannelInstaller } from "./channel_windows";

export type InstallResult = {
  root: string; // root is a directory containing all contents for chromium
  bin: string; // bin is a sub-path to chromium executable binary from root
};

export type DownloadResult = {
  archive: string;
};

export interface Installer {
  checkInstalled(version: string): Promise<InstallResult | undefined>;

  download(version: string): Promise<DownloadResult>;

  install(version: string, archive: string): Promise<InstallResult>;
}

export const install = async (
  platform: Platform,
  version: string
): Promise<string> => {
  const installer = (() => {
    switch (version) {
      case "latest":
        return new LatestInstaller(platform);
      case "stable":
      case "beta":
      case "dev":
      case "canary":
        switch (platform.os) {
          case OS.LINUX:
            return new LinuxChannelInstaller(platform);
          case OS.DARWIN:
            return new MacOSChannelInstaller(platform);
          case OS.WINDOWS:
            return new WindowsChannelInstaller(platform);
        }
        break;
      default:
        return new SnapshotInstaller(platform);
    }
  })();

  const cache = await installer.checkInstalled(version);
  if (cache) {
    core.info(`Found in cache @ ${cache.root}`);
    return path.join(cache.root, cache.bin);
  }

  core.info(`Attempting to download ${version}...`);
  const { archive } = await installer.download(version);

  core.info("Installing chromium...");
  const { root, bin } = await installer.install(version, archive);

  core.info(`Successfully installed chromium to ${path.join(root, bin)}`);

  return path.join(root, bin);
};
