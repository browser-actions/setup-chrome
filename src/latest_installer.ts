import * as cache from "./cache";
import type { DownloadResult, InstallResult, Installer } from "./installer";
import type { Platform } from "./platform";
import { resolveLatestVersion } from "./snapshot_bucket";
import { SnapshotInstaller } from "./snapshot_installer";

export class LatestInstaller implements Installer {
  private readonly snapshotInstaller = new SnapshotInstaller(this.platform);

  private latestSnapshotCache: string | undefined;

  constructor(private readonly platform: Platform) {}

  async checkInstalled(_version: string): Promise<InstallResult | undefined> {
    const snapshot = await this.getLatestSnapshot();
    return this.snapshotInstaller.checkInstalled(snapshot);
  }

  async downloadBrowser(_version: string): Promise<DownloadResult> {
    const snapshot = await this.getLatestSnapshot();
    return this.snapshotInstaller.downloadBrowser(snapshot);
  }

  async installBrowser(
    _version: string,
    archive: string,
  ): Promise<InstallResult> {
    const snapshot = await this.getLatestSnapshot();
    return this.snapshotInstaller.installBrowser(snapshot, archive);
  }

  async downloadDriver(_version: string): Promise<DownloadResult> {
    const version = await this.getLatestSnapshot();
    return this.snapshotInstaller.downloadDriver(version);
  }

  async installDriver(
    _version: string,
    archive: string,
  ): Promise<InstallResult> {
    const snapshot = await this.getLatestSnapshot();
    return this.snapshotInstaller.installDriver(snapshot, archive);
  }

  private async getLatestSnapshot(): Promise<string> {
    if (this.latestSnapshotCache) {
      return Promise.resolve(this.latestSnapshotCache);
    }

    this.latestSnapshotCache = await resolveLatestVersion(this.platform);
    return this.latestSnapshotCache;
  }
}
