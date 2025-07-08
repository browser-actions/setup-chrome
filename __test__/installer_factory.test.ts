import { beforeEach, describe, expect, test, vi } from "vitest";
import { LinuxChannelInstaller } from "../src/channel_linux";
import { MacOSChannelInstaller } from "../src/channel_macos";
import { WindowsChannelInstaller } from "../src/channel_windows";
import { getInstaller } from "../src/installer_factory";
import { LatestInstaller } from "../src/latest_installer";
import { OfficialInstaller } from "../src/official_installer";
import { Arch, OS } from "../src/platform";
import { SnapshotInstaller } from "../src/snapshot_installer";
import { KnownGoodVersionInstaller } from "../src/version_installer";

describe("getInstaller", () => {
  describe("latest version", () => {
    test("returns LatestInstaller for 'latest' version", () => {
      const platform = { os: OS.LINUX, arch: Arch.AMD64 };
      const installer = getInstaller(platform, "latest", {
        resolveBrowserVersionOnly: false,
      });
      expect(installer).toBeInstanceOf(LatestInstaller);
    });
  });

  describe("channel versions", () => {
    test.each([
      ["stable", LinuxChannelInstaller],
      ["beta", LinuxChannelInstaller],
      ["dev", LinuxChannelInstaller],
      ["canary", LinuxChannelInstaller],
    ])("Linux platform %s", (channel, expectedInstaller) => {
      const platform = { os: OS.LINUX, arch: Arch.AMD64 };
      const installer = getInstaller(platform, channel, {
        resolveBrowserVersionOnly: false,
      });
      expect(installer).toBeInstanceOf(expectedInstaller);
    });

    test.each([
      ["stable", MacOSChannelInstaller],
      ["beta", MacOSChannelInstaller],
      ["dev", MacOSChannelInstaller],
      ["canary", MacOSChannelInstaller],
    ])("macOS platform %s", (channel, expectedInstaller) => {
      const platform = { os: OS.DARWIN, arch: Arch.AMD64 };
      const installer = getInstaller(platform, channel, {
        resolveBrowserVersionOnly: false,
      });
      expect(installer).toBeInstanceOf(expectedInstaller);
    });

    test.each([
      ["stable", WindowsChannelInstaller],
      ["beta", WindowsChannelInstaller],
      ["dev", WindowsChannelInstaller],
      ["canary", WindowsChannelInstaller],
    ])("Windows platform %s", (channel, expectedInstaller) => {
      const platform = { os: OS.WINDOWS, arch: Arch.AMD64 };
      const installer = getInstaller(platform, channel, {
        resolveBrowserVersionOnly: false,
      });
      expect(installer).toBeInstanceOf(expectedInstaller);
    });

    test("returns OfficialInstaller for arm64 Windows platform", () => {
      const platform = { os: OS.WINDOWS, arch: Arch.ARM64 };
      const installer = getInstaller(platform, "stable", {
        resolveBrowserVersionOnly: false,
      });
      expect(installer).toBeInstanceOf(OfficialInstaller);
    });
  });

  describe("snapshot versions", () => {
    test("returns SnapshotInstaller for snapshot version", () => {
      const platform = { os: OS.LINUX, arch: Arch.AMD64 };
      const installer = getInstaller(platform, "123456", {
        resolveBrowserVersionOnly: false,
      });
      expect(installer).toBeInstanceOf(SnapshotInstaller);
    });
  });

  describe("four-parts versions", () => {
    test("returns KnownGoodVersionInstaller", () => {
      const platform = { os: OS.LINUX, arch: Arch.AMD64 };
      const installer = getInstaller(platform, "119.0.6045.123", {
        resolveBrowserVersionOnly: false,
      });
      expect(installer).toBeInstanceOf(KnownGoodVersionInstaller);
    });
  });
});
