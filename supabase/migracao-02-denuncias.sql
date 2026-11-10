-- Migração 02: declaração obrigatória ao avaliar + pedidos de remoção/correção e denúncias.
-- Rode uma vez no Supabase: SQL Editor > New query > colar tudo > Run.

-- a função ganhou um parâmetro novo: remove a versão antiga
drop function if exists public.adicionar_avaliacao(text, text, text, text, int, text, text[]);

create or replace function public.adicionar_avaliacao(
  p_nome text, p_telefone text, p_cidade text, p_especialidade text,
  p_nota int, p_texto text, p_fotos text[] default '{}', p_declaracao boolean default false
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
  if not coalesce(p_declaracao, false) then raise exception 'declaracao_necessaria'; end if;
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

revoke all on function public.adicionar_avaliacao(text, text, text, text, int, text, text[], boolean) from public, anon;
grant execute on function public.adicionar_avaliacao(text, text, text, text, int, text, text[], boolean) to authenticated;

-- ---------- Pedidos de remoção/correção e denúncias ----------
-- Qualquer visitante pode enviar (o profissional pode não ter conta Google). Ninguém lê pelo site:
-- os pedidos aparecem só para o dono, no Supabase (Table Editor > solicitacoes).
create table if not exists public.solicitacoes (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null check (tipo in ('remocao', 'correcao', 'denuncia')),
  fornecedor_id  text references public.fornecedores(id) on delete set null,
  avaliacao_id   uuid references public.avaliacoes(id) on delete set null,
  motivo         text not null check (char_length(motivo) between 2 and 80),
  detalhes       text check (char_length(detalhes) <= 1000),
  contato        text check (char_length(contato) <= 120),
  status         text not null default 'novo' check (status in ('novo', 'em_analise', 'resolvido', 'recusado')),
  criado_em      timestamptz not null default now(),
  autor_id       uuid default auth.uid()
);
alter table public.solicitacoes enable row level security;
drop policy if exists "qualquer um envia solicitacao" on public.solicitacoes;
create policy "qualquer um envia solicitacao" on public.solicitacoes for insert to anon, authenticated
  with check (status = 'novo' and (autor_id is null or autor_id = auth.uid()));
grant insert on public.solicitacoes to anon, authenticated;
