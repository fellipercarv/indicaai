-- Indicaí: banco de dados, regras de acesso e armazenamento de fotos.
-- Rode este arquivo inteiro uma vez no Supabase: SQL Editor > New query > colar > Run.

-- ---------- Tabelas ----------
create table if not exists public.fornecedores (
  id              text primary key,                -- nome normalizado + telefone, ex.: "ze-do-marmore-19995321357"
  nome            text not null check (char_length(nome) between 2 and 80),
  telefone        text not null check (telefone ~ '^[0-9]{10,11}$'),
  cidade          text check (char_length(cidade) <= 60),
  especialidades  text[] not null default '{}',
  criado_em       timestamptz not null default now(),
  criado_por      uuid references auth.users(id) on delete set null
);

create table if not exists public.avaliacoes (
  id             uuid primary key default gen_random_uuid(),
  fornecedor_id  text not null references public.fornecedores(id) on delete cascade,
  nota           smallint not null check (nota between 1 and 5),
  texto          text not null check (char_length(texto) between 5 and 600),
  especialidade  text not null check (char_length(especialidade) between 2 and 40),
  fotos          text[] not null default '{}' check (cardinality(fotos) <= 5),
  autor_id       uuid not null references auth.users(id) on delete cascade,
  autor_nome     text not null default 'Pessoa',
  criado_em      timestamptz not null default now(),
  unique (fornecedor_id, autor_id)                 -- uma avaliação por pessoa para cada fornecedor
);
create index if not exists avaliacoes_fornecedor_idx on public.avaliacoes (fornecedor_id, criado_em desc);

-- ---------- Resumo para a lista da página inicial ----------
create or replace view public.fornecedores_resumo
with (security_invoker = true) as
select f.id, f.nome, f.telefone, f.cidade, f.especialidades,
       count(a.id)::int                         as aval,
       coalesce(round(avg(a.nota), 2), 0)::float as nota
from public.fornecedores f
left join public.avaliacoes a on a.fornecedor_id = f.id
group by f.id;

-- ---------- Regras de acesso (RLS) ----------
alter table public.fornecedores enable row level security;
alter table public.avaliacoes  enable row level security;

drop policy if exists "todos leem fornecedores" on public.fornecedores;
create policy "todos leem fornecedores" on public.fornecedores for select using (true);

drop policy if exists "todos leem avaliacoes" on public.avaliacoes;
create policy "todos leem avaliacoes" on public.avaliacoes for select using (true);

drop policy if exists "autor exclui a propria avaliacao" on public.avaliacoes;
create policy "autor exclui a propria avaliacao" on public.avaliacoes for delete to authenticated using (autor_id = auth.uid());

-- Ninguém grava direto nas tabelas: toda avaliação entra pela função abaixo,
-- que valida os dados, cria ou atualiza o fornecedor e grava a avaliação de uma vez.
create or replace function public.adicionar_avaliacao(
  p_nome text, p_telefone text, p_cidade text, p_especialidade text,
  p_nota int, p_texto text, p_fotos text[] default '{}'
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_tel   text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  v_nome  text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_esp   text := btrim(coalesce(p_especialidade, ''));
  v_cid   text := nullif(btrim(regexp_replace(coalesce(p_cidade, ''), '\s+', ' ', 'g')), '');
  v_slug  text;
  v_id    text;
  v_autor text;
  v_meta  jsonb;
begin
  if v_uid is null then raise exception 'login_necessario'; end if;
  if char_length(v_tel) not between 10 and 11 then raise exception 'telefone_invalido'; end if;
  v_slug := trim(both '-' from regexp_replace(lower(unaccent_simples(v_nome)), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then raise exception 'nome_invalido'; end if;
  v_id := v_slug || '-' || v_tel;
  if exists (select 1 from unnest(coalesce(p_fotos, '{}')) f where f not like v_uid::text || '/%') then
    raise exception 'foto_invalida';
  end if;

  -- nome público do autor: só as iniciais (ex.: "Fellipe Carvalho" vira "F.C.")
  select raw_user_meta_data into v_meta from auth.users where id = v_uid;
  v_autor := iniciais_autor(coalesce(v_meta->>'full_name', v_meta->>'name', ''));

  insert into fornecedores (id, nome, telefone, cidade, especialidades, criado_por)
  values (v_id, v_nome, v_tel, v_cid, array[v_esp], v_uid)
  on conflict (id) do update
    set especialidades = case when v_esp = any(fornecedores.especialidades) then fornecedores.especialidades
                              else fornecedores.especialidades || v_esp end,
        cidade = coalesce(fornecedores.cidade, excluded.cidade);

  insert into avaliacoes (fornecedor_id, nota, texto, especialidade, fotos, autor_id, autor_nome)
  values (v_id, p_nota, btrim(p_texto), v_esp, coalesce(p_fotos, '{}'), v_uid, v_autor);
  return v_id;
end $$;

-- iniciais públicas de quem avalia: primeiro nome + último sobrenome ("Fellipe Carvalho" -> "F.C.")
create or replace function public.iniciais_autor(nome text) returns text
language sql immutable as $$
  with p as (select regexp_split_to_array(btrim(coalesce(nome, '')), '\s+') as w)
  select case
    when btrim(coalesce(nome, '')) = '' then 'Anônimo'
    when array_length(w, 1) = 1 then upper(left(w[1], 1)) || '.'
    else upper(left(w[1], 1)) || '.' || upper(left(w[array_length(w, 1)], 1)) || '.'
  end from p
$$;

-- remove acentos sem depender de extensão
create or replace function public.unaccent_simples(t text) returns text
language sql immutable as $$
  select translate(t, 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
                      'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')
$$;

revoke all on function public.adicionar_avaliacao(text, text, text, text, int, text, text[]) from public, anon;
grant execute on function public.adicionar_avaliacao(text, text, text, text, int, text, text[]) to authenticated;

-- ---------- Fotos (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "todos veem fotos" on storage.objects;
create policy "todos veem fotos" on storage.objects for select using (bucket_id = 'fotos');

drop policy if exists "logado envia fotos na propria pasta" on storage.objects;
create policy "logado envia fotos na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "autor apaga as proprias fotos" on storage.objects;
create policy "autor apaga as proprias fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
