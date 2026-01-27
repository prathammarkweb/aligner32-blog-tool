'use client';

export default function BlogTitle({ value, onChange }: any) {
  return (
    <div className="form-group">
      <label>Blog Title</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter your blog title here"
        maxLength={120}
      />
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 6 }}>
        {value.length}/120 characters
      </div>
    </div>
  );
}
