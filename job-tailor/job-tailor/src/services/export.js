/**
 * Export tailored resume bullets + cover letter to PDF or DOCX.
 * PDF uses jsPDF (CDN). DOCX builds raw XML in a Blob.
 */

// ─── PDF ────────────────────────────────────────────────────────────────────

async function loadJsPDF() {
  if (window.jspdf) return window.jspdf.jsPDF;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.jspdf.jsPDF;
}

/**
 * @param {{ name: string, bullets: string[], coverLetter?: string }} data
 */
export async function exportToPDF({ name = 'Resume', bullets = [], coverLetter = '' }) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: 'pt', format: 'letter' });

  const margin = 60;
  const pageW  = doc.internal.pageSize.getWidth();
  const maxW   = pageW - margin * 2;
  let y = margin;

  const line = (text, size = 11, bold = false, color = '#f0f0f0') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxW);
    lines.forEach((l) => {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage(); y = margin;
      }
      doc.text(l, margin, y);
      y += size * 1.5;
    });
  };

  doc.setTextColor(240, 240, 240);
  doc.setFillColor(12, 12, 15);
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F');

  line(name, 20, true);
  y += 10;

  if (bullets.length) {
    line('Tailored Resume Bullets', 13, true);
    y += 4;
    bullets.forEach((b) => {
      line(`• ${b}`, 11);
      y += 4;
    });
  }

  if (coverLetter) {
    y += 16;
    line('Cover Letter', 13, true);
    y += 4;
    line(coverLetter, 11);
  }

  doc.save('jobtailor-export.pdf');
}

// ─── DOCX ───────────────────────────────────────────────────────────────────

/**
 * Minimal DOCX builder — pure XML, no deps.
 */
export function exportToDOCX({ name = 'Resume', bullets = [], coverLetter = '' }) {
  const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const para = (text, bold = false, size = 22) => `
    <w:p>
      <w:pPr><w:spacing w:after="120"/></w:pPr>
      <w:r>
        <w:rPr>
          ${bold ? '<w:b/>' : ''}
          <w:sz w:val="${size}"/>
          <w:szCs w:val="${size}"/>
        </w:rPr>
        <w:t xml:space="preserve">${esc(text)}</w:t>
      </w:r>
    </w:p>`;

  const bulletPara = (text) => `
    <w:p>
      <w:pPr>
        <w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>
        <w:spacing w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
        <w:t xml:space="preserve">${esc(text)}</w:t>
      </w:r>
    </w:p>`;

  const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

  const bodyContent = [
    para(name, true, 32),
    bullets.length ? para('Tailored Resume Bullets', true, 26) : '',
    ...bullets.map(bulletPara),
    coverLetter ? para('Cover Letter', true, 26) : '',
    coverLetter ? para(coverLetter, false, 22) : '',
  ].join('\n');

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyContent}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="22"/><w:szCs w:val="22"/>
    </w:rPr></w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml"  ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;

  const topRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  // Build zip using JSZip (loaded from CDN if needed)
  return loadJSZip().then((JSZip) => {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', contentTypes);
    zip.file('_rels/.rels', topRels);
    zip.file('word/document.xml', document);
    zip.file('word/styles.xml', styles);
    zip.file('word/numbering.xml', numbering);
    zip.file('word/_rels/document.xml.rels', rels);
    return zip.generateAsync({ type: 'blob' });
  }).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: 'jobtailor-export.docx' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.JSZip;
}
