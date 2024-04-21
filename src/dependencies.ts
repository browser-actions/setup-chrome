import { pkg } from "actions-swing";
import type { Platform } from "./platform";
import * as core from "@actions/core";

const DEPENDENT_PACKAGES = [
  "libglib2.0-0",
  "libgconf-2-4",
  "libatk1.0-0",
  "libatk-bridge2.0-0",
  "libgdk-pixbuf2.0-0",
  "libgtk-3-0",
  "libgbm-dev",
  "libnss3-dev",
  "libxss-dev",
  "libasound2",
  "xvfb",
  "fonts-liberation",
  "libu2f-udev",
  "xdg-utils",
];

const installDependencies = async (platform: Platform): Promise<void> => {
  if (platform.os !== "linux") {
    core.warning(
      `install-dependencies is only supported on Linux, but current platform is ${platform.os}`,
    );
    return;
  }

  await pkg.install(DEPENDENT_PACKAGES);
};

export { installDependencies };
