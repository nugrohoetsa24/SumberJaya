
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Product, Category } from '../types';

// Helper to load image and return base64
const getBase64Image = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/jpeg', 0.8); // Compression for PDF size
      resolve(dataURL);
    };
    img.onerror = () => {
      resolve(''); // Return empty if image fails
    };
    img.src = url;
  });
};

const drawSingleProductFlyer = async (product: Product): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Blue accent bar
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Branding
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTOGEAR ACCESSORIES', 15, 15);

  // Image
  const imgData = await getBase64Image(product.imageUrl || 'https://via.placeholder.com/400');
  if (imgData) {
    doc.addImage(imgData, 'JPEG', 15, 25, 180, 120);
  }

  // Product Info
  let y = 160;
  doc.setFontSize(24);
  doc.setTextColor(33, 33, 33);
  doc.text(product.name, 15, y);
  
  y += 10;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Kategori: ${product.category} | SKU: ${product.code}`, 15, y);

  y += 15;
  doc.setFontSize(20);
  doc.setTextColor(30, 58, 138);
  doc.text(`Harga: Rp ${product.price.toLocaleString('id-ID')}`, 15, y);

  y += 15;
  doc.setTextColor(33, 33, 33);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Deskripsi Produk:', 15, y);
  
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const splitDesc = doc.splitTextToSize(product.description, 180);
  doc.text(splitDesc, 15, y);

  // Footer - Updated branding as requested
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('© Sumber Jaya - Katalog Digital Aksesoris', pageWidth/2, 285, { align: 'center' });
  
  return doc;
};

export const pdfService = {
  generateCatalogPDF: async (products: Product[], categories: Category[]) => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    
    // Header helper
    const renderHeader = () => {
      doc.setFillColor(30, 58, 138); // Blue 900
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('AUTOGEAR FULL CATALOG', margin, 18);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Katalog Produk Aksesoris Mobil & Truk', margin, 26);
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, pageWidth - margin, 26, { align: 'right' });
    };

    renderHeader();

    let currentY = 45;
    const itemHeight = 45; // Height for image + padding
    const imgSize = 35;

    for (const category of categories) {
      const categoryProducts = products.filter(p => p.category === category.name);
      if (categoryProducts.length === 0) continue;

      // Check for page break before category title
      if (currentY + 20 > pageHeight - 20) {
        doc.addPage();
        renderHeader();
        currentY = 45;
      }

      // Category Section
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 10, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(category.name.toUpperCase(), margin + 5, currentY + 7);
      currentY += 15;

      for (const product of categoryProducts) {
        // Check for page break before product item
        if (currentY + itemHeight > pageHeight - 15) {
          doc.addPage();
          renderHeader();
          currentY = 45;
        }

        // Draw Image Placeholder/Frame
        doc.setDrawColor(229, 231, 235);
        doc.rect(margin, currentY, imgSize, imgSize);
        
        // Load and Add Image
        const imgData = await getBase64Image(product.imageUrl || 'https://via.placeholder.com/150?text=No+Image');
        if (imgData) {
          try {
            doc.addImage(imgData, 'JPEG', margin + 1, currentY + 1, imgSize - 2, imgSize - 2);
          } catch (e) {
            console.warn("Failed to add image to PDF", e);
          }
        }

        // Product Details
        const textX = margin + imgSize + 8;
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(product.name, textX, currentY + 5);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(`Kode: ${product.code}`, textX, currentY + 10);

        doc.setFontSize(11);
        doc.setTextColor(30, 58, 138);
        doc.setFont('helvetica', 'bold');
        doc.text(`Rp ${product.price.toLocaleString('id-ID')}`, textX, currentY + 18);

        // Short Description (clamped)
        doc.setFontSize(8);
        doc.setTextColor(75, 85, 99);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(product.description || 'Tidak ada deskripsi.', pageWidth - textX - margin);
        doc.text(descLines.slice(0, 3), textX, currentY + 25);

        currentY += itemHeight;

        // Divider
        doc.setDrawColor(243, 244, 246);
        doc.line(margin, currentY - 5, pageWidth - margin, currentY - 5);
      }
      
      currentY += 5; // Extra space between categories
    }

    // Add page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    doc.save('AutoGear_Katalog_Lengkap.pdf');
  },

  generateSingleProductPDF: async (product: Product) => {
    const doc = await drawSingleProductFlyer(product);
    doc.save(`AutoGear_${product.code}.pdf`);
  },

  // Added for direct sharing with File object
  generateSingleProductPDFBlob: async (product: Product): Promise<Blob> => {
    const doc = await drawSingleProductFlyer(product);
    return doc.output('blob');
  }
};
