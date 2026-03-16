import { useState, useCallback } from "react";
import { textToImage } from "../lib/grokApi";
import { getDownloadFilename } from "../lib/downloadUtils";

export default function TextToImage() {
  const [prompt, setPrompt] = useState("");
  const [resultUrls, setResultUrls] = useState<string[]>([]); // ← pole místo jednoho url
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
    setResultUrls([]);

    try {
      const urls = await textToImage(prompt.trim(), numImages);
      setResultUrls(urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [prompt, numImages]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Text to Image</h1>
        <p className="subtitle">
          Describe an image. The model generates it from your prompt.
        </p>

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

      {resultUrls.length > 0 && (
        <div className="result result-on-top" style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
          {resultUrls.map((url, index) => (
            <div key={index} style={{ textAlign: "center" }}>
              <img
                src={url}
                alt={`Generated ${index + 1}`}
                className="result-img"
                style={{ maxWidth: "400px", borderRadius: "8px" }}
              />
              <a
                href={url}
                download={getDownloadFilename(url)}
                className="download-link"
                style={{ display: "block", marginTop: "8px" }}
              >
                ↓ Stáhnout obrázek {index + 1}
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="form-card">
        <div className="form">
          <label className="block">
            <span>Prompt</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="např. Kočka v kosmu s helmou, realistický styl"
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
                <span className="spinner" /> Generuji...
              </>
            ) : (
              "Vygenerovat"
            )}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
