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
  "{account.enabled && <div className=\"grid sm:grid-cols-3 gap-4 mt-4\"><Field label=\"E-mail\"><input type=\"email\" className={inputClass} value={account.email} disabled={selectedAccount?.email?.toLowerCase()===ADMIN_EMAIL} onChange={e=>setAccount({...account,email:e.target.value})}/></Field><Field label=\"Perfil de acesso\"><select className={inputClass} value={account.role || 'MEMBER'} disabled={selectedAccount?.email?.toLowerCase()===ADMIN_EMAIL} onChange={e=>setAccount({...account,role:e.target.value})}><option value=\"MEMBER\">Membro</option><option value=\"ADMIN\">Administrador</option></select></Field>{!selectedAccount && <Field label=\"Senha inicial\" hint=\"Mínimo de 8 caracteres.\"><input type=\"password\" className={inputClass} value={account.password} onChange={e=>setAccount({...account,password:e.target.value})}/></Field>}</div>}",
  'seletor de perfil e senha inicial'
);


replaceOnce(
  "  const [saving, setSaving] = useState(false);",
  "  const [saving, setSaving] = useState(false);\\n  const [resetOpen, setResetOpen] = useState(false);\\n  const [resetForm, setResetForm] = useState({ password: '', confirm: '' });\\n  const [resetting, setResetting] = useState(false);",
  'estado de redefinição de senha'
);

replaceOnce(
  "    if (!selected) { setForm(blank); setAccount({ enabled: false, email: '', password: '', role: 'MEMBER', status: 'approved' }); return; }",
  "    if (!selected) { setForm(blank); setAccount({ enabled: false, email: '', password: '', role: 'MEMBER', status: 'approved' }); setResetOpen(false); setResetForm({ password: '', confirm: '' }); return; }",
  'limpa redefinição ao criar atleta'
);

replaceOnce(
  "  const toggleActive = async athlete => {",
  "  const resetPassword = async () => {\\n    if (!selectedAccount?.email) return notify('Este atleta não possui acesso ao portal.', 'error');\\n    if (resetForm.password.length < 8) return notify('A nova senha deve ter pelo menos 8 caracteres.', 'error');\\n    if (resetForm.password !== resetForm.confirm) return notify('As senhas informadas não são iguais.', 'error');\\n    try { setResetting(true); const r = await adminPost('resetPassword', { email: selectedAccount.email, newPassword: resetForm.password }); notify(r.message); setResetOpen(false); setResetForm({ password: '', confirm: '' }); }\\n    catch (e) { notify(e.message, 'error'); } finally { setResetting(false); }\\n  };\\n  const toggleActive = async athlete => {",
  'ação de redefinição de senha'
);

replaceOnce(
  "      <div className=\"flex justify-end mt-6\"><button disabled={saving || !form.name.trim()} onClick={save} className={cx(btn,'bg-indigo-600 hover:bg-indigo-500 text-white min-w-32')}>{saving ? <RefreshCw className=\"w-4 h-4 animate-spin\"/> : <Save className=\"w-4 h-4\"/>}Salvar</button></div>",
  "      {resetOpen && <div className=\"mt-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4\"><div className=\"flex items-center justify-between gap-3 mb-3\"><div><p className=\"font-black text-white\">Redefinir senha</p><p className=\"text-xs text-slate-400 mt-1\">{selected?.name} · {selectedAccount?.email}</p></div><button onClick={()=>{setResetOpen(false);setResetForm({password:'',confirm:''});}} className=\"p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800\"><X className=\"w-4 h-4\"/></button></div><div className=\"grid sm:grid-cols-2 gap-3\"><Field label=\"Nova senha\" hint=\"Mínimo de 8 caracteres.\"><input type=\"password\" autoComplete=\"new-password\" minLength={8} className={inputClass} value={resetForm.password} onChange={e=>setResetForm({...resetForm,password:e.target.value})}/></Field><Field label=\"Confirmar nova senha\"><input type=\"password\" autoComplete=\"new-password\" minLength={8} className={inputClass} value={resetForm.confirm} onChange={e=>setResetForm({...resetForm,confirm:e.target.value})}/></Field></div><div className=\"flex justify-end gap-2 mt-3\"><button onClick={()=>{setResetOpen(false);setResetForm({password:'',confirm:''});}} className={cx(btn,'bg-slate-700 text-slate-200')}>Cancelar</button><button disabled={resetting || resetForm.password.length < 8 || resetForm.password !== resetForm.confirm} onClick={resetPassword} className={cx(btn,'bg-amber-600 hover:bg-amber-500 text-white')}>{resetting ? <RefreshCw className=\"w-4 h-4 animate-spin\"/> : <LockKeyhole className=\"w-4 h-4\"/>}Salvar nova senha</button></div></div>}\\n      <div className=\"flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6\">{selectedAccount && account.enabled && <button type=\"button\" onClick={()=>setResetOpen(v=>!v)} className={cx(btn,'bg-slate-700 hover:bg-slate-600 text-slate-100')}><LockKeyhole className=\"w-4 h-4\"/>Redefinir senha</button>}<button disabled={saving || !form.name.trim()} onClick={save} className={cx(btn,'bg-indigo-600 hover:bg-indigo-500 text-white min-w-32')}>{saving ? <RefreshCw className=\"w-4 h-4 animate-spin\"/> : <Save className=\"w-4 h-4\"/>}{selected ? 'Atualizar' : 'Salvar'}</button></div>",
  'botão e formulário de redefinição'
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
