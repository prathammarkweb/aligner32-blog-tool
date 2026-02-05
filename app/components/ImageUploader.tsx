'use client';

import Cropper from 'react-easy-crop';
import { useState } from 'react';

export default function ImageUploader() {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const onFileChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <div>
      <label>Blog Image</label>
      
      {/* Only show file input if no image uploaded */}
      {!image && (
        <input type="file" accept="image/*" onChange={onFileChange} />
      )}

      {image && (
        <div style={{ position: 'relative', marginTop: '10px', display: 'inline-block' }}>
          {/* Remove button */}
          <button
            onClick={removeImage}
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              background: 'red',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: '28px',
              textAlign: 'center',
              zIndex: 10,
              padding: 0
            }}
            title="Remove image"
          >
            X
          </button>
          
          {/* Image preview without cropper */}
          <div style={{ border: '1px solid #ccc', padding: '5px', background: '#f5f5f5' }}>
            <img
              src={image}
              alt="Preview"
              style={{ 
                display: 'block',
                maxWidth: '300px', 
                maxHeight: '200px',
                width: 'auto',
                height: 'auto'
              }}
            />
          </div>
          
          {/* Option to replace image */}
          <div style={{ marginTop: '10px' }}>
            <input 
              type="file" 
              accept="image/*" 
              onChange={onFileChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
