export const metadata = {
  title: 'CDSS MTC — Clinical Decision Support System',
  description: 'Sistema de soporte a decisiones clínicas para Medicina Tradicional China',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}