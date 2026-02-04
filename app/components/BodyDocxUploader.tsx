'use client';

import { useState, useMemo } from 'react';

interface Heading {
  level: number;
  id: string;
  content: string;
}

// Function to detect and format References/Citations from heading + content
const formatReferences = (doc: Document): void => {
  // Find all h2 headings with "References" or "Citations"
  const headings = doc.querySelectorAll('h2');

  headings.forEach((heading) => {
    const headingText = heading.textContent?.toLowerCase().trim() || '';
    if (headingText.includes('reference') || headingText.includes('citation')) {
      // Get all sibling elements until the next h2
      const referenceItems: string[] = [];
      let currentElement = heading.nextElementSibling;
      while (currentElement && currentElement.tagName !== 'H2') {
        if (currentElement.tagName === 'P') {
          const refText = currentElement.textContent?.trim() || '';
          if (refText) {
            referenceItems.push(refText);
          }
        }
        currentElement = currentElement.nextElementSibling;
      }
      // If we found reference items, create the References structure
      if (referenceItems.length > 0) {
        const refWrapper = doc.createElement('div');
        refWrapper.setAttribute('class', 'article-reference-section');
        refWrapper.setAttribute('bis_skin_checked', '1');

        // Create h2 for the title
        const h2 = doc.createElement('h2');
        h2.setAttribute('id', 'citations');
        h2.textContent = 'Citations:';
        refWrapper.appendChild(h2);

        // Add all reference items as paragraphs
        referenceItems.forEach((refText) => {
          const refP = doc.createElement('p');
          refP.textContent = refText;
          refWrapper.appendChild(refP);
        });

        // Replace the heading with the references wrapper
        heading.parentNode?.insertBefore(refWrapper, heading);
        heading.remove();

        // Remove all reference elements that come after the wrapper
        currentElement = refWrapper.nextElementSibling;
        let elementsToRemove: Element[] = [];
        while (currentElement && currentElement.tagName !== 'H2') {
          elementsToRemove.push(currentElement);
          currentElement = currentElement.nextElementSibling;
        }
        elementsToRemove.forEach(el => el.remove());
      }
    }
  });
};

