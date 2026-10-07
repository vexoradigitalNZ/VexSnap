/* eslint-disable @next/next/no-img-element -- This is a small browser-created blob thumbnail. */
import type { Photo } from "@/lib/photo";

type Props = {
  photo: Photo;
  index: number;
  count: number;
  busy: boolean;
  onPreview: () => void;
  onMove: (nextIndex: number) => void;
  onRotate: (degrees: number) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
};

export function PhotoCard({
  photo,
  index,
  count,
  busy,
  onPreview,
  onMove,
  onRotate,
  onRemove,
  onDragStart,
  onDrop,
  onDragEnd,
}: Props) {
  return (
    <article
      className="photo-card"
      draggable={!busy}
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
    >
      <button
        className="thumbnail"
        onClick={onPreview}
        aria-label={`Preview ${photo.name}`}
      >
        <img
          src={photo.thumbUrl}
          alt={photo.name}
          style={{ transform: `rotate(${photo.rotation}deg)` }}
        />
      </button>
      <div className="card-meta">
        <span className="photo-number">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="file-name" title={photo.name}>
          {photo.name}
        </span>
      </div>
      <div className="card-actions">
        <button
          onClick={() => onMove(index - 1)}
          disabled={busy || index === 0}
          aria-label={`Move ${photo.name} earlier`}
        >
          ←
        </button>
        <button
          onClick={() => onMove(index + 1)}
          disabled={busy || index === count - 1}
          aria-label={`Move ${photo.name} later`}
        >
          →
        </button>
        <button
          onClick={() => onRotate(-90)}
          disabled={busy}
          aria-label={`Rotate ${photo.name} left`}
        >
          ↶
        </button>
        <button
          onClick={() => onRotate(90)}
          disabled={busy}
          aria-label={`Rotate ${photo.name} right`}
        >
          ↷
        </button>
        <button
          onClick={onRemove}
          disabled={busy}
          aria-label={`Remove ${photo.name}`}
        >
          ×
        </button>
      </div>
    </article>
  );
}
