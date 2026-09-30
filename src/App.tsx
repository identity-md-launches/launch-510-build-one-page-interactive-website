import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  activity,
  formatNumber,
  gasMillions,
  intensity,
  matches,
  summarize,
  type Block,
  type Filter,
} from "./data";
import { EthereumIcon, Icon, Level } from "./icons";
import { useBlocks } from "./useBlocks";

const formatTime = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleTimeString("en-GB", {
    hour12: false,
    timeZone: "UTC",
  });
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1),
    min = Math.min(...values, 0);
  const points = values
    .map(
      (v, i) =>
        `${(i / Math.max(values.length - 1, 1)) * 100},${28 - ((v - min) / (max - min || 1)) * 24}`,
    )
    .join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 100 32" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
function App() {
  const feed = useBlocks();
  const [filter, setFilter] = useState<Filter>("all");
  const [replay, setReplay] = useState<Block[] | null>(null);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectionAnnouncement, setSelectionAnnouncement] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const blocks = replay ?? feed.blocks;
  const latest = feed.blocks.at(-1);
  const stats = useMemo(() => summarize(feed.blocks), [feed.blocks]);
  const visible = useMemo(
    () =>
      blocks
        .filter((b) => matches(b, filter))
        .slice()
        .reverse(),
    [blocks, filter],
  );
  const current = replay
    ? blocks[cursor]
    : (blocks.find((b) => b.number === selected) ?? blocks.at(-1));
  const currentIndex = current ? blocks.indexOf(current) : 0;
  const ready = blocks.length === 50;
  const elapsed = feed.updatedAt
    ? Math.max(0, Math.floor((now - feed.updatedAt) / 1000))
    : 0;
  const label =
    feed.connection === "live" && elapsed > 45
      ? "Delayed"
      : {
          connecting: "Connecting",
          live: "Live",
          sample: "Sample data",
          stale: "Connection lost",
          error: "Offline",
        }[feed.connection];

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      setReducedMotion(media.matches);
      if (media.matches) setPlaying(false);
    };
    media.addEventListener("change", onChange);
    const onVisibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      media.removeEventListener("change", onChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  useEffect(() => {
    if (!playing || !replay) return;
    if (cursor >= replay.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setCursor((i) => i + 1), 650 / speed);
    return () => clearTimeout(timer);
  }, [playing, replay, cursor, speed]);
  function togglePlayback() {
    if (!ready) return;
    if (!replay) {
      setReplay([...feed.blocks]);
      setCursor(0);
      setPlaying(true);
    } else if (playing) setPlaying(false);
    else {
      if (cursor === 49) setCursor(0);
      setPlaying(true);
    }
  }
  function returnToLive() {
    setPlaying(false);
    setReplay(null);
    setSelected(null);
  }
  function inspect(index: number) {
    const block = blocks[index];
    if (block)
      setSelectionAnnouncement(
        `Selected block ${block.number}: ${block.transactions} transactions, ${gasMillions(block.gasUsed)} gas used, ${activity(block)} activity.`,
      );
    if (replay) {
      setCursor(index);
      setPlaying(false);
    } else setSelected(blocks[index]?.number ?? null);
  }
  function changeFilter(next: Filter) {
    setFilter(next);
    setShowAll(false);
    if (!replay)
      setSelected(
        [...blocks].reverse().find((b) => matches(b, next))?.number ?? null,
      );
  }
  const status = replay
    ? playing
      ? "Playing"
      : cursor === 49
        ? "Replay complete"
        : "Paused"
    : label;
  const progress = replay ? cursor : currentIndex;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to visualizer
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#" aria-label="Block Rhythm home">
            <span className="brand-symbol">
              <Icon name="wave" size={25} />
            </span>
            block<span className="brand-light">rhythm</span>
            <span className="beta">Beta</span>
          </a>
          <nav aria-label="Main navigation">
            <a className="nav-active" href="#main">
              Visualizer
            </a>
            <a href="#how-it-works">
              How it works <Icon name="arrow" size={14} />
            </a>
          </nav>
          <div className="network-label">
            <EthereumIcon />
            <span>
              Ethereum <span className="muted">Mainnet</span>
            </span>
            <span className="network-dot" />
          </div>
        </div>
      </header>
      <main id="main" className="page-shell">
        <section className="hero" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">
              <span />
              Onchain. In rhythm.
            </p>
            <h1 id="page-title">
              The heartbeat of <span>Ethereum.</span>
            </h1>
            <p className="hero-description">
              Every block has a beat. Watch the network come alive.
            </p>
          </div>
          <div className="hero-aside">
            <span className="mini-wave" aria-hidden="true">
              {[10, 20, 13, 33, 46, 24, 14, 30, 18, 8].map((h, i) => (
                <i key={i} style={{ height: h }} />
              ))}
            </span>
            <span>A network that never skips a beat.</span>
          </div>
        </section>

        <section
          className="metrics"
          aria-label="Network statistics for the latest 50 blocks"
          aria-busy={!latest && feed.busy}
        >
          <article className="metric">
            <div className="metric-label">
              <Icon name="cube" />
              Latest block
              <span
                className={`status-dot ${feed.connection === "live" ? "" : "inactive"}`}
              />
            </div>
            <div className="metric-value">
              {latest ? (
                formatNumber(latest.number)
              ) : (
                <span className="skeleton">—</span>
              )}
            </div>
            <div className="metric-bottom">
              <span>
                {feed.connection === "sample"
                  ? "Saved Ethereum snapshot"
                  : latest
                    ? "Ethereum mainnet"
                    : "Waiting for the first beat"}
              </span>
              <span className="small-tag">
                #{latest ? String(latest.number).slice(-4) : "----"}
              </span>
            </div>
          </article>
          <article className="metric">
            <div className="metric-label">
              <Icon name="clock" />
              Average block time
            </div>
            <div className="metric-value">
              {latest ? stats.averageTime.toFixed(1) : "—"}
              <span className="unit">s</span>
            </div>
            <div className="metric-bottom">
              <span>Across the last 50 blocks</span>
              <Sparkline
                values={feed.blocks
                  .slice(-16)
                  .map((b, i, a) =>
                    i ? b.timestamp - a[i - 1].timestamp : 12,
                  )}
              />
            </div>
          </article>
          <article className="metric">
            <div className="metric-label">
              <Icon name="transactions" />
              Transactions / block
            </div>
            <div className="metric-value">
              {latest ? Math.round(stats.transactions) : "—"}
              <span className="unit">txns</span>
            </div>
            <div className="metric-bottom">
              <span>Average transactions</span>
              <Sparkline
                values={feed.blocks.slice(-16).map((b) => b.transactions)}
              />
            </div>
          </article>
          <article className="metric">
            <div className="metric-label">
              <Icon name="gas" />
              Gas used / block
            </div>
            <div className="metric-value">
              {latest ? gasMillions(stats.gas) : "—"}
              <span className="unit">gas</span>
            </div>
            <div className="metric-bottom">
              <span>
                {latest
                  ? `${stats.utilization.toFixed(1)}% of block capacity`
                  : "Measuring network usage"}
              </span>
              <Sparkline
                values={feed.blocks.slice(-16).map((b) => b.gasUsed)}
              />
            </div>
          </article>
        </section>

        <div className="connection-announcement sr-only" role="status">
          {feed.message}
        </div>
        <div className="sr-only" role="status">
          {selectionAnnouncement}
        </div>
        {(feed.connection === "sample" ||
          feed.connection === "stale" ||
          feed.connection === "error") && (
          <div className="connection-notice">
            <Icon name="info" />
            <p>
              {feed.message}
              {feed.connection === "sample" && latest && (
                <span>
                  {" "}
                  Snapshot:{" "}
                  {new Date(latest.timestamp * 1000).toLocaleString("en-GB", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC.
                </span>
              )}
            </p>
            <button
              className="text-button"
              onClick={() => void feed.refresh()}
              disabled={feed.busy}
            >
              <Icon name="reset" size={15} />
              {feed.busy ? "Connecting…" : "Retry live"}
            </button>
          </div>
        )}

        <section className="visualizer panel" aria-labelledby="rhythm-title">
          <div className="panel-heading">
            <div className="heading-with-status">
              <h2 id="rhythm-title">Network rhythm</h2>
              <span
                className={`status-pill ${replay || feed.connection !== "live" ? "neutral" : ""}`}
              >
                <span className="status-dot" />
                {status}
              </span>
            </div>
            <div className="window-label">
              <Icon name="wave" size={17} />
              <span>Last 50 blocks</span>
              <span className="divider-vertical" />
              <span>
                ~
                {stats.averageTime
                  ? Math.round((stats.averageTime * 49) / 60)
                  : "10"}{" "}
                min
              </span>
            </div>
          </div>
          <div className="chart-toolbar">
            <div
              className="filters"
              role="group"
              aria-label="Filter by block activity"
            >
              <span className="filter-label">Activity</span>
              {(["all", "low", "medium", "high"] as Filter[]).map((value) => (
                <button
                  key={value}
                  className={`filter ${filter === value ? "selected" : ""}`}
                  aria-pressed={filter === value}
                  onClick={() => changeFilter(value)}
                >
                  {value !== "all" && <Level level={value} />}
                  {value === "all"
                    ? "All blocks"
                    : value[0].toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
            <span className="chart-hint">One block. One pulse.</span>
          </div>
          <div className="chart-area">
            {!ready ? (
              <div className="chart-loading" role="status">
                <Icon name="wave" size={42} />
                <strong>
                  {feed.busy
                    ? "Tuning into Ethereum…"
                    : "Waiting for the network"}
                </strong>
                <p>
                  {feed.busy
                    ? "Loading the most recent 50 blocks."
                    : "Retry the live connection to load blocks."}
                </p>
              </div>
            ) : (
              <>
                <div className="chart-caption">
                  <span>
                    <span className="tiny-dot" />
                    {replay
                      ? "Replay sequence"
                      : feed.connection === "sample"
                        ? "Saved block sequence"
                        : "Block activity"}
                  </span>
                  <span className="mono">
                    {filter === "all" ? "50 / 50" : `${visible.length} / 50`}{" "}
                    blocks
                  </span>
                </div>
                <svg
                  className="rhythm-chart"
                  viewBox="0 0 1200 240"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`Activity pulses for ${blocks.length} blocks. Taller and brighter pulses indicate more transactions and gas. Use the block selector below for details.`}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    inspect(
                      Math.min(
                        49,
                        Math.max(
                          0,
                          Math.floor(
                            ((event.clientX - rect.left) / rect.width) * 50,
                          ),
                        ),
                      ),
                    );
                  }}
                >
                  <defs>
                    <pattern
                      id="grid"
                      width="24"
                      height="40"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M24 0H0V40"
                        fill="none"
                        stroke="#1b2823"
                        strokeWidth=".65"
                        strokeDasharray="2 5"
                      />
                    </pattern>
                    <linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop stopColor="#b8f9da" />
                      <stop offset=".5" stopColor="#8cedbb" />
                      <stop offset="1" stopColor="#4c8b6a" />
                    </linearGradient>
                  </defs>
                  <rect width="1200" height="240" fill="url(#grid)" />
                  <line
                    x1="0"
                    x2="1200"
                    y1="120"
                    y2="120"
                    stroke="#3b5949"
                    strokeWidth="1"
                  />
                  {blocks.map((block, i) => {
                    const height = 20 + intensity(block) * 182;
                    const active = i === currentIndex;
                    const match = matches(block, filter);
                    return (
                      <g
                        key={block.number}
                        className={`beat ${active ? "beat-active" : ""} ${match ? "" : "beat-filtered"}`}
                        data-activity={activity(block)}
                        opacity={match ? 1 : 0.13}
                      >
                        {active && (
                          <rect
                            x={i * 24}
                            y="0"
                            width="24"
                            height="240"
                            fill="#9cf6c9"
                            opacity=".06"
                          />
                        )}
                        {[0.46, 0.83, 1, 0.64].map((factor, j) => (
                          <rect
                            key={j}
                            x={i * 24 + j * 5 + 2}
                            y={120 - (height * factor) / 2}
                            width="3"
                            height={height * factor}
                            rx="1.5"
                            fill="url(#wave-fill)"
                            opacity={0.45 + intensity(block) * 0.55}
                          />
                        ))}
                        {active && (
                          <>
                            <line
                              x1={i * 24 + 12}
                              x2={i * 24 + 12}
                              y1="0"
                              y2="240"
                              stroke="#c0ffe0"
                              strokeWidth="1"
                              strokeDasharray="2 4"
                            />
                            <circle
                              cx={i * 24 + 12}
                              cy="120"
                              r="4"
                              fill="#e3fff1"
                            />
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
                <div className="chart-axis mono">
                  <span>
                    #{formatNumber(blocks[0].number)}
                    <span className="axis-secondary">
                      {formatTime(blocks[0].timestamp)} UTC
                    </span>
                  </span>
                  <span className="time-direction">
                    Earlier <span className="axis-arrow">⟶</span> Latest
                  </span>
                  <span>
                    #{formatNumber(blocks[49].number)}
                    <span className="axis-secondary">
                      {formatTime(blocks[49].timestamp)} UTC
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="playback-controls">
            <div className="playback-actions">
              <button
                className="primary-button"
                onClick={togglePlayback}
                disabled={!ready}
              >
                <Icon name={playing ? "pause" : "play"} size={17} />
                {playing
                  ? "Pause playback"
                  : replay
                    ? cursor === 49
                      ? "Replay again"
                      : "Resume playback"
                    : "Play last 50"}
              </button>
              <button
                className="icon-button"
                title="Restart playback"
                aria-label="Restart playback"
                disabled={!ready}
                onClick={() => {
                  setReplay([...blocks]);
                  setCursor(0);
                  setPlaying(false);
                }}
              >
                <Icon name="reset" />
              </button>
            </div>
            <div className="scrubber">
              <label htmlFor="block-position" className="sr-only">
                Select block in timeline
              </label>
              <input
                id="block-position"
                type="range"
                min="0"
                max="49"
                value={progress}
                disabled={!ready}
                onChange={(event) => inspect(Number(event.target.value))}
                aria-valuetext={
                  current
                    ? `Block ${current.number}, ${current.transactions} transactions, ${activity(current)} activity`
                    : "Loading blocks"
                }
                style={
                  { "--progress": `${(progress / 49) * 100}%` } as CSSProperties
                }
              />
              <span className="playback-count mono">
                {replay
                  ? `${String(cursor + 1).padStart(2, "0")} / 50`
                  : "50 blocks"}
              </span>
            </div>
            <div className="playback-options">
              <label className="speed-label" htmlFor="playback-speed">
                Speed
              </label>
              <select
                id="playback-speed"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                aria-label="Playback speed"
              >
                <option value=".5">0.5×</option>
                <option value="1">1×</option>
                <option value="2">2×</option>
                <option value="4">4×</option>
              </select>
              {replay ? (
                <button
                  className="text-button return-live"
                  onClick={returnToLive}
                >
                  <span className="status-dot" />
                  {feed.connection === "sample"
                    ? "Back to sample"
                    : "Back to live"}
                </button>
              ) : (
                <span className="visual-only">
                  <Icon name="wave" size={15} />
                  Visual playback
                </span>
              )}
            </div>
          </div>
          {current && (
            <div
              className="block-inspector"
              role="group"
              aria-label="Selected block details"
            >
              <div className="inspector-block">
                <Icon name="cube" size={17} />
                <span>
                  Block{" "}
                  <strong className="mono">
                    #{formatNumber(current.number)}
                  </strong>
                </span>
              </div>
              <div className="inspector-stat">
                <strong className="mono">
                  {formatNumber(current.transactions)}
                </strong>{" "}
                transactions
              </div>
              <div className="inspector-stat">
                <strong className="mono">{gasMillions(current.gasUsed)}</strong>{" "}
                gas used
              </div>
              <span className={`activity-badge activity-${activity(current)}`}>
                <Level level={activity(current)} />
                {activity(current)} activity
              </span>
              <a
                className="explorer-link"
                href={`https://etherscan.io/block/${current.number}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`View block ${current.number} on Etherscan (opens in a new tab)`}
              >
                <span>View block</span>
                <Icon name="external" size={14} />
              </a>
            </div>
          )}
          {reducedMotion && (
            <p className="motion-note">
              Reduced motion is on. Playback advances the selection without
              animated transitions.
            </p>
          )}
        </section>

        <div className="lower-grid">
          <section className="recent panel" aria-labelledby="recent-title">
            <div className="panel-heading">
              <div className="heading-with-status">
                <h2 id="recent-title">Recent blocks</h2>
                <span className="count-pill">{visible.length}</span>
              </div>
              <span className="subtle-label">
                {replay ? "Replay snapshot" : "Latest first"}
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Block</th>
                    <th scope="col">Transactions</th>
                    <th scope="col">Gas used</th>
                    <th scope="col">Activity</th>
                    <th scope="col">
                      <span className="sr-only">Select block</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.slice(0, showAll ? 50 : 5).map((block) => (
                    <tr
                      key={block.number}
                      className={
                        current?.number === block.number ? "row-selected" : ""
                      }
                    >
                      <td>
                        <button
                          className="block-number mono"
                          onClick={() => inspect(blocks.indexOf(block))}
                        >
                          #{formatNumber(block.number)}
                        </button>
                        <span className="row-time">
                          {formatTime(block.timestamp)} UTC
                        </span>
                      </td>
                      <td className="mono">
                        {formatNumber(block.transactions)}
                        <span className="cell-unit"> txns</span>
                      </td>
                      <td className="mono">
                        {gasMillions(block.gasUsed)}
                        <span className="gas-meter" aria-hidden="true">
                          <i
                            style={{
                              width: `${(block.gasUsed / block.gasLimit) * 100}%`,
                            }}
                          />
                        </span>
                      </td>
                      <td>
                        <span
                          className={`activity-badge activity-${activity(block)}`}
                        >
                          <Level level={activity(block)} />
                          {activity(block)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="row-select icon-button"
                          aria-label={`Inspect block ${block.number}`}
                          onClick={() => inspect(blocks.indexOf(block))}
                        >
                          <Icon name="chevron" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.length && (
              <div className="empty-state">
                <Icon name="wave" size={30} />
                <p>
                  {ready
                    ? `No ${filter} activity blocks in this window.`
                    : "Recent blocks will appear here."}
                </p>
                {ready && (
                  <button
                    className="text-button"
                    onClick={() => changeFilter("all")}
                  >
                    Show all activity
                  </button>
                )}
              </div>
            )}
            <div className="table-footer">
              <span role="status">
                Showing {Math.min(visible.length, showAll ? 50 : 5)} of{" "}
                {visible.length} blocks
              </span>
              {visible.length > 5 && (
                <button
                  className="text-button"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll
                    ? "Show fewer blocks"
                    : `View all ${visible.length} blocks`}
                  <Icon name="arrow" size={15} />
                </button>
              )}
            </div>
          </section>
          <aside
            className="guide panel"
            id="how-it-works"
            aria-labelledby="guide-title"
          >
            <div className="guide-heading">
              <span className="guide-icon">
                <Icon name="wave" size={23} />
              </span>
              <span className="eyebrow">Behind the beat</span>
            </div>
            <h2 id="guide-title">Read the rhythm.</h2>
            <p>
              Each pulse is an Ethereum block. Its height and brightness reflect
              how much happened inside.
            </p>
            <div className="activity-key">
              <div>
                <Level level="low" />
                <strong>Low activity</strong>
                <span>A quieter moment</span>
              </div>
              <div>
                <Level level="medium" />
                <strong>Medium activity</strong>
                <span>A steady flow</span>
              </div>
              <div>
                <Level level="high" />
                <strong>High activity</strong>
                <span>The network in full swing</span>
              </div>
            </div>
            <div className="guide-note">
              <Icon name="info" size={16} />
              <p>
                More transactions + more gas = a stronger beat. Select any pulse
                to explore its block.
              </p>
            </div>
            <details>
              <summary>
                How activity is measured
                <Icon name="chevron" size={14} />
              </summary>
              <p>
                Activity combines transaction count (up to 400) and total gas
                used (up to 30 million), weighted equally. Low is below 35%,
                medium is 35–65%, and high is 65% or above. These are visual
                reference levels, not network capacity limits.
              </p>
              <p>
                Filters dim other pulses to preserve the timeline and narrow the
                recent block list. Playback steps through all 50 blocks at a
                compressed, regular pace; it is silent.
              </p>
            </details>
          </aside>
        </div>
        <footer className="site-footer">
          <span className="footer-brand">
            <Icon name="wave" size={19} />
            Block by block. Beat by beat.
          </span>
          <span className="footer-source">
            <span
              className={`status-dot ${feed.connection === "live" ? "" : "inactive"}`}
            />
            {feed.connection === "live"
              ? `Updated ${elapsed}s ago · ${feed.provider}`
              : feed.connection === "sample"
                ? "Saved sample · live connection unavailable"
                : label}
          </span>
          <span>Built for the curious.</span>
        </footer>
      </main>
    </>
  );
}
export default App;
