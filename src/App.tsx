import { useRef, useState } from "react";
import UploadScreen from "./components/UploadScreen";
import AnalyzingView from "./components/AnalyzingView";
import ResultsScreen, { type ResultItem } from "./components/ResultsScreen";
import { analyzeDesign, type AnalysisResult } from "./lib/mockAnalysis";

type Phase = "upload" | "analyzing" | "results";

/** Max concurrent /api/analyze calls — paid Tier 1 quotas are generous. */
const MAX_CONCURRENT = 4;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function App() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [items, setItems] = useState<ResultItem[]>([]);
  // Platform is always auto-detected per screenshot — no toggle.
  const directionRequest = "auto" as const;
  const filesRef = useRef<File[]>([]);

  const markItem = (
    index: number,
    patch: Partial<ResultItem>,
  ) =>
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, ...patch } : it)),
    );

  const analyzeOne = async (index: number, file: File) => {
    markItem(index, { status: "analyzing", error: undefined });
    // One automatic retry: the AI service flakes (dropped connections,
    // timeouts) often enough that a single retry saves most failures.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result: AnalysisResult = await analyzeDesign(
          file,
          directionRequest,
        );
        markItem(index, { status: "done", result, error: undefined });
        return;
      } catch (err) {
        if (attempt === 0) {
          await delay(3000);
          continue;
        }
        markItem(index, {
          status: "error",
          error:
            err instanceof Error ? err.message : "Analysis failed. Please try again.",
        });
      }
    }
  };

  const handleAnalyze = async (files: File[]) => {
    filesRef.current = files;
    setItems(
      files.map((file) => ({
        fileName: file.name,
        imageUrl: URL.createObjectURL(file),
        status: "queued" as const,
      })),
    );
    setPhase("analyzing");
    // The staged UI needs a beat to read well even on fast networks.
    await delay(800);

    let next = 0;
    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENT, files.length) },
      async () => {
        while (true) {
          const i = next;
          next += 1;
          if (i >= files.length) return;
          await analyzeOne(i, files[i]);
        }
      },
    );
    await Promise.all(workers);
    setPhase("results");
  };

  const handleRetry = (index: number) => {
    const file = filesRef.current[index];
    if (file) void analyzeOne(index, file);
  };

  const handleReset = () => {
    setPhase("upload");
    setItems((prev) => {
      for (const it of prev) URL.revokeObjectURL(it.imageUrl);
      return [];
    });
    filesRef.current = [];
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-lg font-bold text-white"
            aria-hidden="true"
          >
            A
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-stone-900">
              Janus
            </p>
            <p className="text-xs text-stone-500">
              See your design through the other platform's eyes.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {phase === "upload" && (
          <>
            <div className="mx-auto mb-8 max-w-xl text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
                Will your design survive the other platform?
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-stone-600">
                Upload up to 10 app screenshots and get a checklist of
                everything to change when porting between iOS and Android —
                navigation, components, typography, motion, and more.
              </p>
            </div>
            <UploadScreen onAnalyze={handleAnalyze} />
          </>
        )}

        {phase === "analyzing" && (
          <AnalyzingView items={items} />
        )}

        {phase === "results" && (
          <ResultsScreen
            items={items}
            onReset={handleReset}
            onRetry={handleRetry}
          />
        )}
      </main>

      <footer className="border-t border-stone-200">
        <p className="mx-auto max-w-5xl px-4 py-5 text-xs text-stone-400 sm:px-6">
          Screenshots are sent securely to our AI analysis service and are
          never stored. Janus prototype.
        </p>
      </footer>
    </div>
  );
}
