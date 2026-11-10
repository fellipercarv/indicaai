/* Indicaí — front-end estático que conversa com o Supabase (banco, fotos e login com Google). */
const CFG = window.INDICAI_CONFIG || {};
const EMAIL_CONTATO = "fellipe_carv@hotmail.com";
const ESPECIALIDADES = ["Ar-condicionado","Azulejista","Chaveiro","Eletricista","Encanador","Gesseiro","Impermeabilização","Jardinagem","Marcenaria","Marmoraria","Montador de móveis","Pedreiro","Pintor","Piso","Serralheria","Telhadista","Vidraçaria"];
const NOTA_TXT = ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"];
const ICON = {
  phone: '<svg class="i" viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  pin: '<svg class="i" viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  tool: '<svg class="i" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>',
  star: '<svg class="i" viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
  copy: '<svg class="i" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
  chat: '<svg class="i" viewBox="0 0 24 24"><path d="M4 20l1.5-4A8 8 0 1 1 9 19.5z"/></svg>',
  pen: '<svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  back: '<svg class="i" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>'
};
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const digits = (s) => String(s || "").replace(/\D/g, "");
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const keyOf = (nome, tel) => slug(nome) + "-" + digits(tel);
function fmtTel(t) {
  const d = digits(t);
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return d;
}
function starsHTML(v) { const p = Math.max(0, Math.min(5, v || 0)) / 5 * 100; return `<span class="stars" role="img" aria-label="${(v||0).toFixed(1)} de 5 estrelas"><i style="width:${p}%"></i></span>`; }
const fmtNota = (v) => v ? Number(v).toFixed(1).replace(".", ",") : "–";
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
function quando(iso) {
  const d = new Date(iso); if (isNaN(d)) return "";
  const dias = Math.floor((Date.now() - d) / 864e5);
  if (dias < 1) return "hoje"; if (dias < 2) return "ontem"; if (dias < 7) return `há ${dias} dias`;
  if (dias < 30) { const s = Math.floor(dias / 7); return s === 1 ? "há 1 semana" : `há ${s} semanas`; }
  const m = Math.floor(dias / 30); if (m < 12) return m === 1 ? "há 1 mês" : `há ${m} meses`;
  const a = Math.floor(m / 12); return a === 1 ? "há 1 ano" : `há ${a} anos`;
}
function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
const COLORS = ["#0d7a66","#7a4cc2","#c2410c","#1d4ed8","#a21caf","#047857","#b45309","#be123c"];
const colorFor = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
const initials = (n) => { const t = String(n || "?").trim(); if (/^(\p{L}\.){1,2}$/u.test(t)) return t.replace(/\./g, "").toUpperCase(); return t.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase(); };
const ss = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
// navegadores dentro de apps (Instagram, Facebook, TikTok, LinkedIn...) não permitem login com Google
const ua = navigator.userAgent || "";
const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|Bytedance|LinkedInApp|Snapchat|Pinterest|; wv\)/i.test(ua);

