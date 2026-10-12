/**
 * Identidade pública do projeto. Edite este arquivo para atualizar os créditos
 * exibidos no site. Não colocar senhas, tokens ou outros segredos aqui.
 */
export const projectAuthor = {
  name: "Taylor Reis",
  githubHandle: "@TaylorReis-lab",
  githubUrl: "https://github.com/TaylorReis-lab",
  email: "taylor-reis@outlook.com",
  website: "https://taylorreis.netlify.app",
  role: "Desenvolvedor principal e mantenedor",
} as const;

export const projectContributors = [
  {
    ...projectAuthor,
    contribution: "Idealização, desenvolvimento fullstack, integrações, experiência de uso e manutenção do DualWave.",
  },
] as const;

export const projectInfo = {
  name: "DualWave",
  license: "MIT",
  copyrightYear: 2026,
  creditsPath: "/creditos",
} as const;
