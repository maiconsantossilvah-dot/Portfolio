begin;
alter table public.public_profile add column author_note text not null default 'Também crio o FastSEO, ferramenta autoral para estruturar, auditar e produzir conteúdo para e-commerce.';
commit;
