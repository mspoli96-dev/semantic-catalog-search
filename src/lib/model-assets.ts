import { EMBEDDING_MODEL, MODEL_REVISION } from "./model-config";

export type VerifiedAsset = { path: string; size: number; sha256: string };
export const MODEL_ROOT = `/models/${MODEL_REVISION}/${EMBEDDING_MODEL}/`;
export const MODEL_ASSETS: VerifiedAsset[] = [
  { path: `${MODEL_ROOT}config.json`, size: 650, sha256: "7135149f7cffa1a573466c6e4d8423ed73b62fd2332c575bf738a0d033f70df7" },
  { path: `${MODEL_ROOT}tokenizer_config.json`, size: 366, sha256: "9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3" },
  { path: `${MODEL_ROOT}tokenizer.json`, size: 711661, sha256: "da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0" },
  { path: `${MODEL_ROOT}onnx/model_quantized.onnx`, size: 22972370, sha256: "afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1" },
];
export const WASM_ASSET: VerifiedAsset = {
  path: `/models/${MODEL_REVISION}/runtime/ort-wasm-simd-threaded.jsep.wasm`,
  size: 21596019,
  sha256: "c46655e8a94afc45338d4cb2b840475f88e5012d524509916e505079c00bfa39",
};
