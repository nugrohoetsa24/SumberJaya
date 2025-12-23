import React from 'react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div 
      className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer flex flex-col h-full"
      onClick={() => onClick(product)}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img 
          src={product.imageUrl || 'https://via.placeholder.com/400x400?text=No+Image'} 
          alt={product.name} 
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
          {product.category}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="text-xs text-gray-400 mb-1 font-mono">{product.code}</div>
        <h3 className="font-semibold text-gray-900 text-lg mb-1 leading-tight line-clamp-2">{product.name}</h3>
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="text-indigo-600 font-bold text-lg">{formatRupiah(product.price)}</span>
          <span className="text-xs text-gray-400">Detail &rarr;</span>
        </div>
      </div>
    </div>
  );
};
