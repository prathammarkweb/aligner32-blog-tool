'use client';

import Cropper from 'react-easy-crop';
import { useState } from 'react';
import { X } from 'lucide-react';

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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Blog Image</label>
        {!image && (
          <input 
            type="file" 
            accept="image/*" 
            onChange={onFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        )}
      </div>

      {image && (
        <div className="relative border rounded-lg p-4">
          {/* Remove button */}
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 z-10"
            title="Remove image"
          >
            <X size={16} />
          </button>
          
          {/* Image preview without cropper */}
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <img
                src={image}
                alt="Preview"
                className="max-h-64 rounded-md object-contain"
              />
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              Image uploaded successfully. You can replace it by selecting a new file.
            </div>
            
            {/* Hidden file input to allow replacing the image */}
            <input 
              type="file" 
              accept="image/*" 
              onChange={onFileChange}
              className="block w-full max-w-xs text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
