const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const formPasswordRecovery = document.getElementById('form-password-recovery');
const requestPasswordReset = document.getElementById('request-password-reset');
const authTabs = document.querySelector('.auth-tabs');
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
  formPasswordRecovery.classList.add('hidden');
  requestPasswordReset.classList.toggle('hidden', !isLogin);
  document.getElementById('auth-heading').textContent = isLogin ? 'Acesse sua conta' : 'Faça parte do HYLA';
  document.getElementById('auth-description').textContent = isLogin
    ? 'Entre para acompanhar sua comunidade.'
    : 'Crie sua conta e ajude a transformar sua cidade.';
}

function showPasswordRecoveryForm() {
  authTabs.classList.add('hidden');
  formLogin.classList.add('hidden');
  formRegister.classList.add('hidden');
  requestPasswordReset.classList.add('hidden');
  formPasswordRecovery.classList.remove('hidden');
  document.getElementById('auth-heading').textContent = 'Crie uma nova senha';
  document.getElementById('auth-description').textContent = 'Escolha uma senha segura para sua conta.';
  document.getElementById('recovery-password').focus();
}

tabLogin.addEventListener('click', () => switchAuthTab('login'));
tabRegister.addEventListener('click', () => switchAuthTab('register'));

requestPasswordReset.addEventListener('click', async () => {
  const emailInput = document.getElementById('login-email');
  if (!emailInput.reportValidity()) return;

  requestPasswordReset.disabled = true;
  try {
    const redirectUrl = new URL('index.html', window.location.href);
    redirectUrl.searchParams.set('flow', 'recovery');
    const { error } = await supabaseClient.auth.resetPasswordForEmail(emailInput.value.trim(), {
      redirectTo: redirectUrl.href
    });
    if (error) {
      showAuthError(error);
      return;
    }

    await Swal.fire({
      icon: 'success',
      title: 'Confira seu e-mail',
      text: 'Se houver uma conta com esse endereço, enviaremos um link para redefinir a senha.',
      confirmButtonColor: '#d7ff00'
    });
  } catch (error) {
    showAuthError(error);
  } finally {
    requestPasswordReset.disabled = false;
  }
});

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

formPasswordRecovery.addEventListener('submit', async (event) => {
  event.preventDefault();
  const passwordInput = document.getElementById('recovery-password');
  const confirmationInput = document.getElementById('recovery-password-confirmation');
  if (passwordInput.value !== confirmationInput.value) {
    confirmationInput.setCustomValidity('As senhas não coincidem.');
    confirmationInput.reportValidity();
    return;
  }
  confirmationInput.setCustomValidity('');

  const submitButton = formPasswordRecovery.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    const { error } = await supabaseClient.auth.updateUser({ password: passwordInput.value });
    if (error) {
      showAuthError(error);
      return;
    }
    await Swal.fire({
      icon: 'success',
      title: 'Senha atualizada',
      text: 'Sua senha foi alterada. Você já pode continuar para o HYLA.',
      confirmButtonColor: '#d7ff00'
    });
    window.location.href = 'dashboard.html';
  } catch (error) {
    showAuthError(error);
  } finally {
    submitButton.disabled = false;
  }
});

document.getElementById('recovery-password-confirmation').addEventListener('input', (event) => {
  event.currentTarget.setCustomValidity('');
});

async function initializeAuth() {
  const hashParameters = new URLSearchParams(window.location.hash.slice(1));
  const queryParameters = new URLSearchParams(window.location.search);
  const isRecoveryLink = hashParameters.get('type') === 'recovery' ||
    queryParameters.get('flow') === 'recovery';

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    showAuthError(error);
    return;
  }

  if (isRecoveryLink) {
    if (!data.session) {
      await Swal.fire({
        icon: 'error',
        title: 'Link inválido ou expirado',
        text: 'Solicite um novo link de recuperação de senha.',
        confirmButtonColor: '#d7ff00'
      });
      return;
    }
    showPasswordRecoveryForm();
    return;
  }

  if (data.session) window.location.href = 'dashboard.html';
}

initializeAuth().catch(showAuthError);
