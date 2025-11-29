import "./globals.css";

export const metadata = {
  title: "SupportDesk - Support Portal",
  description: "Customer support ticket management system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}