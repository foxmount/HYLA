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
    confirmButtonColor: '#d7ff00'
  });
}

function switchAuthTab(activeTab) {
  const isLogin = activeTab === 'login';
  tabLogin.classList.toggle('is-active', isLogin);
  tabLogin.setAttribute('aria-selected', String(isLogin));
  tabRegister.classList.toggle('is-active', !isLogin);
  tabRegister.setAttribute('aria-selected', String(!isLogin));
  formLogin.classList.toggle('hidden', !isLogin);
  formRegister.classList.toggle('hidden', isLogin);
  document.getElementById('auth-heading').textContent = isLogin ? 'Acesse sua conta' : 'Faça parte do HYLA';
  document.getElementById('auth-description').textContent = isLogin
    ? 'Entre para acompanhar sua comunidade.'
    : 'Crie sua conta e ajude a transformar sua cidade.';
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
      confirmButtonColor: '#d7ff00'
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
