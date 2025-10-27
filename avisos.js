import { db, auth } from "./firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const ADMIN_LIST = ["6266","6414","5354","4144","70029"];
const lista = document.getElementById('avisosList');
const controls = document.getElementById('avisosControls');

function isAdminByEmail(email){
    if(!email) return false;
    const mat = email.split('@')[0];
    return ADMIN_LIST.includes(mat);
}

function renderItem(id, data, currentUserIsAdmin){
    const tr = document.createElement('tr');
    if(data.riscado) tr.classList.add('aviso-riscado');

    // Checkbox
    const tdCheckbox = document.createElement('td');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!data.riscado;
    cb.disabled = !currentUserIsAdmin;
    cb.addEventListener('change', async ()=>{
        try{
            await updateDoc(doc(db,'avisos',id), { riscado: cb.checked });
        }catch(e){ console.error('update riscado',e); alert('Erro ao salvar'); }
    });
    tdCheckbox.appendChild(cb);
    tr.appendChild(tdCheckbox);

    // Data
    const tdData = document.createElement('td');
    const dataObj = data.data?.toDate ? data.data.toDate() : new Date();
    tdData.textContent = `${String(dataObj.getDate()).padStart(2,'0')}/${String(dataObj.getMonth()+1).padStart(2,'0')}/${dataObj.getFullYear()}`;
    tr.appendChild(tdData);

    // Mensagem
    const tdMsg = document.createElement('td');
    tdMsg.textContent = `${data.titulo || ''} - ${data.conteudo || ''}`;
    if(currentUserIsAdmin){
        tdMsg.setAttribute('contenteditable','true');
        tdMsg.addEventListener('blur', async ()=>{
            try{
                await updateDoc(doc(db,'avisos',id), { titulo: data.titulo, conteudo: tdMsg.textContent, data: serverTimestamp() });
            }catch(e){ console.error('save edit',e); alert('Erro ao salvar'); }
        });
    }
    tr.appendChild(tdMsg);

    // Ações (Excluir)
    const tdActions = document.createElement('td');
    if(currentUserIsAdmin){
        const del = document.createElement('button');
        del.className = 'deleteAvisoBtn';
        del.innerHTML = '🗑️';
        del.addEventListener('click', async ()=>{
            if(!confirm('Remover aviso?')) return;
            try{ await deleteDoc(doc(db,'avisos',id)); }catch(e){ console.error(e); alert('Erro ao remover'); }
        });
        tdActions.appendChild(del);
    }
    tr.appendChild(tdActions);

    return tr;
}

onAuthStateChanged(auth, async (user)=>{
    if(!user) return;
    const isAdmin = isAdminByEmail(user.email);

    // Botão adicionar aviso
    controls.innerHTML = '';
    if(isAdmin){
        const addBtn = document.createElement('button');
        addBtn.id = 'addAvisoBtn';
        addBtn.textContent = 'Adicionar Aviso';
        addBtn.style.backgroundColor = '#4da6ff';
        addBtn.style.color = '#fff';
        addBtn.style.border = 'none';
        addBtn.style.borderRadius = '8px';
        addBtn.style.padding = '8px 12px';
        addBtn.style.cursor = 'pointer';
        addBtn.style.fontWeight = 'bold';
        addBtn.addEventListener('click', async ()=>{
            const t = prompt('Título:');
            if(t===null) return;
            const m = prompt('Mensagem:');
            if(m===null) return;
            try{
                await addDoc(collection(db,'avisos'), { titulo: t, conteudo: m, data: serverTimestamp(), riscado: false, autor: user.email });
            }catch(e){ console.error('add aviso',e); alert('Erro ao criar aviso'); }
        });
        controls.appendChild(addBtn);
    }

    // Listen avisos
    const q = query(collection(db,'avisos'), orderBy('data','desc'));
    onSnapshot(q, (snap)=>{
        lista.innerHTML = '';
        snap.forEach(d=>{
            lista.appendChild(renderItem(d.id, d.data(), isAdmin));
        });
    }, (err)=>{
        console.error('snapshot error avisos', err);
        if(err && err.code && err.code.includes('permission')) alert('Permissão negada ao ler avisos. Verifique regras Firestore.');
    });
});
