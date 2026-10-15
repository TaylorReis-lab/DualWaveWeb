/**
 * Diagnóstico de falhas do OAuth do Spotify e do Google/YouTube.
 *
 * Os provedores devolvem mensagens crípticas ("redirect_uri: Not matching
 * configuration", "redirect_uri_mismatch", "invalid_client"). Aqui elas viram
 * uma explicação e o passo a passo para resolver, já com a URI que o app enviou.
 */

export type OAuthProblemKind =
  | "redirect_uri_mismatch"
  | "invalid_client"
  | "access_denied"
  | "invalid_scope"
  | "state_mismatch"
  | "missing_credentials"
  | "token_exchange"
  | "network"
  | "unknown";

export interface OAuthDiagnosis {
  kind: OAuthProblemKind;
  /** Título curto e legível. */
  title: string;
  /** Explicação da causa provável. */
  cause: string;
  /** Passos objetivos para resolver, em ordem. */
  steps: string[];
  /** Verdadeiro quando a correção é cadastrar/ajustar a redirect URI no painel. */
  fixInDashboard: boolean;
}

const DASHBOARD_BY_PLATFORM = {
  spotify: "https://developer.spotify.com/dashboard",
  youtube: "https://console.cloud.google.com/apis/credentials",
} as const;

export type OAuthPlatform = keyof typeof DASHBOARD_BY_PLATFORM;

function dashboardLabel(platform: OAuthPlatform) {
  return platform === "spotify" ? "Spotify Developer Dashboard" : "Google Cloud Console (Credenciais)";
}

/**
 * Interpreta o erro informado pelo provedor (ou pelo nosso callback) e cruza com
 * a redirect URI que o app realmente enviou.
 */
