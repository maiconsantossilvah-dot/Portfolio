# Plano e progresso

Recriação do portfólio estático como React SPA com CMS real. O histórico anterior permanece no Git. Não publicar trabalhos corporativos sem autorização. Contatos reais existentes foram preservados como conteúdo inicial editável.

- [x] Fase 1 — React, TypeScript strict, Vite, Tailwind, tokens e Supabase
- [x] Fase 2 — Auth, autorização por UUID, migrations, RLS e bucket privado
- [x] Fase 3 — Home editorial, temas, catálogo, pesquisa e filtros
- [x] Fase 4 — Estudos de caso com blocos modulares
- [x] Fase 5 — Administração, transação de projetos, autosave e prévia privada
- [x] Fase 6 — Biblioteca, otimização, miniaturas e referências seguras
- [x] Fase 7 — Serviços, categorias, tecnologias, perfil, contatos e configurações
- [x] Fase 8 — Comparadores, galerias e visualização de PDP desktop/mobile
- [x] Fase 9 — Testes, revisão de segurança, acessibilidade e performance
- [x] Fase 10 — README, SECURITY, backup e GitHub Actions/Pages

## Verificação local executada em 25/11/2026

- TypeScript strict, ESLint e build de produção aprovados.
- Vitest: 55 testes aprovados (validações, Auth, editor, falhas, upload, cache e PostgreSQL/RLS).
- PostgreSQL: migrations completas, escrita negada a visitantes/usuários comuns, rascunhos e mídia privada, MFA, publicação/despublicação, conflitos, exclusão, ordenação e importação transacional verificados.
- Playwright: 8 cenários de navegação/layout/axe e mais 2 de isolamento real do sandbox aprovados, em desktop e mobile.
- axe sem violações nas regras selecionadas para os temas claro/escuro e os três destaques permitidos; revisão humana continua necessária para novos conteúdos.
- Build com base `/portfolio-ci/`: assets, rotas diretas, reload, CSP, noindex, robots e sitemap verificados no navegador.
- npm audit: nenhuma vulnerabilidade reportada.
- 3 testes HTTP reais de Supabase foram explicitamente pulados por ausência de instância local/credenciais. Auth/Storage da conta do proprietário não foram acessados ou homologados.

As fases acima indicam implementação no código e validação local, não provisionamento ou publicação de contas externas.

## Dependências externas para ativar em produção

- Criar/configurar projeto Supabase gratuito e executar migrations.
- Desabilitar signup, criar conta manualmente e autorizar UUID por SQL.
- Informar URL e chave pública no ambiente e cadastrar redirects de recuperação.
- Configurar GitHub Pages/Actions. Nenhuma infraestrutura paga é criada automaticamente.

O site sem configuração mostra o conteúdo profissional inicial e o estudo de caso estático da PDP Salon Line. Login e gerenciamento de conteúdo dependem do Supabase.
