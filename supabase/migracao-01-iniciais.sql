-- Migração 01: quem avalia aparece só pelas iniciais (ex.: "F.C.").
-- Rode uma vez no Supabase: SQL Editor > New query > colar tudo > Run.

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

-- atualiza as avaliações que já existem
update public.avaliacoes a
set autor_nome = public.iniciais_autor(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''))
from auth.users u
where u.id = a.autor_id;
