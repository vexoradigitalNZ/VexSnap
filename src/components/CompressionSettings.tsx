import type { Compression, Preset } from "@/lib/photo";

type Props = {
  preset: Preset;
  custom: Compression;
  busy: boolean;
  actualSize: number | null;
  onPreset: (preset: Preset) => void;
  onCustom: (config: Compression) => void;
  onCalculate: () => void;
};

export function CompressionSettings({
  preset,
  custom,
  busy,
  actualSize,
  onPreset,
  onCustom,
  onCalculate,
}: Props) {
  return (
    <section className="section" aria-labelledby="compression-title">
      <div className="eyebrow">02 / MAKE THEM LIGHTER</div>
      <h2 id="compression-title">Choose a size</h2>
      <p>
        We resize large photos and make smaller JPEG copies. Smaller photos are
        never enlarged.
      </p>
      <div className="preset-grid">
        {(["small", "balanced", "high", "custom"] as Preset[]).map((option) => (
          <button
            key={option}
            className={`preset ${preset === option ? "selected" : ""}`}
            aria-pressed={preset === option}
            onClick={() => onPreset(option)}
            disabled={!!busy}
          >
            <strong>
              {option === "high"
                ? "High Quality"
                : option[0].toUpperCase() + option.slice(1)}
            </strong>
            <span>
              {option === "small"
                ? "Best for sharing"
                : option === "balanced"
                  ? "A little of both"
                  : option === "high"
                    ? "More detail"
                    : "Set your own"}
            </span>
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="custom-controls">
          <label>
            JPEG quality <strong>{Math.round(custom.quality * 100)}%</strong>
            <input
              type="range"
              min="40"
              max="95"
              value={Math.round(custom.quality * 100)}
              onChange={(event) =>
                onCustom({
                  ...custom,
                  quality: Number(event.target.value) / 100,
                })
              }
            />
          </label>
          <label>
            Longest side <strong>{custom.maxDimension}px</strong>
            <input
              type="range"
              min="640"
              max="6000"
              step="160"
              value={custom.maxDimension}
              onChange={(event) =>
                onCustom({
                  ...custom,
                  maxDimension: Number(event.target.value),
                })
              }
            />
          </label>
        </div>
      )}
      <button
        className="button secondary compress-button"
        disabled={!!busy}
        onClick={onCalculate}
      >
        {actualSize === null
          ? "Calculate compressed size"
          : "Recalculate compressed size"}
      </button>
    </section>
  );
}
