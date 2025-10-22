import "./globals.css";

export const metadata = {
  title: "Chatbot AI | OpenRouter + Next.js",
  description: "Chat con IA usando Vercel AI SDK y OpenRouter de forma segura",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
