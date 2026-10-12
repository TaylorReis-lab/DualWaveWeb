import type { Metadata } from "next";
import type { ReactNode } from "react";
import { projectAuthor, projectInfo } from "@/lib/project";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: projectInfo.name,
  authors: [{ name: projectAuthor.name, url: projectAuthor.website }],
  creator: projectAuthor.name,
  title: "DualWave — Spotify & YouTube Music Hub",
  description:
    "O hub unificado que junta Spotify e YouTube Music. Conecte suas contas, acesse todas as suas playlists e músicas, escute direto pelo player e faça buscas com filtros.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
