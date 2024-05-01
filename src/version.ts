export type ReleaseChannelName = "stable" | "beta" | "dev" | "canary";

export const isReleaseChannelName = (
  version: string,
): version is ReleaseChannelName => {
  return (
    version === "stable" ||
    version === "beta" ||
    version === "dev" ||
    version === "canary"
  );
};

type FourPartsVersion = {
  type: "four-parts";
  major: number;
  minor: number | undefined;
  build: number | undefined;
  patch: number | undefined;
};

type SnapshotVersion = {
  type: "snapshot";
  snapshot: number;
};

type ChannelVersion = {
  type: "channel";
  channel: ReleaseChannelName;
};

type LatestVersion = {
  type: "latest";
};

type VersionValue =
  | FourPartsVersion
  | SnapshotVersion
  | ChannelVersion
  | LatestVersion;

class VersionSpec {
  public readonly value: VersionValue;

  constructor(value: VersionValue) {
    this.value = value;
  }

  static parse(version: string): VersionSpec {
    if (version === "") {
      throw new Error(`Invalid version: ${version}`);
    }

    if (version === "latest") {
      return new VersionSpec({ type: "latest" });
    }

    if (isReleaseChannelName(version)) {
      return new VersionSpec({ type: "channel", channel: version });
    }

    if (Number(version) > 10000) {
      return new VersionSpec({
        type: "snapshot",
        snapshot: Number(version),
      });
    }

    const digits: Array<number | undefined> = version.split(".").map((part) => {
      if (part === "x") {
        return undefined;
      }
      const num = Number(part);
      if (isNaN(num) || num < 0) {
        throw new Error(`Invalid version: ${version}`);
      }
      return num;
    });
    if (digits.length > 4) {
      throw new Error(`Invalid version: ${version}`);
    }
    if (digits.length === 1 && digits[0] === undefined) {
      throw new Error(`Invalid version: ${version}`);
    }
    for (let i = 0; i < digits.length - 1; i++) {
      const [d1, d2] = [digits[i], digits[i + 1]];
      if (d1 === undefined && d2 !== undefined) {
        throw new Error(`Invalid version: ${version}`);
      }
    }

    return new VersionSpec({
      type: "four-parts",
      major: digits[0] as number,
      minor: digits[1],
      build: digits[2],
      patch: digits[3],
    });
  }

  public satisfies(version: string): boolean {
    const spec = VersionSpec.parse(version);
    const [v1, v2] = [this.value, spec.value];
    if (v1.type === "latest" && v2.type === "latest") {
      return true;
    }
    if (v1.type === "channel" && v2.type === "channel") {
      return v1.channel === v2.channel;
    }
    if (v1.type === "snapshot" && v2.type === "snapshot") {
      return v1.snapshot === v2.snapshot;
    }
    if (v1.type === "four-parts" && v2.type === "four-parts") {
      if (v1.major !== v2.major) {
        return false;
      }
      if (v1.minor !== undefined && v1.minor !== v2.minor) {
        return false;
      }
      if (v1.build !== undefined && v1.build !== v2.build) {
        return false;
      }
      if (v1.patch !== undefined && v1.patch !== v2.patch) {
        return false;
      }
      return true;
    }
    return false;
  }

  public gt(version: string): boolean {
    return this.compare(version) > 0;
  }

  public lt(version: string): boolean {
    return this.compare(version) < 0;
  }

  private compare(version: string): number {
    const spec = VersionSpec.parse(version);
    const [v1, v2] = [this.value, spec.value];
    if (v1.type === "latest" && v2.type === "latest") {
      return 0;
    }
    if (v1.type === "channel" && v2.type === "channel") {
      return v1.channel === v2.channel ? 0 : NaN;
    }
    if (v1.type === "snapshot" && v2.type === "snapshot") {
      return v1.snapshot - v2.snapshot;
    }
    if (v1.type === "four-parts" && v2.type === "four-parts") {
      if (v1.major !== v2.major) {
        return v1.major - v2.major;
      }
      if (v1.minor !== v2.minor) {
        return v1.minor === undefined || v2.minor === undefined
          ? NaN
          : v1.minor - v2.minor;
      }
      if (v1.build !== v2.build) {
        return v1.build === undefined || v2.build === undefined
          ? NaN
          : v1.build - v2.build;
      }
      if (v1.patch !== v2.patch) {
        return v1.patch === undefined || v2.patch === undefined
          ? NaN
          : v1.patch - v2.patch;
      }
      return 0;
    }

    return NaN;
  }

  public toString(): string {
    switch (this.value.type) {
      case "latest":
        return "latest";
      case "channel":
        return this.value.channel;
      case "snapshot":
        return String(this.value.snapshot);
      case "four-parts":
        return [
          this.value.major,
          this.value.minor,
          this.value.build,
          this.value.patch,
        ]
          .filter((d) => d !== undefined)
          .join(".");
    }
  }
}

export type { VersionSpec };

export const parse = (version: string): VersionSpec => {
  return VersionSpec.parse(version);
};
