import { afterEach, describe, expect, it, vi } from "vitest";

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ default: { lookup }, lookup }));

import {
  SsrfBlockedError,
  assertSafeToFetch,
  isBlockedIp,
  isSafePublicUrl,
  safeFetch,
  validatePublicUrl,
} from "@/lib/security/url-safety";

afterEach(() => {
  vi.restoreAllMocks();
  lookup.mockReset();
});

describe("validatePublicUrl (sync)", () => {
  it("accepts ordinary public http(s) URLs", () => {
    expect(isSafePublicUrl("https://example.com/feed.xml")).toBe(true);
    expect(isSafePublicUrl("http://news.example.com/rss")).toBe(true);
  });

  it.each([
    ["cloud metadata IP", "http://169.254.169.254/latest/meta-data/"],
    ["loopback IP", "http://127.0.0.1:6379/"],
    ["RFC1918 10/8", "http://10.0.0.5/x"],
    ["RFC1918 192.168/16", "http://192.168.1.1/x"],
    ["RFC1918 172.16/12", "http://172.16.0.1/x"],
    ["CGNAT 100.64/10", "http://100.64.0.1/x"],
    ["0.0.0.0/8", "http://0.0.0.0/x"],
    ["IPv6 loopback", "http://[::1]/x"],
    ["IPv4-mapped loopback", "http://[::ffff:127.0.0.1]/x"],
    ["localhost", "http://localhost:3000/x"],
    ["*.local", "http://printer.local/x"],
    ["*.internal", "http://db.internal/x"],
    ["file scheme", "file:///etc/passwd"],
    ["ftp scheme", "ftp://example.com/x"],
    ["embedded credentials", "http://user:pass@example.com/x"],
    ["not a url", "not-a-url"],
  ])("rejects %s", (_label, url) => {
    expect(isSafePublicUrl(url)).toBe(false);
  });

  it("reports the specific reason", () => {
    expect(validatePublicUrl("file:///etc/passwd")).toMatchObject({ ok: false, reason: "unsupported_scheme" });
    expect(validatePublicUrl("http://169.254.169.254/")).toMatchObject({ ok: false, reason: "private_ip" });
    expect(validatePublicUrl("http://localhost/")).toMatchObject({ ok: false, reason: "internal_hostname" });
    expect(validatePublicUrl("http://a:b@example.com/")).toMatchObject({ ok: false, reason: "embedded_credentials" });
  });
});

describe("isBlockedIp", () => {
  it("classifies v4 + v6", () => {
    expect(isBlockedIp("169.254.169.254")).toBe(true);
    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("::1")).toBe(true);
    expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
    expect(isBlockedIp("fd00::1")).toBe(true);
  });
});

describe("assertSafeToFetch (DNS layer)", () => {
  it("blocks a public hostname that resolves to a private IP", async () => {
    lookup.mockResolvedValue([{ address: "10.0.0.7", family: 4 }]);
    await expect(assertSafeToFetch("https://rebind.example.com/")).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it("allows a public hostname that resolves to a public IP", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    await expect(assertSafeToFetch("https://example.com/")).resolves.toBeInstanceOf(URL);
  });
});

describe("safeFetch (redirect re-validation)", () => {
  it("follows a safe redirect, re-validating each hop", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const fetchMock = vi.spyOn(globalThis, "fetch" as never).mockImplementation((async (url: string) => {
      if (url.includes("/start")) {
        return new Response(null, { status: 302, headers: { location: "https://example.com/final" } });
      }
      return new Response("ok", { status: 200 });
    }) as never);

    const res = await safeFetch("https://example.com/start");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("blocks a redirect that points at an internal address", async () => {
    // First hop resolves public; the Location is a literal internal IP -> blocked at re-validation.
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.spyOn(globalThis, "fetch" as never).mockImplementation((async () =>
      new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data/" } })) as never);

    await expect(safeFetch("https://example.com/start")).rejects.toMatchObject({
      name: "SsrfBlockedError",
      reason: "private_ip",
    });
  });

  it("caps redirect chains", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.spyOn(globalThis, "fetch" as never).mockImplementation((async () =>
      new Response(null, { status: 302, headers: { location: "https://example.com/loop" } })) as never);

    await expect(safeFetch("https://example.com/loop", {}, { maxRedirects: 2 })).rejects.toMatchObject({
      reason: "too_many_redirects",
    });
  });
});
