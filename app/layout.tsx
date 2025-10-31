export const metadata = {
  title: "AskAtlas",
  description: "AskAtlas - Chat with your documents using RAG",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

