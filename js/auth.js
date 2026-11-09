const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const supabaseClient = window.hylaSupabase;

function showAuthError(error) {
  Swal.fire({
    icon: 'error',
    title: 'Não foi possível continuar',
    text: error.message || 'Ocorreu um erro ao conectar com o Supabase.',
    confirmButtonColor: '#2563eb'
  });
}

function switchAuthTab(activeTab) {
  const isLogin = activeTab === 'login';
  tabLogin.classList.toggle('text-blue-600', isLogin);
  tabLogin.classList.toggle('border-b-2', isLogin);
  tabLogin.classList.toggle('border-blue-600', isLogin);
  tabLogin.classList.toggle('text-slate-400', !isLogin);
  tabRegister.classList.toggle('text-emerald-600', !isLogin);
  tabRegister.classList.toggle('border-b-2', !isLogin);
  tabRegister.classList.toggle('border-emerald-600', !isLogin);
  tabRegister.classList.toggle('text-slate-400', isLogin);
  formLogin.classList.toggle('hidden', !isLogin);
  formRegister.classList.toggle('hidden', isLogin);
}

tabLogin.addEventListener('click', () => switchAuthTab('login'));
tabRegister.addEventListener('click', () => switchAuthTab('register'));

formLogin.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = formLogin.querySelector('[type="submit"]');
  button.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: document.getElementById('login-email').value.trim(),
      password: document.getElementById('login-password').value
    });

    if (error) {
      showAuthError(error);
      return;
    }
    window.location.href = 'dashboard.html';
  } catch (error) {
    showAuthError(error);
  } finally {
    button.disabled = false;
  }
});

formRegister.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = formRegister.querySelector('[type="submit"]');
  button.disabled = true;

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: document.getElementById('register-email').value.trim(),
      password: document.getElementById('register-password').value,
      options: {
        emailRedirectTo: new URL('index.html', window.location.href).href
      }
    });

    if (error) {
      showAuthError(error);
      return;
    }

    if (data.session) {
      window.location.href = 'dashboard.html';
      return;
    }

    await Swal.fire({
      icon: 'success',
      title: 'Confira seu e-mail',
      text: 'Enviamos um link de confirmação para ativar sua conta.',
      confirmButtonColor: '#2563eb'
    });
    switchAuthTab('login');
  } catch (error) {
    showAuthError(error);
  } finally {
    button.disabled = false;
  }
});

supabaseClient.auth.getSession().then(({ data, error }) => {
  if (error) {
    showAuthError(error);
    return;
  }
  if (data.session) window.location.href = 'dashboard.html';
}).catch(showAuthError);
