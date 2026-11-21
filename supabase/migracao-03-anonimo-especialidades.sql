-- Migração 03: quem avalia aparece como "Anônimo" e cada avaliação aceita várias especialidades.
-- Rode uma vez no Supabase: SQL Editor > New query > colar tudo > Run.

-- várias especialidades por avaliação
alter table public.avaliacoes add column if not exists especialidades text[] not null default '{}';
update public.avaliacoes set especialidades = array[especialidade]
  where cardinality(especialidades) = 0 and especialidade is not null;
alter table public.avaliacoes alter column especialidade drop not null;
alter table public.avaliacoes drop constraint if exists avaliacoes_especialidades_max;
alter table public.avaliacoes add constraint avaliacoes_especialidades_max check (cardinality(especialidades) <= 5);

-- quem avalia nunca é identificado no site
update public.avaliacoes set autor_nome = 'Anônimo';
alter table public.avaliacoes alter column autor_nome set default 'Anônimo';

-- a função de avaliar passa a receber uma lista de especialidades
drop function if exists public.adicionar_avaliacao(text, text, text, text, int, text, text[], boolean);
drop function if exists public.adicionar_avaliacao(text, text, text, text, int, text, text[]);

create or replace function public.adicionar_avaliacao(
  p_nome text, p_telefone text, p_cidade text, p_especialidades text[],
  p_nota int, p_texto text, p_fotos text[] default '{}', p_declaracao boolean default false
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_tel   text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  v_nome  text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_cid   text := nullif(btrim(regexp_replace(coalesce(p_cidade, ''), '\s+', ' ', 'g')), '');
  v_esps  text[];
  v_slug  text;
  v_id    text;
begin
  if v_uid is null then raise exception 'login_necessario'; end if;
  if not coalesce(p_declaracao, false) then raise exception 'declaracao_necessaria'; end if;
  if char_length(v_tel) not between 10 and 11 then raise exception 'telefone_invalido'; end if;
  v_slug := trim(both '-' from regexp_replace(lower(unaccent_simples(v_nome)), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then raise exception 'nome_invalido'; end if;
  v_id := v_slug || '-' || v_tel;

  -- especialidades: sem repetidas, sem vazias, de 1 a 5, cada uma com 2 a 40 letras
  select coalesce(array_agg(e order by pos), '{}') into v_esps from (
    select distinct on (lower(btrim(e))) btrim(e) as e, pos
    from unnest(coalesce(p_especialidades, '{}')) with ordinality as t(e, pos)
    where btrim(e) <> '' order by lower(btrim(e)), pos
  ) x;
  if cardinality(v_esps) not between 1 and 5
     or exists (select 1 from unnest(v_esps) e where char_length(e) not between 2 and 40) then
    raise exception 'especialidade_invalida';
  end if;

  if exists (select 1 from unnest(coalesce(p_fotos, '{}')) f where f not like v_uid::text || '/%') then
    raise exception 'foto_invalida';
  end if;

  insert into fornecedores (id, nome, telefone, cidade, especialidades, criado_por)
  values (v_id, v_nome, v_tel, v_cid, v_esps, v_uid)
  on conflict (id) do update
    set especialidades = fornecedores.especialidades
          || array(select e from unnest(excluded.especialidades) e where not e = any(fornecedores.especialidades)),
        cidade = coalesce(fornecedores.cidade, excluded.cidade);

  -- quem avalia aparece sempre como "Anônimo"
  insert into avaliacoes (fornecedor_id, nota, texto, especialidade, especialidades, fotos, autor_id, autor_nome)
  values (v_id, p_nota, btrim(p_texto), v_esps[1], v_esps, coalesce(p_fotos, '{}'), v_uid, 'Anônimo');
  return v_id;
end $$;

revoke all on function public.adicionar_avaliacao(text, text, text, text[], int, text, text[], boolean) from public, anon;
grant execute on function public.adicionar_avaliacao(text, text, text, text[], int, text, text[], boolean) to authenticated;

-- não é mais usada
drop function if exists public.iniciais_autor(text);
