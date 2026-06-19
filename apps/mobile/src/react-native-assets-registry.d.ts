interface MediaTrackSettings {
  width?: number;
}

declare module "@react-native/assets-registry/registry" {
  export interface PackagerAsset {
    httpServerLocation: string;
    name: string;
    hash: string;
    type: string;
    scales: number[];
    width?: number;
    height?: number;
  }
}
