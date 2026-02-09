import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
  onShare?: (product: Product, e?: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onClick,
  onShare,
}) => {
  const [imageError, setImageError] = useState(false);

  // Debug lebih detail
  React.useEffect(() => {
    console.log(`🖼️ DEBUG Product ${product.code}:`, {
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      // Cek semua properti yang ada
      allProps: Object.keys(product)
    });
  }, [product]);

  // Coba cari image_url dengan berbagai nama
  const getImageUrl = () => {
    // Coba berbagai kemungkinan nama properti
    const possibleKeys = ['imageUrl', 'image_url', 'image', 'url', 'photo'];
    
    for (const key of possibleKeys) {
      if ((product as any)[key]) {
        console.log(`✅ Found image at key: ${key} =`, (product as any)[key]);
        return (product as any)[key];
      }
    }
    
    return null;
  };

  const imageUrl = getImageUrl();

  return (
    <div
      onClick={() => onClick?.(product)}
      className="cursor-pointer bg-white rounded-xl shadow border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
    >
      {/* FIXED HEIGHT IMAGE */}
      <div className="h-48 overflow-hidden bg-gray-100">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => {
              console.error(`❌ Failed to load image: ${imageUrl}`);
              setImageError(true);
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="text-4xl text-gray-300 mb-2">📦</div>
            <p className="text-sm text-gray-500 text-center">
              {imageError ? 'Gagal memuat gambar' : 'Tidak ada gambar'}
            </p>
            <p className="text-xs text-gray-400 mt-1">{product.code}</p>
          </div>
        )}
      </div>

      {/* CONTENT AREA */}
      <div className="p-4 flex-grow flex flex-col">
        {/* Code & Name */}
        <div className="mb-2">
          <span className="text-xs text-gray-500 font-medium">
            {product.code}
          </span>
          <h3 className="font-semibold text-gray-900 mt-1 line-clamp-2">
            {product.name}
          </h3>
        </div>

        {/* Price - selalu di bawah */}
        <div className="mt-auto">
          <p className="text-lg font-bold text-blue-700">
            Rp {product.price.toLocaleString('id-ID')}
          </p>
          
          {/* Share Button */}
          {onShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(product, e);
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Share Product
            </button>
          )}
        </div>
      </div>
    </div>
  );
};