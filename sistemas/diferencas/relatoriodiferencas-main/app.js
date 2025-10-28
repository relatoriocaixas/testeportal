// ===== IMPORTS =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, getDoc, doc, query, where, orderBy, limit, updateDoc, deleteDoc, serverTimestamp, Timestamp 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { firebaseConfig } from "./firebaseConfig.js";

// ===== INIT =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ===== CONFIG LOCAL =====
const ADMIN_MATS = ["6266", "4144", "70029"];
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const el = id => document.getElementById(id);
const qsel = sel => document.querySelectorAll(sel);

let CURRENT_USER = null;
let CURRENT_USER_DATA = null;
let IS_ADMIN = false;
let POS_CURRENT = { id: null, matricula: null };

// ===== HELPERS =====
function formatDateBR(ts) {
  const d = ts instanceof Date ? ts : ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-BR');
}

function parseDateInput(value) {
  const [y,m,d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y,m-1,d);
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

// ===== DASHBOARD =====
onAuthStateChanged(auth, async (user) => {
  if (!user) return; // não desloga portal inteiro
  CURRENT_USER = user;

  const us = await getDoc(doc(db,"usuarios", user.uid));
  CURRENT_USER_DATA = us.exists() ? us.data() : { matricula:(user.email||"").split("@")[0], nome:"" };
  IS_ADMIN = ADMIN_MATS.includes(CURRENT_USER_DATA.matricula);

  // UI Roles
  qsel(".admin-only").forEach(b=>b.hidden = !IS_ADMIN);
  qsel(".user-only").forEach(b=>b.hidden = IS_ADMIN);

  // Binds
  el("btnLogout")?.addEventListener("click", async ()=>{ await signOut(auth); location.href="/"; });
  el("btnAlterarSenha")?.addEventListener("click", async ()=>{
    const nova = prompt("Nova senha:");
    if(!nova) return;
    try{ await updatePassword(auth.currentUser,nova); alert("Senha alterada."); }
    catch(e){ alert("Erro: "+e.message); }
  });

  el("mesResumo") && (el("mesResumo").value = getCurrentMonthValue());

  // Inputs cálculo sobra/falta
  ["valorFolha","valorDinheiro"].forEach(id=>{
    el(id)?.addEventListener("input", ()=>{
      const vf = parseFloat(el("valorFolha")?.value||0);
      const vd = parseFloat(el("valorDinheiro")?.value||0);
      if(el("sobraFalta")) el("sobraFalta").value = BRL.format(vd-vf);
    });
  });

  // Binds relatórios e filtros
  el("btnSalvarRelatorio")?.addEventListener("click", salvarRelatorioAdmin);
  el("btnCarregarResumo")?.addEventListener("click", carregarListaPadrao);
  el("btnAplicarFiltroMatricula")?.addEventListener("click", filtrarPorMatricula);
  el("btnFiltrarPorData")?.addEventListener("click", filtrarPorData);

  // Pós conferência modal
  el("posClose")?.addEventListener("click", ()=> el("posModal") && (el("posModal").style.display='none'));
  el("posUpload")?.addEventListener("click", async () => {
    if(!el("posImagem")?.files?.[0]){ alert("Escolha uma imagem"); return; }
    const file = el("posImagem").files[0];
    const path = `posConferencia/${POS_CURRENT.matricula}/${POS_CURRENT.id}/${file.name}`;
    try { await uploadBytes(ref(storage, path), file); alert("Imagem anexada."); } 
    catch(e){ alert("Erro ao anexar: "+e.message); }
  });
  el("posVerImagem")?.addEventListener("click", async ()=>{
    try {
      const base = `posConferencia/${POS_CURRENT.matricula}/${POS_CURRENT.id}`;
      const tryNames = ['anexo.jpg','anexo.png','anexo.jpeg'];
      for(const name of tryNames){
        try{
          const url = await getDownloadURL(ref(storage, `${base}/${name}`));
          window.open(url,'_blank'); return;
        }catch(e){}
      }
      alert("Nenhuma imagem padrão encontrada (anexo.jpg/png/jpeg).");
    }catch(e){ alert("Erro: "+e.message); }
  });
  el("posExcluirImagem")?.addEventListener("click", async ()=>{
    const nome = prompt("Digite o nome exato do arquivo para excluir (ex.: anexo.jpg)");
    if(!nome) return;
    try { await deleteObject(ref(storage, `posConferencia/${POS_CURRENT.matricula}/${POS_CURRENT.id}/${nome}`)); alert("Imagem excluída."); }
    catch(e){ alert("Erro ao excluir: "+e.message); }
  });
  el("posSalvar")?.addEventListener("click", async ()=>{
    const txt = el("posTexto")?.value.trim();
    if(!txt){ alert("Digite um texto."); return; }
    try { await updateDoc(doc(db,'relatorios', POS_CURRENT.id), { posTexto: txt, posEditado: true }); alert("Pós conferência salva."); }
    catch(e){ alert("Erro ao salvar: "+e.message); }
    if(el("posModal")) el("posModal").style.display='none';
    carregarListaPadrao();
  });

  await popularMatriculasSelects();
  await carregarListaPadrao();
});

// ===== POPULAR SELECTS =====
async function popularMatriculasSelects() {
  if(!IS_ADMIN) return;
  const snap = await getDocs(collection(db,"usuarios"));
  const users = snap.docs.map(d=>d.data()).sort((a,b)=>(a.matricula||"").localeCompare(b.matricula||""));
  const options = users.map(u=>`<option value="${u.matricula}">${u.matricula} — ${u.nome||""}</option>`).join("");
  if(el("matriculaForm")) el("matriculaForm").innerHTML = options;
  if(el("filtroMatricula")) el("filtroMatricula").innerHTML = '<option value="">Selecione...</option>'+options;
  if(el("selectMatriculas")) el("selectMatriculas").innerHTML = options;
}

// ===== SALVAR RELATÓRIO =====
async function salvarRelatorioAdmin() {
  if(!IS_ADMIN){ alert("Apenas admins."); return; }
  const matricula = el("matriculaForm")?.value;
  const data = parseDateInput(el("dataCaixa")?.value);
  const vf = parseFloat(el("valorFolha")?.value||0);
  const vd = parseFloat(el("valorDinheiro")?.value||0);
  const obs = el("observacao")?.value||"";
  if(!matricula||!data){ alert("Preencha matrícula e data."); return; }

  try{
    await addDoc(collection(db,"relatorios"),{
      matricula,
      dataCaixa: Timestamp.fromDate(data),
      valorFolha: vf,
      valorDinheiro: vd,
      sobraFalta: vd-vf,
      observacao: obs,
      posTexto:"",
      posEditado:false,
      imagemPath:"",
      criadoEm: serverTimestamp(),
      createdBy: CURRENT_USER.uid
    });
    alert("Relatório salvo.");
    ["dataCaixa","valorFolha","valorDinheiro","observacao","sobraFalta"].forEach(id=>el(id) && (el(id).value=""));
    carregarListaPadrao();
  }catch(e){ alert("Erro: "+e.message); }
}

// ===== CARREGAR LISTA =====
async function carregarListaPadrao() {
  let qy;
  if(IS_ADMIN){
    qy = query(collection(db,"relatorios"), orderBy("dataCaixa","desc"));
  }else{
    qy = query(collection(db,"relatorios"),
      where("matricula","==",CURRENT_USER_DATA.matricula),
      orderBy("dataCaixa","desc"), limit(31));
  }
  const snap = await getDocs(qy);
  renderLista(snap.docs.map(d=>({id:d.id, ...d.data()})));
}

// ===== FILTROS =====
async function filtrarPorMatricula(){
  if(!IS_ADMIN) return;
  const mat = el("filtroMatricula")?.value;
  if(!mat){ alert("Selecione uma matrícula."); return; }
  const qy = query(collection(db,"relatorios"), where("matricula","==",mat), orderBy("dataCaixa","desc"), limit(31));
  const snap = await getDocs(qy);
  renderLista(snap.docs.map(d=>({id:d.id, ...d.data()})));
  if(el("selectMatriculas")) el("selectMatriculas").value = mat;
}

async function filtrarPorData(){
  const val = el("filtroDataGlobal")?.value;
  if(!val){ alert("Escolha uma data."); return; }
  const d = parseDateInput(val);
  const start = new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,0,0,0);
  const end = new Date(d.getFullYear(),d.getMonth(),d.getDate(),23,59,59,999);
  let qy = query(collection(db,"relatorios"),
    where("dataCaixa",">=",Timestamp.fromDate(start)),
    where("dataCaixa","<=",Timestamp.fromDate(end)),
    orderBy("dataCaixa","desc"));
  const snap = await getDocs(qy);
  let docs = snap.docs.map(d=>({id:d.id,...d.data()}));
  if(!IS_ADMIN) docs = docs.filter(r=>r.matricula===CURRENT_USER_DATA.matricula);
  renderLista(docs);
}