// Function to detect and format FAQs from heading + Q&A content
const formatFAQs = (doc: Document): void => {
  // Find all h2 headings with "FAQs" or "FAQ"
  const headings = doc.querySelectorAll('h2');
  
  headings.forEach((heading) => {
    const headingText = heading.textContent?.toLowerCase().trim() || '';
    
    if (headingText.includes('faq')) {
      // Collect elements to remove BEFORE creating wrapper
      const elementsToRemove: Element[] = [];
      const faqItems: { question: string; answer: string }[] = [];
      let currentElement = heading.nextElementSibling;
      
      while (currentElement && currentElement.tagName !== 'H2') {
        let text = currentElement.textContent?.trim() || '';
        
        // Look for Q: and A: patterns
        if (text.startsWith('Q:')) {
          const questionText = text.substring(2).trim();
          elementsToRemove.push(currentElement);
          let answerText = '';
          
          // Get the next element which should contain the answer
          const nextElement = currentElement.nextElementSibling;
          if (nextElement && nextElement.textContent?.trim().startsWith('A:')) {
            answerText = nextElement.textContent.trim().substring(2).trim();
            elementsToRemove.push(nextElement);
            currentElement = nextElement; // Skip the answer element
          }
          
          if (questionText && answerText) {
            faqItems.push({ question: questionText, answer: answerText });
          }
        }
        
        currentElement = currentElement.nextElementSibling;
      }
      
      // If we found FAQ items, create the FAQ structure
      if (faqItems.length > 0) {
        // Collect all nodes between this heading and the next H2
        const nodesBetween: Element[] = [];
        let n = heading.nextElementSibling;
        while (n && n.tagName !== 'H2') {
          nodesBetween.push(n);
          n = n.nextElementSibling as Element | null;
        }

        // Try to robustly extract Q/A pairs from the collected nodes
        const extracted: { question: string; answer: string }[] = [];
        const toRemove: Element[] = [];

        for (let i = 0; i < nodesBetween.length; i++) {
          const node = nodesBetween[i];
          const text = node.textContent?.trim() || '';
          // Case: both Q: and A: in same node
          if (/Q:\s*/i.test(text) && /A:\s*/i.test(text)) {
            const parts = text.split(/A:\s*/i);
            const qPart = parts.shift() || '';
            const aPart = parts.join('A:').trim();
            const qText = qPart.replace(/Q:\s*/i, '').trim();
            const aText = aPart.trim();
            if (qText && aText) {
              extracted.push({ question: qText, answer: aText });
              toRemove.push(node);
            }
            continue;
          }

          // Case: Q: in this node, A: in the next node
          if (/Q:\s*/i.test(text)) {
            const qText = text.replace(/Q:\s*/i, '').trim();
            let aText = '';
            if (i + 1 < nodesBetween.length) {
              const nextNode = nodesBetween[i + 1];
              const nextText = nextNode.textContent?.trim() || '';
              if (/A:\s*/i.test(nextText)) {
                aText = nextText.replace(/A:\s*/i, '').trim();
                toRemove.push(node, nextNode);
                i++; // skip the answer node
              } else if (/A:\s*/i.test(nextText)) {
                aText = nextText.replace(/A:\s*/i, '').trim();
                toRemove.push(node, nextNode);
                i++;
              }
            }
            if (qText && aText) extracted.push({ question: qText, answer: aText });
          }
        }

        // If we didn't extract anything via the above, fall back to the original faqItems
        const finalFaqs = extracted.length > 0 ? extracted : faqItems;

        // Build the FAQPage structure and replace the original heading
        const faqPageDiv = doc.createElement('div');
        faqPageDiv.setAttribute('itemscope', '');
        faqPageDiv.setAttribute('itemtype', 'https://schema.org/FAQPage');

        const newH2 = doc.createElement('h2');
        newH2.setAttribute('id', 'faqs');
        newH2.textContent = 'FAQs';
        faqPageDiv.appendChild(newH2);

        finalFaqs.forEach((item) => {
          const questionDiv = doc.createElement('div');
          questionDiv.setAttribute('itemscope', '');
          questionDiv.setAttribute('itemprop', 'mainEntity');
          questionDiv.setAttribute('itemtype', 'https://schema.org/Question');

          const h3 = doc.createElement('h3');
          h3.setAttribute('itemprop', 'name');
          h3.textContent = `Q: ${item.question}`;
          questionDiv.appendChild(h3);

          const answerDiv = doc.createElement('div');
          answerDiv.setAttribute('itemscope', '');
          answerDiv.setAttribute('itemprop', 'acceptedAnswer');
          answerDiv.setAttribute('itemtype', 'https://schema.org/Answer');

          const answerP = doc.createElement('p');
          answerP.setAttribute('itemprop', 'text');
          answerP.textContent = `A: ${item.answer}`;
          answerDiv.appendChild(answerP);

          questionDiv.appendChild(answerDiv);
          faqPageDiv.appendChild(questionDiv);
        });

        // Replace the original heading with our structured FAQ block
        heading.parentNode?.insertBefore(faqPageDiv, heading);
        heading.remove();

        // Remove all nodes we marked for removal (or the original collected elements)
        const removals = toRemove.length > 0 ? toRemove : elementsToRemove;
        removals.forEach(el => el.remove());
      }
    }
  });
};