/* ---------- cidades (IBGE) e busca com sugestões ---------- */
const CIDADES = String(window.CIDADES_BR || "").split(";").filter(Boolean).map(s => {
  const [nome, uf] = s.split("|"); const label = `${nome} - ${uf}`;
  return { label, nome, uf, n: norm(nome), nl: norm(label) };
});
const CID_POR_LABEL = new Map(CIDADES.map(c => [c.nl, c]));
const semUF = (s) => String(s || "").replace(/\s*[-/]\s*[A-Za-z]{2}$/, "");
// "Sao Paulo" -> "São Paulo - SP" quando o nome só existe em um estado
function cidadeOficial(c) {
  if (!c) return c;
  const exata = CID_POR_LABEL.get(norm(c)); if (exata) return exata.label;
  const mesmas = CIDADES.filter(x => x.n === norm(semUF(c)));
  return mesmas.length === 1 ? mesmas[0].label : c;
}
function cidadeBate(cidadeFornecedor, filtro) {
  const f = String(filtro || "").trim(); if (!f) return true;
  if (!cidadeFornecedor) return false;
  const temUF = /\s[-/]\s*[A-Za-z]{2}$/;
  if (temUF.test(f) && temUF.test(cidadeFornecedor)) return norm(f) === norm(cidadeFornecedor);
  return norm(semUF(cidadeFornecedor)).includes(norm(semUF(f)));
}
function buscarCidades(q, limite = 8) {
  const n = norm(q); if (!n) return [];
  const comeca = [], contem = [];
  for (const c of CIDADES) {
    if (c.n.startsWith(n) || c.nl.startsWith(n)) comeca.push(c);
    else if (n.length >= 3 && c.n.includes(n)) contem.push(c);
    if (comeca.length >= 60) break;
  }
  comeca.sort((a, b) => a.n.length - b.n.length || a.nome.localeCompare(b.nome, "pt-BR"));
  return [...comeca, ...contem].slice(0, limite);
}
function autocomplete(input, fonte, aoEscolher) {
  const box = document.createElement("ul");
  box.className = "ac"; box.hidden = true; box.setAttribute("role", "listbox"); box.id = input.id + "-lista";
  input.setAttribute("role", "combobox"); input.setAttribute("aria-autocomplete", "list"); input.setAttribute("aria-controls", box.id); input.setAttribute("aria-expanded", "false");
  (input.closest("dialog") || document.body).appendChild(box);
  let itens = [], idx = -1;
  const posicionar = () => { const r = input.closest(".sf, .field").getBoundingClientRect(); box.style.left = r.left + "px"; box.style.top = (r.bottom + 4) + "px"; box.style.width = Math.max(r.width, 240) + "px"; };
  const fechar = () => { box.hidden = true; idx = -1; input.setAttribute("aria-expanded", "false"); };
  const marcar = () => box.querySelectorAll("li").forEach((li, i) => li.setAttribute("aria-selected", String(i === idx)));
  const mostrar = () => {
    itens = fonte(input.value);
    if (!itens.length) { fechar(); return; }
    box.innerHTML = itens.map((it, i) => `<li role="option" id="${box.id}-${i}" data-i="${i}" aria-selected="false">${esc(it.label)}${it.extra ? `<small>${esc(it.extra)}</small>` : ""}</li>`).join("");
    posicionar(); box.hidden = false; idx = -1; input.setAttribute("aria-expanded", "true");
  };
  const escolher = (it) => { input.value = it.label; fechar(); aoEscolher && aoEscolher(it); };
  input.addEventListener("input", mostrar);
  input.addEventListener("focus", () => { if (input.value.trim()) mostrar(); });
  input.addEventListener("blur", () => setTimeout(fechar, 120));
  input.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "ArrowDown") { idx = Math.min(itens.length - 1, idx + 1); marcar(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { idx = Math.max(0, idx - 1); marcar(); e.preventDefault(); }
    else if (e.key === "Enter" && idx >= 0) { e.preventDefault(); escolher(itens[idx]); }
    else if (e.key === "Escape") { e.stopPropagation(); fechar(); }
  });
  box.addEventListener("mousedown", (e) => { const li = e.target.closest("li"); if (li) { e.preventDefault(); escolher(itens[+li.dataset.i]); } });
  window.addEventListener("resize", () => { if (!box.hidden) posicionar(); });
  window.addEventListener("scroll", () => { if (!box.hidden) posicionar(); }, true);
}

/* ---------- estado ---------- */
let sb = null, sessao = null;
let lista = [];                 // linhas de fornecedores_resumo
let carregado = false;
const revCache = new Map();     // fornecedor_id -> avaliações
let sort = { k: "nota", dir: "desc" };
let selId = null, tab = "geral", revSort = "recentes";

const fotoUrl = (path) => sb.storage.from("fotos").getPublicUrl(path).data.publicUrl;
const minhaId = () => sessao?.user?.id || null;

