
async function sendAuthToIframe(){
    try{
        const user = auth.currentUser;
        if(!user) return;
        const parts = (user.email||'').split('@');
        const idToken = await user.getIdToken();
        const payload = { type:'syncAuth', usuario:{ matricula: parts[0]||'', email: user.email||'', nome: user.displayName||'' }, idToken };
        const iframe = document.getElementById('mainFrame');
        if(iframe && iframe.contentWindow){
            iframe.contentWindow.postMessage(payload, '*');
        }
    }catch(e){ console.warn('sendAuthToIframe error', e); }
}

import { auth } from "./firebaseConfig.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const ADMIN_LIST = ["6266","6414","5354","4144","70029"];

const sidebar = document.getElementById('sidebar');
const logoutBtn = document.getElementById('logoutBtn');
const frame = document.getElementById('mainFrame');
const iframeContainer = document.getElementById('iframeContainer');
const avisosSection = document.getElementById('avisosSection');

const ROUTES = {
  home: null,
  abastecimento: "sistemas/abastecimento/index.html",
  emprestimo: "sistemas/emprestimo/index.html",
  relatorios: "sistemas/emprestimo/emprestimocartao-main/relatorio.html",
  diferencas: "sistemas/diferencas/index.html"
};

function goHome(){ iframeContainer.classList.remove('full'); iframeContainer.style.display='none'; avisosSection.style.display='block'; sidebar.style.display='flex'; }
function openRoute(route){
    const src = ROUTES[route];
    if(!src){ goHome(); return; }
    avisosSection.style.display='none';
    iframeContainer.style.display='block';
    iframeContainer.classList.add('full');
    frame.src = src; setTimeout(sendAuthToIframe,500);
}

document.querySelectorAll('.sidebar li').forEach(li=>{
    li.addEventListener('click', ()=> {
        const t = li.dataset.target;
        if(t === 'home') goHome();
        else openRoute(t);
    });
});


onAuthStateChanged(auth, (user)=>{
    if(!user){
        window.location.href = 'login.html';
    }else{
        sidebar.classList.remove('hidden');
        // set badge
        const topbar = document.querySelector('.topbar');
        const badge = document.createElement('div');
        badge.className='badge';
        const parts = (user.email||'').split('@');
        badge.textContent = (user.displayName || 'Usuário') + ' • ' + (parts[0] || '');
        topbar.appendChild(badge);
        goHome();

        // send auth info to iframe(s) so internal sites can set localStorage and avoid re-login
        try {
            user.getIdToken().then(function(idToken){
                const payload = {
                    type: 'syncAuth',
                    usuario: {
                        matricula: parts[0] || '',
                        email: user.email || '',
                        nome: user.displayName || ''
                    },
                    idToken: idToken
                };
                const iframe = document.getElementById('mainFrame');
                if(iframe && iframe.contentWindow){
                    iframe.contentWindow.postMessage(payload, '*');
                }
            });
        } catch(e){
            console.warn('erro ao enviar token ao iframe', e);
        }
    }
});

logoutBtn.addEventListener('click', async ()=>{
    await signOut(auth);
    window.location.href = 'login.html';
});

// criar botão alterar senha
const changePassBtn = document.createElement('button');
changePassBtn.id = 'changePassBtn';
changePassBtn.textContent = 'Alterar Senha';
changePassBtn.style.backgroundColor = '#4da6ff'; // azul claro
changePassBtn.style.color = '#fff';
changePassBtn.style.border = 'none';
changePassBtn.style.borderRadius = '8px';
changePassBtn.style.padding = '8px 12px';
changePassBtn.style.cursor = 'pointer';
changePassBtn.style.marginBottom = '8px';

// insere o botão acima do logout
logoutBtn.parentNode.insertBefore(changePassBtn, logoutBtn);

// adiciona funcionalidade
changePassBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if(!user) return alert('Usuário não autenticado');
    const nova = prompt('Digite a nova senha:');
    if(!nova) return;
    try {
        await user.updatePassword(nova);
        alert('Senha alterada com sucesso.');
    } catch(e) {
        alert('Erro ao alterar senha: ' + (e?.message || e));
    }
});
