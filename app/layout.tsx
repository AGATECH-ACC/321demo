import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaProvider from "./pwa-provider";

export const metadata: Metadata = {
  title: "Three.21 Studio — Production workspace",
  description: "From first frame to final delivery. Video production and review for Three.21 Consultancy.",
  applicationName: "Three.21 Studio",
  appleWebApp: {capable: true, title: "3.21 Studio", statusBarStyle: "default"},
  icons: {icon: [{url:"/favicon-32.png",sizes:"32x32",type:"image/png"},{url:"/favicon-192.png",sizes:"192x192",type:"image/png"}], shortcut: "/favicon-32.png", apple: [{url:"/apple-touch-icon.png",sizes:"180x180",type:"image/png"}]},
};

export const viewport: Viewport = {width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#f8f8f4"};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><PwaProvider>{children}</PwaProvider></body>
    </html>
  );
}
