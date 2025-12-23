import * as XLSX from 'xlsx';
import { Product } from '../types';

export const exportToExcel = (products: Product[]) => {
  const worksheet = XLSX.utils.json_to_sheet(
    products.map(({ id, imageUrl, updatedAt, ...rest }) => rest) // Exclude internal fields for cleaner edit
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, 'Katalog_Produk.xlsx');
};

export const parseExcel = (file: File): Promise<Partial<Product>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        // Map excel columns to Product type loosely
        const products = json.map((row: any) => ({
          code: row.code || row.Code || row.KODE,
          name: row.name || row.Name || row.NAMA,
          price: Number(row.price || row.Price || row.HARGA),
          category: row.category || row.Category || row.KATEGORI,
          description: row.description || row.Description || row.DESKRIPSI,
        }));
        
        resolve(products as Partial<Product>[]);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
