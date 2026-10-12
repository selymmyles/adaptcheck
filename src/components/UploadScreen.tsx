import { useRef, useState } from "react";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILES = 10;

interface UploadScreenProps {
  onAnalyze: (files: File[]) => void;
}

interface PickedFile {
  file: File;
  preview: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadScreen({ onAnalyze }: UploadScreenProps) {
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (candidates: FileList | File[] | null | undefined) => {
    if (!candidates) return;
    const list = Array.from(candidates);
    const valid = list.filter((f) => ACCEPTED_TYPES.includes(f.type));
    if (valid.length < list.length) {
      setError("Only PNG or JPG screenshots — the rest were skipped.");
    } else {
      setError(null);
    }
    setPicked((prev) => {
      const room = MAX_FILES - prev.length;
      if (room <= 0) {
        setError(`Up to ${MAX_FILES} screenshots per batch.`);
        return prev;
      }
      const accepted = valid.slice(0, room);
      if (valid.length > accepted.length) {
        setError(`Up to ${MAX_FILES} screenshots per batch.`);
      }
      return [
        ...prev,
        ...accepted.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        })),
      ];
    });
  };

  const removeFile = (index: number) => {
    setPicked((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
    setError(null);
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload app screenshots"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging
            ? "border-teal-700 bg-teal-50"
            : "border-stone-300 bg-white hover:border-stone-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <svg
          className="mb-4 h-10 w-10 text-stone-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-base font-medium text-stone-900">
          Drop your screenshots here
        </p>
        <p className="mt-1 text-sm text-stone-500">
          or <span className="font-medium text-teal-700 underline">browse files</span> — PNG or JPG, up to {MAX_FILES}
        </p>
      </div>

      {error && (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}

      {picked.length > 0 && (
        <ul className="mt-4 space-y-2">
          {picked.map((p, i) => (
            <li
              key={`${p.file.name}-${i}`}
              className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4"
            >
              <img
                src={p.preview}
                alt={`Screenshot ${i + 1} preview`}
                className="h-24 w-auto rounded-lg border border-stone-200 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-900">
                  {p.file.name}
                </p>
                <p className="text-sm text-stone-500">
                  {formatSize(p.file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={picked.length === 0}
        onClick={() => onAnalyze(picked.map((p) => p.file))}
        className="mt-6 w-full rounded-xl bg-teal-700 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
      >
        {picked.length <= 1
          ? "Analyze screen"
          : `Analyze ${picked.length} screens`}
      </button>
      <p className="mt-3 text-center text-xs text-stone-400">
        Screenshots are sent securely for AI analysis and are never stored.
      </p>
    </div>
  );
}