// ===== RENDER LISTA =====
function renderLista(rows){
  const lista = el("listaRelatorios");
  if(!lista) return;
  lista.innerHTML="";
  rows.forEach(r=>{
    const wrap = document.createElement("div");
    wrap.className="item";
    const warn = r.posTexto && r.posTexto.trim() ? '<span class="badge warn">⚠️ verificar pós conferência</span>':'';
    wrap.innerHTML = `
      <div class="item-header">
        <div class="item-title">${formatDateBR(r.dataCaixa)} — Matrícula ${r.matricula} ${warn}</div>
        <div class="controls">
          <button class="btn outline btnToggle">Esconder/Exibir</button>
          <button class="btn outline btnPos">Pós Conferência</button>
          ${IS_ADMIN ? '<button class="btn outline btnEdit">Editar</button>':""}
          ${IS_ADMIN ? '<button class="btn danger btnDelete">Excluir</button>':""}
        </div>
      </div>
      <div class="item-body collapsed">
        <div class="field"><div>Data do Caixa</div><div>${formatDateBR(r.dataCaixa)}</div></div>
        <div class="field"><div>Valor Folha</div><div class="money">${BRL.format(r.valorFolha||0)}</div></div>
        <div class="field"><div>Valor Dinheiro</div><div class="money">${BRL.format(r.valorDinheiro||0)}</div></div>
        <div class="field"><div>Sobra/Falta</div><div class="money">${BRL.format((r.valorDinheiro||0)-(r.valorFolha||0))}</div></div>
        <div class="field"><div>Observação</div><div>${(r.observacao||"").replace(/[<>&]/g,'')}</div></div>
      </div>
    `;
    const body = wrap.querySelector(".item-body");
    wrap.querySelector(".btnToggle")?.addEventListener("click",()=>body.classList.toggle("collapsed"));
    wrap.querySelector(".btnPos")?.addEventListener("click", ()=>abrirPosConferencia(r.id, r.matricula));
    wrap.querySelector(".btnDelete")?.addEventListener("click", async ()=>{
      if(confirm("Excluir relatório?")){
        try{ await deleteDoc(doc(db,"relatorios",r.id)); alert("Excluído."); carregarListaPadrao(); }
        catch(e){ alert("Erro: "+e.message); }
      }
    });
    wrap.querySelector(".btnEdit")?.addEventListener("click", ()=>{
      el("matriculaForm") && (el("matriculaForm").value = r.matricula);
      el("dataCaixa") && (el("dataCaixa").value = r.dataCaixa.toDate().toISOString().split('T')[0]);
      el("valorFolha") && (el("valorFolha").value = r.valorFolha||0);
      el("valorDinheiro") && (el("valorDinheiro").value = r.valorDinheiro||0);
      el("observacao") && (el("observacao").value = r.observacao||"");
    });
    lista.appendChild(wrap);
  });
}

// ===== ABRIR PÓS CONFERÊNCIA =====
function abrirPosConferencia(id, matricula){
  POS_CURRENT = { id, matricula };
  if(el("posModal")) el("posModal").style.display='flex';
  if(el("posAdminArea")) el("posAdminArea").style.display = IS_ADMIN ? 'block':'none';
  if(el("posExcluirImagem")) el("posExcluirImagem").style.display = IS_ADMIN ? 'inline-block':'none';
}
