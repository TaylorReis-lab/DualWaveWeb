# Dependências e scripts do projeto

Use esta lista para saber o que o projeto utiliza e evitar baixar novamente o que já está disponível. Os nomes e versões abaixo foram extraídos de `package.json` (manifesto do projeto).

## Dependências

| Dependência | Versão | Finalidade | Instalada/localização |
|---|---|---|---|
| next | 16.2.6 | Framework React com SSR/rotas e build | node_modules |
| react | 19.2.6 | Biblioteca de UI | node_modules |
| react-dom | 19.2.6 | Renderização do React para o DOM | node_modules |
| drizzle-orm | 0.45.2 | ORM TypeScript para acesso ao banco | node_modules |
| pg | 8.20.0 | Driver PostgreSQL | node_modules |
| dotenv | 17.3.1 | Carregamento de variáveis de ambiente | node_modules |
| lucide-react | ^1.55.0 | Ícones React | node_modules |

### Dependências de desenvolvimento

| Dependência | Versão | Finalidade | Instalada/localização |
|---|---|---|---|
| typescript | 5.9.3 | Compilador/checagem de tipos | node_modules |
| @types/node | 22.19.15 | Tipos do Node.js | node_modules |
| @types/pg | 8.18.0 | Tipos do driver pg | node_modules |
| @types/react | 19.2.14 | Tipos do React | node_modules |
| @types/react-dom | 19.2.3 | Tipos do React DOM | node_modules |
| drizzle-kit | 0.31.10 | CLI de migrations/geração do Drizzle | node_modules |
| eslint | 9.39.4 | Linter | node_modules |
| eslint-config-next | 16.2.6 | Configuração ESLint do Next | node_modules |
| tailwindcss | 4.1.17 | Framework de CSS utilitário | node_modules |
| @tailwindcss/postcss | 4.1.17 | Plugin PostCSS do Tailwind | node_modules |
| postcss | 8.5.8 | Processador de CSS | node_modules |

Antes de instalar, verifique se a dependência já existe no ambiente local. Se o manifesto e o arquivo de lock não mudaram, reutilize a instalação existente. Baixe novamente apenas se faltar algum pacote ou se as versões tiverem sido alteradas.

## Scripts

| Script/comando | Finalidade | Observações |
|---|---|---|
| `npm run dev` | `next dev` — inicia o servidor de desenvolvimento | — |
| `npm run build` | `next build` — gera o build de produção | — |
| `npm run start` | `next start` — serve o build de produção | Requer `npm run build` antes |
| `npm run lint` | `eslint .` — executa o linter | — |
| `npm run typecheck` | `tsc --noEmit` — checagem de tipos sem gerar saída | — |

Consulte o manifesto do projeto e registre os comandos reais usados pela equipe, como desenvolvimento, testes ou build, se estiverem definidos.
