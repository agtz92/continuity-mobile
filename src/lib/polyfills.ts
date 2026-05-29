// Apply ONLY the globals Supabase/Apollo/SSE need. We deliberately do NOT
// polyfill global `fetch`: react-native-fetch-api's fetch breaks Supabase auth
// ("Cannot read property 'blobId' of undefined"). The streaming fetch is scoped
// to the SSE consumer in assistantStream.ts, leaving Supabase + Apollo on RN's
// native fetch. Must be imported before anything that touches these globals.
import { polyfill as polyfillBase64 } from "react-native-polyfill-globals/src/base64";
import { polyfill as polyfillEncoding } from "react-native-polyfill-globals/src/encoding";
import { polyfill as polyfillReadableStream } from "react-native-polyfill-globals/src/readable-stream";
import { polyfill as polyfillCrypto } from "react-native-polyfill-globals/src/crypto";

polyfillBase64();
polyfillEncoding();
polyfillReadableStream();
polyfillCrypto();
