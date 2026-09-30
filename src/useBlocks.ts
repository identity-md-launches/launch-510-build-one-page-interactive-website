import { useCallback, useEffect, useRef, useState } from "react";
import { loadBlocks, loadSample, type Block } from "./data";
export type Connection = "connecting" | "live" | "sample" | "stale" | "error";
export function useBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [message, setMessage] = useState("Connecting to Ethereum…");
  const [busy, setBusy] = useState(true);
  const [provider, setProvider] = useState("");
  const [updatedAt, setUpdatedAt] = useState(0);
  const latest = useRef<Block[]>([]);
  const sampleMode = useRef(false);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const result = await loadBlocks(
        sampleMode.current ? [] : latest.current,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      latest.current = result.blocks;
      sampleMode.current = false;
      setBlocks(result.blocks);
      setProvider(result.provider);
      setUpdatedAt(Date.now());
      setConnection("live");
      setMessage("Live connection restored. The latest 50 blocks are ready.");
    } catch {
      if (controller.signal.aborted) return;
      if (latest.current.length && !sampleMode.current) {
        setConnection("stale");
        setMessage(
          "Live updates interrupted. Showing the last received blocks. Check your connection and retry.",
        );
      } else {
        try {
          const sample = await loadSample(controller.signal);
          if (controller.signal.aborted) return;
          latest.current = sample;
          sampleMode.current = true;
          setBlocks(sample);
          setConnection("sample");
          setMessage(
            "Live connection unavailable. Explore a saved sample or retry the connection.",
          );
        } catch {
          if (controller.signal.aborted) return;
          setConnection("error");
          setMessage(
            "Blocks could not be loaded. Check your connection and retry.",
          );
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        request.current = null;
      }
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden && !sampleMode.current && !request.current)
        void refresh();
    }, 12_000);
    return () => {
      clearInterval(timer);
      request.current?.abort();
    };
  }, [refresh]);
  return { blocks, connection, message, busy, provider, updatedAt, refresh };
}
