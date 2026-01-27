'use client';

export default function TableOfContents({ toc, setToc }: any) {
  const count = toc.trim() ? toc.split('\n').filter((line: string) => line.trim()).length : 0;

  const slugify = (text: string): string => {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  };

  const generateHTML = (format: 'desktop' | 'mobile'): string => {
    const lines = toc.split('\n').map((line: string) => line.trim()).filter((line: string | any[]) => line.length > 0);
    
    if (lines.length === 0) return '';

    // Parse items and extract heading level from markers like (H2), (H3)
    const items: Array<{ text: string; level: number }> = [];

    lines.forEach((line: string) => {
      const match = line.match(/\(H([1-6])\)\s*$/);
      const level = match ? parseInt(match[1]) : 2; // default to H2 if no marker
      const cleanedText = line.replace(/\s*\(H[1-6]\)\s*$/gi, '').trim();
      items.push({ text: cleanedText, level });
    });

    // Build list items HTML based on heading levels
    let listHTML = '';
    let inSubList = false;

    items.forEach((item, idx) => {
      const href = slugify(item.text);
      const linkHTML = `<a href="#${href}">${item.text}</a>`;
      const nextItem = items[idx + 1];

      if (item.level === 2) {
        // Close sub-list if it was open
        if (inSubList) {
          listHTML += '\n</ul>';
          inSubList = false;
        }
        listHTML += `\n<li>${linkHTML}</li>`;

        // Check if next item is H3 - if so, open sub-list
        if (nextItem && nextItem.level === 3) {
          listHTML += '\n<ul class="table-content-sub-list">\n';
          inSubList = true;
        }
      } else if (item.level === 3) {
        // This is a sub-item
        if (!inSubList) {
          listHTML += '\n<ul class="table-content-sub-list">\n';
          inSubList = true;
        }
        listHTML += `\n<li>${linkHTML}</li>`;

        // Check if next item is NOT H3 - if so, close sub-list
        if (!nextItem || nextItem.level !== 3) {
          listHTML += '\n</ul>';
          inSubList = false;
        }
      }
    });

    // Close any open sub-list at the end
    if (inSubList) {
      listHTML += '\n</ul>';
    }

    const wrapperClass = format === 'desktop' ? 'desktop-show' : 'mobile-show';

    return `<div class="table-of-contents ${wrapperClass}">
  <div class="table-of-contents-list-wrapper">
    <h2><strong>Table of Contents</strong></h2>
    
<ul class="table-content-list">
${listHTML}
</ul>
  </div>
</div>`;
  };

  const desktopHTML = generateHTML('desktop');
  const mobileHTML = generateHTML('mobile');

  return (
    <div className="form-group">
      <label>Table of Contents</label>
      <textarea
        value={toc}
        onChange={e => setToc(e.target.value)}
        placeholder="Introduction
Key Points
Benefits
Conclusion"
        style={{ minHeight: 120 }}
      />
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 6 }}>
        {count} section{count !== 1 ? 's' : ''}
      </div>

      {/* HTML Code Display */}
      {count > 0 && (
        <div style={{ marginTop: 24 }}>
          {/* Desktop HTML */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 12 }}>
              Desktop HTML
            </div>
            <pre
              style={{
                background: '#1e1e1e',
                color: '#d4d4d4',
                padding: '16px',
                borderRadius: '6px',
                overflow: 'auto',
                fontSize: '13px',
                fontFamily: 'Courier New, monospace',
                lineHeight: '1.6',
                border: '1px solid #333',
                maxHeight: '400px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                marginRight: '12px',
              }}
            >
              {desktopHTML}
            </pre>
          </div>

          {/* Mobile HTML */}
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 12 }}>
              Mobile HTML
            </div>
            <pre
              style={{
                background: '#1e1e1e',
                color: '#d4d4d4',
                padding: '16px',
                borderRadius: '6px',
                overflow: 'auto',
                fontSize: '13px',
                fontFamily: 'Courier New, monospace',
                lineHeight: '1.6',
                border: '1px solid #333',
                maxHeight: '400px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                marginRight: '12px',
              }}
            >
              {mobileHTML}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
