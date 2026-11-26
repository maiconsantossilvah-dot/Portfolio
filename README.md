# Maicon Santos — portfólio com CMS

Portfólio comercial e painel privado para conteúdo rico de e-commerce, imagens, SEO, páginas web e aplicações autorais. React + TypeScript + Supabase, com hospedagem estática no GitHub Pages. Não há servidor dedicado, cadastro público ou serviços pagos obrigatórios.

## Começar localmente

Requisitos: Node.js 24 LTS, npm e um projeto Supabase gratuito. As versões exatas estão no `package-lock.json`.

```powershell
cd "C:\Users\maicons\Documents\GitHub\Portfólio"
npm ci
Copy-Item .env.example .env
npm run dev
```

Abra a URL exibida pelo Vite. Sem Supabase configurado, a home apresenta as informações profissionais iniciais, os contatos e o estudo de caso estático da PDP Salon Line. **Não há simulação de persistência ou de login.** O FastSEO é cadastrado pela migration como **rascunho**, para que você revise e adicione imagens antes de publicar.

## Ativar o Supabase

### 1. Projeto e tabelas

1. Crie um projeto no plano Free no [Supabase](https://supabase.com/dashboard). Escolha uma senha de banco forte e guarde-a fora do código.
2. Abra **SQL Editor** e execute, uma única vez, os arquivos de `supabase/migrations` em ordem numérica, de `202611250001_schema.sql` até `202611250006_profile_note.sql`.
3. Confirme as tabelas no Table Editor. As migrations criam constraints, índices, triggers, funções transacionais, RLS e o bucket privado `portfolio-media`.
4. Não exponha o schema `private` na Data API. Mantenha apenas os schemas públicos necessários. Não adicione políticas permissivas ao bucket ou às tabelas.

Alternativa para quem usa CLI: `npx supabase login`, `npx supabase link --project-ref SEU_PROJECT_REF` e `npx supabase db push`. Revise o projeto vinculado antes de enviar migrations. Escolha SQL Editor **ou** CLI para a primeira instalação; não reaplique os mesmos arquivos pelos dois métodos. Para evoluir um banco já instalado, crie uma nova migration, sem editar migrations aplicadas.

### 2. Desabilitar cadastros e criar a conta

1. Em Authentication, desative **Allow new users to sign up**. Desative login anônimo e provedores de autenticação que você não utilizará.
2. Em **Authentication → Users → Add user**, crie manualmente sua conta de e-mail e senha. Confirme o e-mail pelo painel quando necessário. Não use um usuário fictício de exemplo.
3. Copie o UUID da conta. No SQL Editor, substitua o marcador abaixo pelo UUID real:

```sql
insert into private.admin_users (user_id)
values ('SEU_UUID_REAL');
```

A tabela aceita somente um proprietário. O cadastro de usuários no Auth **não** concede administração. E-mail, `user_metadata` e valores enviados pelo navegador não definem permissões.

Para revogar o administrador:

```sql
delete from private.admin_users where user_id = 'SEU_UUID_REAL';
```

Para trocar de proprietário, revogue o anterior e autorize o novo UUID na mesma transação, somente pelo painel ou conexão privilegiada ao banco.

### 3. Ambiente público

Preencha seu `.env`:

```dotenv
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
VITE_BASE_PATH=/
VITE_SITE_URL=
```

São configurações públicas de conexão. A chave legada `anon` também é aceita. **Nunca use `service_role`, `sb_secret_*`, senha de banco ou token administrativo em variáveis `VITE_*`.** Todo valor `VITE_*` é incluído no JavaScript publicado. O cliente recusa chaves reconhecidas como privilegiadas.

Reinicie o Vite depois de alterar `.env`. Mudanças futuras em projetos, perfil, contatos, serviços, cores e seções são lidas do banco e não precisam de novo build. Trocar URL/chave do Supabase ou o domínio/base da aplicação exige atualizar o ambiente e gerar outro build.

### 4. Login e recuperação

O painel fica em `/#/admin` no desenvolvimento e `https://SEU_DOMINIO/BASE/#/admin` em produção. A navegação pública não contém acesso administrativo.

Em **Authentication → URL Configuration**, configure:

- Site URL: a URL pública da aplicação, incluindo o caminho do repositório e a barra final.
- Redirect URLs: a URL exata `https://SEU_DOMINIO/BASE/?auth=recovery`.
- Para desenvolvimento: `http://127.0.0.1:5173/?auth=recovery` (ajuste a porta para a mostrada pelo Vite).

O login utiliza e-mail/senha e sessão renovável. A recuperação utiliza PKCE, com destino interno fixo: abra o e-mail **no mesmo navegador que solicitou a recuperação**. A tela Segurança permite definir a nova senha. Um link expirado requer outra solicitação. Não há tela de registro.

O envio depende do serviço de e-mail configurado no Supabase; confira seus limites e os destinatários permitidos no serviço padrão. Você pode configurar SMTP próprio sem alterar o frontend. Consulte [recuperação por e-mail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

### 5. MFA opcional

Em **Segurança**, configure um autenticador TOTP e verifique o código. Depois, para tornar a segunda etapa obrigatória também no banco:

```sql
update private.admin_users
set require_mfa = true
where user_id = 'SEU_UUID_REAL';
```

`is_admin()` passa a exigir o claim assinado `aal2`. Um token válido apenas com senha perde acesso administrativo. Guarde acesso ao Dashboard Supabase para recuperação. Se perder o autenticador, o proprietário pode remover a exigência pelo SQL Editor e redefinir o fator na gestão do Auth. Consulte o [MFA do Supabase](https://supabase.com/docs/guides/auth/auth-mfa).

## Primeiro projeto, do rascunho à publicação

Para começar pelos textos, abra **Projetos → Novo projeto → Colar conteúdo**. Use **Copiar prompt** e envie o prompt ao ChatGPT com seus textos ou a PDP. Cole a resposta, clique em **Conferir conteúdo** e depois **Preencher rascunho**. O painel preenche os campos, seleciona categorias e tecnologias já cadastradas e cria os blocos na ordem da resposta. Depois de salvar, envie a capa e as imagens pela **Biblioteca de mídia** e vincule os arquivos aos blocos. Revise na prévia e publique quando terminar.

Para montar um projeto manualmente:

1. Entre em `/#/admin`.
2. Revise **Sobre mim**, **Contatos**, **Página inicial** e **Configurações**. Os contatos iniciais vieram do site anterior; confirme que continuam corretos.
3. Em **Categorias & tecnologias**, revise os itens iniciais ou crie outros.
4. Em **Biblioteca de mídia**, envie suas imagens autorizadas. Edite nome, texto alternativo, legenda e categoria/tag.
5. Em **Projetos**, abra o rascunho FastSEO ou crie um projeto.
6. Preencha título, slug, resumo, capa e categoria. Identifique sua contribuição e as permissões de divulgação.
7. Monte o estudo de caso com **Adicionar bloco**. Os itens de listas, FAQ, processo e especificações usam campos visuais; não exigem JSON.
8. Use as setas para ordenar blocos ou arraste pela alça. Duplique blocos ou projetos quando útil. A ordem das imagens acompanha a ordem de seleção na biblioteca.
9. Clique **Salvar** e **Prévia**. A prévia acontece dentro da sessão administrativa; não cria uma URL pública para o rascunho.
10. Clique **Publicar**. O catálogo público passa a consultar o registro publicado, sem deploy. Reabra/atualize a página pública para carregar o conteúdo recente.
11. **Despublicar** retorna o projeto a rascunho. **Arquivar** oculta do público. Excluir um projeto remove blocos e relações, mas preserva os arquivos da biblioteca.

Rascunhos válidos têm autosave após uma pausa de aproximadamente 2 segundos. A preferência é persistida em `admin_settings`. Título/slug inválidos aguardam correção. Em falhas, as alterações permanecem na tela e o aviso solicita uma nova tentativa; não há fila offline. Projetos publicados usam **salvamento explícito** para que uma alteração parcial não vá automaticamente ao ar. Fechar ou sair do editor com alterações pendentes dispara aviso. Edições concorrentes são detectadas por `updated_at`, evitando sobrescrever silenciosamente outra aba.

Publicar exige título, slug exclusivo, resumo, capa e categoria, além de imagens e URLs válidas para os blocos utilizados. As referências a objetos do Storage são verificadas no banco durante o salvamento transacional.

## Blocos e PDPs

Há 22 tipos: título, subtítulo, parágrafo, texto formatado, imagem, galeria, grid, comparação, banner, vídeo, demonstração externa, características, tecnologias, especificações, FAQ, processo, código, link, resultado opcional, separador, espaçamento e PDP desktop/mobile.

- Texto formatado aceita `**negrito**` e `[texto](https://destino)`. HTML é exibido como texto; não é injetado no DOM.
- Vídeo aceita URL HTTPS direta de MP4/WebM. O vídeo não é enviado à biblioteca de imagens. Para plataformas externas, use demonstração ou link.
- PDP permite conjuntos desktop e mobile e alternância quando ambos existem. A área de rolagem preserva imagens longas; selecionar uma imagem abre zoom, navegação por teclado e tela cheia quando disponível no navegador.
- Comparadores usam controle nativo acessível por mouse, toque e teclado. As imagens mantêm suas proporções com `object-fit: contain`; use imagens com enquadramento e dimensões equivalentes para uma comparação alinhada.
- Demonstrações usam iframe `sandbox=""`, origem opaca e `referrerpolicy="no-referrer"`, sem scripts, formulários ou navegação de topo. O visitante escolhe carregar a prévia. Há sempre um link para outra aba. A aplicação não testa nem contorna CSP/X-Frame-Options do destino. Demos que precisam de JavaScript devem ser abertas externamente.
- Não existe upload de HTML, SVG arbitrário ou executáveis. Código nos estudos de caso é somente texto.

Nenhuma imagem, página ou código corporativo é copiado automaticamente. Cadastre trabalhos profissionais manualmente após verificar a autorização. Não registre segredos de APIs, prompts internos, documentos privados, resultados inventados ou dados de clientes.

## Mídia e armazenamento

O bucket `portfolio-media` é privado. A biblioteca aceita JPEG, PNG, WebP e AVIF que o navegador consiga decodificar, até 25 MiB e 100 megapixels por imagem, em lotes de até 20 arquivos. O cliente confere assinatura binária e MIME; o bucket também restringe tamanho/MIME e upload por administrador.

A opção **Preservar original** vem ativada: recomendada para capturas com texto e conteúdos ricos. Desativá-la converte para WebP, com qualidade ajustável e lado máximo de 5.000 px, sempre preservando proporção. Uma miniatura WebP de até 960 px é criada separadamente e usada nos cards, evitando baixar originais grandes no catálogo. Não são utilizados serviços pagos de transformação de imagem. Há processamento local no navegador antes do envio.

As URLs são assinadas por 120 segundos e renovadas em telas abertas. As políticas só autorizam novas assinaturas de arquivos ligados a projetos publicados, foto pública ou imagem de compartilhamento; o administrador pode assinar arquivos privados. **Uma URL já emitida continua utilizável até expirar**, mesmo após despublicar. Pessoas também podem guardar cópias de material que já foi público. Veja [Storage privado](https://supabase.com/docs/guides/storage/buckets/fundamentals).

A exclusão verifica vínculos a projetos (inclusive rascunhos), perfil e compartilhamento. O banco marca o arquivo para exclusão antes de remover o objeto, impedindo novas referências concorrentes durante a operação. Se uma remoção falhar pela rede, tente novamente. O Dashboard estima armazenamento com os tamanhos registrados, incluindo miniaturas; objetos órfãos e demais buckets só aparecem na cota real do painel Supabase.

## Arquitetura

```text
src/
  auth/                    Sessão, autorização e MFA
  components/public/       Navegação e cards
  components/admin/        Layout privado, seleção de mídia e backup
  components/editors/      Editor modular
  components/blocks/       Renderização, galerias, comparação e PDP
  config/                  Conteúdo inicial e rótulos
  hooks/                   Carregamento, metadados e contexto público
  lib/                     Cliente Supabase e validações Zod
  pages/                   Home, catálogo, estudos de caso e painel
  repositories/            Consultas e comandos de persistência
  services/                Processamento/upload e backup
  types/                   Contratos de domínio
supabase/migrations/       Modelo, RLS, transações e conteúdo inicial
tests/                     Unitários, PostgreSQL e Playwright
.github/workflows/         Qualidade e publicação manual
```

Tabelas: `projects`, `project_blocks`, `categories`, `technologies`, `project_categories`, `project_technologies`, `media_assets`, `project_media`, `services`, `public_profile`, `site_settings` e `admin_settings`. A allowlist de um único proprietário fica em `private.admin_users`.

O RPC `save_project` salva projeto, blocos e relações em uma transação. Verifica autorização, concorrência, status, URLs e existência de mídia. `reorder_projects` reorganiza sem múltiplas gravações parciais no cliente. `import_content` aplica o backup integralmente ou reverte a operação. Esses RPCs usam `SECURITY INVOKER` e continuam sujeitos a RLS. Os helpers `SECURITY DEFINER` são limitados à consulta de autorização/acesso público, com `search_path` vazio e grants explícitos. Consulte [funções PostgreSQL no Supabase](https://supabase.com/docs/guides/database/functions) e `SECURITY.md`.

O roteamento usa `createHashRouter` (`/#/projetos/slug`). Funciona com links diretos e atualização no GitHub Pages sem servidor de fallback. As áreas administrativas são carregadas separadamente por `React.lazy`. Fontes Inter, Space Grotesk e JetBrains Mono são distribuídas localmente com suas licenças OFL.

## Comandos e testes

```text
npm run dev          Desenvolvimento
npm run typecheck    TypeScript strict
npm run lint         ESLint
npm test             Unitários, componentes e RLS em PostgreSQL
npm run test:watch   Testes em observação
npm run build        Tipos + build + robots/sitemap
npm run preview      Servir o build localmente
npm run test:e2e     Navegação, responsividade e acessibilidade
npm run test:production  Build e navegação com CSP de produção
npm run check        Tipos + lint + testes + build
```

Antes do Playwright, execute `npx playwright install chromium`. No Linux/CI, use `npx playwright install --with-deps chromium`. O teste inicia seu próprio Vite na porta 4173. Execute os testes públicos sem `.env` apontando a um projeto real; eles verificam também o estado sem configuração. O relatório HTML fica em `playwright-report/` (ignorado no Git).

`security.test.ts` executa **as migrations reais em PostgreSQL embutido (PGlite)** e aplica roles `anon` e `authenticated`. Auth e Storage têm schemas de teste que representam seus contratos; as expressões RLS, funções, constraints e transações são executadas pelo PostgreSQL, não simuladas por componentes. Isso valida autorização por UUID/MFA, ausência de escrita pública, ocultação de rascunhos, referências privadas, rollback e concorrência. Não substitui a homologação dos serviços Auth e Storage do Supabase.

Para testar a API HTTP real, consulte `tests/supabase-http.test.ts` e `.env.security.example`. Essa suíte é opcional e aceita **somente um Supabase local de testes**. Sem configuração, os testes são pulados explicitamente. Não execute testes destrutivos no seu ambiente de produção.

Copie `.env.security.example` para `.env.security`, preencha as credenciais de dois usuários criados manualmente no Studio local (um proprietário autorizado e um usuário comum) e execute `npm test -- tests/supabase-http.test.ts`. Use uma conta local de teste sem exigência de MFA para essa suíte. O arquivo de ambiente é ignorado pelo Git e não vai ao frontend.

O CI também executa o smoke test do build com base `/portfolio-ci/`, verificando assets, links diretos, atualização, CSP de produção e arquivos de SEO. Os testes públicos e de produção pressupõem o estado inicial sem uma conta Supabase conectada.

Valide manualmente depois da configuração: login, upload, texto alternativo, rascunho, prévia, publicação em aba anônima, despublicação, recuperação e MFA. A revisão com axe é automatizada e não certifica conformidade integral: revise teclado, leitor de tela e os contrastes dos materiais que você cadastrar.

### Supabase local opcional

Com Docker e Supabase CLI instalados, `npx supabase start` usa `supabase/config.toml`. Aplique migrations em ambiente descartável com `npx supabase db reset` (**apaga o banco local**). Crie os usuários no Studio local, autorize o UUID no SQL Editor e use a URL/chave local em `.env`. URLs HTTP para `127.0.0.1`/`localhost` são aceitas somente pelo Vite em desenvolvimento. A produção exige HTTPS.

## Publicação gratuita no GitHub Pages

1. Em **Settings → Pages → Source**, selecione **GitHub Actions**. A opção **Deploy from a branch** pode servir o `index.html` do código-fonte e exibir apenas o texto básico, pois o navegador não recebe o JavaScript compilado pelo Vite.
2. Com o workflow em `main`, abra **Actions → Publicar no GitHub Pages → Run workflow** e selecione `main`. A publicação é manual. O workflow **Qualidade** executa as verificações em push e pull request.
3. Abra a URL retornada pelo job `deploy` e confira a home e as rotas após atualizar a página. O workflow lê a URL e o caminho base do GitHub Pages. Se precisar substituí-los, cadastre `VITE_SITE_URL` ou `VITE_BASE_PATH` nas variáveis do repositório.
4. Para ativar o CMS, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em **Settings → Secrets and variables → Actions**, configure as URLs de recuperação no Supabase e execute o workflow novamente. Com os dois secrets vazios, a publicação mostra o conteúdo inicial e a PDP Salon Line. Quando o CMS estiver conectado, o catálogo exibirá os projetos publicados no banco. Para manter o estudo da Salon Line, importe as capturas em `public/trabalhos/salon-line/`, publique o projeto com o slug `salon-line-liso-ostentacao` e marque-o como primeiro destaque.

O build roda verificações e gera `dist/`, `.nojekyll`, `robots.txt` e sitemap da home quando `VITE_SITE_URL` está configurado. Não é necessário Render, VPS ou um backend Node em produção. As decisões de base path seguem o [guia de deploy do Vite](https://vite.dev/guide/static-deploy.html).

## SEO e limites da hospedagem estática

A home contém HTML inicial com nome e descrição profissionais reais, metadados e `Person` em JSON-LD. O navegador atualiza título, descrição, canonical, dados estruturados e a imagem de compartilhamento com os dados do CMS. Rotas administrativas recebem `noindex, nofollow`.

Hash routes e conteúdo carregado via API têm limitações de indexação. Crawlers que não executam JavaScript podem enxergar apenas os metadados estáticos da home. Prévias de redes sociais podem ignorar os metadados individuais e URLs temporárias de mídia. O sitemap contém a home, sem fragmentos artificiais. Publicar conteúdo não dispara um novo deploy para gerar SEO. Caso precise de SEO individual robusto, uma evolução para SSR/prerender com infraestrutura adequada será necessária.

`robots.txt` e `noindex` não protegem o painel. A proteção é feita pelo Auth, pelos grants e pelo RLS.

A aplicação inclui CSP via `<meta>`: scripts da própria origem, sem `eval`, conexões ao Supabase, objetos bloqueados e iframes restritos pelo próprio componente. Estilos inline são permitidos para tokens/layout; imagens e vídeos HTTPS externos e frames HTTPS são necessários para os conteúdos autorizados. No desenvolvimento, o HMR tem permissões locais adicionais. GitHub Pages não oferece configuração arbitrária de cabeçalhos como `frame-ancestors`, HSTS próprio, X-Frame-Options ou CSP HTTP; não alegamos fornecê-los. Se forem obrigatórios, use um host que permita defini-los.

## Backup e restauração

Em **Configurações**, exporte JSON antes de grandes alterações. O arquivo contém projetos, blocos, categorias, tecnologias, serviços, perfil, configurações públicas e metadados/caminhos de mídia. Não contém usuários, senhas, sessões, chaves nem permissões administrativas. Mesmo sem credenciais, o JSON contém rascunhos e dados privados do seu conteúdo: guarde-o em local protegido.

O arquivo JSON **não contém as imagens**. Baixe também todos os objetos do bucket `portfolio-media`, incluindo miniaturas, pelo Dashboard/cliente de Storage autenticado como proprietário. Preserve a estrutura `images/UUID/original.ext` e `images/UUID/thumb.webp`. Para muitos arquivos, use uma ferramenta compatível com a API do Storage. Backups do banco também não incluem os bytes dos objetos; veja a [documentação de backups](https://supabase.com/docs/guides/platform/backups).

Para restaurar:

1. Prepare o banco com as migrations e configure Auth/proprietário no destino.
2. Reenvie originais e miniaturas ao bucket **privado**, mantendo os caminhos originais. Não copie tabelas internas do Storage manualmente.
3. Entre no CMS, escolha o JSON, confira a prévia com contagens e confirme.
4. A importação valida o formato, URLs, tipos e referências. Mescla por UUID e substitui os registros correspondentes; não apaga registros ausentes. Slugs duplicados ou objetos ausentes fazem a transação inteira falhar.
5. Projetos marcados como publicados no backup voltam a ser públicos. Revise os direitos de divulgação antes de confirmar.
6. Teste imagens e projetos em aba anônima. Novas URLs assinadas serão emitidas pelo destino.

Para portabilidade além do CMS, mantenha também um dump PostgreSQL feito com as ferramentas oficiais e uma cópia dos objetos. Não coloque backups com rascunhos ou dados de Auth em um repositório público.

## Limites do plano gratuito

Em 25/11/2026, a [página oficial do Supabase](https://supabase.com/pricing) informa 500 MB de banco, 1 GB de arquivos, 5 GB de egress e 5 GB de egress em cache no Free, até dois projetos ativos e pausa após uma semana de inatividade. Confira valores e regras atuais antes de publicar: podem mudar. Imagens grandes e URLs assinadas consomem armazenamento/tráfego; prefira miniaturas e revise o tamanho dos seus arquivos. O limite interno de upload deste projeto é 25 MiB por arquivo, independente da cota restante.

Serviço de e-mail, disponibilidade, retenção de logs e backups também têm restrições. Um projeto pausado precisa ser reativado no painel; o frontend mostra erro de carregamento em vez de inventar conteúdo do banco. Nenhuma rotina de cobrança, upgrade, tráfego artificial para evitar pausa ou serviço pago foi habilitada.

## Solução de problemas

| Sintoma                                           | O que conferir                                                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Painel pede configuração                          | URL/chave pública em `.env`; reinicie Vite. Nunca use `service_role`.                                                              |
| Login funciona, acesso negado                     | UUID exato em `private.admin_users`; se MFA é obrigatório, conclua TOTP.                                                           |
| Projeto não publica                               | Título, slug, resumo, capa, categoria, URLs HTTPS, imagens dos blocos e objetos do Storage existentes.                             |
| Imagens privadas dão erro no público              | É esperado para rascunhos. Para publicados, confira `project_media`, bucket privado e políticas, sem torná-lo público.             |
| Uma imagem não pode ser excluída                  | Retire capa/blocos ou foto/compartilhamento que a utilizam. Relações de rascunhos também contam.                                   |
| Falha após interrupção de upload                  | Reenvie. Arquivos registrados e referências existentes não são sobrescritos. Confira objetos órfãos no painel antes de removê-los. |
| Edição em outra aba                               | Reabra o projeto; não substitua silenciosamente uma versão mais recente. Copie seu texto antes de recarregar se necessário.        |
| Recuperação não abre o painel                     | Confira redirect exato, validade do e-mail e use o mesmo navegador que pediu o link.                                               |
| Iframe vazio                                      | O destino pode bloquear frames ou exigir scripts. Abra a demonstração na outra aba.                                                |
| Página branca no Pages                            | Confira base path, URL do repositório, workflow e erros de assets no navegador.                                                    |
| `relation does not exist` ou schema desatualizado | Execute todas as migrations em ordem e aguarde atualização do cache da Data API.                                                   |
| Falha de rede/limite no Supabase                  | Confira conexão, status do projeto e cotas no Dashboard.                                                                           |

## Checklist antes de divulgar

- [ ] Signup e login anônimo desabilitados; proprietário criado manualmente.
- [ ] UUID autorizado pelo SQL; schema privado fora da API.
- [ ] Todas as migrations aplicadas e RLS ativo; nenhum grant/policy adicional permissivo.
- [ ] Bucket privado; uploads e novas assinaturas conferidos em sessão anônima.
- [ ] `.env` e backups fora do Git; nenhuma chave privilegiada no build.
- [ ] Recuperação, MFA (se exigido), publicação e despublicação testados na instância real.
- [ ] Contatos, autoria e direitos de divulgação revisados; imagens com texto alternativo.
- [ ] Backup JSON e cópia dos arquivos feitos; limites do Free acompanhados.

O histórico do site anterior permanece no Git. Consulte `IMPLEMENTACAO.md` para o progresso e `SECURITY.md` para o modelo de autorização.
