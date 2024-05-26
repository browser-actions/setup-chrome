import * as cache from "./cache";
import type { DownloadResult, InstallResult, Installer } from "./installer";
import type { Platform } from "./platform";
import { resolveLatestVersion } from "./snapshot_bucket";
import { SnapshotInstaller } from "./snapshot_installer";

export class LatestInstaller implements Installer {
  private readonly snapshotInstaller = new SnapshotInstaller(this.platform);

  constructor(private readonly platform: Platform) {}

  async checkInstalled(version: string): Promise<InstallResult | undefined> {
    const root = await cache.find("chromium", version);
    if (root) {
      return { root, bin: "chrome" };
    }
  }

  async downloadBrowser(_version: string): Promise<DownloadResult> {
    const version = await resolveLatestVersion(this.platform);
    return this.snapshotInstaller.downloadBrowser(version);
  }

  installBrowser = this.snapshotInstaller.installBrowser;
  downloadDriver = this.snapshotInstaller.downloadDriver;
  installDriver = this.snapshotInstaller.installDriver;
}
