export const metadata = {
    title: "SupportDesk",
    description: "Support ticket management portal",
  };
  
  import "./globals.css";
  
  export default function RootLayout({ children }) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }
  