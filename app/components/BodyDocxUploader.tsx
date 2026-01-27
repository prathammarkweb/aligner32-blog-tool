'use client';

import { useState, useMemo } from 'react';

interface Heading {
  level: number;
  id: string;
  content: string;
}

// Function to generate mobile TOC HTML
const generateMobileTOC = (toc: string): string => {
  const lines = toc.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) return '';

  const slugify = (text: string): string => {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  };

  // Parse items and extract heading level from markers like (H2), (H3)
  const items: Array<{ text: string; level: number }> = [];

  lines.forEach((line) => {
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

  return `<div class="table-of-contents mobile-show">
  <div class="table-of-contents-list-wrapper">
    <h2><strong>Table of Contents</strong></h2>
    <ul class="table-content-list">
${listHTML}
    </ul>
  </div>
</div>`;
};

// Function to inject mobile TOC at the top of body content
const injectMobileTOC = (bodyHtml: string, toc: string): string => {
  if (!toc.trim()) {
    return bodyHtml;
  }

  const mobileTOC = generateMobileTOC(toc);
  
  // Wrap the entire content in the blog-article-content-desc-wrapper if not already wrapped
  if (!bodyHtml.includes('blog-article-content-desc-wrapper')) {
    return `${mobileTOC}\n${bodyHtml}`;
  }

  // If already wrapped, inject TOC after the opening wrapper div
  return bodyHtml.replace(
    '<div class="blog-article-content-desc-wrapper">',
    `<div class="blog-article-content-desc-wrapper">\n${mobileTOC}`
  );
};

// Function to detect and format References/Citations from heading + content
const formatReferences = (doc: Document): void => {
  // Find all h2 headings with "References" or "Citations"
  const headings = doc.querySelectorAll('h2');
  
  headings.forEach((heading) => {
    const headingText = heading.textContent?.toLowerCase().trim() || '';
    const originalHeadingText = heading.textContent?.trim() || '';
    
    if (headingText.includes('reference') || headingText.includes('citation')) {
      // Get all sibling elements until the next h2
      const referenceItems: string[] = [];
      let currentElement = heading.nextElementSibling;
      
      while (currentElement && currentElement.tagName !== 'H2') {
        // Collect all paragraphs and text content as references
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
        refWrapper.setAttribute('class', 'article-faq-wrapper');
        
        const accordionDiv = doc.createElement('div');
        accordionDiv.setAttribute('id', 'inner-accordion_block');
        accordionDiv.setAttribute('class', 'inner-accordion');
        
        const itemDiv = doc.createElement('div');
        itemDiv.setAttribute('class', 'inner-accordion-item');
        itemDiv.setAttribute('itemscope', '');
        itemDiv.setAttribute('itemprop', 'mainEntity');
        itemDiv.setAttribute('itemtype', 'https://schema.org/Question');
        
        const titleDiv = doc.createElement('div');
        titleDiv.setAttribute('class', 'inner-accordion-title');
        titleDiv.setAttribute('itemprop', 'name');
        
        // Create h2 for the title
        const titleH2 = doc.createElement('h2');
        const textNode = doc.createTextNode(originalHeadingText + ':');
        titleH2.appendChild(textNode);
        titleDiv.appendChild(titleH2);
        
        const contentDiv = doc.createElement('div');
        contentDiv.setAttribute('class', 'inner-accordion-content');
        contentDiv.setAttribute('itemscope', '');
        contentDiv.setAttribute('itemprop', 'acceptedAnswer');
        contentDiv.setAttribute('itemtype', 'https://schema.org/Answer');
        contentDiv.setAttribute('style', 'display: none;');
        
        // Add all reference items as paragraphs
        referenceItems.forEach((refText) => {
          const refP = doc.createElement('p');
          refP.setAttribute('itemprop', 'text');
          refP.textContent = refText;
          contentDiv.appendChild(refP);
        });
        
        itemDiv.appendChild(titleDiv);
        itemDiv.appendChild(contentDiv);
        accordionDiv.appendChild(itemDiv);
        refWrapper.appendChild(accordionDiv);
        
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
        const faqWrapper = doc.createElement('div');
        faqWrapper.setAttribute('class', 'article-faq-wrapper');
        
        const faqPageDiv = doc.createElement('div');
        faqPageDiv.setAttribute('itemscope', '');
        faqPageDiv.setAttribute('itemtype', 'https://schema.org/FAQPage');
        
        const accordionDiv = doc.createElement('div');
        accordionDiv.setAttribute('id', 'inner-accordion_block');
        accordionDiv.setAttribute('class', 'inner-accordion');
        
        faqItems.forEach((item, index) => {
          const itemDiv = doc.createElement('div');
          itemDiv.setAttribute('class', 'inner-accordion-item');
          itemDiv.setAttribute('itemscope', '');
          itemDiv.setAttribute('itemprop', 'mainEntity');
          itemDiv.setAttribute('itemtype', 'https://schema.org/Question');
          
          const titleDiv = doc.createElement('div');
          titleDiv.setAttribute('class', 'inner-accordion-title');
          titleDiv.setAttribute('itemprop', 'name');
          
          // Create text node for the question
          const textNode = doc.createTextNode(item.question);
          titleDiv.appendChild(textNode);
          
          const contentDiv = doc.createElement('div');
          contentDiv.setAttribute('class', 'inner-accordion-content');
          contentDiv.setAttribute('itemscope', '');
          contentDiv.setAttribute('itemprop', 'acceptedAnswer');
          contentDiv.setAttribute('itemtype', 'https://schema.org/Answer');
          if (index > 0) {
            contentDiv.setAttribute('style', 'display: none;');
          }
          
          const answerP = doc.createElement('p');
          answerP.setAttribute('itemprop', 'text');
          answerP.textContent = item.answer;
          
          contentDiv.appendChild(answerP);
          itemDiv.appendChild(titleDiv);
          itemDiv.appendChild(contentDiv);
          accordionDiv.appendChild(itemDiv);
        });
        
        faqPageDiv.appendChild(accordionDiv);
        faqWrapper.appendChild(faqPageDiv);
        
        // Insert the FAQ wrapper after the heading (keep the heading)
        heading.parentNode?.insertBefore(faqWrapper, heading.nextElementSibling);
        
        // Remove all collected Q&A elements
        elementsToRemove.forEach(el => el.remove());
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
      // CTA table - don't wrap, just add CTA styling (can use thead and th)
      const currentClass = table.getAttribute('class') || '';
      const newClass = currentClass 
        ? `${currentClass} blog_assessment_button` 
        : 'blog_assessment_button';
      table.setAttribute('class', newClass);

      // Add primary-button class to all links inside this CTA table
      const links = table.querySelectorAll('a');
      links.forEach((link) => {
        const linkClass = link.getAttribute('class') || '';
        const newLinkClass = linkClass 
          ? `${linkClass} primary-button` 
          : 'primary-button';
        link.setAttribute('class', newLinkClass);
      });
    } else {
      // Non-CTA table - convert all thead rows to tbody, convert th to td, and wrap in responsive div
      const theads = table.querySelectorAll('thead');
      theads.forEach((thead) => {
        const rows = thead.querySelectorAll('tr');
        const tbody = doc.createElement('tbody');
        rows.forEach((row) => {
          const clonedRow = row.cloneNode(true) as Element;
          // Convert all th elements to td in this row
          const thElements = clonedRow.querySelectorAll('th');
          thElements.forEach((th) => {
            const td = doc.createElement('td');
            td.innerHTML = th.innerHTML;
            // Copy attributes
            Array.from(th.attributes).forEach(attr => {
              td.setAttribute(attr.name, attr.value);
            });
            th.parentNode?.replaceChild(td, th);
          });
          tbody.appendChild(clonedRow);
        });
        thead.parentNode?.replaceChild(tbody, thead);
      });

      // Convert all th elements to td in tbody rows
      const tbodyRows = table.querySelectorAll('tbody tr');
      tbodyRows.forEach((row) => {
        const thElements = row.querySelectorAll('th');
        thElements.forEach((th) => {
          const td = doc.createElement('td');
          td.innerHTML = th.innerHTML;
          // Copy attributes
          Array.from(th.attributes).forEach(attr => {
            td.setAttribute(attr.name, attr.value);
          });
          th.parentNode?.replaceChild(td, th);
        });
      });

      // Wrap in responsive div and add comparison table classes
      const wrapper = doc.createElement('div');
      wrapper.setAttribute('class', 'table-responsive');
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);

      const currentClass = table.getAttribute('class') || '';
      const newClass = currentClass 
        ? `${currentClass} comparison-table scan-comparison-table` 
        : 'comparison-table scan-comparison-table';
      table.setAttribute('class', newClass);
    }
  });

  // Add class to ul tags containing li elements
  const ulLists = doc.querySelectorAll('ul');
  ulLists.forEach((ul) => {
    const hasListItems = ul.querySelector('li');
    if (hasListItems) {
      const currentClass = ul.getAttribute('class') || '';
      const newClass = currentClass 
        ? `${currentClass} article-list-features` 
        : 'article-list-features';
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
        // Inject mobile TOC at the top of body content
        cleanHtml = injectMobileTOC(cleanHtml, tableOfContents);
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
