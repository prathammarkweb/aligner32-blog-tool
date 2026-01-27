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

  return (
    <div>
      <label>Blog Image</label>
      <input type="file" accept="image/*" onChange={onFileChange} />

      {image && (
        <div style={{ position: 'relative', height: 300 }}>
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            onCropChange={setCrop}
            onZoomChange={setZoom}
          />
        </div>
      )}
    </div>
  );
}
