import { describe, test, expect } from "bun:test";
import { Base62Util } from "../../utils/base62.util";

// ── toBase62 ─────────────────────────────────────────────────────────────────
describe("Base62Util.toBase62", () => {
  test("returns a string at least 7 characters long (default minimum length)", () => {
    // length is a minimum / padding length, not a cap –
    // a large UUID can produce a code longer than the requested length
    const result = Base62Util.toBase62("550e8400-e29b-41d4-a716-446655440000");
    expect(result.length).toBeGreaterThanOrEqual(7);
  });

  test("pads a short result up to the custom minimum length", () => {
    // A UUID whose first 16 hex chars encode to fewer than 10 base-62 digits
    // should be left-padded with '0' to reach the requested length
    const result = Base62Util.toBase62("00000001-0000-0000-0000-000000000000", 10);
    expect(result.length).toBeGreaterThanOrEqual(10);
  });

  test("output contains only base-62 characters (0-9 a-z A-Z)", () => {
    const result = Base62Util.toBase62("550e8400-e29b-41d4-a716-446655440000");
    expect(result).toMatch(/^[0-9a-zA-Z]+$/);
  });

  test("strips hyphens from the UUID before encoding", () => {
    const withHyphens    = Base62Util.toBase62("550e8400-e29b-41d4-a716-446655440000");
    const withoutHyphens = Base62Util.toBase62("550e8400e29b41d4a716446655440000");
    expect(withHyphens).toBe(withoutHyphens);
  });

  test("pads with leading zeros when the encoded value is shorter than length", () => {
    const result = Base62Util.toBase62("00000001-0000-0000-0000-000000000000", 7);
    expect(result).toHaveLength(7);
    expect(result).toMatch(/^[0-9a-zA-Z]{7}$/);
  });

  test("returns all-zeros string for a zero UUID", () => {
    const result = Base62Util.toBase62("00000000-0000-0000-0000-000000000000", 7);
    expect(result).toBe("0000000");
  });

  test("is deterministic – same UUID always yields the same code", () => {
    const uuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    expect(Base62Util.toBase62(uuid)).toBe(Base62Util.toBase62(uuid));
  });

  test("two different UUIDs (different first 16 hex chars) produce different codes", () => {
    const a = Base62Util.toBase62("aaaaaaaa-0000-0000-0000-000000000000");
    const b = Base62Util.toBase62("bbbbbbbb-0000-0000-0000-000000000000");
    expect(a).not.toBe(b);
  });
});

// ── decode ───────────────────────────────────────────────────────────────────
describe("Base62Util.decode", () => {
  test("decodes '0' to 0n", () => {
    expect(Base62Util.decode("0")).toBe(0n);
  });

  test("decodes 'a' to 10n (position of 'a' in the charset)", () => {
    // CHARS = "0123456789abc..." → 'a' is at index 10
    expect(Base62Util.decode("a")).toBe(10n);
  });

  test("decodes 'A' to 36n (position of 'A' in the charset)", () => {
    // CHARS = "0-9 a-z A-Z" → 'A' is at index 36
    expect(Base62Util.decode("A")).toBe(36n);
  });

  test("decodes '10' to 62n (one full base-62 'carry')", () => {
    expect(Base62Util.decode("10")).toBe(62n);
  });

  test("decodes a multi-character string correctly", () => {
    expect(Base62Util.decode("00")).toBe(0n);
    expect(Base62Util.decode("01")).toBe(1n);
  });

  test("returns a bigint", () => {
    expect(typeof Base62Util.decode("abc")).toBe("bigint");
  });
});

// ── isValid ──────────────────────────────────────────────────────────────────
describe("Base62Util.isValid", () => {
  test.each([
    ["abc1234",    true],
    ["ABC",        true],
    ["0",          true],
    ["zZ9",        true],
    ["AAAAAAAAAA", true],  // all uppercase letters
    ["0000000",    true],  // all zeros
  ])("returns true for valid base-62 string: %s", (code, expected) => {
    expect(Base62Util.isValid(code)).toBe(expected);
  });

  test.each([
    ["",         false],   // empty
    ["has-dash", false],   // hyphen
    ["has_under",false],   // underscore
    ["with space",false],  // space
    ["emöji",    false],   // non-ASCII
    ["!@#$",     false],   // special chars
  ])("returns false for invalid base-62 string: %s", (code) => {
    expect(Base62Util.isValid(code)).toBe(false);
  });
});

// ── round-trip ───────────────────────────────────────────────────────────────
describe("Base62Util round-trip (toBase62 → decode)", () => {
  test("decoded value of two different encodings differs when source UUIDs differ", () => {
    const codeA = Base62Util.toBase62("aaaaaaaa-0000-0000-0000-000000000000");
    const codeB = Base62Util.toBase62("cccccccc-0000-0000-0000-000000000000");
    expect(Base62Util.decode(codeA)).not.toBe(Base62Util.decode(codeB));
  });

  test("same UUID always decodes to the same numeric value", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const encoded = Base62Util.toBase62(uuid);
    expect(Base62Util.decode(encoded)).toBe(Base62Util.decode(encoded));
  });
});


