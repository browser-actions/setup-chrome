import { StaticVersion, VersionSpec } from "../src/version";

describe("StaticVersion", () => {
  describe("constructor", () => {
    test("new instance", () => {
      const version = new StaticVersion({
        major: 119,
        minor: 0,
        build: 6045,
        patch: 123,
      });

      expect(version.major).toBe(119);
      expect(version.minor).toBe(0);
      expect(version.build).toBe(6045);
      expect(version.patch).toBe(123);
    });

    test("parse", () => {
      const version = new StaticVersion("119.0.6045.123");

      expect([
        version.major,
        version.minor,
        version.build,
        version.patch,
      ]).toEqual([119, 0, 6045, 123]);
    });

    test.each([
      ["119.0.6045.123.456"],
      ["119.0.6045.-123"],
      ["119.0.6045.beta"],
      ["119.0.6045"],
    ])("throw an error for %s", (version) => {
      expect(() => new StaticVersion(version)).toThrow(
        `Invalid version: ${version}`,
      );
    });
  });

  describe("compare", () => {
    test.each`
      a                   | b                   | equals   | greaterThan | lessThan | greaterThanOrEqual | lessThanOrEqual
      ${"119.0.6045.123"} | ${"119.0.6045.123"} | ${true}  | ${false}    | ${false} | ${true}            | ${true}
      ${"119.0.6045.123"} | ${"119.0.6045.100"} | ${false} | ${true}     | ${false} | ${false}           | ${true}
      ${"119.0.6045.123"} | ${"119.0.6045.200"} | ${false} | ${false}    | ${true}  | ${false}           | ${true}
      ${"119.0.6045.123"} | ${"119.0.7000.100"} | ${false} | ${false}    | ${true}  | ${false}           | ${true}
      ${"119.0.6045.123"} | ${"119.0.5000.100"} | ${false} | ${true}     | ${false} | ${false}           | ${true}
      ${"119.0.6045.123"} | ${"119.1.6045.100"} | ${false} | ${false}    | ${true}  | ${false}           | ${true}
      ${"119.0.6045.123"} | ${"120.0.6045.100"} | ${false} | ${false}    | ${true}  | ${false}           | ${true}
      ${"119.0.6045.123"} | ${"118.0.6045.100"} | ${false} | ${true}     | ${false} | ${false}           | ${true}
      ${"119.0.6045.123"} | ${"119.0.6045.122"} | ${false} | ${true}     | ${false} | ${false}           | ${true}
    `('compare "$a" and "$b"', ({ a, b, equals, greaterThan, lessThan }) => {
      const v1 = new StaticVersion(a);
      const v2 = new StaticVersion(b);
      expect(v1.equals(v2)).toBe(equals);
      expect(v1.greaterThan(v2)).toBe(greaterThan);
      expect(v1.lessThan(v2)).toBe(lessThan);
      expect(v1.greaterThanOrEqual(v2)).toBe(greaterThan || equals);
      expect(v1.lessThanOrEqual(v2)).toBe(lessThan || equals);
    });
  });

  describe("toString", () => {
    test("return stringified version", () => {
      const v = new StaticVersion("119.0.6045.123");
      expect(v.toString()).toBe("119.0.6045.123");
    });
  });
});

describe("VersionSpec", () => {
  describe("constructor", () => {
    test("new instance", () => {
      const version = new VersionSpec({
        major: 119,
        minor: 0,
        build: 6045,
        patch: 123,
      });

      expect(version.major).toBe(119);
      expect(version.minor).toBe(0);
      expect(version.build).toBe(6045);
      expect(version.patch).toBe(123);
    });

    test.each([
      ["119.0.6045.123", [119, 0, 6045, 123]],
      ["119.0.6045", [119, 0, 6045]],
      ["119.0", [119, 0]],
      ["119", [119]],
      ["119.0.6045.x", [119, 0, 6045]],
      ["119.0.x", [119, 0]],
      ["119.x", [119]],
    ])("parse %s", (version, expected) => {
      const v = new VersionSpec(version);
      expect([v.major, v.minor, v.build, v.patch]).toEqual(expected);
    });

    test.each([
      ["119.0.6045.beta"],
      ["119.0.x.123"],
      ["x"],
      ["119.0.6045.123.456"],
      ["119.0.6045.-123"],
      [""],
    ])("throw an error for %s", (version) => {
      expect(() => new VersionSpec(version)).toThrow(
        `Invalid version: ${version}`,
      );
    });
  });

  describe("toString", () => {
    test.each([
      ["119.0.6045.123", "119.0.6045.123"],
      ["119", "119"],
    ])("return %s for %s", (expected, version) => {
      const v = new VersionSpec(version);
      expect(v.toString()).toBe(expected);
    });
  });

  describe("satisfies", () => {
    test.each`
      spec                | version             | satisfies
      ${"119.0.6045.123"} | ${"119.0.6045.123"} | ${true}
      ${"119.0.6045"}     | ${"119.0.6045.123"} | ${true}
      ${"119"}            | ${"119.0.6045.123"} | ${true}
      ${"119.0.6045.123"} | ${"119.0.6045.100"} | ${false}
      ${"119.0.6000"}     | ${"119.0.6045.100"} | ${false}
      ${"120"}            | ${"119.0.6045.100"} | ${false}
    `("return if $spec satisfies $version", ({ spec, version, satisfies }) => {
      const s = new VersionSpec(spec);
      const v = new StaticVersion(version);
      expect(s.satisfies(v)).toBe(satisfies);
    });
  });
});
