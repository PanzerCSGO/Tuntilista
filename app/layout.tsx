import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tuntilista | KMR INFRA OY",
  description: "KMR INFRA OY – kaivuu- ja urakkatyön tuntikirjaus",
  icons: {
    icon: "/kmr-logo.jpg",
    apple: "/kmr-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 text-gray-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
