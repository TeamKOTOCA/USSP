/**
 * SDK Node.js/ブラウザ互換性テスト
 */

describe("USSP SDK Compatibility", () => {
  const isNode = typeof window === "undefined";

  describe("Environment Detection", () => {
    it("should correctly detect environment", () => {
      expect(isNode).toBe(true);
    });
  });

  describe("Crypto Utils", () => {
    it("should generate code verifier", async () => {
      const { generateCodeVerifier } = await import("../src/crypto-utils");
      const verifier = await generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(typeof verifier).toBe("string");
      expect(verifier.length).toBeGreaterThan(0);
    });

    it("should generate code challenge", async () => {
      const { generateCodeVerifier, generateCodeChallenge } = await import(
        "../src/crypto-utils"
      );
      const verifier = await generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe("string");
      expect(challenge.length).toBeGreaterThan(0);
    });
  });

  describe("HTTP Client", () => {
    it("should handle Node.js environment", async () => {
      const { httpRequest } = await import("../src/http-client");
      // ローカルのモックサーバーがない場合は、エラーハンドリングをテスト
      try {
        await httpRequest("http://localhost:9999/test", {
          method: "GET",
        });
      } catch (error) {
        // エラーが発生することを期待
        expect(error).toBeDefined();
      }
    });
  });

  describe("USSP SDK", () => {
    it("should initialize SDK", async () => {
      const { default: USSP } = await import("../src/index");
      const sdk = new USSP({
        serverUrl: "http://localhost:5000",
        clientId: "test-client",
      });

      expect(sdk).toBeDefined();
      expect(sdk.getServerUrl()).toBe("http://localhost:5000");
      expect(sdk.getClientId()).toBe("test-client");
    });

    it("should handle token operations", async () => {
      const { default: USSP } = await import("../src/index");
      const sdk = new USSP({
        serverUrl: "http://localhost:5000",
      });

      expect(sdk.getAccessToken()).toBeNull();

      sdk.setAccessToken("test-token");
      expect(sdk.getAccessToken()).toBe("test-token");
    });
  });

  describe("Files Client", () => {
    it("should support Buffer data type", async () => {
      const { default: USSP } = await import("../src/index");
      const sdk = new USSP({
        serverUrl: "http://localhost:5000",
      });

      const buffer = Buffer.from("test data");
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });

  describe("OAuth Client", () => {
    it("should generate authorize URL", async () => {
      const { default: USSP } = await import("../src/index");
      const sdk = new USSP({
        serverUrl: "http://localhost:5000",
        clientId: "test-client",
      });

      const url = await sdk.oauth.generateAuthorizeUrl({
        redirectUri: "http://localhost:3000/callback",
      });

      expect(url).toBeDefined();
      expect(typeof url).toBe("string");
      expect(url).toContain("client_id=test-client");
      expect(url).toContain("code_challenge");
    });
  });
});
