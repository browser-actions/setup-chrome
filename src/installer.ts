export type InstallResult = {
  root: string; // root is a directory containing all contents for chrome
  bin: string; // bin is a sub-path to chrome executable binary from root
};

export type DownloadResult = {
  archive: string;
};

export interface Installer {
  checkInstalledBrowser(version: string): Promise<InstallResult | undefined>;
  downloadBrowser(version: string): Promise<DownloadResult>;
  installBrowser(version: string, archive: string): Promise<InstallResult>;

  checkInstalledDriver(version: string): Promise<InstallResult | undefined>;
  downloadDriver(version: string): Promise<DownloadResult>;
  installDriver(version: string, archive: string): Promise<InstallResult>;
}
