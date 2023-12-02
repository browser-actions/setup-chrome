export class StaticVersion {
  public readonly major: number;
  public readonly minor: number;
  public readonly build: number;
  public readonly patch: number;

  constructor(
    arg:
      | string
      | { major: number; minor: number; build: number; patch: number },
  ) {
    if (typeof arg === "string") {
      if (arg === "") {
        throw new Error(`Invalid version: ${arg}`);
      }
      const digits: Array<number> = arg.split(".").map((part) => {
        const num = Number(part);
        if (isNaN(num) || num < 0) {
          throw new Error(`Invalid version: ${arg}`);
        }
        return num;
      });
      if (digits.length !== 4) {
        throw new Error(`Invalid version: ${arg}`);
      }
      this.major = digits[0];
      this.minor = digits[1];
      this.build = digits[2];
      this.patch = digits[3];
    } else {
      this.major = arg.major;
      this.minor = arg.minor;
      this.build = arg.build;
      this.patch = arg.patch;
    }
  }

  private compare(o: StaticVersion): number {
    if (this.major !== o.major) {
      return this.major - o.major;
    }
    if (this.minor !== o.minor) {
      return this.minor - o.minor;
    }
    if (this.build !== o.build) {
      return this.build - o.build;
    }
    if (this.patch !== o.patch) {
      return this.patch - o.patch;
    }
    return 0;
  }

  public greaterThan(o: StaticVersion): boolean {
    return this.compare(o) > 0;
  }

  public greaterThanOrEqual(o: StaticVersion): boolean {
    return this.compare(o) >= 0;
  }

  public lessThan(o: StaticVersion): boolean {
    return this.compare(o) < 0;
  }

  public lessThanOrEqual(o: StaticVersion): boolean {
    return this.compare(o) <= 0;
  }

  public equals(o: StaticVersion): boolean {
    return this.compare(o) === 0;
  }

  public toString(): string {
    return `${this.major}.${this.minor}.${this.build}.${this.patch}`;
  }
}

export class VersionSpec {
  public readonly major: number;
  public readonly minor: number | undefined;
  public readonly build: number | undefined;
  public readonly patch: number | undefined;

  constructor(
    arg:
      | string
      | { major: number; minor?: number; build?: number; patch?: number },
  ) {
    if (typeof arg === "string") {
      if (arg === "") {
        throw new Error(`Invalid version: ${arg}`);
      }
      const digits: Array<number | undefined> = arg.split(".").map((part) => {
        if (part === "x") {
          return undefined;
        }
        const num = Number(part);
        if (isNaN(num) || num < 0) {
          throw new Error(`Invalid version: ${arg}`);
        }
        return num;
      });
      if (digits.length > 4) {
        throw new Error(`Invalid version: ${arg}`);
      }
      if (digits.length === 1 && digits[0] === undefined) {
        throw new Error(`Invalid version: ${arg}`);
      }
      for (let i = 0; i < digits.length - 1; i++) {
        const [d1, d2] = [digits[i], digits[i + 1]];
        if (d1 === undefined && d2 !== undefined) {
          throw new Error(`Invalid version: ${arg}`);
        }
      }
      this.major = digits[0] as number;
      this.minor = digits[1];
      this.build = digits[2];
      this.patch = digits[3];
    } else {
      this.major = arg.major;
      this.minor = arg.minor;
      this.build = arg.build;
      this.patch = arg.patch;
    }
  }

  public satisfies(version: StaticVersion): boolean {
    if (this.major !== version.major) {
      return false;
    }
    if (this.minor !== undefined && this.minor !== version.minor) {
      return false;
    }
    if (this.build !== undefined && this.build !== version.build) {
      return false;
    }
    if (this.patch !== undefined && this.patch !== version.patch) {
      return false;
    }
    return true;
  }

  public toString(): string {
    return [this.major, this.minor, this.build, this.patch]
      .filter((d) => d !== undefined)
      .join(".");
  }
}
