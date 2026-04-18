import "./globals.css";

export const metadata = {
  title: "WaveAnalytics",
  description: "Dashboard de análisis de señales — OWON SDS1202",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
