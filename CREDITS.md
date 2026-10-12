# Créditos e agradecimentos — DualWave

## Desenvolvedor principal e mantenedor

**Taylor Reis** é o desenvolvedor principal e mantenedor do DualWave, projeto dedicado à comunidade open source.

| Informação | Contato |
|---|---|
| Nome | Taylor Reis |
| GitHub | [@TaylorReis-lab](https://github.com/TaylorReis-lab) |
| E-mail | [taylor-reis@outlook.com](mailto:taylor-reis@outlook.com) |
| Website | [taylorreis.netlify.app](https://taylorreis.netlify.app) |

Responsabilidades: idealização do projeto, desenvolvimento fullstack, integração com Spotify e YouTube, experiência de uso, documentação e manutenção.

Os mesmos dados estão disponíveis no site em **`/creditos`**, nos rodapés do app e do Console Dev e nos metadados de autoria.

## Contribuidores

| Pessoa | Perfil | Contribuição |
|---|---|---|
| **Taylor Reis** | [@TaylorReis-lab](https://github.com/TaylorReis-lab) | Idealização, desenvolvimento principal e manutenção do DualWave. |

A lista acima contém os contribuidores identificados até o momento. Novos colaboradores podem ser adicionados após suas contribuições, com nome, perfil e descrição do trabalho. Não há geração automática desta lista.

Para atualizar a lista no site, edite **`src/lib/project.ts`** (`projectAuthor` e `projectContributors`) e mantenha este documento alinhado.

## Tecnologias open source

### Frameworks e linguagem
- [Next.js](https://nextjs.org/) — framework fullstack com App Router, mantido pela Vercel e comunidade.
- [React](https://react.dev/) — biblioteca de interface.
- [TypeScript](https://www.typescriptlang.org/) — linguagem com tipagem estática.
- [Node.js](https://nodejs.org/) — runtime do servidor; fornece o scrypt usado no hash de senhas.

### Banco de dados
- [PostgreSQL](https://www.postgresql.org/) — persistência de contas, sessões e bibliotecas.
- [Drizzle ORM](https://orm.drizzle.team/) — acesso ao banco e modelagem do schema.
- [node-postgres (`pg`)](https://node-postgres.com/) — driver PostgreSQL.

### Interface e assets
- [Tailwind CSS](https://tailwindcss.com/) — estilização.
- [Lucide](https://lucide.dev/) — ícones da interface.
- [Unsplash](https://unsplash.com/) — imagens usadas nos dados de demonstração; as licenças das imagens são independentes da licença do código.
- [Sharp](https://sharp.pixelplumbing.com/) — conversão do favicon SVG para ICO e PNG.

O favicon é uma composição própria do DualWave (onda sonora e reprodução, em verde e rosa), sem uso dos logos oficiais dos serviços. Os assets estão em `src/app/icon.svg`, `src/app/favicon.ico` e `src/app/apple-icon.png`.

## Integrações

- [Spotify Web API](https://developer.spotify.com/documentation/web-api).
- [YouTube Data API v3](https://developers.google.com/youtube/v3).
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).
- [OAuth 2.0](https://oauth.net/2/) para autorização das contas.

O DualWave **não é afiliado nem endossado pelo Spotify ou pelo Google/YouTube**. Spotify, YouTube e YouTube Music são marcas de seus respectivos titulares. As integrações estão sujeitas às políticas e limitações de cada serviço.

## Músicas e vídeos de demonstração

Os nomes de músicas e artistas no sandbox são utilizados para demonstrar a aplicação. Nenhuma propriedade sobre essas obras é reivindicada. Músicas, vídeos, capas e marcas permanecem sujeitos aos direitos de seus titulares; a licença MIT do projeto não concede direitos sobre esse conteúdo.

## Licença

**Copyright © 2026 Taylor Reis.** O código do projeto é distribuído sob a licença [MIT](./LICENSE). Bibliotecas, serviços e conteúdo externo mantêm suas próprias licenças e condições de uso.

## Agradecimentos

À comunidade open source, aos mantenedores das ferramentas utilizadas e às pessoas que testam, reportam problemas e contribuem com ideias e documentação.

Para falar sobre contribuições, contate [Taylor Reis](mailto:taylor-reis@outlook.com).