/* ---------- lista ---------- */
function render() {
  const espCount = new Map(), cidSet = new Set();
  lista.forEach(g => { (g.especialidades || []).forEach(e => espCount.set(e, (espCount.get(e) || 0) + 1)); if (g.cidade) cidSet.add(g.cidade); });
  const espAll = [...new Set([...ESPECIALIDADES, ...espCount.keys()])].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  fillSelect($("fEsp"), espAll, "Todos");
  cidadesComFornecedor = [...cidSet];
  const fe = $("fEsp").value, fc = $("fCid").value, qn = norm($("fNome").value), qd = digits($("fTel").value);
  const catHTML = [...espCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .map(([e, n]) => `<button class="cat" type="button" data-cat="${esc(e)}" aria-pressed="${e === fe}">${esc(e)} <span>${n}</span></button>`).join("");
  if ($("cats").dataset.h !== catHTML) { $("cats").innerHTML = catHTML; $("cats").dataset.h = catHTML; }

  let rows = lista.filter(g => (!fe || (g.especialidades || []).includes(fe)) && cidadeBate(g.cidade, fc) &&
    (!qn || norm(g.nome).includes(qn)) && (!qd || digits(g.telefone).includes(qd)));
  const m = sort.dir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const v = sort.k === "nome" ? a.nome.localeCompare(b.nome, "pt-BR")
      : sort.k === "tel" ? digits(a.telefone).localeCompare(digits(b.telefone))
      : sort.k === "esp" ? ((a.especialidades || [])[0] || "").localeCompare((b.especialidades || [])[0] || "", "pt-BR")
      : sort.k === "aval" ? (a.aval - b.aval) : ((a.nota - b.nota) || (a.aval - b.aval));
    return v * m || a.nome.localeCompare(b.nome, "pt-BR");
  });
  document.querySelectorAll(".lhead button").forEach(b => {
    const on = b.dataset.k === sort.k; const base = b.textContent.replace(/ [↑↓]$/, "");
    b.setAttribute("aria-sort", on ? (sort.dir === "asc" ? "ascending" : "descending") : "none");
    b.textContent = base + (on ? (sort.dir === "asc" ? " ↑" : " ↓") : "");
  });
  const sv = sort.k + ":" + sort.dir; if ([...$("sortSel").options].some(o => o.value === sv)) $("sortSel").value = sv;
  $("count").textContent = lista.length ? `· ${rows.length}${rows.length !== lista.length ? " de " + lista.length : ""}` : "";

  const box = $("rows");
  if (!carregado) {}
  else if (!lista.length) box.innerHTML = `<div class="empty"><strong>Nenhum fornecedor avaliado ainda</strong><span>Conhece um bom gesseiro, encanador ou marceneiro? Seja o primeiro a indicar.</span><button class="btn primary" type="button" data-new>Avaliar fornecedor</button></div>`;
  else if (!rows.length) box.innerHTML = `<div class="empty"><strong>Nenhum fornecedor com esses filtros</strong><button class="btn" type="button" data-clear>Limpar filtros</button></div>`;
  else box.innerHTML = rows.map(g => `
    <button class="lrow item${g.id === selId ? " sel" : ""}" type="button" data-id="${esc(g.id)}">
      <span class="c-n">${esc(g.nome)}</span>
      <span class="c-t">${esc(fmtTel(g.telefone))}</span>
      <span class="c-e" title="${esc((g.especialidades || []).join(", "))}">${esc((g.especialidades || []).join(", "))}</span>
      <span class="c-a">${g.aval}<span class="lbl"> ${g.aval === 1 ? "avaliação" : "avaliações"}</span></span>
      <span class="c-r"><b>${fmtNota(g.nota)}</b>${starsHTML(g.nota)}</span>
    </button>`).join("");
  renderPanel();
}
function fillSelect(sel, values, allLabel) {
  const cur = sel.value;
  const html = `<option value="">${allLabel}</option>` + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  if (sel.dataset.h !== html) { sel.innerHTML = html; sel.dataset.h = html; sel.value = values.includes(cur) ? cur : ""; }
}

/* ---------- painel do fornecedor ---------- */
function revsHTML(revs) {
  const list = [...revs];
  if (revSort === "maior") list.sort((a, b) => b.nota - a.nota || String(b.criado_em).localeCompare(String(a.criado_em)));
  if (revSort === "menor") list.sort((a, b) => a.nota - b.nota || String(b.criado_em).localeCompare(String(a.criado_em)));
  if (revSort === "fotos") list.sort((a, b) => (b.fotos || []).length - (a.fotos || []).length);
  return list.map(r => {
    const mine = minhaId() && r.autor_id === minhaId();
    return `<article class="rev">
      <div class="who"><div class="avatar" style="background:${colorFor(r.autor_id)}">${esc(initials(r.autor_nome))}</div>
        <div><b>${esc(r.autor_nome)}</b><small>Avaliação no Indicaí</small></div></div>
      <div class="rline">${starsHTML(r.nota)}<span>${quando(r.criado_em)}</span>${r.especialidade ? `<span>· ${esc(r.especialidade)}</span>` : ""}</div>
      <p>${esc(r.texto)}</p>
      ${(r.fotos || []).length ? `<div class="strip">${r.fotos.map(f => `<button type="button" data-img="${esc(fotoUrl(f))}"><img src="${esc(fotoUrl(f))}" alt="Foto do serviço" loading="lazy"></button>`).join("")}</div>` : ""}
      <div class="rev-acts">${mine ? `<button class="del" type="button" data-del="${esc(r.id)}">Excluir minha avaliação</button>` : ""}<button class="report" type="button" data-report="${esc(r.id)}">Denunciar</button></div>
    </article>`;
  }).join("");
}

async function carregarAvaliacoes(id, force) {
  if (revCache.has(id) && !force) return;
  revCache.set(id, null);
  const { data, error } = await sb.from("avaliacoes").select("id,fornecedor_id,nota,texto,especialidade,fotos,autor_id,autor_nome,criado_em").eq("fornecedor_id", id).order("criado_em", { ascending: false });
  revCache.set(id, error ? [] : data);
  if (selId === id) renderPanel();
}