// Function to prettify HTML with proper formatting
const prettifyHtml = (html: string): string => {
  let formatted = html;
  let indent = 0;
  const indentString = ''; // No indentation - just line breaks
  
  // First, remove all unnecessary whitespace
  formatted = formatted
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .replace(/\s+/g, ' ') // Collapse multiple spaces into one
    .trim();
  
  // Add line breaks between tags
  formatted = formatted.replace(/></g, '>\n<');
  
  const lines = formatted.split('\n');
  const prettified = lines
    .map(line => {
      line = line.trim();
      if (!line) return '';
      
      // Check if this is a closing tag
      const isClosing = line.startsWith('</');
      
      // Decrease indent for closing tags
      if (isClosing) {
        indent = Math.max(0, indent - 1);
      }
      
      const result = indentString.repeat(indent) + line;
      
      // Increase indent for opening tags (but not self-closing)
      if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>')) {
        indent++;
      }
      
      return result;
    })
    .filter(line => line) // Remove empty lines
    .join('\n');
  
  return prettified;
};

// Function to generate ID from text
const generateId = (text: string): string => {
  // Remove (H2) and (H3) tags from text
  let cleanText = text
    .replace(/\s*\(H[2-3]\)\s*$/i, '') // Remove (H2) or (H3) from the end
    .trim();
  
  return cleanText
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
};

