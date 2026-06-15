/**
 * pdfmake-config.ts
 * Configuración centralizada de fuentes para pdfmake
 * CDSS MTC Premium v2.2
 */
import { TableCell, CustomTableLayout } from 'pdfmake/interfaces';
import * as pdfMake from 'pdfmake/build/pdfmake';

export interface PdfFonts {
  NotoSans: {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  };
  NotoSansSC: {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  };
  NotoSerif: {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  };
}

export const PDF_COLORS = {
  jade: '#1a4731',
  jadeDark: '#1a4731',
  jadeLight: '#2d6a4f',
  gold: '#c9a227',
  goldLight: '#e9d5a7',
  cream: '#faf8f3',
  text: '#1a1a1a',
  textMuted: '#666666',
  textLight: '#999999',
  alertRed: '#8B0000',
  alertYellow: '#c9a227',
} as const;

const FONT_DEFINITIONS: PdfFonts = {
  NotoSans: {
    normal: 'NotoSans-Regular.ttf',
    bold: 'NotoSans-Bold.ttf',
    italics: 'NotoSans-Italic.ttf',
    bolditalics: 'NotoSans-BoldItalic.ttf',
  },
  NotoSansSC: {
    normal: 'NotoSansSC-Regular.ttf',
    bold: 'NotoSansSC-Bold.ttf',
    italics: 'NotoSansSC-Regular.ttf',
    bolditalics: 'NotoSansSC-Bold.ttf',
  },
  NotoSerif: {
    normal: 'NotoSerif-Regular.ttf',
    bold: 'NotoSerif-Bold.ttf',
    italics: 'NotoSerif-Regular.ttf',
    bolditalics: 'NotoSerif-Bold.ttf',
  },
};

let isConfigured = false;

export async function configurePdfMake(): Promise<typeof pdfMake> {
  if (isConfigured) {
    return pdfMake;
  }

  if (typeof window === 'undefined') {
    throw new Error(
      'pdfmake solo puede configurarse en el cliente. ' +
      'No llames configurePdfMake() en server-side rendering (SSR).'
    );
  }

  const win = window as unknown as {
    pdfMake?: { vfs?: Record<string, string> };
  };

  if (win.pdfMake?.vfs) {
    (pdfMake as unknown as { addVirtualFileSystem: (vfs: Record<string, string>) => void })
      .addVirtualFileSystem(win.pdfMake.vfs);
    (pdfMake as any).fonts = FONT_DEFINITIONS;
    isConfigured = true;
    return pdfMake;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vfs_fonts.js';
    script.onload = () => {
      const vfs = win.pdfMake?.vfs;
      if (vfs) {
        (pdfMake as unknown as { addVirtualFileSystem: (vfs: Record<string, string>) => void })
          .addVirtualFileSystem(vfs);
        (pdfMake as any).fonts = FONT_DEFINITIONS;
        isConfigured = true;
        console.log('[pdfmake] VFS cargado, fuentes configuradas');
        resolve();
      } else {
        reject(new Error('vfs_fonts.js cargó pero pdfMake.vfs no está disponible'));
      }
    };
    script.onerror = () => reject(new Error('No se pudo cargar /vfs_fonts.js'));
    document.head.appendChild(script);
  });

  return pdfMake;
}

export function getPdfMake(): typeof pdfMake {
  if (!isConfigured) {
    throw new Error(
      'pdfmake no está configurado. ' +
      'Llama primero a await configurePdfMake() en un useEffect o handler de cliente.'
    );
  }
  return pdfMake;
}

export function tableLayout(): CustomTableLayout {
  return {
    hLineWidth: (i: number, node: { table: { body: unknown[] } }) => 
      (i === 0 || i === node.table.body.length) ? 1 : 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => '#e0e0e0',
    vLineColor: () => '#e0e0e0',
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 2,
    paddingBottom: () => 2,
  };
}

export function cellLabel(text: string): TableCell {
  return {
    text,
    fontSize: 8,
    bold: true,
    color: PDF_COLORS.jadeDark,
    fillColor: '#f8f9fa',
    margin: [4, 2, 4, 2] as [number, number, number, number],
  };
}

export function cellValue(
  text: string | number | null | undefined, 
  useChineseFont = false
): TableCell {
  return {
    text: text === null || text === undefined || text === '' ? 'N/A' : String(text),
    fontSize: 9,
    font: useChineseFont ? 'NotoSansSC' : 'NotoSans',
    margin: [4, 2, 4, 2] as [number, number, number, number],
  };
}