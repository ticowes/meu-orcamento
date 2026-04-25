import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import archiver from "archiver";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { htmlCliente, htmlControle } = req.body;

    if (!htmlCliente || !htmlControle) {
      return res.status(400).json({ error: "HTML não recebido" });
    }

    // 🔥 Detecta ambiente (local vs Vercel)
    const isLocal = !process.env.VERCEL;

    // 🔥 Inicializa Chromium corretamente
    const browser = await puppeteer.launch({
  args: [
    ...chromium.args,
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--single-process",
    "--no-zygote"
  ],
  executablePath: await chromium.executablePath(),
  headless: true,
});

    const page = await browser.newPage();

    // ===== PDF CLIENTE =====
    await page.setContent(htmlCliente, { waitUntil: "networkidle0" });

    const pdfCliente = await page.pdf({
      format: "A4",
      margin: {
        top: "30mm",
        bottom: "25mm",
        left: "20mm",
        right: "20mm",
      },
    });

    // ===== PDF CONTROLE =====
    await page.setContent(htmlControle, { waitUntil: "networkidle0" });

    const pdfControle = await page.pdf({
      format: "A4",
      margin: {
        top: "25mm",
        bottom: "20mm",
        left: "18mm",
        right: "18mm",
      },
    });

    await browser.close();

    // ===== ZIP =====
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=orcamento.zip"
    );

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(res);

    archive.append(pdfCliente, { name: "orcamento.pdf" });
    archive.append(pdfControle, { name: "controle.pdf" });

    await archive.finalize();

  } catch (err) {
    console.error("ERRO:", err);

    return res.status(500).json({
      error: "Erro ao gerar PDFs",
      detalhe: err.message,
    });
  }
}