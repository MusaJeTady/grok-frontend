import { useState, useCallback } from "react";
import { textToImage } from "../lib/grokApi";
import { getDownloadFilename } from "../lib/downloadUtils";

export default function TextToImage() {
  const [prompt, setPrompt] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numImages, setNumImages] = useState(1);

  const submit = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultUrl(null);

    try {
      // ← zde přidáno numImages jako druhý parametr
      const url = await textToImage(prompt.trim(), numImages);
      setResultUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [prompt, numImages]);   // ← přidáno numImages do závislostí

  return (
    <div className="page">
      <div className="page-header">
        <h1>Text to Image</h1>
        <p className="subtitle">
          Describe an image. The model generates it from your prompt.
        </p>

        {/* Pole pro počet obrázků – už opravené */}
        <div style={{ margin: "15px 0", display: "flex", alignItems: "center", gap: "12px" }}>
          <label htmlFor="numImages" style={{ fontWeight: "bold" }}>
            Počet obrázků (1–4):
          </label>
          <input
            id="numImages"
            type="number"
            min="1"
            max="4"
            value={numImages}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setNumImages(isNaN(val) ? 1 : Math.max(1, Math.min(4, val)));
            }}
            style={{ width: "70px", padding: "8px", fontSize: "16px" }}
          />
        </div>
      </div>

      {resultUrl && (
        <div className="result result-on-top">
          <img src={resultUrl} alt="Generated" className="result-img" />
          <a
            href={resultUrl}
            download={getDownloadFilename(resultUrl)}
            className="download-link"
          >
            ↓ Download image
          </a>
        </div>
      )}

      <div className="form-card">
        <div className="form">
          <label className="block">
            <span>Prompt</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A collage of London landmarks in a stenciled street-art style"
              rows={4}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
            />
          </label>

          <button
            type="button"
            className="primary-button"
            onClick={submit}
            disabled={loading || !prompt.trim()}
          >
            {loading ? (
              <>
                <span className="spinner" /> Generating…
              </>
            ) : (
              "Generate image"
            )}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
