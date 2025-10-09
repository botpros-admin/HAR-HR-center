/**
 * PDF Signing Utility using pdf-lib
 * Adds signatures and text fields to PDF documents
 */

import { PDFDocument, rgb, PDFFont, StandardFonts } from 'pdf-lib';

export interface SignatureField {
  page: number;      // 0-indexed page number
  x: number;         // X coordinate (points from left)
  y: number;         // Y coordinate (points from bottom)
  width: number;     // Width in points
  height: number;    // Height in points
}

export interface TextField {
  page: number;
  x: number;
  y: number;
  text: string;
  fontSize?: number;
}

/**
 * Add signature image to PDF document
 *
 * @param pdfBytes - Original PDF as ArrayBuffer
 * @param signaturePng - Signature image as PNG ArrayBuffer
 * @param fields - Array of signature field positions
 * @returns Signed PDF as Uint8Array
 */
export async function addSignatureToPDF(
  pdfBytes: ArrayBuffer,
  signaturePng: ArrayBuffer,
  fields: SignatureField[]
): Promise<Uint8Array> {
  // Load the existing PDF
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Embed the signature image
  const signatureImage = await pdfDoc.embedPng(signaturePng);

  // Get signature dimensions
  const { width: imgWidth, height: imgHeight } = signatureImage.scale(1);

  // Embed font for timestamp
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Add signature to each field
  for (const field of fields) {
    const page = pdfDoc.getPages()[field.page];

    if (!page) {
      throw new Error(`Page ${field.page} not found in PDF`);
    }

    // Calculate aspect-ratio-preserving dimensions
    const aspectRatio = imgWidth / imgHeight;
    let drawWidth = field.width;
    let drawHeight = field.width / aspectRatio;

    if (drawHeight > field.height) {
      drawHeight = field.height;
      drawWidth = field.height * aspectRatio;
    }

    // Center signature in field
    const xOffset = (field.width - drawWidth) / 2;
    const yOffset = (field.height - drawHeight) / 2;

    // Draw signature image
    page.drawImage(signatureImage, {
      x: field.x + xOffset,
      y: field.y + yOffset,
      width: drawWidth,
      height: drawHeight,
      opacity: 1.0,
    });

    // Add timestamp below signature
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const timestampText = `Signed: ${timestamp}`;
    const timestampWidth = font.widthOfTextAtSize(timestampText, 8);
    const timestampX = field.x + (field.width - timestampWidth) / 2;

    page.drawText(timestampText, {
      x: timestampX,
      y: field.y - 15,
      size: 8,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  // Set metadata
  pdfDoc.setProducer('Hartzell HR Center');
  pdfDoc.setCreator('Hartzell HR Center PDF Signer');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  // Save the signed PDF
  const signedPdfBytes = await pdfDoc.save();

  return signedPdfBytes;
}

/**
 * Add text field to PDF (for dates, names, etc.)
 */
export async function addTextField(
  pdfBytes: ArrayBuffer,
  textFields: TextField[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const field of textFields) {
    const page = pdfDoc.getPages()[field.page];

    if (!page) {
      throw new Error(`Page ${field.page} not found in PDF`);
    }

    page.drawText(field.text, {
      x: field.x,
      y: field.y,
      size: field.fontSize || 12,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return await pdfDoc.save();
}

/**
 * Add both signature and text fields to PDF
 */
export async function addFieldsToPDF(
  pdfBytes: ArrayBuffer,
  signaturePng: ArrayBuffer | null,
  signatureFields: SignatureField[],
  textFields: TextField[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Add text fields first
  for (const field of textFields) {
    const page = pdfDoc.getPages()[field.page];

    if (!page) {
      throw new Error(`Page ${field.page} not found in PDF`);
    }

    page.drawText(field.text, {
      x: field.x,
      y: field.y,
      size: field.fontSize || 12,
      font,
      color: rgb(0, 0, 0),
    });
  }

  // Add signature if provided
  if (signaturePng && signatureFields.length > 0) {
    const signatureImage = await pdfDoc.embedPng(signaturePng);
    const { width: imgWidth, height: imgHeight } = signatureImage.scale(1);

    for (const field of signatureFields) {
      const page = pdfDoc.getPages()[field.page];

      if (!page) {
        throw new Error(`Page ${field.page} not found in PDF`);
      }

      // Calculate aspect-ratio-preserving dimensions
      const aspectRatio = imgWidth / imgHeight;
      let drawWidth = field.width;
      let drawHeight = field.width / aspectRatio;

      if (drawHeight > field.height) {
        drawHeight = field.height;
        drawWidth = field.height * aspectRatio;
      }

      // Center signature in field
      const xOffset = (field.width - drawWidth) / 2;
      const yOffset = (field.height - drawHeight) / 2;

      // Draw signature image
      page.drawImage(signatureImage, {
        x: field.x + xOffset,
        y: field.y + yOffset,
        width: drawWidth,
        height: drawHeight,
        opacity: 1.0,
      });

      // Add timestamp
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      const timestampText = `Signed: ${timestamp}`;
      const timestampWidth = font.widthOfTextAtSize(timestampText, 8);
      const timestampX = field.x + (field.width - timestampWidth) / 2;

      page.drawText(timestampText, {
        x: timestampX,
        y: field.y - 15,
        size: 8,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
  }

  // Set metadata
  pdfDoc.setProducer('Hartzell HR Center');
  pdfDoc.setCreator('Hartzell HR Center PDF Signer');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  return await pdfDoc.save();
}

/**
 * Flatten PDF form fields (make them non-editable)
 */
export async function flattenPDF(pdfBytes: ArrayBuffer): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Get the form
  const form = pdfDoc.getForm();

  // Flatten all fields
  form.flatten();

  return await pdfDoc.save();
}
