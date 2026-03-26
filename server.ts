import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for PDF extraction
  app.post("/api/extract-momo", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const dataBuffer = req.file.buffer;
      const data = await pdf(dataBuffer);
      const text = data.text;

      // Basic Regex for MoMo transactions
      // This is a simplified version and might need tuning for specific statement formats
      // Format: Date (DD-MM-YYYY), Details, Amount, Balance
      const transactions: any[] = [];
      
      // Regex to find potential transaction rows
      // Example: 12-03-2024 Airtime Topup 5,000 15,000
      const lines = text.split('\n');
      
      for (const line of lines) {
        // Match Date (DD-MM-YYYY or DD/MM/YYYY)
        const dateMatch = line.match(/(\d{2}[-/]\d{2}[-/]\d{4})/);
        if (dateMatch) {
          const date = dateMatch[1];
          // Remove date from line to parse rest
          let remaining = line.replace(date, '').trim();
          
          // Match amounts (handle commas)
          const amountMatches = remaining.match(/(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
          
          if (amountMatches && amountMatches.length >= 1) {
            // Usually the last two are amount and balance, or just amount
            const amountStr = amountMatches[0].replace(/,/g, '');
            const amount = parseFloat(amountStr);
            
            const balanceStr = amountMatches.length > 1 ? amountMatches[amountMatches.length - 1].replace(/,/g, '') : "0";
            const balance = parseFloat(balanceStr);
            
            // Details is what's left
            let details = remaining;
            amountMatches.forEach(m => {
              details = details.replace(m, '');
            });
            details = details.trim();

            transactions.push({
              date,
              details,
              amount,
              balance
            });
          }
        }
      }

      res.json({ transactions });
    } catch (error) {
      console.error("PDF Extraction Error:", error);
      res.status(500).json({ error: "Failed to extract data from PDF" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