function renderPanel() {
  const p = $("panel"), s = $("scrim");
  const g = lista.find(x => x.id === selId);
  if (!g) { if (!p.hidden) { p.hidden = true; s.hidden = true; p.innerHTML = ""; document.body.style.overflow = ""; } return; }
  if (!revCache.has(g.id)) carregarAvaliacoes(g.id);
  const revs = revCache.get(g.id);
  const keepScroll = !p.hidden ? p.scrollTop : 0;
  p.hidden = false; s.hidden = false; document.body.style.overflow = "hidden";
  const notas = (revs || []).map(r => r.nota);
  const dist = [5,4,3,2,1].map(n => ({ n, c: notas.filter(x => x === n).length }));
  const max = Math.max(1, ...dist.map(d => d.c));
  const f = (revs || []).flatMap(r => r.fotos || []).map(fotoUrl);
  const esps = (g.especialidades || []).join(", ");
  const cover = !f.length ? `<div class="ph" style="background:${colorFor(g.id)}">${esc(initials(g.nome))}</div>`
    : f.length < 3 ? `<button type="button" class="solo" data-img="${esc(f[0])}"><img src="${esc(f[0])}" alt="Foto do serviço"></button>`
    : `<button type="button" data-img="${esc(f[0])}"><img src="${esc(f[0])}" alt="Foto do serviço"></button><div class="side">${f.slice(1,3).map(x => `<button type="button" data-img="${esc(x)}"><img src="${esc(x)}" alt="Foto do serviço"></button>`).join("")}</div>`;
  const summary = `<div class="summary"><div class="dist">${dist.map(d => `<div><span>${d.n}</span><span class="bar"><span style="width:${d.c / max * 100}%"></span></span></div>`).join("")}</div>
      <div class="avg"><div class="n">${fmtNota(g.nota)}</div>${starsHTML(g.nota)}<div class="cnt">${plural(g.aval, "avaliação", "avaliações")}</div></div></div>`;
  const ask = `<div class="ask"><strong>Já contratou ${esc(g.nome.split(" ")[0])}?</strong><span class="note">Conte como foi</span><div class="row">${[1,2,3,4,5].map(n => `<button type="button" data-ask="${n}" aria-label="${n} estrela${n>1?"s":""}">★</button>`).join("")}</div></div>`;
  const loading = `<p class="note" style="padding-top:14px">Carregando avaliações…</p>`;
  let body = "";
  if (tab === "geral") body = `
    <ul class="info">
      <li>${ICON.phone}<div><span class="tel">${esc(fmtTel(g.telefone))}</span><small>Telefone</small></div></li>
      <li>${ICON.tool}<div>${esc(esps || "–")}<small>Especialidade</small></div></li>
      ${g.cidade ? `<li>${ICON.pin}<div>${esc(g.cidade)}<small>Cidade</small></div></li>` : ""}
      <li>${ICON.star}<div>${fmtNota(g.nota)} de 5 · ${plural(g.aval, "avaliação", "avaliações")}<small>Nota média</small></div></li>
    </ul>
    ${summary}${ask}
    ${!revs ? loading : revs.length ? `<div class="sorts"><b style="padding:5px 0">Avaliações recentes</b></div>${revsHTML(revs.slice(0, 2))}${revs.length > 2 ? `<p><button class="btn" type="button" data-tab="avaliacoes">Ver todas as ${revs.length} avaliações</button></p>` : ""}` : ""}`;
  else if (tab === "avaliacoes") body = `${summary}${ask}
    <div class="sorts">${[["recentes","Mais recentes"],["maior","Maior nota"],["menor","Menor nota"],["fotos","Com fotos"]].map(([k,l]) => `<button type="button" data-rsort="${k}" aria-pressed="${revSort === k}">${l}</button>`).join("")}</div>
    ${!revs ? loading : revs.length ? revsHTML(revs) : `<p class="note">Ainda sem avaliações.</p>`}`;
  else body = !revs ? loading : f.length ? `<div class="grid">${f.map(x => `<button type="button" data-img="${esc(x)}"><img src="${esc(x)}" alt="Foto do serviço" loading="lazy"></button>`).join("")}</div>` : `<p class="note" style="padding-top:14px">Ninguém enviou fotos deste fornecedor ainda.</p>`;

  p.innerHTML = `
    <div class="cover">${cover}<button class="x" type="button" data-close aria-label="Fechar">${ICON.back}</button></div>
    <div class="p-head"><h2>${esc(g.nome)}</h2>
      <div class="rline"><b>${fmtNota(g.nota)}</b>${starsHTML(g.nota)}<span class="cnt">(${g.aval})</span></div>
      <div class="meta">${esc(esps)}${g.cidade ? " · " + esc(g.cidade) : ""}</div></div>
    <div class="acts">
      <button class="act main" type="button" data-rate="${esc(g.id)}"><span class="ic">${ICON.pen}</span>Avaliar</button>
      <a class="act" href="https://wa.me/55${digits(g.telefone)}" target="_blank" rel="noopener"><span class="ic">${ICON.chat}</span>WhatsApp</a>
      <a class="act" href="tel:+55${digits(g.telefone)}" data-call><span class="ic">${ICON.phone}</span>Ligar</a>
      <button class="act" type="button" data-copy="${esc(fmtTel(g.telefone))}"><span class="ic">${ICON.copy}</span>Copiar telefone</button>
    </div>
    <div class="tabs" role="tablist">${[["geral","Visão geral"],["avaliacoes","Avaliações"],["fotos","Fotos"]].map(([k,l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${tab === k}">${l}</button>`).join("")}</div>
    <div class="pane">${body}</div>
    <div class="owner"><strong>É ${esc(g.nome.split(" ")[0])} ou trabalha com ${esc(g.nome.split(" ")[0])}?</strong><span>Peça a correção dos dados ou a remoção deste cadastro.</span><button class="btn" type="button" data-owner="${esc(g.id)}">Sou este profissional</button></div>`;
  p.scrollTop = keepScroll;
}

/* ---------- navegação ---------- */
function setHash(h) { try { history.replaceState(null, "", location.pathname + location.search + (h ? "#" + h : "")); } catch {} }
function openDetail(id) { selId = id; tab = "geral"; revSort = "recentes"; setHash("f-" + id); render(); $("panel").scrollTop = 0; }
function closeDetail() { selId = null; setHash(""); render(); }
function readHash() { const h = location.hash.replace(/^#/, ""); if (h.includes("access_token=") || h.includes("error=")) return; selId = h.startsWith("f-") ? decodeURIComponent(h.slice(2)) : null; }
window.addEventListener("hashchange", () => { readHash(); render(); });
$("scrim").addEventListener("click", closeDetail);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && selId && !$("dlg").open && !$("lightbox").open && !$("loginDlg").open && !$("pedidoDlg").open) closeDetail(); });

document.addEventListener("click", async (e) => {
  const t = e.target.closest("button"); if (!t) return;
  const ds = t.dataset;
  if (ds.id) openDetail(ds.id);
  else if (ds.k) { sort = { k: ds.k, dir: sort.k === ds.k ? (sort.dir === "asc" ? "desc" : "asc") : (["nome","tel","esp"].includes(ds.k) ? "asc" : "desc") }; render(); }
  else if ("close" in ds) closeDetail();
  else if ("new" in ds) openForm();
  else if ("clear" in ds) { ["fEsp","fCid","fNome","fTel"].forEach(id => $(id).value = ""); render(); }
  else if (ds.cat !== undefined) { $("fEsp").value = $("fEsp").value === ds.cat ? "" : ds.cat; render(); }
  else if (ds.tab) { tab = ds.tab; render(); $("panel").querySelector(".tabs").scrollIntoView({ block: "nearest" }); }
  else if (ds.rsort) { revSort = ds.rsort; render(); }
  else if (ds.rate) openForm(lista.find(x => x.id === ds.rate));
  else if (ds.ask) openForm(lista.find(x => x.id === selId), +ds.ask);
  else if (ds.report) abrirPedido("denuncia", { avaliacao: ds.report });
  else if (ds.owner) abrirPedido("profissional", { fornecedor: ds.owner });
  else if (ds.img) { $("lbImg").src = ds.img; $("lightbox").showModal(); }
  else if (ds.copy) { try { await navigator.clipboard.writeText(ds.copy); toast("Telefone copiado"); } catch { toast(ds.copy); } }
  else if (ds.del) {
    if (ds.confirm !== "1") { ds.confirm = "1"; t.textContent = "Toque de novo para excluir"; setTimeout(() => { if (t.isConnected) { ds.confirm = ""; t.textContent = "Excluir minha avaliação"; } }, 4000); return; }
    const rev = (revCache.get(selId) || []).find(r => r.id === ds.del);
    const { error } = await sb.from("avaliacoes").delete().eq("id", ds.del);
    if (error) { toast("Não foi possível excluir agora"); return; }
    if (rev && rev.fotos?.length) sb.storage.from("fotos").remove(rev.fotos);
    toast("Avaliação excluída"); await recarregar(selId);
  }
});
$("fEsp").addEventListener("change", render);
$("fCid").addEventListener("input", render);
let cidadesComFornecedor = [];
// filtro: primeiro as cidades que já têm fornecedores (com a quantidade), depois as demais do Brasil
autocomplete($("fCid"), (q) => {
  const n = norm(semUF(q)); if (!n) return [];
  const daLista = cidadesComFornecedor.filter(c => norm(semUF(c)).includes(n))
    .map(c => ({ label: c, extra: plural(lista.filter(g => g.cidade === c).length, "fornecedor", "fornecedores") }));
  const ja = new Set(daLista.map(x => norm(semUF(x.label))));
  return [...daLista, ...buscarCidades(q).filter(c => !ja.has(c.n)).map(c => ({ label: c.label }))].slice(0, 8);
}, render);
// formulário: só cidades oficiais
autocomplete($("iCid"), (q) => buscarCidades(q).map(c => ({ label: c.label })));
["fNome","fTel"].forEach(id => $(id).addEventListener("input", render));
$("search").addEventListener("submit", (e) => { e.preventDefault(); render(); $("results").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); });
$("sortSel").addEventListener("change", () => { const [k, dir] = $("sortSel").value.split(":"); sort = { k, dir }; render(); });
$("btnNew").addEventListener("click", () => openForm());
$("lbClose").addEventListener("click", () => $("lightbox").close());

/* ---------- login ---------- */
function renderAuth() {
  const u = sessao?.user;
  const nome = u ? (u.user_metadata?.full_name || u.user_metadata?.name || u.email || "Você").split(" ")[0] : "";
  $("authBox").innerHTML = u ? `<span class="me">Olá, ${esc(nome)}</span><button class="btn ghost" type="button" id="btnSair">Sair</button>` : `<button class="btn ghost" type="button" id="btnEntrar">Entrar</button>`;
  $("btnSair")?.addEventListener("click", async () => { ss.set("indicai:pendente", null); await sb.auth.signOut({ scope: "local" }); sessao = null; renderAuth(); render(); toast("Você saiu do Indicaí"); });
  $("btnEntrar")?.addEventListener("click", abrirLogin);
}
function abrirLogin() {
  $("inAppNote").hidden = !inApp; $("btnGoogle").hidden = inApp;
  $("loginDlg").showModal();
}
$("btnCopyLink").addEventListener("click", async () => {
  const url = location.origin + location.pathname;
  try { await navigator.clipboard.writeText(url); toast("Link copiado. Cole no Chrome ou Safari."); } catch { toast(url); }
});
async function entrarComGoogle() {
  // prompt=select_account: o Google sempre pergunta qual conta usar, em vez de entrar direto na última
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: "select_account" } } });
  if (error) toast("Não foi possível abrir o login do Google");
}
$("btnGoogle").addEventListener("click", entrarComGoogle);
$("btnLoginCancel").addEventListener("click", () => { ss.set("indicai:pendente", null); $("loginDlg").close(); });

/* ---------- formulário ---------- */
let nota = 0, fotos = [];
$("iEsp").innerHTML = `<option value="">Escolha…</option>` + ESPECIALIDADES.map(e => `<option>${e}</option>`).join("") + `<option value="__outra">Outra…</option>`;
$("iEsp").addEventListener("change", () => { $("outraWrap").hidden = $("iEsp").value !== "__outra"; });
$("pick").innerHTML = [1,2,3,4,5].map(n => `<button type="button" role="radio" aria-checked="false" aria-label="${n} estrela${n>1?"s":""} – ${NOTA_TXT[n]}" data-n="${n}">★</button>`).join("");
$("pick").addEventListener("click", (e) => { const b = e.target.closest("[data-n]"); if (b) { e.stopPropagation(); setNota(+b.dataset.n); } });
function setNota(n) { nota = n; $("pick").querySelectorAll("button").forEach(b => { b.classList.toggle("on", +b.dataset.n <= n); b.setAttribute("aria-checked", String(+b.dataset.n === n)); }); $("pickTxt").textContent = n ? `${n} – ${NOTA_TXT[n]}` : "Toque nas estrelas"; }
$("iTel").addEventListener("input", () => { const d = digits($("iTel").value).slice(0, 11); $("iTel").value = d.length > 2 ? fmtTel(d) || d : d; matchHint(); });
$("iNome").addEventListener("input", matchHint);
function matchHint() {
  const f = lista.find(x => x.id === keyOf($("iNome").value, $("iTel").value));
  $("matchHint").textContent = f && digits($("iTel").value).length >= 10 ? "Esse fornecedor já está no Indicaí. Sua avaliação vai somar às dele." : "";
  if (f && !$("iCid").value && f.cidade) $("iCid").value = f.cidade;
}
$("iFotos").addEventListener("change", () => {
  fotos = [...$("iFotos").files].filter(f => f.type.startsWith("image/")).slice(0, 5);
  $("previews").innerHTML = ""; fotos.forEach(f => { const i = document.createElement("img"); i.src = URL.createObjectURL(f); i.alt = ""; $("previews").appendChild(i); });
  $("formErr").textContent = $("iFotos").files.length > 5 ? "Só as 5 primeiras fotos serão enviadas." : "";
});
$("btnCancel").addEventListener("click", () => $("dlg").close());

function openForm(f, n) {
  if (!sb) return;
  if (!sessao) { ss.set("indicai:pendente", JSON.stringify({ id: f?.id || "", nota: n || 0 })); abrirLogin(); return; }
  $("form").reset(); setNota(n || 0); fotos = []; $("previews").innerHTML = ""; $("formErr").textContent = ""; $("outraWrap").hidden = true; $("matchHint").textContent = "";
  if (f) {
    $("iNome").value = f.nome; $("iTel").value = fmtTel(f.telefone); $("iCid").value = f.cidade || "";
    const e = (f.especialidades || [])[0];
    if (e) { if (ESPECIALIDADES.includes(e)) $("iEsp").value = e; else { $("iEsp").value = "__outra"; $("outraWrap").hidden = false; $("iOutra").value = e; } }
  }
  $("dlg").showModal();
  (f ? $("iTxt") : $("iNome")).focus();
}
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file); const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(b => r(b || file), "image/jpeg", 0.85));
  } catch { return file; }
}
const ERROS = {
  login_necessario: "Entre com sua conta Google para publicar.",
  telefone_invalido: "Informe o telefone com DDD (10 ou 11 dígitos).",
  nome_invalido: "Use letras ou números no nome.",
  foto_invalida: "Não foi possível anexar as fotos. Tente enviá-las de novo.",
  declaracao_necessaria: "Marque a declaração para publicar."
};
$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = $("iNome").value.trim().replace(/\s+/g, " "), tel = digits($("iTel").value), cidadeDigitada = $("iCid").value.trim().replace(/\s+/g, " ");
  let cidade = cidadeDigitada;
  let esp = $("iEsp").value === "__outra" ? $("iOutra").value.trim() : $("iEsp").value; if (esp) esp = esp[0].toUpperCase() + esp.slice(1);
  const texto = $("iTxt").value.trim(); const err = (m) => { $("formErr").textContent = m; };
  if (!nome) return err("Informe o nome do fornecedor.");
  if (tel.length < 10) return err(ERROS.telefone_invalido);
  if (!slug(nome)) return err(ERROS.nome_invalido);
  if (!esp || esp.length < 2) return err("Escolha a especialidade.");
  if (!nota) return err("Escolha uma nota de 1 a 5 estrelas.");
  if (texto.length < 5) return err("Escreva uma frase curta explicando a nota.");
  if (!$("iDecl").checked) return err("Marque a declaração para publicar.");
  if (cidade) {
    const exata = CID_POR_LABEL.get(norm(cidade));
    if (exata) cidade = exata.label;
    else {
      const mesmas = CIDADES.filter(c => c.n === norm(semUF(cidade)));
      if (mesmas.length === 1) cidade = mesmas[0].label;
      else if (mesmas.length > 1) return err(`Existe "${semUF(cidade)}" em mais de um estado. Escolha a cidade na lista.`);
      else return err("Cidade não encontrada. Digite e escolha uma cidade da lista.");
    }
  }
  err(""); const btn = $("btnSave"); btn.disabled = true;
  const enviadas = [];
  try {
    for (let i = 0; i < fotos.length; i++) {
      btn.textContent = `Enviando foto ${i + 1} de ${fotos.length}…`;
      const blob = await shrink(fotos[i]);
      const path = `${minhaId()}/${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from("fotos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw { message: "foto_upload" };
      enviadas.push(path);
    }
    btn.textContent = "Publicando…";
    const { data: id, error } = await sb.rpc("adicionar_avaliacao", { p_nome: nome, p_telefone: tel, p_cidade: cidade, p_especialidade: esp, p_nota: nota, p_texto: texto, p_fotos: enviadas, p_declaracao: true });
    if (error) throw error;
    $("dlg").close(); toast("Avaliação publicada");
    await recarregar(id); selId = id; tab = "avaliacoes"; setHash("f-" + id); render();
  } catch (x) {
    if (enviadas.length) sb.storage.from("fotos").remove(enviadas);
    const msg = String(x?.message || "");
    const k = Object.keys(ERROS).find(k => msg.includes(k));
    err(k ? ERROS[k] : x?.code === "23505" ? "Você já avaliou este fornecedor. Exclua a avaliação anterior para enviar outra."
      : msg === "foto_upload" ? "Não foi possível enviar as fotos. Use JPG ou PNG de até 5 MB."
      : "Não foi possível publicar agora. Tente de novo em instantes.");
  } finally { btn.disabled = false; btn.textContent = "Publicar avaliação"; }
});

