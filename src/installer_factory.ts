import { LinuxChannelInstaller } from "./channel_linux";
import { MacOSChannelInstaller } from "./channel_macos";
import { WindowsChannelInstaller } from "./channel_windows";
import type { Installer } from "./installer";
import { LatestInstaller } from "./latest_installer";
import { OfficialInstaller } from "./official_installer";
import { OS, type Platform } from "./platform";
import { SnapshotInstaller } from "./snapshot_installer";
import { parse } from "./version";
import { KnownGoodVersionInstaller } from "./version_installer";

export const getInstaller = (
  platform: Platform,
  version: string,
  { resolveBrowserVersionOnly }: { resolveBrowserVersionOnly: boolean },
): Installer => {
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
          if (platform.arch === "arm64") {
            return new OfficialInstaller(platform);
          }
          return new WindowsChannelInstaller(platform);
      }
      break;
    case "snapshot":
      return new SnapshotInstaller(platform);
    case "four-parts":
      return new KnownGoodVersionInstaller(platform, {
        resolveBrowserVersionOnly,
      });
  }
};