// Function to add IDs to h2 and h3 headings and identify CTA tables
const processHeadingsWithIds = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // First, format FAQs if they exist
  formatFAQs(doc);
  
  // Then, format References if they exist
  formatReferences(doc);
  
  const headings = doc.querySelectorAll('h2, h3');
  headings.forEach((heading) => {
    let text = heading.textContent?.trim() || '';
    
    // Remove (H2) and (H3) from the text - multiple patterns to catch all variations
    text = text
      .replace(/\s*\(H[2-3]\)\s*$/i, '') // Remove from end
      .replace(/\(H[2-3]\)/gi, '') // Remove all occurrences
      .trim();
    
    if (text) {
      // Remove the nested anchor tag if it exists
      const anchor = heading.querySelector('a[id]');
      if (anchor) {
        anchor.remove();
      }
      
      // Update heading text without (H2)/(H3)
      heading.textContent = text;
      
      // Set the ID on the heading itself
      const id = generateId(text);
      heading.id = id;
    }
  });

  // Detect CTA tables (tables that contain links AND h3 headings) and wrap non-CTA tables
  const tables = doc.querySelectorAll('table');
  tables.forEach((table) => {
    const hasLink = table.querySelector('a');
    const hasH3 = table.querySelector('h3');
    const isCTA = hasLink && hasH3;
    
    if (isCTA) {
      // CTA table - extract content and rebuild as desired structure
      const h3 = table.querySelector('h3');
      const p = table.querySelector('p');
      const link = table.querySelector('a');
      
      if (h3 && p && link) {
        // Create new div wrapper
        const ctaDiv = doc.createElement('div');
        ctaDiv.setAttribute('class', 'blog_assessment_button');
        ctaDiv.setAttribute('bis_skin_checked', '1');
        
        // Create h3 with classes
        const newH3 = doc.createElement('h3');
        newH3.setAttribute('class', 'text-2xl font-bold text-gray-900 mb-2');
        newH3.textContent = h3.textContent || '';
        
        // Create p with classes
        const newP = doc.createElement('p');
        newP.setAttribute('class', 'text-gray-600 mb-4');
        newP.textContent = p.textContent || '';
        
        // Create link with classes
        const newLink = doc.createElement('a');
        newLink.setAttribute('href', link.getAttribute('href') || '#');
        newLink.setAttribute('class', 'primary-button');
        newLink.setAttribute('target', '_blank');
        newLink.textContent = link.textContent || 'Get Started';
        
        // Append all to the wrapper
        ctaDiv.appendChild(newH3);
        ctaDiv.appendChild(newP);
        ctaDiv.appendChild(newLink);
        
        // Replace the table with the new structure
        table.parentNode?.replaceChild(ctaDiv, table);
      }
    } else {
      // Non-CTA table - only apply <thead>/<tbody> and data-row logic if table has multiple rows
      const rows = table.querySelectorAll('tr');
      if (rows.length > 1) {
        // Create thead and tbody
        const thead = doc.createElement('thead');
        const tbody = doc.createElement('tbody');

        // First row becomes thead
        const firstRow = rows[0].cloneNode(true) as Element;
        const firstRowCells = firstRow.querySelectorAll('td, th');
        firstRowCells.forEach((cell) => {
          const th = doc.createElement('th');
          th.innerHTML = cell.innerHTML;
          Array.from(cell.attributes).forEach(attr => {
            th.setAttribute(attr.name, attr.value);
          });
          th.setAttribute('data-row', '1');
          cell.parentNode?.replaceChild(th, cell);
        });
        thead.appendChild(firstRow);

        // Remaining rows become tbody
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i].cloneNode(true) as Element;
          const rowCells = row.querySelectorAll('td, th');
          rowCells.forEach((cell) => {
            const td = doc.createElement('td');
            td.innerHTML = cell.innerHTML;
            Array.from(cell.attributes).forEach(attr => {
              td.setAttribute(attr.name, attr.value);
            });
            td.setAttribute('data-row', (i + 1).toString());
            cell.parentNode?.replaceChild(td, cell);
          });
          tbody.appendChild(row);
        }

        // Remove all original rows
        rows.forEach((row) => row.remove());
        table.appendChild(thead);
        table.appendChild(tbody);
      } else if (rows.length === 1) {
        // Only one row: keep it in tbody
        const tbody = doc.createElement('tbody');
        const singleRow = rows[0].cloneNode(true) as Element;
        const rowCells = singleRow.querySelectorAll('td, th');
        rowCells.forEach((cell) => {
          const td = doc.createElement('td');
          td.innerHTML = cell.innerHTML;
          Array.from(cell.attributes).forEach(attr => {
            td.setAttribute(attr.name, attr.value);
          });
          cell.parentNode?.replaceChild(td, cell);
        });
        tbody.appendChild(singleRow);
        rows[0].remove();
        table.appendChild(tbody);
      }

      // Wrap in responsive div and add sydney-main table_full_width classes
      const wrapper = doc.createElement('div');
      wrapper.setAttribute('class', 'table-responsive');
      wrapper.setAttribute('bis_skin_checked', '1');
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);

      table.setAttribute('class', 'sydney-main table_full_width');
                // Unwrap <p> tags inside <td> and <th>
                const cells = table.querySelectorAll('td, th');
                cells.forEach(cell => {
                  const ps = Array.from(cell.children).filter(child => child.tagName === 'P');
                  ps.forEach(p => {
                    while (p.firstChild) {
                      cell.insertBefore(p.firstChild, p);
                    }
                    p.remove();
                  });
                });
          // Remove any empty <thead> elements
          const emptyTheads = table.querySelectorAll('thead');
          emptyTheads.forEach(thead => {
            if (!thead.hasChildNodes() || !thead.querySelector('tr')) {
              thead.remove();
            }
          });
    }
  });

  // Add class to ul tags containing li elements
  const ulLists = doc.querySelectorAll('ul');
  ulLists.forEach((ul) => {
    const hasListItems = ul.querySelector('li');
    if (hasListItems) {
      const currentClass = ul.getAttribute('class') || '';
      const newClass = currentClass 
        ? `${currentClass} blog-list-disc` 
        : 'blog-list-disc';
      ul.setAttribute('class', newClass);
    }
  });
  
  let formattedHtml = doc.body.innerHTML;
  
  // Remove any remaining (H2) or (H3) from the entire HTML
  formattedHtml = formattedHtml
    .replace(/\s*\(H[2-3]\)\s*/gi, '') // Remove all (H2) and (H3) occurrences
    .replace(/\s+/g, ' '); // Clean up extra spaces
  
  // Prettify the HTML
  formattedHtml = prettifyHtml(formattedHtml);
  
  // Wrap entire content in div with class="blog-auto"
  formattedHtml = `<div class="blog-article-content-desc-wrapper">\n${formattedHtml}\n</div>`;
  
  return formattedHtml;
};

