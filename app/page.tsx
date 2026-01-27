'use client';

import { useState, useRef } from 'react';
import BlogTitle from './components/BlogTitle';
import MetaFields from './components/MetaFields';
import TableOfContents from './components/TableOfContents';
import BodyDocxUploader from './components/BodyDocxUploader';
import ImageUploader from './components/ImageUploader';
import RelatedBlogsEditor, { RelatedBlogsEditorHandle } from './components/RelatedBlogsEditor';

const BLOG_ID = 'gid://shopify/Blog/93379330367';

export default function BlogComposer() {
  const [title, setTitle] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [toc, setToc] = useState('');
  const [bodyHtml, setBodyHtml] = useState(''); // 🔥 important
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const relatedBlogsRef = useRef<RelatedBlogsEditorHandle>(null);

  const generateHandle = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const generateDesktopTOC = (): string => {
    const lines = toc.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) return '';

    const slugify = (text: string): string => {
      return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    };

    // Parse items and extract heading level from markers like (H2), (H3)
    const items: Array<{ text: string; level: number }> = [];

    lines.forEach((line) => {
      const match = line.match(/\(H([1-6])\)\s*$/);
      const level = match ? parseInt(match[1]) : 2;
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
        if (inSubList) {
          listHTML += '\n</ul>';
          inSubList = false;
        }
        listHTML += `\n<li>${linkHTML}</li>`;

        if (nextItem && nextItem.level === 3) {
          listHTML += '\n<ul class="table-content-sub-list">\n';
          inSubList = true;
        }
      } else if (item.level === 3) {
        if (!inSubList) {
          listHTML += '\n<ul class="table-content-sub-list">\n';
          inSubList = true;
        }
        listHTML += `\n<li>${linkHTML}</li>`;

        if (!nextItem || nextItem.level !== 3) {
          listHTML += '\n</ul>';
          inSubList = false;
        }
      }
    });

    if (inSubList) {
      listHTML += '\n</ul>';
    }

    return `<div class="table-of-contents desktop-show">
  <div class="table-of-contents-list-wrapper">
    <h2><strong>Table of Contents</strong></h2>
<ul class="table-content-list">
${listHTML}
</ul>
  </div>
</div>`;
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Validate required fields
    if (!title || !bodyHtml) {
      setError('Title and body content are required');
      return;
    }

    setLoading(true);

    try {
      const articleHandle = handle || generateHandle(title);
      const desktopTOC = generateDesktopTOC();
      const relatedBlogsHtml = relatedBlogsRef.current?.getRelatedBlogsHtml() || '';

      const payload = {
        blogId: BLOG_ID,
        title,
        body: bodyHtml,
        handle: articleHandle,
        pageTitle: metaTitle,
        metaDescription: metaDesc,
        tableOfContents: desktopTOC,
        relatedBlogs: relatedBlogsHtml,
      };

      console.log('Uploading to Shopify:', payload);

      const response = await fetch('/api/publish-to-shopify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish blog');
      }

      setSuccess(`Blog published successfully! ID: ${data.article.numericId}`);
      console.log('Success:', data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: '40px 20px',
      minHeight: '100vh'
    }}>
      <div style={{ marginBottom: 8 }}>
        <h1>Smilepath Aus</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
          Create and manage your blog posts 
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 20 }}>Content</h2>
        <div className="form-group">
          <BlogTitle value={title} onChange={setTitle} />
        </div>
        <div className="form-group">
          <label>URL Slug (Handle)</label>
          <input
            type="text"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder={handle || (title ? generateHandle(title) : 'auto-generated-from-title')}
            style={{ marginBottom: 8 }}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Preview: {handle || (title ? generateHandle(title) : 'your-blog-title')}
          </div>
        </div>
        <div className="form-group">
          <ImageUploader />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 20 }}>SEO & Meta</h2>
        <div className="form-group">
          <MetaFields
            metaTitle={metaTitle}
            metaDesc={metaDesc}
            setMetaTitle={setMetaTitle}
            setMetaDesc={setMetaDesc}
          />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 20 }}>Body</h2>
        <div className="form-group">
          <TableOfContents toc={toc} setToc={setToc} />
        </div>
        <div className="form-group">
          <BodyDocxUploader
            bodyHtml={bodyHtml}
            setBodyHtml={setBodyHtml}
            tableOfContents={toc}
          />
        </div>
      </div>

      <RelatedBlogsEditor ref={relatedBlogsRef} />

      <div style={{ display: 'flex', gap: 12 }}>
        <button 
          onClick={handleSubmit} 
          disabled={loading}
          style={{ 
            flex: 1, 
            maxWidth: 200,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Publishing...' : 'Save & Publish to Shopify'}
        </button>
        <button style={{
          flex: 1,
          maxWidth: 200,
          background: 'transparent',
          border: '1px solid var(--border-color)',
          color: 'var(--foreground)'
        }}>Draft</button>
      </div>

      {error && (
        <div style={{
          marginTop: 20,
          padding: 12,
          background: '#fee',
          color: '#c33',
          borderRadius: 6,
          fontSize: 14
        }}>
          ❌ Error: {error}
        </div>
      )}

      {success && (
        <div style={{
          marginTop: 20,
          padding: 12,
          background: '#efe',
          color: '#3a3',
          borderRadius: 6,
          fontSize: 14
        }}>
          ✓ {success}
        </div>
      )}
    </div>
  );
}
