import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Attachment,
  AttachmentActions,
  AttachmentAction,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";

/** The design system the user is trying to match (target-first framing). */
export type DesignTarget = "auto" | "ios" | "android";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILES = 10;

interface UploadScreenProps {
  onAnalyze: (files: File[]) => void;
  target: DesignTarget;
  onTargetChange: (target: DesignTarget) => void;
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

export default function UploadScreen({
  onAnalyze,
  target,
  onTargetChange,
}: UploadScreenProps) {
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
      {/* Target picker (founder-directed 2026-10-13): the user names the
          design system they are matching BEFORE analysis — a screen that
          is halfway converted cannot be auto-detected honestly. Stock
          ToggleGroup, single-select; a click on the active item would
          deselect it, so empty changes are ignored (a target is always
          chosen). */}
      <div className="mb-4 flex flex-col items-start gap-2">
        <p
          id="design-target-label"
          className="text-sm font-medium text-foreground"
        >
          Designing for
        </p>
        <ToggleGroup
          variant="outline"
          spacing={0}
          value={[target]}
          onValueChange={(value) => {
            const next = value[0];
            if (next) onTargetChange(next as DesignTarget);
          }}
          aria-labelledby="design-target-label"
        >
          <ToggleGroupItem value="ios">iOS</ToggleGroupItem>
          <ToggleGroupItem value="android">Android</ToggleGroupItem>
          <ToggleGroupItem value="auto">Auto-detect</ToggleGroupItem>
        </ToggleGroup>
      </div>

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
            ? "border-primary bg-accent"
            : "border-border bg-card hover:border-muted-foreground"
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
              className="mb-4 h-10 w-10 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-base font-medium text-foreground">
              Drop your screenshots here
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              or <span className="font-medium text-primary underline">browse files</span> — PNG or JPG, up to {MAX_FILES}
            </p>
          </>
        ) : (
          <>
                        <div className="flex w-full flex-wrap justify-center gap-3">
              {picked.map((p, i) => (
                <Attachment
                  key={`${p.file.name}-${i}`}
                  orientation="vertical"
                >
                  <AttachmentMedia variant="image">
                    <img
                      src={p.preview}
                      alt={`Screenshot ${i + 1} preview`}
                    />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle title={p.file.name}>
                      {p.file.name}
                    </AttachmentTitle>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                      aria-label={`Remove ${p.file.name}`}
                    >
                      <X aria-hidden="true" />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Drop more, or click to{" "}
              <span className="font-medium text-primary underline">browse</span>{" "}
              — {picked.length} of {MAX_FILES}
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        disabled={picked.length === 0}
        onClick={() => onAnalyze(picked.map((p) => p.file))}
        size="lg"
        className="mt-6 w-full"
      >
        {picked.length <= 1
          ? "Analyze screen"
          : `Analyze ${picked.length} screens`}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Screenshots are sent securely for AI analysis and are never stored.
      </p>
    </div>
  );
}
