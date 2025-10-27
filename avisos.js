import { db, auth } from "./firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    const ADMIN_LIST = ["6266","6414","5354","4144","70029"];
    const lista = document.getElementById('avisosList');
    const controls = document.getElementById('avisosControls');

    function isAdminByEmail(email){
        if(!email) return false;
        const mat = email.split('@')[0];
        return ADMIN_LIST.includes(mat);
    }

    function formatTimestamp(ts){
        if(!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    }

    function renderItem(id, data, currentUserIsAdmin){
        const li = document.createElement('li');
        li.className = 'aviso' + (data.riscado ? ' riscado' : '');
        
        // checkbox
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!data.riscado;
        cb.disabled = !currentUserIsAdmin;
        cb.addEventListener('change', async ()=>{
            try{
                await updateDoc(doc(db,'avisos',id), { riscado: cb.checked, baixaTimestamp: serverTimestamp() });
            }catch(e){ console.error('update riscado',e); alert('Erro ao salvar'); }
        });
        li.appendChild(cb);

        // content
        const content = document.createElement('div');
        content.className = 'content';

        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = data.titulo || '';

        const body = document.createElement('div');
        body.className = 'body';
        body.textContent = data.conteudo || '';

        // timestamps
        const tsCreated = document.createElement('div');
        tsCreated.className = 'timestamp';
        tsCreated.textContent = 'Criado: ' + formatTimestamp(data.data);

        const tsBaixa = document.createElement('div');
        tsBaixa.className = 'timestamp';
        tsBaixa.textContent = data.riscado ? 'Baixa: ' + formatTimestamp(data.baixaTimestamp) : '';

        content.appendChild(title);
        content.appendChild(body);
        content.appendChild(tsCreated);
        content.appendChild(tsBaixa);

        if(currentUserIsAdmin){
            title.setAttribute('contenteditable','true');
            body.setAttribute('contenteditable','true');

            const saveFn = async ()=>{
                try{
                    await updateDoc(doc(db,'avisos',id), { titulo: title.textContent, conteudo: body.textContent, data: serverTimestamp() });
                }catch(e){ console.error('save edit',e); alert('Erro ao salvar'); }
            };
            title.addEventListener('blur', saveFn);
            body.addEventListener('blur', saveFn);
        }

        li.appendChild(content);

        if(currentUserIsAdmin){
            const actions = document.createElement('div');
            actions.className = 'actions';

            const del = document.createElement('button');
            del.className = 'delBtn';
            del.innerHTML = '🗑️';
            del.title = 'Remover aviso';
            del.addEventListener('click', async ()=>{
                if(!confirm('Remover aviso?')) return;
                try{ await deleteDoc(doc(db,'avisos',id)); }
                catch(e){ console.error(e); alert('Erro ao remover'); }
            });

            actions.appendChild(del);
            li.appendChild(actions);
        }

        return li;
    }

    onAuthStateChanged(auth, async (user)=>{
        if(!user) return;

        const isAdmin = isAdminByEmail(user.email);

        // adicionar botão "Adicionar aviso" se for admin
        controls.innerHTML = '';
        if(isAdmin){
            const addBtn = document.createElement('button');
            addBtn.className = 'adminBtn';
            addBtn.textContent = 'Adicionar aviso';
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

});
