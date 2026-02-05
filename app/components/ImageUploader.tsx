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
        <div style={{ position: 'relative', marginTop: '10px' }}>
          {/* Remove button */}
          <button
            onClick={removeImage}
            style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              background: 'red',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              zIndex: 10
            }}
            title="Remove image"
          >
            ×
          </button>
          
          {/* Image preview without cropper */}
          <div>
            <img
              src={image}
              alt="Preview"
              style={{ maxHeight: '200px', maxWidth: '100%' }}
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
