import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Code2, Globe, Heart, Mail, Music2, Users } from "lucide-react";
import { SiteCredits } from "@/components/SiteCredits";
import { projectAuthor, projectContributors, projectInfo } from "@/lib/project";

export const metadata: Metadata = {
  title: "Créditos e contribuidores — DualWave",
  description: "Conheça Taylor Reis, desenvolvedor principal e mantenedor do DualWave, e os créditos deste projeto open source.",
};

const technologies = [
  { name: "Next.js", detail: "Aplicação fullstack", url: "https://nextjs.org" },
  { name: "React", detail: "Interface e componentes", url: "https://react.dev" },
  { name: "TypeScript", detail: "Tipagem e desenvolvimento", url: "https://www.typescriptlang.org" },
  { name: "Drizzle ORM", detail: "Acesso ao banco de dados", url: "https://orm.drizzle.team" },
  { name: "PostgreSQL", detail: "Persistência no servidor", url: "https://www.postgresql.org" },
  { name: "Tailwind CSS", detail: "Estilização da interface", url: "https://tailwindcss.com" },
  { name: "Lucide", detail: "Ícones da interface", url: "https://lucide.dev" },
  { name: "Unsplash", detail: "Imagens de demonstração", url: "https://unsplash.com" },
];

export default function CreditsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      <header className="border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
            <img src="/icon.svg" width="34" height="34" alt="" aria-hidden="true" />
            <span>Dual<span className="text-emerald-400">Wave</span></span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao app
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-16 space-y-10">
        <section className="space-y-4 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 rounded-full">
            <Code2 className="w-3.5 h-3.5" /> Open source · Licença {projectInfo.license}
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Gente que faz a música <span className="text-emerald-400">acontecer.</span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            O DualWave nasce da ideia de reunir músicas e playlists em uma experiência única.
            Conheça quem desenvolve o projeto e as tecnologias que ajudam a construí-lo.
          </p>
        </section>

        <section aria-labelledby="principal-heading" className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 p-6 sm:p-8">
          <div className="grid md:grid-cols-[1fr_300px] gap-8">
            <div className="space-y-5">
              <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-[0.18em]">Desenvolvedor principal</p>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-rose-500 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-emerald-950/50" aria-hidden="true">TR</div>
                <div>
                  <h2 id="principal-heading" className="text-2xl font-extrabold tracking-tight">{projectAuthor.name}</h2>
                  <p className="text-xs text-zinc-400 mt-1">{projectAuthor.role}</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
                Responsável pela idealização, desenvolvimento fullstack, integrações com Spotify e YouTube,
                experiência de uso e manutenção do DualWave como projeto open source.
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950/50 border border-zinc-700/70 text-[11px] text-zinc-300 px-3 py-1">
                <Music2 className="w-3.5 h-3.5 text-rose-400" /> Todas as suas músicas. Zero barreiras.
              </span>
            </div>
            <div className="space-y-2 md:border-l md:border-zinc-800 md:pl-6 md:self-center">
              {[
                { icon: Code2, label: "GitHub", text: projectAuthor.githubHandle, href: projectAuthor.githubUrl },
                { icon: Mail, label: "E-mail", text: projectAuthor.email, href: `mailto:${projectAuthor.email}` },
                { icon: Globe, label: "Website", text: "taylorreis.netlify.app", href: projectAuthor.website },
              ].map(({ icon: Icon, label, text, href }) => (
                <a key={label} href={href} target={label === "E-mail" ? undefined : "_blank"} rel={label === "E-mail" ? undefined : "noopener noreferrer"} className="flex items-center gap-3 rounded-xl p-3 hover:bg-zinc-800/60 transition-colors group">
                  <Icon className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
                    <p className="text-xs text-zinc-200 break-all mt-0.5">{text}</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="contributors-heading" className="space-y-4">
          <h2 id="contributors-heading" className="font-bold text-lg flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" /> Contribuidores
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {projectContributors.map((person) => (
              <article key={person.githubHandle} className="border border-zinc-800 bg-zinc-900/50 rounded-2xl p-5 space-y-2">
                <a href={person.githubUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm text-white hover:text-emerald-400 flex items-center justify-between gap-3">
                  {person.name} <ArrowUpRight className="w-4 h-4 text-zinc-500" />
                </a>
                <p className="text-[11px] text-emerald-400">{person.githubHandle}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{person.contribution}</p>
              </article>
            ))}
            <article className="border border-dashed border-zinc-700 bg-zinc-950 rounded-2xl p-5 space-y-2">
              <p className="font-semibold text-sm flex items-center gap-2"><Heart className="w-4 h-4 text-rose-400" /> A comunidade também faz parte</p>
              <p className="text-xs text-zinc-400 leading-relaxed">Ideias, correções e documentação são bem-vindas. Entre em contato com o mantenedor para contribuir com o projeto.</p>
              <a href={`mailto:${projectAuthor.email}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 pt-1">Falar com Taylor <ArrowUpRight className="w-3 h-3" /></a>
            </article>
          </div>
        </section>

        <section aria-labelledby="technology-heading" className="space-y-4">
          <h2 id="technology-heading" className="font-bold text-lg">Construído com open source</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {technologies.map((technology) => (
              <a key={technology.name} href={technology.url} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-600 hover:bg-zinc-900 transition-colors">
                <p className="text-xs font-semibold text-white">{technology.name}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{technology.detail}</p>
              </a>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Integrações: Spotify Web API, YouTube Data API v3 e YouTube IFrame Player API.
            O DualWave não é afiliado nem endossado pelo Spotify ou pelo Google/YouTube.
            Músicas, vídeos e marcas pertencem aos respectivos titulares; a licença MIT se aplica ao código do projeto.
          </p>
        </section>

        <footer className="pt-3"><SiteCredits /></footer>
      </div>
    </main>
  );
}
