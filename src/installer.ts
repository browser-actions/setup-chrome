import path from "node:path";
import * as core from "@actions/core";
import { LinuxChannelInstaller } from "./channel_linux";
import { MacOSChannelInstaller } from "./channel_macos";
import { WindowsChannelInstaller } from "./channel_windows";
import { LatestInstaller } from "./latest_installer";
import { OS, type Platform } from "./platform";
import { SnapshotInstaller } from "./snapshot_installer";
import { parse } from "./version";
import { KnownGoodVersionInstaller } from "./version_installer";

export type InstallResult = {
  root: string; // root is a directory containing all contents for chromium
  bin: string; // bin is a sub-path to chromium executable binary from root
};

export type DownloadResult = {
  archive: string;
};

export interface Installer {
  checkInstalled(version: string): Promise<InstallResult | undefined>;

  downloadBrowser(version: string): Promise<DownloadResult>;

  installBrowser(version: string, archive: string): Promise<InstallResult>;
}

export const install = async (
  platform: Platform,
  version: string,
): Promise<string> => {
  const installer = (() => {
    const spec = parse(version);
    switch (spec.value.type) {
      case "latest":
        return new LatestInstaller(platform);
      case "channel":
        switch (platform.os) {
          case OS.LINUX:
            return new LinuxChannelInstaller(platform);
          case OS.DARWIN:
            return new MacOSChannelInstaller(platform);
          case OS.WINDOWS:
            return new WindowsChannelInstaller(platform);
        }
        break;
      case "snapshot":
        return new SnapshotInstaller(platform);
      case "four-parts":
        return new KnownGoodVersionInstaller(platform);
    }
  })();

  const cache = await installer.checkInstalled(version);
  if (cache) {
    core.info(`Found in cache @ ${cache.root}`);
    return path.join(cache.root, cache.bin);
  }

  core.info(`Attempting to download ${version}...`);
  const { archive } = await installer.downloadBrowser(version);

  core.info("Installing chromium...");
  const { root, bin } = await installer.installBrowser(version, archive);

  return path.join(root, bin);
};
