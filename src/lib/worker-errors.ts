export type SearchStage = "catalogue" | "model-download" | "runtime-initialization" | "query-embedding" | "ranking";

export function searchFailureMessage(error: unknown, stage: SearchStage): string {
  const details = error instanceof Error ? error.message : "";
  let code = "UNAVAILABLE";
  if (/failed to fetch|fetch failed|network|load failed|terminated/i.test(details)) code = "NETWORK";
  else if (/invalid url|construct.*URL|unsupported.*protocol/i.test(details)) code = "ASSET_URL";
  else if (/no available backend|WebAssembly|wasm|backend initializing/i.test(details)) code = "RUNTIME";
  else if (/protobuf|invalid model|model.*parse|external data/i.test(details)) code = "MODEL_DATA";
  else if (/unauthorized|forbidden|403|401/i.test(details)) code = "ASSET_ACCESS";
  else if (/could not locate|not found|404/i.test(details)) code = "ASSET_MISSING";
  else if (error instanceof TypeError) code = "TYPE_ERROR";
  else if (error instanceof RangeError) code = "RESOURCE_LIMIT";
  return `Local search could not finish (${stage.toUpperCase().replaceAll("-", "_")}:${code}). Check your connection, refresh the page, and try again.`;
}
