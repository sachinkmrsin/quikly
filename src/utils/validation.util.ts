export class Validation {
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isValidShortCode(code: string): boolean {
    return /^[0-9A-Za-z]{1,10}$/.test(code);
  }

  static sanitizedUrl(url: string): string {
    return url.trim();
  }
}
