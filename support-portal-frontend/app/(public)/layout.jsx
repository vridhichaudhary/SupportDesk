export const metadata = {
  title: "SupportDesk",
};

export default function PublicLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">{children}</body>
    </html>
  );
}
