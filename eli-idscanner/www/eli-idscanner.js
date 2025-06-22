// eli-idscanner.js (Bundled version with OCR + Parser)

// ========== Vision API OCR ==========
async function runVision(base64Image, apiKey) {
  const payload = {
    requests: [
      {
        image: { content: base64Image.split(",")[1] },
        features: [{ type: "TEXT_DETECTION" }]
      }
    ]
  };

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  const json = await res.json();
  if (!json.responses || !json.responses[0]?.fullTextAnnotation?.text) {
    throw new Error("No text detected");
  }
  return json.responses[0].fullTextAnnotation.text;
}

// ========== Tesseract.js OCR ==========
async function runTesseract(base64Image) {
  if (!window.Tesseract) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/tesseract.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const result = await Tesseract.recognize(base64Image, 'eng');
  return result.data.text;
}

// ========== Aadhaar/DL Text Parser ==========
function parseResult(text) {
  const result = { raw: text, documentType: "unknown" };
  const aadhaarMatch = text.match(/\b\d{4} \d{4} \d{4}\b/);
  const nameMatch = text.match(/(?<=Name[:\s]*)[A-Z ]{3,}/i);
  const dobMatch = text.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/);
  const genderMatch = text.match(/\b(MALE|FEMALE|TRANSGENDER)\b/i);
  const dlMatch = text.match(/\b[A-Z]{2}\d{2} ?\d{11}\b/);

  if (aadhaarMatch) {
    result.documentType = "aadhaar";
    result.aadhaar = aadhaarMatch[0];
    result.name = nameMatch ? nameMatch[0].trim() : "";
    result.dob = dobMatch ? dobMatch[0].replace(/\//g, '-') : "";
    result.gender = genderMatch ? genderMatch[0].toUpperCase() : "";
  } else if (dlMatch) {
    result.documentType = "dl";
    result.dlNumber = dlMatch[0];
    result.name = nameMatch ? nameMatch[0].trim() : "";
    result.dob = dobMatch ? dobMatch[0].replace(/\//g, '-') : "";
  }

  return result;
}

// ========== Plugin Wrapper ==========
const eli_idscanner = (() => {
  const VISION_LIMIT = 999;
  const USAGE_KEY = "eli_vision_usage";
  const TIMESTAMP_KEY = "eli_vision_last_reset";

  function getMonthlyUsage() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastReset = parseInt(localStorage.getItem(TIMESTAMP_KEY) || 0);
    if (lastReset < monthStart) {
      localStorage.setItem(USAGE_KEY, "0");
      localStorage.setItem(TIMESTAMP_KEY, monthStart);
    }
    return parseInt(localStorage.getItem(USAGE_KEY) || 0);
  }

  function incrementUsage() {
    let count = getMonthlyUsage() + 1;
    localStorage.setItem(USAGE_KEY, count);
  }

  async function scan(config) {
    const { image, apiKey, mode = "auto", success, error } = config;
    const usage = getMonthlyUsage();

    try {
      if (mode === "offline") {
        const result = await runTesseract(image);
        success(parseResult(result));
      } else if (mode === "online") {
        const result = await runVision(image, apiKey);
        incrementUsage();
        success(parseResult(result));
      } else {
        if (usage < VISION_LIMIT) {
          try {
            const result = await runVision(image, apiKey);
            incrementUsage();
            success(parseResult(result));
          } catch (e) {
            const result = await runTesseract(image);
            success(parseResult(result));
          }
        } else {
          const result = await runTesseract(image);
          success(parseResult(result));
        }
      }
    } catch (e) {
      error && error(e);
    }
  }

  return { scan };
})();

// export under window.eli
window.eli = window.eli || {};
window.eli.idscan = eli_idscanner.scan;
