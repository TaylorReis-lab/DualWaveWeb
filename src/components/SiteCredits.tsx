import Link from "next/link";
import { Code2 } from "lucide-react";
import { projectAuthor, projectInfo } from "@/lib/project";

/** Rodapé público; não contém nem acessa dados das contas do servidor. */
export function SiteCredits() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-zinc-800/70 pt-5 text-[11px] text-zinc-500">
      <span>
        © {projectInfo.copyrightYear} {projectInfo.name} · Desenvolvido por{" "}
        <a href={projectAuthor.website} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-emerald-400 transition-colors">
          {projectAuthor.name}
        </a>
      </span>
      <Link href={projectInfo.creditsPath} className="hover:text-white transition-colors">
        Créditos e contribuidores
      </Link>
      <a href={projectAuthor.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
        <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
        Open source · {projectInfo.license}
      </a>
    </div>
  );
}
