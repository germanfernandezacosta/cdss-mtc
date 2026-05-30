import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CDSS MTC · Sistema de Soporte a Decisiones Clínicas",
  description:
    "Sistema operativo clínico premium para Medicina Tradicional China. Motor híbrido FUKUOKA-H con validación determinista KANT y documentación forense FOUCAULT.",
  keywords: [
    "Medicina Tradicional China",
    "MTC",
    "CDSS",
    "decisión clínica",
    "diagnóstico TCM",
    "FUKUOKA-H",
    "KANT",
    "FOUCAULT",
  ],
  authors: [{ name: "CDSS MTC Premium" }],
  robots: "noindex, nofollow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4a9b78",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, #fafaf8 0%, #f5f0e8 30%, #ede6da 60%, #e8e2d8 100%)`,
            }}
          />
          <div
            className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full opacity-[0.07] blur-[120px]"
            style={{ background: "radial-gradient(circle, #4a9b78 0%, transparent 70%)" }}
          />
          <div
            className="absolute top-[40%] -right-[15%] w-[50%] h-[50%] rounded-full opacity-[0.05] blur-[100px]"
            style={{ background: "radial-gradient(circle, #3d7d61 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] rounded-full opacity-[0.06] blur-[110px]"
            style={{ background: "radial-gradient(circle, #b56d4d 0%, transparent 70%)" }}
          />
          <div
            className="absolute top-[10%] right-[30%] w-[30%] h-[30%] rounded-full opacity-[0.04] blur-[90px]"
            style={{ background: "radial-gradient(circle, #ca8c6f 0%, transparent 70%)" }}
          />
          <div
            className="absolute top-[60%] left-[50%] w-[35%] h-[35%] rounded-full opacity-[0.04] blur-[80px]"
            style={{ background: "radial-gradient(circle, #c0984a 0%, transparent 70%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              backgroundSize: "128px 128px",
            }}
          />
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.03]"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4a9b78" stopOpacity="0" />
                <stop offset="50%" stopColor="#4a9b78" stopOpacity="1" />
                <stop offset="100%" stopColor="#4a9b78" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#b56d4d" stopOpacity="0" />
                <stop offset="50%" stopColor="#b56d4d" stopOpacity="1" />
                <stop offset="100%" stopColor="#b56d4d" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,200 Q400,100 800,300 T1600,200"
              fill="none"
              stroke="url(#lineGrad1)"
              strokeWidth="1"
            />
            <path
              d="M0,400 Q500,600 1000,350 T1600,500"
              fill="none"
              stroke="url(#lineGrad2)"
              strokeWidth="1"
            />
          </svg>
        </div>

        <main className="relative min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