export default function BodyDocxUploader({
  bodyHtml,
  setBodyHtml,
  tableOfContents = '',
}: {
  bodyHtml: string;
  setBodyHtml: (val: string) => void;
  tableOfContents?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [showHeadings, setShowHeadings] = useState(false);

  const headings = useMemo(() => {
    if (!bodyHtml) return [];
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(bodyHtml, 'text/html');
    const headingElements = doc.querySelectorAll('h2, h3');
    
    const extractedHeadings: Heading[] = [];
    headingElements.forEach((heading) => {
      const level = parseInt(heading.tagName[1]);
      const id = heading.id || '';
      let content = heading.textContent?.trim().replace(/\s+/g, ' ') || '';
      
      // Remove (H2) and (H3) from content
      content = content.replace(/\s*\(H[2-3]\)\s*$/i, '').trim();
      
      if (content) {
        extractedHeadings.push({ level, id, content });
      }
    });
    
    return extractedHeadings;
  }, [bodyHtml]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-docx', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      console.log('API RESPONSE:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (data.html) {
        let cleanHtml = String(data.html).trim();
        // Automatically format headings with IDs
        cleanHtml = processHeadingsWithIds(cleanHtml);
        setBodyHtml(cleanHtml);
      } else {
        throw new Error('No HTML content received');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
      // Reset file input to allow re-uploading the same file
      e.target.value = '';
    }
  };

  const handleAddHeadingIds = () => {
    const processedHtml = processHeadingsWithIds(bodyHtml);
    setBodyHtml(processedHtml);
  };

  return (
    <div className="form-group">
      <label>Body Content (DOCX or HTML)</label>
      <div style={{
        padding: 24,
        border: '2px dashed var(--border-color)',
        borderRadius: 8,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: 'var(--input-bg)',
        opacity: loading ? 0.6 : 1,
      }}>
        <input
          type="file"
          accept=".docx,.doc,.html"
          onChange={handleUpload}
          disabled={loading}
          style={{ display: 'none' }}
          id="docx-input"
        />
        <label htmlFor="docx-input" style={{ cursor: loading ? 'not-allowed' : 'pointer', margin: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            {loading ? 'Processing...' : 'Drag and drop your file here'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            or click to browse (DOCX, DOC, HTML)
          </div>
        </label>
      </div>

      {error && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: '#fee',
          color: '#c33',
          borderRadius: 6,
          fontSize: 12
        }}>
          Error: {error}
        </div>
      )}

      {bodyHtml && (
        <>
          <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowRaw(!showRaw)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--foreground)',
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              {showRaw ? 'Preview' : 'View & Edit Raw'}
            </button>
            {headings.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHeadings(!showHeadings)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--foreground)',
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                {showHeadings ? 'Hide' : 'Show'} Headings ({headings.length})
              </button>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', alignSelf: 'center' }}>
              {bodyHtml.length} characters
            </span>
          </div>

          {headings.length > 0 && showHeadings && (
            <div style={{
              marginTop: 12,
              padding: 12,
              background: 'var(--input-bg)',
              borderRadius: 6,
              fontSize: 12
            }}>
              <strong style={{ color: 'var(--foreground)' }}>Headings found:</strong>
              {headings.map((h, i) => (
                <div key={i} style={{ marginTop: 6, paddingLeft: h.level === 3 ? 16 : 0, color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 500 }}>#{h.id || 'no-id'}</span> {h.content}
                </div>
              ))}
            </div>
          )}

          <div style={{
            marginTop: 20,
            padding: 16,
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            background: 'var(--input-bg)',
            minHeight: 200,
            maxHeight: 800,
            overflowY: 'auto'
          }}>
            {showRaw ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 12,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    lineHeight: 1.6,
                    resize: 'vertical',
                    minHeight: 400,
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Content is editable. Changes are saved automatically to the form.
                </div>
              </div>
            ) : (
              <div
                className="html-content"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
