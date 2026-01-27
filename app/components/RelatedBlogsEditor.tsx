'use client';

import { useState, useImperativeHandle, forwardRef } from 'react';

export type RelatedBlogsEditorHandle = {
  getRelatedBlogsHtml: () => string;
};

interface RelatedBlog {
  url: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
}

const RelatedBlogsEditor = forwardRef<RelatedBlogsEditorHandle>((props, ref) => {
  const [relatedBlogUrl, setRelatedBlogUrl] = useState('');
  const [relatedBlogs, setRelatedBlogs] = useState<RelatedBlog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addRelatedBlog = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/validate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogUrl: relatedBlogUrl }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');
      
      setRelatedBlogs((prev) => [
        ...prev,
        {
          url: data.article.url,
          title: data.article.title,
          imageUrl: data.article.imageUrl,
          imageAlt: data.article.imageAlt,
        },
      ]);
      setRelatedBlogUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch blog');
    } finally {
      setLoading(false);
    }
  };

  const removeRelatedBlog = (index: number) => {
    setRelatedBlogs((prev) => prev.filter((_, i) => i !== index));
  };

  const generateRelatedBlogsHtml = (): string => {
    if (relatedBlogs.length === 0) return '';
    
    let listItems = '';
    relatedBlogs.forEach((blog) => {
      listItems += `
        <li>
          ${blog.imageUrl ? `<img src="${blog.imageUrl}" alt="${blog.imageAlt}" width="150" height="100" loading="lazy">` : ''}
          <a href="${blog.url}">
            <h3 style="margin: 0;">${blog.title}</h3>
          </a>
        </li>`;
    });

    return `<div class="related-blogs-wrapper">
  <h2 style="margin: 0;"><strong>Related Blogs</strong></h2>
  <ul>
${listItems}
  </ul>
</div>`;
  };

  useImperativeHandle(ref, () => ({
    getRelatedBlogsHtml: generateRelatedBlogsHtml,
  }));

  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 20 }}>Related Blogs</h2>
      <div className="form-group">
        <label>Add Related Blog URLs</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={relatedBlogUrl}
            onChange={(e) => setRelatedBlogUrl(e.target.value)}
            placeholder="Paste blog URL: /blogs/blog-name/article-slug"
            style={{ flex: 1 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addRelatedBlog();
              }
            }}
          />
          <button
            type="button"
            onClick={addRelatedBlog}
            disabled={loading || !relatedBlogUrl.trim()}
            style={{
              padding: '8px 16px',
              background: loading ? '#ccc' : 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
        </div>
        {error && (
          <div style={{ color: '#c33', fontSize: 12, marginBottom: 12 }}>
            ❌ {error}
          </div>
        )}

        {relatedBlogs.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
              Added {relatedBlogs.length} blog{relatedBlogs.length !== 1 ? 's' : ''}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              {relatedBlogs.map((blog, idx) => (
                <div
                  key={blog.url + idx}
                  style={{
                    background: 'var(--input-bg)',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {blog.imageUrl && (
                    <img
                      src={blog.imageUrl}
                      alt={blog.imageAlt}
                      style={{ width: '100%', height: 100, objectFit: 'cover' }}
                    />
                  )}
                  <div style={{ padding: 8 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 13,
                        marginBottom: 8,
                        color: 'var(--foreground)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={blog.title}
                    >
                      {blog.title}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRelatedBlog(idx)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: 12,
                        background: '#fee',
                        color: '#c33',
                        border: '1px solid #fcc',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* HTML Output */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                HTML to be sent to Shopify:
              </div>
              <textarea
                value={generateRelatedBlogsHtml()}
                readOnly
                style={{
                  width: '100%',
                  minHeight: 200,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  padding: 12,
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

RelatedBlogsEditor.displayName = 'RelatedBlogsEditor';

export default RelatedBlogsEditor;
