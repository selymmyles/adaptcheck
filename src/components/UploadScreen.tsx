import { useRef, useState } from "react";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface UploadScreenProps {
  onAnalyze: (file: File) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadScreen({ onAnalyze }: UploadScreenProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (candidate: File | null | undefined) => {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError("Please upload a PNG or JPG screenshot.");
      return;
    }
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
  };

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload an iOS screenshot"
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
          pickFile(e.dataTransfer.files[0]);
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
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
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
          Drop your iOS screenshot here
        </p>
        <p className="mt-1 text-sm text-stone-500">
          or <span className="font-medium text-teal-700 underline">browse files</span> — PNG or JPG
        </p>
      </div>

      {error && (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}

      {file && preview && (
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4">
          <img
            src={preview}
            alt="Screenshot preview"
            className="h-24 w-auto rounded-lg border border-stone-200 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900">
              {file.name}
            </p>
            <p className="text-sm text-stone-500">{formatSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          >
            Remove
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={!file}
        onClick={() => file && onAnalyze(file)}
        className="mt-6 w-full rounded-xl bg-teal-700 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
      >
        Analyze design
      </button>
      <p className="mt-3 text-center text-xs text-stone-400">
        Screenshots are sent securely for AI analysis and are never stored.
      </p>
    </div>
  );
}
