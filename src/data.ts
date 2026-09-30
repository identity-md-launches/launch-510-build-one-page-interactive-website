export interface Block {
  number: number;
  timestamp: number;
  transactions: number;
  gasUsed: number;
  gasLimit: number;
  hash: string;
}
export type Activity = "low" | "medium" | "high";
export type Filter = "all" | Activity;
export const ENDPOINTS = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.drpc.org",
];
export const formatNumber = (n: number) => n.toLocaleString("en-US");
export const gasMillions = (n: number) => `${(n / 1_000_000).toFixed(2)}M`;
export const intensity = (b: Block) =>
  Math.min(1, b.transactions / 400) * 0.5 +
  Math.min(1, b.gasUsed / 30_000_000) * 0.5;
export const activity = (b: Block): Activity =>
  intensity(b) < 0.35 ? "low" : intensity(b) < 0.65 ? "medium" : "high";
export const matches = (b: Block, filter: Filter) =>
  filter === "all" || activity(b) === filter;
export function summarize(blocks: Block[]) {
  const count = blocks.length;
  return {
    averageTime:
      count > 1
        ? (blocks[count - 1].timestamp - blocks[0].timestamp) / (count - 1)
        : 0,
    transactions: count
      ? blocks.reduce((sum, b) => sum + b.transactions, 0) / count
      : 0,
    gas: count ? blocks.reduce((sum, b) => sum + b.gasUsed, 0) / count : 0,
    utilization: count
      ? (blocks.reduce((sum, b) => sum + b.gasUsed / b.gasLimit, 0) / count) *
        100
      : 0,
  };
}
const hex = (value: unknown): number => {
  if (typeof value !== "string" || !/^0x[\da-f]+$/i.test(value))
    throw new Error("Invalid block quantity");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0)
    throw new Error("Invalid block quantity");
  return number;
};
export function parseBlock(value: unknown): Block {
  if (!value || typeof value !== "object")
    throw new Error("Block is unavailable");
  const b = value as Record<string, unknown>;
  if (
    !Array.isArray(b.transactions) ||
    typeof b.hash !== "string" ||
    !/^0x[\da-f]{64}$/i.test(b.hash)
  )
    throw new Error("Incomplete block");
  const block = {
    number: hex(b.number),
    timestamp: hex(b.timestamp),
    transactions: b.transactions.length,
    gasUsed: hex(b.gasUsed),
    gasLimit: hex(b.gasLimit),
    hash: b.hash,
  };
  if (!block.gasLimit || block.gasUsed > block.gasLimit)
    throw new Error("Invalid gas usage");
  return block;
}
async function request(
  endpoint: string,
  payload: unknown,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.any([signal, AbortSignal.timeout(9_000)]),
  });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return response.json();
}
const rpc = (id: number, method: string, params: unknown[]) => ({
  jsonrpc: "2.0",
  id,
  method,
  params,
});
export async function loadBlocks(
  previous: Block[],
  signal: AbortSignal,
): Promise<{ blocks: Block[]; provider: string }> {
  for (const endpoint of ENDPOINTS) {
    try {
      const latestResponse = (await request(
        endpoint,
        rpc(1, "eth_getBlockByNumber", ["latest", false]),
        signal,
      )) as { result?: unknown };
      const latest = parseBlock(latestResponse.result);
      // Refresh the last three blocks to account for shallow chain reorganizations.
      const first = latest.number - 49;
      const cached = new Map(
        previous
          .filter((b) => b.number >= first && b.number < latest.number - 2)
          .map((b) => [b.number, b]),
      );
      cached.set(latest.number, latest);
      const missing = Array.from({ length: 50 }, (_, i) => first + i).filter(
        (n) => !cached.has(n),
      );
      for (let start = 0; start < missing.length; start += 10) {
        const ids = missing.slice(start, start + 10);
        const response = await request(
          endpoint,
          ids.map((n) =>
            rpc(n, "eth_getBlockByNumber", [`0x${n.toString(16)}`, false]),
          ),
          signal,
        );
        if (!Array.isArray(response) || response.length !== ids.length)
          throw new Error("Incomplete block history");
        for (const item of response) {
          const block = parseBlock(item.result);
          if (!ids.includes(block.number) || block.number !== item.id)
            throw new Error("Unexpected block response");
          cached.set(block.number, block);
        }
      }
      const blocks = Array.from({ length: 50 }, (_, i) =>
        cached.get(first + i),
      );
      if (blocks.some((b) => !b)) throw new Error("Incomplete block history");
      return {
        blocks: blocks as Block[],
        provider: new URL(endpoint).hostname,
      };
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  throw new Error(
    "Live connection unavailable. Check your connection and retry.",
  );
}
export async function loadSample(signal: AbortSignal): Promise<Block[]> {
  const response = await fetch("./sample-blocks.json", { signal });
  if (!response.ok)
    throw new Error(
      "The sample could not be loaded. Check your connection and retry.",
    );
  const data = (await response.json()) as { blocks: Block[] };
  if (!Array.isArray(data.blocks) || data.blocks.length !== 50)
    throw new Error("Sample is incomplete. Retry the live connection.");
  return data.blocks;
}
