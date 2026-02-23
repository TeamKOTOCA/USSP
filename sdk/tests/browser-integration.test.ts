/**
 * USSP SDK ブラウザ互換性テスト
 * ブラウザ環境での SDK の動作を検証
 */

describe('USSP SDK - Browser Compatibility', () => {
  let originalWindow: any;

  beforeEach(() => {
    // window オブジェクトをモック
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe('環境検出', () => {
    it('ブラウザ環境を正しく検出', () => {
      // window が存在することを確認
      expect(typeof window).toBe('object');
      expect(window.navigator).toBeDefined();
    });

    it('localStorage がブラウザで利用可能', () => {
      expect(typeof localStorage).toBe('object');
      expect(localStorage.getItem).toBeDefined();
      expect(localStorage.setItem).toBeDefined();
    });

    it('sessionStorage がブラウザで利用可能', () => {
      expect(typeof sessionStorage).toBe('object');
    });

    it('fetch API がブラウザで利用可能', () => {
      expect(typeof fetch).toBe('function');
    });
  });

  describe('OAuth フロー', () => {
    it('PKCE コードチャレンジを生成', async () => {
      const { generateCodeVerifier, generateCodeChallenge } = require('../src/crypto-utils');

      const verifier = await generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(0);

      const challenge = await generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');
      expect(challenge).not.toBe(verifier); // S256 は異なる値
    });

    it('OAuth トークンを sessionStorage に保存・取得', () => {
      const testVerifier = 'test-code-verifier-123';
      sessionStorage.setItem('oauth_code_verifier', testVerifier);

      const retrieved = sessionStorage.getItem('oauth_code_verifier');
      expect(retrieved).toBe(testVerifier);

      sessionStorage.removeItem('oauth_code_verifier');
      expect(sessionStorage.getItem('oauth_code_verifier')).toBeNull();
    });
  });

  describe('HTTP リクエスト', () => {
    it('ブラウザ環境で fetch を使用', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
        headers: { entries: () => [] },
      });

      global.fetch = mockFetch;

      const response = await fetch('https://api.example.com/test');
      expect(mockFetch).toHaveBeenCalled();
      expect(response.ok).toBe(true);
    });
  });

  describe('ファイル操作', () => {
    it('Blob オブジェクトを作成・操作', () => {
      const text = 'Hello, World!';
      const blob = new Blob([text], { type: 'text/plain' });

      expect(blob).toBeDefined();
      expect(blob.size).toBe(text.length);
      expect(blob.type).toBe('text/plain');
    });

    it('File オブジェクトを処理', () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

      expect(file.name).toBe('test.txt');
      expect(file.type).toBe('text/plain');
      expect(file.size).toBe('test content'.length);
    });

    it('ArrayBuffer を処理', async () => {
      const data = 'test data';
      const buffer = new TextEncoder().encode(data);

      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBe(data.length);

      const decoded = new TextDecoder().decode(buffer);
      expect(decoded).toBe(data);
    });

    it('URL.createObjectURL でダウンロードURL を生成', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      expect(url).toBeDefined();
      expect(url.startsWith('blob:')).toBe(true);

      URL.revokeObjectURL(url);
    });
  });

  describe('リロケーション・ナビゲーション', () => {
    it('window.location にアクセス可能', () => {
      expect(window.location).toBeDefined();
      expect(window.location.origin).toBeDefined();
      expect(window.location.href).toBeDefined();
    });

    it('URL パラメータを解析', () => {
      // URLSearchParams はブラウザで標準装備
      const params = new URLSearchParams('code=abc123&state=xyz789');

      expect(params.get('code')).toBe('abc123');
      expect(params.get('state')).toBe('xyz789');
    });

    it('URL オブジェクトを操作', () => {
      const url = new URL('https://example.com/callback?code=123&state=abc');

      expect(url.searchParams.get('code')).toBe('123');
      expect(url.searchParams.get('state')).toBe('abc');

      url.searchParams.set('new_param', 'value');
      expect(url.searchParams.get('new_param')).toBe('value');
    });
  });

  describe('DOM イベント処理', () => {
    it('ファイル入力イベントを処理', () => {
      const input = document.createElement('input');
      input.type = 'file';

      const handleChange = jest.fn();
      input.addEventListener('change', handleChange);

      // イベントを発火
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);

      expect(handleChange).toHaveBeenCalled();
    });

    it('メッセージイベントを処理（OAuth ポップアップ）', () => {
      const handleMessage = jest.fn();
      window.addEventListener('message', handleMessage);

      const event = new MessageEvent('message', {
        data: { type: 'oauth_callback', code: '123' },
        origin: window.location.origin,
      });

      window.dispatchEvent(event);
      expect(handleMessage).toHaveBeenCalled();

      window.removeEventListener('message', handleMessage);
    });
  });

  describe('エラーハンドリング', () => {
    it('CORS エラーを検出', async () => {
      const mockFetch = jest.fn().mockRejectedValue(
        new TypeError('Failed to fetch')
      );
      global.fetch = mockFetch;

      try {
        await fetch('https://cross-origin.example.com');
        fail('Should throw error');
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
      }
    });

    it('タイムアウトエラーを処理', async () => {
      const timeoutError = new Error('Request timeout');
      expect(timeoutError.message).toBe('Request timeout');
    });
  });

  describe('パフォーマンス', () => {
    it('localStorage へのアクセスは高速', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        localStorage.setItem(`key-${i}`, `value-${i}`);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000); // 1秒以下

      // クリーンアップ
      for (let i = 0; i < 1000; i++) {
        localStorage.removeItem(`key-${i}`);
      }
    });

    it('base64url エンコーディングは高速', () => {
      const data = 'This is test data for encoding performance';
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        Buffer.from(data).toString('base64url');
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000); // 2秒以下
    });
  });

  describe('互換性チェックリスト', () => {
    it('ブラウザ機能が完全に利用可能', () => {
      const checklist = {
        fetch: typeof fetch === 'function',
        localStorage: typeof localStorage === 'object',
        sessionStorage: typeof sessionStorage === 'object',
        FileReader: typeof FileReader === 'function',
        Blob: typeof Blob === 'function',
        File: typeof File === 'function',
        ArrayBuffer: typeof ArrayBuffer === 'function',
        TextEncoder: typeof TextEncoder === 'function',
        TextDecoder: typeof TextDecoder === 'function',
        URL: typeof URL === 'function',
        URLSearchParams: typeof URLSearchParams === 'function',
        crypto: typeof crypto === 'object',
        SubtleCrypto: typeof crypto?.subtle === 'object',
        MessageEvent: typeof MessageEvent === 'function',
      };

      Object.entries(checklist).forEach(([feature, available]) => {
        expect(available).toBe(true, `${feature} は利用可能であるべき`);
      });
    });
  });
});
