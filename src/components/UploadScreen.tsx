import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILES = 10;

interface UploadScreenProps {
  onAnalyze: (files: File[]) => void;
}

interface PickedFile {
  file: File;
  preview: string;
}

/**
 * Downscales an image to max 1024px on the longest edge via canvas.
 * UI analysis doesn't need full resolution; smaller images upload and
 * process much faster. Returns the original file if already small enough.
 */
async function downscaleImage(file: File, maxDim = 1024): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // The browser can't decode this file (e.g. HEIC bytes behind a .jpg
    // name). Never drop it silently and never upload a guess — hand the
    // original to the server, which will either read it or error honestly.
    return file;
  }
  const { width, height } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // Blank guard: some decoders "succeed" but draw nothing (uniform canvas).
  // A real screenshot always has luminance range — text, icons, chrome.
  // If the canvas is effectively one flat color, keep the original file
  // instead of uploading a blank image that would fake a "native" verdict.
  try {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let min = 255;
    let max = 0;
    for (let i = 0; i < data.length; i += 1604) {
      const lum = data[i];
      if (lum < min) min = lum;
      if (lum > max) max = lum;
      if (max - min >= 8) break;
    }
    if (max - min < 8) return file;
  } catch {
    // Pixel read blocked — proceed with the downscale as before.
  }
  if (scale >= 1) return file;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) return file;
  const name = file.name.replace(/\.(png|webp)$/i, ".jpg");
  return new File([blob], name, { type: "image/jpeg" });
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
    // Downscale to max 1024px before upload: UI analysis doesn't need
    // full resolution, and smaller images upload + process much faster.
    void (async () => {
      // Per-file isolation: one undecodable image must not kill the batch.
      const downscaled = await Promise.all(
        valid.map(async (f) => {
          try {
            return await downscaleImage(f);
          } catch {
            return f;
          }
        }),
      );
      setPicked((prev) => {
        const room = MAX_FILES - prev.length;
        if (room <= 0) {
          setError(`Up to ${MAX_FILES} screenshots per batch.`);
          return prev;
        }
        const accepted = downscaled.slice(0, room);
        if (downscaled.length > accepted.length) {
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
    })();
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
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${
          picked.length > 0 ? "py-6" : "py-12"
        } ${
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
        {picked.length === 0 ? (
          <>
            <Upload
              className="mb-4 h-10 w-10 text-stone-400"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-base font-medium text-stone-900">
              Drop your screenshots here
            </p>
            <p className="mt-1 text-sm text-stone-500">
              or <span className="font-medium text-teal-700 underline">browse files</span> — PNG or JPG, up to {MAX_FILES}
            </p>
          </>
        ) : (
          <>
            <ul className="grid w-full grid-cols-5 gap-3">
              {picked.map((p, i) => (
                <li
                  key={`${p.file.name}-${i}`}
                  className="group relative overflow-hidden rounded-xl border border-stone-200 bg-white"
                >
                  <img
                    src={p.preview}
                    alt={`Screenshot ${i + 1} preview`}
                    className="h-32 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    aria-label={`Remove ${p.file.name}`}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <p
                    className="truncate px-2 py-1.5 text-center text-[11px] text-stone-500"
                    title={p.file.name}
                  >
                    {p.file.name}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-stone-500">
              Drop more, or click to{" "}
              <span className="font-medium text-teal-700 underline">browse</span>{" "}
              — {picked.length} of {MAX_FILES}
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        disabled={picked.length === 0}
        onClick={() => onAnalyze(picked.map((p) => p.file))}
        className="mt-6 h-12 w-full rounded-xl px-6 text-base font-semibold disabled:bg-stone-300 disabled:text-stone-500 disabled:opacity-100"
      >
        {picked.length <= 1
          ? "Analyze screen"
          : `Analyze ${picked.length} screens`}
      </Button>
      <p className="mt-3 text-center text-xs text-stone-400">
        Screenshots are sent securely for AI analysis and are never stored.
      </p>
    </div>
  );
}
