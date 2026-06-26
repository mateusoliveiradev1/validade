import type { ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi, afterEach } from "vitest";
import { BarcodeLookupAssistant } from "./BarcodeLookupAssistant";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type CameraPermissionFixture = {
  granted: boolean;
  status: "undetermined" | "granted" | "denied";
  canAskAgain: boolean;
};

const cameraMock = vi.hoisted<{
  permission: CameraPermissionFixture | null;
  requestPermission: ReturnType<typeof vi.fn>;
}>(() => ({
  permission: {
    granted: false,
    status: "undetermined",
    canAskAgain: true,
  },
  requestPermission: vi.fn(() =>
    Promise.resolve({ granted: true, status: "granted", canAskAgain: true }),
  ),
}));

const linkingMock = vi.hoisted(() => ({
  openSettings: vi.fn(() => Promise.resolve()),
}));

vi.mock("react-native", async () => {
  const React = await import("react");
  const host =
    (name: string) =>
    ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(name, props, children);

  return {
    Linking: linkingMock,
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T) => styles,
    },
    Text: host("Text"),
    View: host("View"),
    Pressable: host("Pressable"),
  };
});

vi.mock("expo-camera", async () => {
  const React = await import("react");

  return {
    CameraView: (props: Record<string, unknown>) => React.createElement("CameraView", props),
    PermissionStatus: {
      DENIED: "denied",
      GRANTED: "granted",
      UNDETERMINED: "undetermined",
    },
    useCameraPermissions: () => [cameraMock.permission, cameraMock.requestPermission] as const,
  };
});

afterEach(() => {
  cameraMock.permission = { granted: false, status: "undetermined", canAskAgain: true };
  cameraMock.requestPermission.mockClear();
  linkingMock.openSettings.mockClear();
});

function renderAssistant(): ReactTestRenderer {
  return create(<BarcodeLookupAssistant onBack={() => undefined} onLookup={() => undefined} />);
}

function press(tree: ReactTestRenderer, label: string): void {
  const button = tree.root
    .findAllByType("Pressable")
    .find((candidate) => candidate.props.accessibilityLabel === label);

  if (button === undefined || typeof button.props.onPress !== "function") {
    throw new Error(`Expected button ${label}.`);
  }

  button.props.onPress();
}

describe("barcode lookup assistant", () => {
  it("asks for camera permission without showing a failure first", () => {
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = renderAssistant();
    });

    const rendered = JSON.stringify(tree!.toJSON());
    expect(rendered).toContain("Permita a câmera");
    expect(rendered).toContain("Permitir câmera");
    expect(rendered).not.toContain("Não foi possível usar a câmera");

    act(() => {
      press(tree!, "Permitir câmera");
    });

    expect(cameraMock.requestPermission).toHaveBeenCalledOnce();
  });

  it("opens Android settings when camera permission cannot be requested again", () => {
    cameraMock.permission = { granted: false, status: "denied", canAskAgain: false };
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = renderAssistant();
    });

    const rendered = JSON.stringify(tree!.toJSON());
    expect(rendered).toContain("câmera está bloqueada");
    expect(rendered).toContain("Abrir configurações da câmera");

    act(() => {
      press(tree!, "Abrir configurações da câmera");
    });

    expect(linkingMock.openSettings).toHaveBeenCalledOnce();
  });

  it("renders the back camera scanner and forwards scanned codes when permission is granted", () => {
    cameraMock.permission = { granted: true, status: "granted", canAskAgain: true };
    const scanned: string[] = [];
    let tree: ReactTestRenderer | undefined;

    act(() => {
      tree = create(
        <BarcodeLookupAssistant
          onBack={() => undefined}
          onLookup={(value) => scanned.push(value)}
        />,
      );
    });

    const camera = tree!.root.findByType("CameraView");
    expect(camera.props.facing).toBe("back");
    expect(camera.props.barcodeScannerSettings.barcodeTypes).toContain("ean13");

    act(() => {
      camera.props.onBarcodeScanned({ data: "7890000000001" });
    });

    expect(scanned).toEqual(["7890000000001"]);
  });
});