/* ---------- pedidos de remoção/correção e denúncias ---------- */
const MOTIVOS = {
  denuncia: ["Avaliação falsa (não houve contratação)", "Conteúdo ofensivo", "Expõe dados pessoais de alguém", "Outro motivo"],
  profissional: ["Quero remover meu cadastro", "Quero corrigir meus dados", "Este telefone não é meu / não sou prestador"]
};
let pedido = null;
function abrirPedido(tipo, ref) {
  if (!sb) return;
  pedido = { tipo, ...ref };
  const g = lista.find(x => x.id === (ref.fornecedor || selId));
  $("pTitulo").textContent = tipo === "denuncia" ? "Denunciar avaliação" : "Sou este profissional";
  $("pIntro").textContent = tipo === "denuncia"
    ? "Conte o problema. Avaliações falsas, ofensivas ou com dados pessoais de terceiros são removidas."
    : `Peça a remoção ou a correção do cadastro de ${g ? g.nome : "este profissional"}. Para confirmar que é você, entramos em contato pelo meio que informar abaixo.`;
  $("pMotivo").innerHTML = MOTIVOS[tipo].map(m => `<option>${esc(m)}</option>`).join("");
  $("pDetalhes").value = ""; $("pContato").value = ""; $("pErr").textContent = "";
  $("pContatoLbl").textContent = tipo === "denuncia" ? "Seu e-mail ou WhatsApp (opcional)" : "Seu e-mail ou WhatsApp para retorno";
  $("pEmail").textContent = EMAIL_CONTATO;
  $("pedidoDlg").showModal();
}
$("pCancel").addEventListener("click", () => $("pedidoDlg").close());
$("pedidoForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const motivo = $("pMotivo").value, detalhes = $("pDetalhes").value.trim(), contato = $("pContato").value.trim();
  if (pedido.tipo === "profissional" && contato.length < 6) { $("pErr").textContent = "Informe um e-mail ou WhatsApp para respondermos."; return; }
  const tipo = pedido.tipo === "denuncia" ? "denuncia" : (motivo.startsWith("Quero corrigir") ? "correcao" : "remocao");
  const btn = $("pEnviar"); btn.disabled = true;
  const { error } = await sb.from("solicitacoes").insert({
    tipo, motivo, detalhes: detalhes || null, contato: contato || null,
    fornecedor_id: pedido.fornecedor || selId || null, avaliacao_id: pedido.avaliacao || null
  });
  btn.disabled = false;
  if (error) { $("pErr").textContent = `Não foi possível enviar agora. Escreva para ${EMAIL_CONTATO}.`; return; }
  $("pedidoDlg").close(); toast("Pedido recebido. Respondemos em até 15 dias.");
});

