# Indicaí

Site de avaliações de profissionais de obra. É um site estático (HTML, CSS e JS), hospedado no GitHub Pages. O banco de dados, as fotos e o login com Google ficam no Supabase.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | A página |
| `style.css` | Visual |
| `app.js` | Lógica: lista, filtros, ficha do fornecedor, avaliações, login |
| `config.js` | Endereço e chave pública do Supabase (você preenche) |
| `supabase/schema.sql` | Tabelas, regras de segurança e armazenamento de fotos |

## Passo a passo para colocar no ar

### 1. Supabase (banco de dados, fotos e login)
1. Crie uma conta em https://supabase.com e clique em **New project**. Escolha a região **South America (São Paulo)**.
2. Abra **SQL Editor > New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Project Settings > API**, copie a **Project URL** e a **anon public key** para o `config.js`.
   - A *anon key* é pública e pode ir no site. **Nunca** use a *service_role key* no site.

### 2. Login com Google
1. No Google Cloud Console (https://console.cloud.google.com), crie um projeto. Configure a **tela de consentimento OAuth** como "Externo" e depois crie uma **credencial OAuth (Aplicativo da Web)**.
2. Em "URIs de redirecionamento autorizados", coloque o endereço que o Supabase mostra em **Authentication > Providers > Google** (algo como `https://SEU-PROJETO.supabase.co/auth/v1/callback`).
3. Cole o **Client ID** e o **Client Secret** do Google em **Authentication > Providers > Google** no Supabase e ative.
4. Em **Authentication > URL Configuration**:
   - **Site URL**: `https://indicai.com.br`
   - **Redirect URLs**: `https://indicai.com.br/**` e o endereço do GitHub Pages (`https://SEU-USUARIO.github.io/indicai/**`)

### 3. GitHub Pages (hospedagem)
1. Suba os arquivos para o repositório `indicai` no GitHub.
2. Abra **Settings > Pages > Source: Deploy from a branch**, escolha `main` e `/ (root)`.
3. Em alguns minutos o site abre em `https://SEU-USUARIO.github.io/indicai/`.

### 4. Domínio indicai.com.br
1. Registre o domínio em https://registro.br (cerca de R$ 40 por ano; precisa de CPF ou CNPJ).
2. No Registro.br, abra **DNS > Editar zona** e crie:
   - 4 registros **A** para `indicai.com.br`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - 1 registro **CNAME** para `www`, apontando para `SEU-USUARIO.github.io`
3. No GitHub, abra **Settings > Pages > Custom domain**, digite `indicai.com.br`, salve e marque **Enforce HTTPS** quando liberar (pode levar algumas horas).

## Moderação
Para apagar uma avaliação ofensiva ou falsa, abra no Supabase **Table Editor > avaliacoes** e exclua a linha. Para remover um fornecedor que pediu para sair do site, exclua-o em **fornecedores**; as avaliações dele são apagadas junto.

## Antes de divulgar
- Crie um e-mail de contato e coloque no rodapé, para que prestadores possam pedir remoção e para atender à LGPD.
- Escreva uma página simples de **Termos de uso e Privacidade**.
