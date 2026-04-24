import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import JSZip from "jszip";

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido" });
    }

    try {
        const { htmlCliente, htmlControle } = req.body;

        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });

        const page = await browser.newPage();

        // PDF CLIENTE
        await page.setContent(htmlCliente, { waitUntil: "networkidle0" });
        const pdfCliente = await page.pdf({ format: "A4" });

        // PDF CONTROLE
        await page.setContent(htmlControle, { waitUntil: "networkidle0" });
        const pdfControle = await page.pdf({ format: "A4" });

        await browser.close();

        // ZIP
        const zip = new JSZip();
        zip.file("orcamento_cliente.pdf", pdfCliente);
        zip.file("controle_interno.pdf", pdfControle);

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", "attachment; filename=orcamentos.zip");

        return res.status(200).send(zipBuffer);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao gerar PDFs" });
    }
}