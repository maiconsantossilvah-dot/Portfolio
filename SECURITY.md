# Modelo de segurança

## Fronteira de confiança

O navegador e suas chamadas HTTP são entradas não confiáveis. Esconder o link administrativo, verificar e-mail ou proteger componentes React não concede autorização. As tabelas expostas usam RLS e grants explícitos. O schema `private` não deve ser exposto pela Data API.

`private.admin_users` contém o UUID de um único proprietário criado manualmente em `auth.users`. Não há política que permita a `anon` ou `authenticated` ler, inserir ou alterar essa allowlist. Somente uma operação privilegiada no SQL Editor/conexão administrativa pode conceder acesso. Um índice limita a tabela a uma conta.

`public.is_admin()` é um helper `SECURITY DEFINER`, com `search_path=''`, nomes de schema explícitos e execução concedida apenas aos papéis necessários. Lê `auth.uid()` e, quando exigido, o claim assinado `aal2`. Não consulta e-mails ou metadados editáveis pelo usuário.

## Permissões

| Recurso                         | Anônimo / autenticado comum         | Proprietário autorizado                 |
| ------------------------------- | ----------------------------------- | --------------------------------------- |
| Projetos e blocos               | Somente publicados                  | CRUD de todos os estados                |
| Categorias / tecnologias        | Leitura                             | CRUD                                    |
| Serviços                        | Somente ativos                      | CRUD                                    |
| Perfil / configurações públicas | Leitura                             | Edição                                  |
| Configuração administrativa     | Sem acesso                          | Leitura/escrita                         |
| Allowlist de administradores    | Sem acesso                          | Também sem acesso pela API do navegador |
| Arquivos privados               | Só referências públicas autorizadas | Leitura/upload/exclusão permitida       |

Ser autenticado não é suficiente para escrever. O frontend não envia chaves privilegiadas. As políticas e grants se aplicam igualmente a chamadas diretas de SDK, REST ou SQL sob essas roles.

## Escritas e consistência

`save_project`, `reorder_projects`, `prepare_media_delete` e `import_content` são `SECURITY INVOKER`. Validam `is_admin()` e continuam sujeitos ao RLS. O salvamento de projetos é transacional, com lock por projeto, comparação de `updated_at` e bloqueios em referências de mídia. Um erro reverte projeto, blocos e relações. A publicação valida os campos essenciais, tipos de blocos que exigem mídia e URLs.

O administrador é um editor confiável, não um tenant hostil. Não permita que plugins ou clientes de terceiros escrevam tabelas diretamente sem preservar as regras de integridade dos RPCs. A aplicação utiliza os RPCs para gravar o grafo do projeto.

## Storage

O bucket `portfolio-media` permanece privado. As políticas verificam autorização do proprietário ou vínculo a projeto publicado/foto pública/imagem de compartilhamento. Apenas essas referências podem receber novas URLs assinadas por visitantes. Nomes UUID organizam o conteúdo e não substituem autorização.