/* ---------- dados ---------- */
async function carregarLista() {
  const { data, error } = await sb.from("fornecedores_resumo").select("*");
  if (error) { $("rows").innerHTML = `<div class="empty"><strong>Não foi possível carregar os fornecedores</strong><span>Verifique sua conexão e recarregue a página.</span></div>`; return; }
  lista = data.map(g => ({ ...g, cidade: cidadeOficial(g.cidade) })); carregado = true; render();
}
async function recarregar(id) { if (id) revCache.delete(id); await carregarLista(); if (id) await carregarAvaliacoes(id, true); }

/* ---------- início ---------- */
readHash(); render();
(async () => {
  if (!CFG.supabaseUrl || !CFG.supabaseAnonKey || CFG.supabaseUrl.includes("COLE_AQUI")) {
    $("rows").innerHTML = `<div class="empty"><strong>Site ainda não configurado</strong><span>Preencha o arquivo config.js com os dados do Supabase.</span></div>`;
    return;
  }
  if (!window.supabase) {
    $("rows").innerHTML = `<div class="empty"><strong>Não foi possível carregar o site</strong><span>Um componente não carregou. Recarregue a página; se continuar, desative bloqueadores de anúncio para este site.</span></div>`;
    return;
  }
  sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
  const { data } = await sb.auth.getSession(); sessao = data.session; renderAuth();
  sb.auth.onAuthStateChange((_ev, s) => { sessao = s; renderAuth(); render(); });
  // erro devolvido pelo Google/Supabase no retorno do login
  const ret = new URLSearchParams(location.hash.slice(1) + "&" + location.search.slice(1));
  if (ret.get("error")) {
    toast("Não foi possível entrar: " + (ret.get("error_description") || ret.get("error")).replace(/\+/g, " "));
    try { history.replaceState(null, "", location.pathname); } catch {}
  }
  await carregarLista();
  const pend = ss.get("indicai:pendente");
  if (pend && sessao) { ss.set("indicai:pendente", null); try { const p = JSON.parse(pend); const f = lista.find(x => x.id === p.id); if (f) { selId = f.id; setHash("f-" + f.id); render(); } openForm(f, p.nota); } catch {} }
})();
