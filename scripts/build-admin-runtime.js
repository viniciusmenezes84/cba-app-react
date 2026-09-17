const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'src', 'AdminDashboardBridge.js');
const outPath = path.join(__dirname, '..', 'src', 'AdminDashboardBridge.runtime.js');
let source = fs.readFileSync(srcPath, 'utf8');

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) {
    throw new Error(`Admin runtime patch não encontrou: ${label}`);
  }
  source = source.replace(from, to);
};

replaceOnce(
  "      const email = String(user?.email || parsed?.email || '').toLowerCase();\n      if (token && email) return { token, email, user };",
  "      const email = String(user?.email || parsed?.email || '').toLowerCase();\n      const role = String(user?.role || parsed?.role || parsed?.user?.role || '').toUpperCase();\n      if (token && email) return { token, email, role, user };",
  'role no localStorage'
);

replaceOnce(
  "      return { token: parsed?.token, email: String(parsed?.email || parsed?.user?.email || '').toLowerCase(), user: parsed?.user || parsed };",
  "      return { token: parsed?.token, email: String(parsed?.email || parsed?.user?.email || '').toLowerCase(), role: String(parsed?.role || parsed?.user?.role || '').toUpperCase(), user: parsed?.user || parsed };",
  'role no sessionStorage'
);

source = source.replaceAll(
  "{ enabled: false, email: '', password: '', status: 'approved' }",
  "{ enabled: false, email: '', password: '', role: 'MEMBER', status: 'approved' }"
);

replaceOnce(
  "setAccount({ enabled: Boolean(selectedAccount && selectedAccount.status === 'approved'), email: selectedAccount?.email || '', password: '', status: selectedAccount?.status || 'approved' });",
  "setAccount({ enabled: Boolean(selectedAccount && selectedAccount.status === 'approved'), email: selectedAccount?.email || '', password: '', role: selectedAccount?.role || 'MEMBER', status: selectedAccount?.status || 'approved' });",
  'perfil da conta existente'
);

replaceOnce(
  "onChange={e=>setAccount({...account,enabled:e.target.checked})}/>",
  "onChange={e=>setAccount({...account,enabled:e.target.checked,status:e.target.checked?'approved':'disabled'})}/>",
  'reativação de conta'
);

replaceOnce(
  "{account.enabled && <div className=\"grid sm:grid-cols-2 gap-4 mt-4\"><Field label=\"E-mail\"><input type=\"email\" className={inputClass} value={account.email} disabled={selectedAccount?.email?.toLowerCase()===ADMIN_EMAIL} onChange={e=>setAccount({...account,email:e.target.value})}/></Field><Field label={selectedAccount ? 'Nova senha (opcional)' : 'Senha inicial'} hint=\"Mínimo de 10 caracteres.\"><input type=\"password\" className={inputClass} value={account.password} onChange={e=>setAccount({...account,password:e.target.value})}/></Field></div>}",
  "{account.enabled && <div className=\"grid sm:grid-cols-3 gap-4 mt-4\"><Field label=\"E-mail\"><input type=\"email\" className={inputClass} value={account.email} disabled={selectedAccount?.email?.toLowerCase()===ADMIN_EMAIL} onChange={e=>setAccount({...account,email:e.target.value})}/></Field><Field label=\"Perfil de acesso\"><select className={inputClass} value={account.role || 'MEMBER'} disabled={selectedAccount?.email?.toLowerCase()===ADMIN_EMAIL} onChange={e=>setAccount({...account,role:e.target.value})}><option value=\"MEMBER\">Membro</option><option value=\"ADMIN\">Administrador</option></select></Field><Field label={selectedAccount ? 'Nova senha (opcional)' : 'Senha inicial'} hint=\"Mínimo de 10 caracteres.\"><input type=\"password\" className={inputClass} value={account.password} onChange={e=>setAccount({...account,password:e.target.value})}/></Field></div>}",
  'seletor de perfil'
);

replaceOnce(
  "<p className=\"text-[10px] text-slate-600 px-3\">Acesso exclusivo<br/>{ADMIN_EMAIL}</p>",
  "<p className=\"text-[10px] text-slate-600 px-3\">Perfil administrativo<br/>Controle por permissão</p>",
  'texto de acesso exclusivo'
);

replaceOnce(
  "setAllowed(readSession()?.email===ADMIN_EMAIL)",
  "setAllowed(readSession()?.role==='ADMIN')",
  'liberação do botão administrativo'
);

fs.writeFileSync(outPath, source);
console.log(`Admin runtime gerado: ${path.relative(process.cwd(), outPath)}`);