export function diagnoseOAuthError(input: {
  platform: OAuthPlatform;
  /** Mensagem bruta do provedor / do callback. */
  message: string;
  /** Redirect URI que o app usou nesta tentativa. */
  redirectUri: string;
  /** Todas as variantes que vale cadastrar. */
  candidateUris: string[];
  /** Endereço que o navegador usou, quando conhecido. */
  browsedHost?: string | null;
}): OAuthDiagnosis {
  const { platform, message, redirectUri, candidateUris, browsedHost } = input;
  const raw = (message || "").toLowerCase();
  const dashboard = dashboardLabel(platform);
  const uriList = candidateUris.length > 0 ? candidateUris : [redirectUri];

  const mismatch: OAuthDiagnosis = {
    kind: "redirect_uri_mismatch",
    title: "A redirect URI enviada não está cadastrada no painel do provedor",
    cause:
      platform === "spotify"
        ? "O Spotify compara a redirect_uri caractere por caractere. “localhost” e “127.0.0.1” são considerados endereços DIFERENTES, e porta ou barra final também contam."
        : "O Google compara a redirect_uri caractere por caractere. “localhost” e “127.0.0.1” são endereços DIFERENTES, e porta ou barra final também contam.",
    steps: [
      `Abra o ${dashboard}.`,
      ...uriList.map((uri) => `Cadastre exatamente esta URI (copie sem digitar): ${uri}`),
      "Salve a configuração e aguarde alguns segundos (algumas alterações levam até 5 minutos para valer).",
      "Volte ao app e clique novamente em entrar com a conta real.",
    ],
    fixInDashboard: true,
  };

  if (raw.includes("not matching configuration") || raw.includes("redirect_uri_mismatch") || raw.includes("redirect_uri")) {
    return mismatch;
  }

  if (raw.includes("invalid_client") || raw.includes("client_id não configurado") || raw.includes("client_id_ou")) {
    return {
      kind: "invalid_client",
      title: platform === "spotify" ? "Client ID do Spotify inválido ou ausente" : "Client ID/Secret do Google inválidos ou ausentes",
      cause:
        platform === "spotify"
          ? "O SPOTIFY_CLIENT_ID não foi encontrado ou não pertence a um app válido."
          : "O GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET estão ausentes, trocados entre si ou o segredo foi regenerado.",
      steps: [
        `Confira as credenciais em ${dashboard}.`,
        "Cole os valores no Console Dev (/dev) e clique em gravar, ou escreva-os no .env / .env.local.",
        "Verifique se o Client ID não tem espaços ou aspas extras.",
        "Tente o login novamente.",
      ],
      fixInDashboard: false,
    };
  }

  if (raw.includes("access_denied") || raw.includes("login_cancelado") || raw.includes("negado")) {
    return {
      kind: "access_denied",
      title: "A autorização não foi concluída na tela do provedor",
      cause: "O login foi cancelado, a permissão foi negada ou a conta não foi selecionada.",
      steps: [
        "Clique novamente em entrar com a conta real.",
        "Na tela do provedor, escolha a conta e aceite as permissões solicitadas.",
        platform === "spotify"
          ? "Se o app estiver em Development Mode, sua conta precisa estar na lista de usuários do app (User Management)."
          : "Se a tela indicar app não verificado, use “Avançar” ou adicione a conta como Test user no OAuth consent screen.",
      ],
      fixInDashboard: false,
    };
  }

  if (raw.includes("invalid_scope") || raw.includes("escopo")) {
    return {
      kind: "invalid_scope",
      title: "Escopo solicitado não está disponível para este app",
      cause: "Um dos escopos pedidos não está habilitado para a aplicação no painel do provedor.",
      steps: [
        platform === "youtube"
          ? "No Google Cloud, habilite a YouTube Data API v3 para o projeto."
          : "No Spotify Dashboard, confira quais produtos/escopos estão ativos para o app.",
        "Ajuste a lista de escopos conforme o painel e tente novamente.",
      ],
      fixInDashboard: true,
    };
  }

  if (raw.includes("state_invalido") || raw.includes("csrf")) {
    return {
      kind: "state_mismatch",
      title: "Validação anti-CSRF falhou",
      cause:
        "O parâmetro state gravado no cookie não corresponde ao recebido de volta. Geralmente é cookie bloqueado ou duas tentativas abertas ao mesmo tempo.",
      steps: [
        "Permita cookies deste site no navegador.",
        "Feche outras abas do app que estejam no meio do login.",
        "Tente novamente em uma única aba.",
      ],
      fixInDashboard: false,
    };
  }

  if (raw.includes("troca_de_token_falhou") || raw.includes("token")) {
    return mismatch.kind === "redirect_uri_mismatch" && raw.includes("redirect_uri")
      ? mismatch
      : {
          kind: "token_exchange",
          title: "Não foi possível trocar o código de autorização por tokens",
          cause:
            "O provedor recusou a troca. As causas mais comuns são redirect URI divergente no passo de troca, código já utilizado/expirado ou relógio do servidor adiantado.",
          steps: [
            "Tente o login novamente (o código é de uso único).",
            `Confirme que a MESMA redirect URI usada na autorização está cadastrada: ${redirectUri}`,
            "Se estiver atrás de proxy, confirme o cabeçalho x-forwarded-proto (http vs https).",
          ],
          fixInDashboard: true,
        };
  }

  if (raw.includes("rede") || raw.includes("fetch failed") || raw.includes("enotfound") || raw.includes("etimedout")) {
    return {
      kind: "network",
      title: "Falha de rede ao contatar o provedor",
      cause: "O servidor não conseguiu alcançar accounts.spotify.com ou oauth2.googleapis.com.",
      steps: [
        "Verifique a conexão de internet do servidor/proxy.",
        "Confirme se há firewall ou proxy corporativo bloqueando as APIs.",
        "Tente novamente em alguns instantes.",
      ],
      fixInDashboard: false,
    };
  }

  return {
    kind: "unknown",
    title: "Não foi possível concluir o login na plataforma",
    cause: message || "O provedor devolveu um erro não identificado.",
    steps: [
      `Verifique a configuração em ${dashboard}.`,
      `Confirme a redirect URI cadastrada: ${redirectUri}`,
      "Consulte os logs do servidor para o erro completo.",
    ],
    fixInDashboard: true,
  };
}

export function dashboardUrlFor(platform: OAuthPlatform) {
  return DASHBOARD_BY_PLATFORM[platform];
}

/**
 * Monta o redirecionamento de falha do OAuth levando o diagnóstico completo.
 * Usado pelos dois callbacks para o usuário ver, no Console Dev, exatamente qual
 * URI precisa cadastrar — em vez de uma mensagem críptica do provedor.
 */
export async function oauthFailureRedirect(
  req: Request,
  platform: OAuthPlatform,
  message: string
) {
  const { resolveOrigin, getRedirectUris, getRedirectUriCandidates } = await import("./credentials");
  const { origin, browsedHost } = resolveOrigin(req);
  const uris = getRedirectUris(origin);
  const redirectUri = platform === "spotify" ? uris.spotify : uris.youtube;
  const candidates = platform === "spotify" ? getRedirectUriCandidates(origin).spotify : getRedirectUriCandidates(origin).youtube;

  const diagnosis = diagnoseOAuthError({
    platform,
    message,
    redirectUri,
    candidateUris: candidates,
    browsedHost,
  });

  const params = new URLSearchParams({
    error: platform,
    kind: diagnosis.kind,
    msg: message || diagnosis.title,
    title: diagnosis.title,
    cause: diagnosis.cause,
    redirect_uri: redirectUri,
    uris: JSON.stringify(candidates),
    steps: JSON.stringify(diagnosis.steps),
    fix: String(diagnosis.fixInDashboard),
  });

  const { NextResponse } = await import("next/server");
  return NextResponse.redirect(`${origin}/dev?${params.toString()}`);
}
