'use client';

export default function MetaFields({ metaTitle, metaDesc, setMetaTitle, setMetaDesc }: any) {
  return (
    <>
      <div className="form-group">
        <label>Meta Title</label>
        <input
          type="text"
          value={metaTitle}
          onChange={e => setMetaTitle(e.target.value)}
          placeholder="Keep it under 60 characters for SEO"
          maxLength={60}
        />
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 6 }}>
          {metaTitle.length}/60 characters
        </div>
      </div>

      <div className="form-group">
        <label>Meta Description</label>
        <textarea
          value={metaDesc}
          onChange={e => setMetaDesc(e.target.value)}
          placeholder="Describe your post in 150-160 characters"
          maxLength={160}
          style={{ minHeight: 80 }}
        />
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 6 }}>
          {metaDesc.length}/160 characters
        </div>
      </div>
    </>
  );
}
