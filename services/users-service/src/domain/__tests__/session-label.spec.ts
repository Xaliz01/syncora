import { deriveSessionDeviceClass, deriveSessionLabel } from "../session-label";

describe("deriveSessionLabel", () => {
  it("returns unknown label when user-agent is missing", () => {
    expect(deriveSessionLabel()).toBe("Appareil inconnu");
    expect(deriveSessionLabel("")).toBe("Appareil inconnu");
  });

  it("derives browser and OS from common user-agents", () => {
    expect(
      deriveSessionLabel(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome · macOS");
    expect(
      deriveSessionLabel(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari · iOS");
  });
});

describe("deriveSessionDeviceClass", () => {
  it("classifies desktop browsers as desktop", () => {
    expect(
      deriveSessionDeviceClass(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe("desktop");
    expect(deriveSessionDeviceClass()).toBe("desktop");
  });

  it("classifies phones and tablets as mobile", () => {
    expect(
      deriveSessionDeviceClass(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("mobile");
    expect(
      deriveSessionDeviceClass(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("mobile");
  });
});
