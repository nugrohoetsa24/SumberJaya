import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Product, Category } from '../types';

/* ================================
   CONFIG
================================ */
const LOGO_URL = '/logo.png'; // WAJIB di folder public

/* ================================
   IMAGE HELPERS
================================ */
const getBase64Image = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      console.error('Gagal load image:', url);
      resolve('');
    };

    img.src = url;
  });
};

// Cache logo supaya load sekali saja
let cachedLogo: string | null = null;

const getLogo = async (): Promise<string> => {
  if (!cachedLogo) {
    cachedLogo = await getBase64Image(LOGO_URL);
  }
  return cachedLogo;
};

/* ================================
   SINGLE PRODUCT FLYER
================================ */
const drawSingleProductFlyer = async (product: Product): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Logo
  const logoData = await getLogo();
  if (logoData) {
    doc.addImage(logoData, 'PNG', 15, 10, 80, 25);
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMBER JAYA', 15, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('AUTO ACCESSORIES', 15, 32);
  }

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGITAL PRODUCT FLYER', pageWidth - 15, 25, { align: 'right' });

  // Product Image
  const imgData = await getBase64Image(product.imageUrl || 'https://via.placeholder.com/600');
  if (imgData) {
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(14.5, 54.5, 181, 121, 2, 2, 'D');
    doc.addImage(imgData, 'PNG', 15, 55, 180, 120);
  }

  // Details
  let y = 190;
  doc.setFontSize(28);
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  doc.text(product.name, 15, y);

  y += 12;
  doc.setFontSize(13);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`${product.category.toUpperCase()}  |  SKU: ${product.code}`, 15, y);

  y += 20;
  doc.setFillColor(0, 173, 239);
  doc.roundedRect(15, y - 10, 85, 16, 3, 3, 'F');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rp ${product.price.toLocaleString('id-ID')}`, 22, y + 2);

  y += 22;
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DESKRIPSI PRODUK:', 15, y);

  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const desc = doc.splitTextToSize(
    product.description || 'Spesifikasi standar produk aksesoris Sumber Jaya.',
    180
  );
  doc.text(desc, 15, y);

  // Footer
  doc.setDrawColor(240, 240, 240);
  doc.line(15, 275, pageWidth - 15, 275);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    '© 2024 SUMBER JAYA AUTO ACCESSORIES - Official Product Flyer',
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  return doc;
};

/* ================================
   PDF SERVICE
================================ */
export const pdfService = {
  generateCatalogPDF: async (products: Product[], categories: Category[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    const logoData = await getLogo();

    const renderHeader = () => {
      doc.setFillColor(26, 26, 26);
      doc.rect(0, 0, pageWidth, 40, 'F');

      if (logoData) {
        doc.addImage(logoData, 'PNG', margin, 8, 70, 22);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('KATALOG PRODUK LENGKAP', pageWidth - margin, 20, { align: 'right' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text(
        `Dicetak: ${new Date().toLocaleDateString('id-ID')}`,
        pageWidth - margin,
        28,
        { align: 'right' }
      );
    };

    renderHeader();

    let currentY = 50;
    const itemHeight = 45;
    const imgSize = 35;

    for (const category of categories) {
      const items = products.filter(p => p.category === category.name);
      if (!items.length) continue;

      if (currentY + 30 > pageHeight - 20) {
        doc.addPage();
        renderHeader();
        currentY = 50;
      }

      doc.setFillColor(245, 245, 245);
      doc.rect(margin, currentY, pageWidth - margin * 2, 10, 'F');
      doc.setTextColor(0, 173, 239);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(category.name.toUpperCase(), margin + 5, currentY + 7);

      currentY += 15;

      for (const product of items) {
        if (currentY + itemHeight > pageHeight - 20) {
          doc.addPage();
          renderHeader();
          currentY = 50;
        }

        doc.setDrawColor(240, 240, 240);
        doc.roundedRect(margin, currentY, imgSize, imgSize, 1, 1);

        const pImg = await getBase64Image(product.imageUrl || 'https://via.placeholder.com/150');
        if (pImg) {
          doc.addImage(pImg, 'PNG', margin + 1, currentY + 1, imgSize - 2, imgSize - 2);
        }

        const textX = margin + imgSize + 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 26, 26);
        doc.text(product.name, textX, currentY + 6);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`SKU: ${product.code}`, textX, currentY + 11);

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 173, 239);
        doc.text(`Rp ${product.price.toLocaleString('id-ID')}`, textX, currentY + 20);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        const desc = doc.splitTextToSize(product.description || '-', pageWidth - textX - margin);
        doc.text(desc.slice(0, 2), textX, currentY + 28);

        currentY += itemHeight;
      }

      currentY += 10;
    }

    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text(
        `Halaman ${i} dari ${total} | SUMBER JAYA AUTO ACCESSORIES`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    doc.save('KATALOG_SUMBER_JAYA_LENGKAP.pdf');
  },

  generateSingleProductPDF: async (product: Product) => {
    const doc = await drawSingleProductFlyer(product);
    doc.save(`FLYER_SUMBERJAYA_${product.code}.pdf`);
  },

  generateSingleProductPDFBlob: async (product: Product): Promise<Blob> => {
    const doc = await drawSingleProductFlyer(product);
    return doc.output('blob');
  }
};
