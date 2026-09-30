import type { CSSProperties } from "react";
type Name =
  | "wave"
  | "cube"
  | "clock"
  | "transactions"
  | "gas"
  | "play"
  | "pause"
  | "reset"
  | "arrow"
  | "chevron"
  | "info"
  | "external"
  | "check";
const paths: Record<Name, string> = {
  wave: "M2 12h4l3-8 6 16 3-8h4",
  cube: "m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 10 9-5m-9 5L3 8m9 5v8M7.5 5.5l9 5",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  transactions: "M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4",
  gas: "M4 21V4h10v17M2 21h14M4 10h10m0-4 4 3v8a2 2 0 0 0 4 0v-5l-4-5",
  play: "m8 4 12 8-12 8V4Z",
  pause: "M8 4v16M16 4v16",
  reset: "M3 10a9 9 0 1 1 1 8M3 4v6h6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  info: "M12 11v6m0-10v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  external: "M14 3h7v7m0-7L10 14m0-10H4v16h16v-6",
  check: "m5 12 4 4L19 6",
};
export function Icon({
  name,
  size = 18,
  style,
}: {
  name: Name;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function EthereumIcon() {
  return (
    <svg
      width="15"
      height="23"
      viewBox="0 0 16 26"
      fill="none"
      aria-hidden="true"
    >
      <path d="m8 1 7 12-7 4-7-4L8 1Z" stroke="currentColor" />
      <path
        d="m1 16 7 9 7-9-7 4-7-4ZM8 1v16M1 13l7-4 7 4"
        stroke="currentColor"
      />
    </svg>
  );
}
export function Level({ level }: { level: string }) {
  return (
    <span className={`level level-${level}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
