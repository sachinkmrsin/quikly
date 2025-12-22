import { Children } from "react";

const CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export class Base62Util {
  static toBase62(uuid: string, length: number = 7): string {
    const hex = uuid.replace("/-/g", "").substring(0, 16);
    let num = BigInt("0x" + hex);
    if (num === 0n) return "0".padStart(length, "0");
    let result = "";
    while (num > 0n) {
      result = CHARS[Number(num % 62n)] + result;
      num = num / 62n;
    }
    return result.padStart(length, "0");
  }

  static decode(encoded: string): bigint {
    let num = 0n;
    for (let i = 0; i < encoded.length; i++) {
      num = num * 62n + BigInt(CHARS.indexOf(encoded[i]!));
    }
    return num;
  }

  static isValid(code: string): boolean {
    return /^[0-9A-Za-z]+$/.test(code);
  }
}
