/// <reference types="nativewind/types" />

declare module "*.css";

declare module "react-native-polyfill-globals/src/base64" {
  export const polyfill: () => void;
}
declare module "react-native-polyfill-globals/src/encoding" {
  export const polyfill: () => void;
}
declare module "react-native-polyfill-globals/src/readable-stream" {
  export const polyfill: () => void;
}
declare module "react-native-polyfill-globals/src/crypto" {
  export const polyfill: () => void;
}
declare module "react-native-fetch-api" {
  export const fetch: (
    resource: string,
    options?: RequestInit & { reactNative?: { textStreaming?: boolean } },
  ) => Promise<Response>;
  export const Headers: typeof globalThis.Headers;
  export const Request: typeof globalThis.Request;
  export const Response: typeof globalThis.Response;
}
