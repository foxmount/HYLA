import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
  throw new Error('Supabase function environment is not configured.')
}

const allowedOrigins = new Set([
  'https://foxmount.github.io',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
])

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'https://foxmount.github.io',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin'
})

const demoUsers = [
  { email: 'ana.souza@hyla.example.com', name: 'Ana Souza' },
  { email: 'bruno.lima@hyla.example.com', name: 'Bruno Lima' },
  { email: 'carla.mendes@hyla.example.com', name: 'Carla Mendes' }
]

const demoReports = [
  { email: demoUsers[0].email, title: 'Buraco na Rua Floriano Peixoto', description: 'O asfalto cedeu perto da praça e dificulta a passagem de bicicletas e veículos.', category: 'Buracos', neighborhood: 'Centro', city: 'Itu', state: 'SP', status: 'pending', latitude: -23.2645, longitude: -47.2992, ageHours: 2, image: 'pavement.svg' },
  { email: demoUsers[1].email, title: 'Lixeira danificada na Praça Carlos Gomes', description: 'A estrutura está solta e parte dos resíduos acaba ficando ao lado da lixeira.', category: 'Lixo', neighborhood: 'Centro', city: 'Campinas', state: 'SP', status: 'progress', latitude: -22.9056, longitude: -47.0608, ageHours: 24, image: 'trash.svg' },
  { email: demoUsers[2].email, title: 'Iluminação apagada na Avenida Boa Viagem', description: 'O trecho está sem iluminação à noite, próximo ao cruzamento com a Rua dos Navegantes.', category: 'Iluminação', neighborhood: 'Boa Viagem', city: 'Recife', state: 'PE', status: 'resolved', latitude: -8.1190, longitude: -34.9010, ageHours: 72, image: 'lighting.svg' },
  { email: demoUsers[0].email, title: 'Calçada obstruída na Rua XV de Novembro', description: 'Um objeto deixado na calçada reduz a passagem e dificulta a circulação de pedestres.', category: 'Outros', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', status: 'pending', latitude: -25.4284, longitude: -49.2733, ageHours: 5, image: 'sidewalk.svg' },
  { email: demoUsers[1].email, title: 'Árvore caída na Asa Norte', description: 'Galhos de uma árvore caída ocupam parte da calçada após a chuva.', category: 'Árvores', neighborhood: 'Asa Norte', city: 'Brasília', state: 'DF', status: 'progress', latitude: -15.7600, longitude: -47.8825, ageHours: 48, image: 'tree.svg' },
  { email: demoUsers[2].email, title: 'Placa danificada na Avenida Oceânica', description: 'A placa está inclinada e com a sinalização parcialmente comprometida.', category: 'Sinalização', neighborhood: 'Barra', city: 'Salvador', state: 'BA', status: 'resolved', latitude: -13.0100, longitude: -38.5320, ageHours: 96, image: 'sign.svg' }
]

const generateDemoPassword = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

const isDemoUser = (user: { app_metadata?: Record<string, unknown> }) =>
    user.app_metadata?.hyla_demo === true

const jsonResponse = (body: unknown, status: number, headers: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...Object.fromEntries(new Headers(headers)), 'Content-Type': 'application/json' }
  })

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin')
  const headers = corsHeaders(origin)

  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse({ error: 'Origem não autorizada.' }, 403, headers)
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405, headers)
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Sessão não autorizada.' }, 401, headers)
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401, headers)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Could not verify administrator role:', profileError)
    return jsonResponse({ error: 'Não foi possível verificar a permissão administrativa.' }, 500, headers)
  }
  if (profile?.role !== 'admin' || !profile.is_active) {
    return jsonResponse({ error: 'Apenas administradores podem gerenciar contas.' }, 403, headers)
  }

  let requestBody: unknown
  try {
    requestBody = await request.json()
  } catch {
    return jsonResponse({ error: 'Requisição inválida.' }, 400, headers)
  }
  if (typeof requestBody !== 'object' || requestBody === null || Array.isArray(requestBody)) {
    return jsonResponse({ error: 'Requisição inválida.' }, 400, headers)
  }
  const payload = requestBody as { action?: string; userId?: string }

  if (payload.action === 'seed_demo') {
    const accounts = new Map<string, { id: string; name: string }>()
    const credentials: Array<{ name: string; email: string; password: string }> = []

    for (const demoUser of demoUsers) {
      let existingUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null
      let foundAllUsers = false
      for (let page = 1; page <= 100; page += 1) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 100 })
        if (error) {
          console.error('Could not find a demo account:', error)
          return jsonResponse({ error: 'Não foi possível verificar as contas de demonstração.' }, 500, headers)
        }
        existingUser = data.users.find((user) => user.email?.toLowerCase() === demoUser.email) ?? null
        if (existingUser || data.users.length < 100) {
          foundAllUsers = true
          break
        }
      }
      if (!foundAllUsers) {
        return jsonResponse({ error: 'A lista de contas excede o limite seguro de consulta.' }, 413, headers)
      }
      if (existingUser && !isDemoUser(existingUser)) {
        return jsonResponse({
          error: `O e-mail reservado ${demoUser.email} já pertence a uma conta não identificada como demonstração.`
        }, 409, headers)
      }
      if (existingUser) {
        const { data: existingProfile, error: existingProfileError } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', existingUser.id)
          .maybeSingle()
        if (existingProfileError) {
          console.error('Could not check the demo profile:', existingProfileError)
          return jsonResponse({ error: `Não foi possível verificar o perfil de ${demoUser.name}.` }, 500, headers)
        }
        if (existingProfile?.role === 'admin') {
          return jsonResponse({ error: `A conta de demonstração ${demoUser.name} não pode ser administrativa.` }, 409, headers)
        }
      }

      const password = generateDemoPassword()
      const userAttributes = {
        email: demoUser.email,
        password,
        email_confirm: true,
        app_metadata: { hyla_demo: true },
        user_metadata: { display_name: demoUser.name }
      }
      const { data: accountData, error: accountError } = existingUser
        ? await adminClient.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
          ban_duration: 'none',
          app_metadata: userAttributes.app_metadata,
          user_metadata: userAttributes.user_metadata
        })
        : await adminClient.auth.admin.createUser(userAttributes)

      if (accountError || !accountData.user) {
        console.error('Could not prepare a demo account:', accountError)
        return jsonResponse({ error: `Não foi possível preparar a conta ${demoUser.name}.` }, 500, headers)
      }

      const { data: existingProfile, error: existingProfileError } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', accountData.user.id)
        .maybeSingle()
      if (existingProfileError) {
        console.error('Could not check the demo profile:', existingProfileError)
        return jsonResponse({ error: `Não foi possível verificar o perfil de ${demoUser.name}.` }, 500, headers)
      }
      if (existingProfile?.role === 'admin') {
        return jsonResponse({ error: `A conta de demonstração ${demoUser.name} não pode ser administrativa.` }, 409, headers)
      }

      const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({ id: accountData.user.id, role: 'user', is_active: true }, {
          onConflict: 'id',
          ignoreDuplicates: true
        })
      if (profileError) {
        console.error('Could not prepare the demo profile:', profileError)
        return jsonResponse({ error: `Não foi possível preparar o perfil de ${demoUser.name}.` }, 500, headers)
      }
      const { error: activateProfileError } = await adminClient
        .from('profiles')
        .update({ is_active: true })
        .eq('id', accountData.user.id)
      if (activateProfileError) {
        console.error('Could not activate the demo profile:', activateProfileError)
        return jsonResponse({ error: `Não foi possível ativar o perfil de ${demoUser.name}.` }, 500, headers)
      }

      accounts.set(demoUser.email, { id: accountData.user.id, name: demoUser.name })
      credentials.push({ name: demoUser.name, email: demoUser.email, password })
    }

    const userIds = [...accounts.values()].map((account) => account.id)
    const { data: existingReports, error: reportsQueryError } = await adminClient
      .from('ocorrencias')
      .select('title, user_id')
      .eq('is_demo', true)
      .in('user_id', userIds)
    if (reportsQueryError) {
      console.error('Could not check existing demo reports:', reportsQueryError)
      return jsonResponse({ error: 'As contas foram preparadas, mas não foi possível verificar os relatos fictícios. Execute novamente para concluir.' }, 500, headers)
    }

    const existingReportKeys = new Set(
      existingReports.map((report) => `${report.user_id}|${report.title}`)
    )
    const reportsToInsert = demoReports
      .flatMap((report) => {
        const account = accounts.get(report.email)
        if (!account || existingReportKeys.has(`${account.id}|${report.title}`)) return []
        return [{
          user_id: account.id,
          title: report.title,
          description: report.description,
          category: report.category,
          neighborhood: report.neighborhood,
          city: report.city,
          state: report.state,
          status: report.status,
          latitude: report.latitude,
          longitude: report.longitude,
          image_url: `https://foxmount.github.io/HYLA/assets/demo-occurrences/${report.image}`,
          is_demo: true,
          created_at: new Date(Date.now() - report.ageHours * 60 * 60 * 1000).toISOString()
        }]
      })

    if (reportsToInsert.length) {
      const { error: insertReportsError } = await adminClient
        .from('ocorrencias')
        .insert(reportsToInsert)
      if (insertReportsError) {
        console.error('Could not create demo reports:', insertReportsError)
        return jsonResponse({ error: 'As contas foram preparadas, mas não foi possível inserir as ocorrências fictícias. Execute novamente para concluir.' }, 500, headers)
      }
    }

    return jsonResponse({
      ok: true,
      credentials,
      reportsCreated: reportsToInsert.length
    }, 200, headers)
  }

  if (payload.action === 'list') {
    const users: Array<{
      id: string
      email?: string
      user_metadata?: Record<string, unknown>
      app_metadata?: Record<string, unknown>
      created_at: string
      last_sign_in_at?: string | null
      banned_until?: string | null
    }> = []
    let allUsersLoaded = false
    for (let page = 1; page <= 100; page += 1) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 100 })
      if (error) {
        console.error('Could not list users:', error)
        return jsonResponse({ error: 'Não foi possível carregar a lista de usuários.' }, 500, headers)
      }

      users.push(...data.users)
      if (data.users.length < 100) {
        allUsersLoaded = true
        break
      }
    }
    if (!allUsersLoaded) {
      return jsonResponse({ error: 'A lista excede o limite seguro de contas por consulta.' }, 413, headers)
    }

    const profilesById = new Map<string, { role: string; isActive: boolean }>()
    for (let start = 0; start < users.length; start += 100) {
      const ids = users.slice(start, start + 100).map((user) => user.id)
      const { data, error } = await adminClient
        .from('profiles')
        .select('id, role, is_active')
        .in('id', ids)
      if (error) {
        console.error('Could not read account roles:', error)
        return jsonResponse({ error: 'Não foi possível carregar os perfis de usuário.' }, 500, headers)
      }
      data.forEach((item) => profilesById.set(item.id, {
        role: item.role,
        isActive: item.is_active
      }))
    }

    return jsonResponse({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: typeof user.user_metadata?.display_name === 'string'
          ? user.user_metadata.display_name
          : null,
        isDemo: isDemoUser(user),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        suspended: Boolean(
          (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) ||
          profilesById.get(user.id)?.isActive === false
        ),
        isAdmin: profilesById.get(user.id)?.role === 'admin'
      }))
    }, 200, headers)
  }

  if (!['suspend', 'reactivate', 'send_recovery'].includes(payload.action ?? '')) {
    return jsonResponse({ error: 'Ação administrativa desconhecida.' }, 400, headers)
  }

  if (!payload.userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.userId)) {
    return jsonResponse({ error: 'Identificador de usuário inválido.' }, 400, headers)
  }

  const { data: targetData, error: targetError } = await adminClient.auth.admin.getUserById(payload.userId)
  if (targetError || !targetData.user) {
    return jsonResponse({ error: 'Usuário não encontrado.' }, 404, headers)
  }
  if (targetData.user.id === userData.user.id) {
    return jsonResponse({ error: 'A conta root não pode alterar o próprio acesso por aqui.' }, 400, headers)
  }

  if (payload.action === 'suspend' || payload.action === 'reactivate') {
    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', payload.userId)
      .maybeSingle()

    if (targetProfileError || !targetProfile) {
      console.error('Could not verify target role:', targetProfileError)
    return jsonResponse({ error: 'Não foi possível verificar a conta selecionada.' }, targetProfileError ? 500 : 404, headers)
    }
    if (targetProfile?.role === 'admin') {
      return jsonResponse({ error: 'Contas root não podem ser suspensas por esta tela.' }, 403, headers)
    }

    if (payload.action === 'suspend') {
      const { error: profileUpdateError } = await adminClient
        .from('profiles')
        .update({ is_active: false })
        .eq('id', payload.userId)
        .select('id')
        .single()
      if (profileUpdateError) {
        console.error('Could not disable the user profile:', profileUpdateError)
        return jsonResponse({ error: 'Não foi possível suspender o perfil desta conta.' }, 500, headers)
      }

      const { error: banError } = await adminClient.auth.admin.updateUserById(payload.userId, {
        ban_duration: '876000h'
      })
      if (banError) {
        console.error('Could not suspend the auth user:', banError)
        const { error: rollbackError } = await adminClient
          .from('profiles')
          .update({ is_active: true })
          .eq('id', payload.userId)
        if (rollbackError) console.error('Could not restore the profile after a failed suspension:', rollbackError)
        return jsonResponse({
          error: rollbackError
            ? 'A autenticação falhou e não foi possível restaurar o perfil. Reative a conta pela administração.'
            : 'Não foi possível suspender a autenticação desta conta.'
        }, 500, headers)
      }

    } else {
      const { error: unbanError } = await adminClient.auth.admin.updateUserById(payload.userId, {
        ban_duration: 'none'
      })
      if (unbanError) {
        console.error('Could not reactivate the auth user:', unbanError)
        return jsonResponse({ error: 'Não foi possível reativar a autenticação desta conta.' }, 500, headers)
      }
      const { error: profileUpdateError } = await adminClient
        .from('profiles')
        .update({ is_active: true })
        .eq('id', payload.userId)
        .select('id')
        .single()
      if (profileUpdateError) {
        console.error('Could not reactivate the user profile:', profileUpdateError)
        return jsonResponse({ error: 'Autenticação reativada, mas não foi possível reativar o perfil. Tente novamente.' }, 500, headers)
      }
    }
    return jsonResponse({ ok: true }, 200, headers)
  }

  if (payload.action === 'send_recovery') {
    if (!targetData.user.email) {
      return jsonResponse({ error: 'Esta conta não possui um e-mail para recuperação.' }, 400, headers)
    }

    const publicClient = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const sitePath = origin === 'http://127.0.0.1:5500' || origin === 'http://localhost:5500'
      ? `${origin}/index.html?flow=recovery`
      : 'https://foxmount.github.io/HYLA/index.html?flow=recovery'
    const { error } = await publicClient.auth.resetPasswordForEmail(targetData.user.email, {
      redirectTo: sitePath
    })
    if (error) {
      console.error('Could not send recovery email:', error)
      return jsonResponse({ error: 'Não foi possível enviar o e-mail de recuperação.' }, 500, headers)
    }
    return jsonResponse({ ok: true }, 200, headers)
  }

  return jsonResponse({ error: 'Ação administrativa desconhecida.' }, 400, headers)
})
