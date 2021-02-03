import { Platform, OS, Arch } from "./platform";
import * as tc from "@actions/tool-cache";
import * as exec from "@actions/exec";
import fs from "fs";
import os from "os";
import path from "path";

type ChannelName = "stable" | "beta" | "dev" | "canary";

export interface ChannelDownloader {
  download(channel: ChannelName): Promise<string>;
}

export class LinuxChannelDownloader implements ChannelDownloader {
  constructor(private readonly platform: Platform) {}

  download(channel: ChannelName): Promise<string> {
    if (channel === "canary") {
      throw new Error(
        `Chromium ${channel} not supported for platform ${this.platform.os} ${this.platform.arch}`
      );
    }

    const url = (() => {
      switch (channel) {
        case "stable":
          return `https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb`;
        case "beta":
          return `https://dl.google.com/linux/direct/google-chrome-beta_current_amd64.deb`;
        case "dev":
          return `https://dl.google.com/linux/direct/google-chrome-unstable_current_amd64.deb`;
      }
    })();
    return tc.downloadTool(url);
  }
}

export class MacOSChannelDownloader implements ChannelDownloader {
  constructor(private readonly platform: Platform) {}

  download(channel: ChannelName): Promise<string> {
    switch (this.platform.arch) {
      case Arch.AMD64:
        return this.downloadForIntelChip(channel);
      case Arch.ARM64:
        return this.downloadForAppleChip(channel);
      default:
        throw new Error(
          `Chromium ${channel} not supported for platform ${this.platform.os} ${this.platform.arch}`
        );
    }
  }

  downloadForIntelChip(channel: ChannelName): Promise<string> {
    const url = (() => {
      switch (channel) {
        case "stable":
          return `https://dl.google.com/chrome/mac/stable/GGRO/googlechrome.dmg`;
        default:
          return `https://dl.google.com/chrome/mac/${channel}/googlechrome${channel}.dmg`;
      }
    })();
    return tc.downloadTool(url);
  }

  downloadForAppleChip(channel: ChannelName): Promise<string> {
    const url = (() => {
      switch (channel) {
        case "stable":
          return `https://dl.google.com/chrome/mac/universal/stable/GGRO/googlechrome.dmg`;
        default:
          return `https://dl.google.com/chrome/mac/universal/${channel}/googlechrome${channel}.dmg`;
      }
    })();
    return tc.downloadTool(url);
  }
}

export class WindowsChannelDownloader implements ChannelDownloader {
  constructor(private readonly platform: Platform) {}

  download(channel: ChannelName): Promise<string> {
    if (channel === "canary") {
      return this.downloadCanary();
    }
    if (this.platform.arch === Arch.ARM64) {
      throw new Error(
        `Chrome ${channel} not supported for platform "${this.platform.os}" "${this.platform.arch}"`
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
      ["appguid", appguid[channel]],
      ["iid", iid],
      ["lang", lang],
      ["browser", browser],
      ["usagestats", usagestats],
      ["appname", encodeURIComponent(appname[channel])],
      ["needsadmin", needsadmin],
      ["ap", ap[this.platform.arch]],
      ["installdataindex", installdataindex],
    ]
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const url = `https://dl.google.com/tag/s/${encodeURIComponent(params)}/${
      path[this.platform.arch][channel]
    }`;

    return tc.downloadTool(url);
  }

  downloadCanary(): Promise<string> {
    throw new Error("TODO");
  }
}

export class ChannelDownloaderFactory {
  create(platform: Platform): ChannelDownloader {
    switch (platform.os) {
      case OS.LINUX:
        return new LinuxChannelDownloader(platform);
      case OS.DARWIN:
        return new MacOSChannelDownloader(platform);
      case OS.WINDOWS:
        return new WindowsChannelDownloader(platform);
    }
  }
}

export interface ChannelInstaller {
  install(channel: ChannelName, archive: string): Promise<string>;
}

export class LinuxChannelInstaller implements ChannelInstaller {
  constructor(private readonly platform: Platform) {}

  async install(channel: ChannelName, archive: string): Promise<string> {
    if (channel === "canary") {
      throw new Error(
        `Chromium ${channel} not supported for platform ${this.platform.os} ${this.platform.arch}`
      );
    }

    const tmpdir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "deb-"));
    const extdir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "chrome-"));
    await exec.exec("ar", ["x", archive], { cwd: tmpdir });
    await exec.exec("tar", [
      "-xf",
      path.join(tmpdir, "data.tar.xz"),
      "--directory",
      extdir,
      "--strip-components",
      "4",
      "./opt/google",
    ]);

    // remove broken symlink
    await fs.promises.unlink(path.join(extdir, "google-chrome"));

    return extdir;
  }
}

export class MacOSChannelInstaller implements ChannelInstaller {
  constructor(private readonly platform: Platform) {}

  install(channel: ChannelName, archive: string): Promise<string> {
    throw new Error("TODO");
  }
}

export class WindowsChannelInstaller implements ChannelInstaller {
  constructor(private readonly platform: Platform) {}

  async install(channel: ChannelName, archive: string): Promise<string> {
    await exec.exec(archive, ["/install", "/silent"]);

    throw new Error("TODO");
  }
}

export class ChannelInstallerFactory {
  create(platform: Platform): ChannelInstaller {
    switch (platform.os) {
      case OS.LINUX:
        return new LinuxChannelInstaller(platform);
      case OS.DARWIN:
        return new MacOSChannelInstaller(platform);
      case OS.WINDOWS:
        return new WindowsChannelInstaller(platform);
    }
  }
}
