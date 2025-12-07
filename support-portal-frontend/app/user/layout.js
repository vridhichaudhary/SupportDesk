import "../globals.css";

export const metadata = {
  title: "User - SupportDesk",
};

export default function UserLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
