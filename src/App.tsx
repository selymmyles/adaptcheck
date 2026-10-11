import { useState } from "react";
import UploadScreen from "./components/UploadScreen";
import AnalyzingView from "./components/AnalyzingView";
import ResultsScreen from "./components/ResultsScreen";
import DirectionSelector from "./components/DirectionSelector";
import {
  analyzeDesign,
  type AnalysisResult,
  type DirectionRequest,
} from "./lib/mockAnalysis";

type Phase = "upload" | "analyzing" | "results";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function App() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [directionRequest, setDirectionRequest] =
    useState<DirectionRequest>("auto");

  const handleAnalyze = async (file: File) => {
    setFileName(file.name);
    setError(null);
    setPhase("analyzing");
    try {
      // BACKEND: POSTs the screenshot + direction to the worker (/api/analyze).
      // The staged UI needs a beat to read well even on fast networks.
      const [res] = await Promise.all([
        analyzeDesign(file, directionRequest),
        delay(1500),
      ]);
      setResult(res);
      setPhase("results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Analysis failed. Please try again.",
      );
      setPhase("upload");
    }
  };

  const handleReset = () => {
    setPhase("upload");
    setResult(null);
    setFileName("");
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
                Upload an app screenshot and get a prioritized checklist of
                everything to change when porting between iOS and Android —
                navigation, components, typography, motion, and more.
              </p>
            </div>
            {error && (
              <div
                className="mx-auto mb-6 w-full max-w-xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                role="alert"
              >
                <div className="flex items-start justify-between gap-3">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="shrink-0 font-medium underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            <DirectionSelector
              value={directionRequest}
              onChange={setDirectionRequest}
            />
            <UploadScreen onAnalyze={handleAnalyze} />
          </>
        )}

        {phase === "analyzing" && (
          <AnalyzingView fileName={fileName} directionRequest={directionRequest} />
        )}

        {phase === "results" && result && (
          <ResultsScreen
            result={result}
            fileName={fileName}
            onReset={handleReset}
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