Novas assinaturas são emitidas por 120 segundos. Despublicar bloqueia novas assinaturas; URLs existentes continuam válidas até expirar e cópias anteriormente baixadas não podem ser revogadas. Esse comportamento é inerente às URLs assinadas, conforme a [documentação de controle do Storage](https://supabase.com/docs/guides/storage/security/access-control).

Uploads restringem MIME/tamanho no bucket; a biblioteca verifica assinatura binária e decodifica imagens no cliente. SVG, HTML e executáveis não entram na biblioteca. São permitidos apenas originais raster e miniaturas WebP. O administrador pode gravar binários pela API privilegiada de sua própria conta: as verificações no cliente não substituem as políticas de autorização.

Arquivos em uso não podem ser excluídos pela biblioteca. `prepare_media_delete` bloqueia a linha e marca arquivos livres antes da remoção, impedindo o editor de adicionar novas referências durante a operação. Falhas de rede podem deixar arquivos marcados para exclusão ou objetos órfãos; revise/reexecute a remoção pelo proprietário. Não remova diretamente objetos em uso no Dashboard.

## Auth, recuperação e MFA

Desative cadastro público e login anônimo na configuração do projeto. A aplicação não fornece registro. Use senhas fortes, confirme o e-mail e configure redirects exatos. Recuperação usa PKCE e destino fixo interno, sem parâmetro de redirecionamento arbitrário. A senha só é atualizada em uma sessão válida.

A sessão é mantida pelo SDK no navegador para a SPA estática, com renovação de tokens. Ela não utiliza cookies HttpOnly de backend. Proteja o dispositivo e a origem de hospedagem; extensões maliciosas, scripts comprometidos da mesma origem ou acesso local ao navegador podem ler a sessão. Não adicione scripts de terceiros sem avaliação.

O TOTP pode ser cadastrado na tela Segurança. Para torná-lo obrigatório nas políticas, o proprietário deve definir `require_mfa=true` via SQL após verificar o fator. Guarde acesso administrativo ao Supabase para recuperação. Revogar o UUID no banco impede novas operações administrativas, inclusive com token ainda válido.

## Conteúdo e XSS

O React renderiza conteúdo como texto. Não há `dangerouslySetInnerHTML`. Texto formatado suporta um subconjunto explícito de negrito/links; não aceita HTML. URLs exigem HTTPS e não aceitam credenciais ou protocolos executáveis; canais de contato aceitam também `mailto:` e `tel:`. O banco também verifica URLs. Código de exemplo é inerte.

Demos externas são carregadas somente após ação do visitante, em iframe sem permissões de sandbox, sem scripts e sem `allow-same-origin`, com `referrerpolicy=no-referrer`. URLs da própria aplicação e da origem Supabase não são incorporadas. Há link externo com `noopener noreferrer`. Não removemos nem contornamos CSP/X-Frame-Options. A aplicação não envia sua sessão ou tokens ao destino.

A CSP em meta restringe scripts e conexões, mas permite estilos inline necessários ao layout, imagens/vídeos HTTPS e frames externos autorizados. Em desenvolvimento permite o HMR local. GitHub Pages não oferece configuração arbitrária de cabeçalhos de resposta; a meta não fornece `frame-ancestors`, X-Frame-Options, HSTS próprio ou proteção de framing da página inteira. O iframe sandbox protege as demonstrações, não transforma o host estático em um backend seguro por cookies.

## Backups e segredos

Não use `service_role`, `sb_secret_*`, senha de banco ou tokens administrativos em qualquer `VITE_*`. A URL e chave publishable/anon são públicas por definição. `.env*` (exceto exemplos), build, relatórios e dependências são ignorados no Git. Não imprima tokens em logs.

Exportações JSON não incluem Auth, permissões ou credenciais, mas contêm rascunhos: são material privado. Guarde-as protegidas junto com uma cópia separada dos objetos do Storage. A importação requer prévia/confirmacão e validação; ocorre em transação. Nunca importe backups não confiáveis sem revisar o conteúdo e os direitos de divulgação.

## Verificação e manutenção

Os testes PGlite aplicam migrations reais e executam RLS em PostgreSQL com papéis sem superusuário. Os schemas de Auth/Storage representam o contrato necessário, sem simular as expressões de autorização. A suíte HTTP opcional verifica serviços Supabase reais apenas no ambiente local dedicado. Não confunda os testes PostgreSQL com uma validação dos serviços de produção.

Antes de publicar, valide a instância real com visitante, proprietário e usuário autenticado comum. Verifique upload, recuperação, MFA, assinatura privada e publicação/despublicação. Execute `npm run check`, `npm run test:e2e` e `npm audit`. Atualize dependências com revisão e repita os testes após mudanças em Auth, SQL, Storage ou renderização.

Não adicione políticas `using(true)` para escrita, não torne o bucket público e não use metadados do usuário para conceder administração. Mantenha backup antes de migrations e não execute testes destrutivos em produção.

## Reportar problemas

Para comunicar uma vulnerabilidade, use o contato profissional privado do proprietário indicado no portfólio. Não publique dados pessoais, credenciais, tokens, URLs assinadas de arquivos privados ou provas destrutivas em issues públicas. Revogue imediatamente credenciais expostas e revise o histórico/artefatos antes de republicar.
