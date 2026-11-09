// Controle de Alternância entre as abas de Login e Cadastro na tela index.html
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

if (tabLogin && tabRegister) {
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
    tabLogin.classList.remove('text-slate-400');
    tabRegister.classList.add('text-slate-400');
    tabRegister.classList.remove('text-emerald-600', 'border-b-2', 'border-emerald-600');
    
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('text-emerald-600', 'border-b-2', 'border-emerald-600');
    tabRegister.classList.remove('text-slate-400');
    tabLogin.classList.add('text-slate-400');
    tabLogin.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
    
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
  });
}

// Simulação de Login e Cadastro (para testar o Front-end sem o Supabase ativo)
if (formLogin) {
  formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    Swal.fire({
      icon: 'success',
      title: 'Login simulado com sucesso!',
      text: 'Redirecionando para o painel...',
      timer: 1500,
      showConfirmButton: false
    }).then(() => {
      window.location.href = 'dashboard.html';
    });
  });
}

if (formRegister) {
  formRegister.addEventListener('submit', (e) => {
    e.preventDefault();
    Swal.fire({
      icon: 'success',
      title: 'Conta criada com sucesso!',
      text: 'Agora você já pode fazer o login.',
      timer: 2000,
      showConfirmButton: false
    });
    tabLogin.click();
  });
}