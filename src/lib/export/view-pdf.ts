import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/** Render one block at a time to avoid mobile canvas limits on long reports. */
export async function exportViewPdf() {
  const main = document.querySelector("main");
  if (!main || main.getAttribute("aria-busy") === "true" || Array.from(main.querySelectorAll('[aria-busy="true"]')).some(node => !node.closest('[data-export-ignore]'))) {
    throw new Error("The current view is still loading.");
  }
  await document.fonts.ready;
  const frame = document.createElement("iframe");
  frame.title = "Προετοιμασία αναφοράς PDF";
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:-12000px;top:0;width:1000px;height:1000px;border:0;pointer-events:none";
  document.body.append(frame);
  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error("Cannot prepare PDF view");
    // Keep the font-variable class and only styles; application scripts are not part of a report.
    doc.documentElement.className = document.documentElement.className;
    document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => doc.head.append(doc.importNode(node, true)));
    doc.body.append(doc.importNode(main, true));
    const root = doc.querySelector("main")!;
    const liveFields = main.querySelectorAll("input,select,textarea");
    root.querySelectorAll("input,select,textarea").forEach((node,index) => {
      const source = liveFields[index] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const target = node as typeof source;
      if (source.type !== "file") target.value = source.value;
      if (source instanceof HTMLInputElement && target.tagName === "INPUT") (target as HTMLInputElement).checked = source.checked;
    });
    doc.querySelectorAll("[data-export-ignore], button, nav").forEach(node => node.remove());
    doc.querySelectorAll("details").forEach(node => { node.open = true; });
    const style = doc.createElement("style");
    style.textContent = `* { animation:none!important; transition:none!important; }
      html,body,main { height:auto!important; min-height:0!important; overflow:visible!important; }
      main { display:block!important; background:#f6f8f7!important; }
      main > header { height:76px!important; }
      main > div { width:936px!important; margin:0 auto!important; padding:24px 0!important; }
      [class*="profileBoard"], [class*="stepCard"] { min-height:0!important; }
      [class*="stepCard"] { overflow:visible!important; }
      [class*="resultsGrid"] { display:block!important; }
      [class*="recommendationCard"] { margin:20px 0!important; }
      [class*="cardActions"], [class*="footerActions"], [class*="finalCta"], [class*="backLink"] { display:none!important; }
      [class*="profileBoard"]::before,[class*="profileBoard"]::after { display:none!important; }`;
    doc.head.append(style);
    await Promise.all(Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(link => new Promise<void>(resolve => {
      if ((link as HTMLLinkElement).sheet) return resolve();
      link.addEventListener("load", () => resolve(), { once: true });
      link.addEventListener("error", () => resolve(), { once: true });
      setTimeout(resolve, 5000);
    })));
    await doc.fonts.ready;
    await Promise.all(Array.from(doc.images).map(img => img.decode().catch(() => undefined)));
    // Give percentage-sized SVG assets explicit raster dimensions for canvas engines.
    for (const img of Array.from(doc.images)) {
      if (!img.complete || !img.naturalWidth || !/\.svg(?:[?#]|$)/i.test(img.currentSrc || img.src)) continue;
      const bounds = img.getBoundingClientRect();
      if (!bounds.width || !bounds.height) continue;
      const raster = doc.createElement("canvas");
      raster.width = Math.ceil(bounds.width * 2); raster.height = Math.ceil(bounds.height * 2);
      raster.getContext("2d")!.drawImage(img, 0, 0, raster.width, raster.height);
      img.removeAttribute("srcset"); img.src = raster.toDataURL("image/png");
      await img.decode();
    }
    // Export input values as text so selects and typed values survive canvas rendering.
    doc.querySelectorAll("input:not([type=radio]):not([type=checkbox]):not([type=file]), select, textarea").forEach(node => {
      const original = node as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const span = doc.createElement("span");
      span.textContent = original.tagName === "SELECT"
        ? (original as HTMLSelectElement).selectedOptions[0]?.textContent ?? "—" : original.value || "—";
      span.style.cssText = "display:block;padding:12px;border:1px solid #d4e3ea;border-radius:8px;background:white";
      node.replaceWith(span);
    });
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    pdf.setProperties({ title: document.querySelector("h1")?.textContent ?? "InsuranceMarket advisory", creator: "InsuranceMarket Health Advisor" });
    const blocks: HTMLElement[] = [];
    function collect(element: HTMLElement) {
      // Split tall layout wrappers, keeping cards and their text together where possible.
      const rect = element.getBoundingClientRect();
      if ((rect.height > 1100 || element.matches('[class*="stage"]')) && element.children.length >= 1) {
        Array.from(element.children).forEach(child => { if (child.nodeType === 1) collect(child as HTMLElement); });
      } else if (rect.height > 0 && rect.width > 0) blocks.push(element);
    }
    Array.from(root.children).forEach(child => collect(child as HTMLElement));
    let y = 12;
    for (const block of blocks) {
      const canvas = await html2canvas(block, { scale: 1.5, backgroundColor: "#f6f8f7", useCORS: true, logging: false, windowWidth: 1000 });
      if (!canvas.width || !canvas.height) continue;
      const width = 186;
      const ratio = width / canvas.width;
      const height = canvas.height * ratio;
      if (height <= 265 && y + height > 281) { pdf.addPage(); y = 12; }
      let offset = 0;
      while (offset < canvas.height) {
        const available = Math.floor((281 - y) / ratio);
        if (available < 40) { pdf.addPage(); y = 12; continue; }
        let sliceHeight = Math.min(available, canvas.height - offset);
        // Prefer whitespace between text lines when a long block crosses a page.
        if (offset + sliceHeight < canvas.height) {
          const ctx = canvas.getContext("2d")!;
          for (let row = offset + sliceHeight - 1; row > offset + sliceHeight - 75; row--) {
            const pixels = ctx.getImageData(0, row, canvas.width, 1).data;
            let dark = 0;
            for (let x = 0; x < pixels.length; x += 4) if (pixels[x] < 150 && pixels[x + 1] < 150 && pixels[x + 2] < 150) dark++;
            if (dark < 3) { sliceHeight = row - offset; break; }
          }
        }
        const slice = doc.createElement("canvas");
        slice.width = canvas.width; slice.height = sliceHeight;
        slice.getContext("2d")!.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        pdf.addImage(slice.toDataURL("image/png"), "PNG", 12, y, width, sliceHeight * ratio);
        y += sliceHeight * ratio + 4;
        offset += sliceHeight;
        slice.width = slice.height = 0;
        if (offset < canvas.height) { pdf.addPage(); y = 12; }
      }
      canvas.width = canvas.height = 0;
    }
    for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
      pdf.setPage(page); pdf.setFontSize(8); pdf.setTextColor(88, 112, 112);
      pdf.text(`InsuranceMarket | ${new Date().toISOString().slice(0, 10)}`, 12, 290);
      pdf.text(`${page} / ${pdf.getNumberOfPages()}`, 198, 290, { align: "right" });
    }
    pdf.save(`insurancemarket-${location.pathname.split("/").filter(Boolean).join("-") || "advisor"}-${new Date().toISOString().slice(0, 10)}.pdf`);
  } finally {
    frame.remove();
  }
}
