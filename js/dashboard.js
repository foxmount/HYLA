const reports = [];

const statusDetails = {
  pending: { label: 'Pendente', classes: 'bg-red-50 text-red-700', icon: 'circle-alert' },
  progress: { label: 'Em andamento', classes: 'bg-amber-50 text-amber-700', icon: 'clock-3' },
  resolved: { label: 'Resolvida', classes: 'bg-green-50 text-green-700', icon: 'circle-check' }
};

const categoryDetails = {
  Buracos: { icon: 'construction', classes: 'bg-red-50 text-red-600' },
  Lixo: { icon: 'trash-2', classes: 'bg-orange-50 text-orange-600' },
  Iluminação: { icon: 'lightbulb', classes: 'bg-amber-50 text-amber-600' },
  Árvores: { icon: 'tree-deciduous', classes: 'bg-green-50 text-green-600' },
  Sinalização: { icon: 'traffic-cone', classes: 'bg-blue-50 text-blue-600' },
  Outros: { icon: 'map-pin', classes: 'bg-violet-50 text-violet-600' }
};

let activeFilter = 'all';
let showMine = false;
let currentUser = null;
let isAdmin = false;

const supabaseClient = window.hylaSupabase;
const reportList = document.getElementById('report-list');
const emptyState = document.getElementById('empty-state');
const reportSearch = document.getElementById('report-search');
const reportStateFilter = document.getElementById('report-state-filter');
const reportCityFilter = document.getElementById('report-city-filter');
const reportCategoryFilter = document.getElementById('report-category-filter');
const dashboardStateFilter = document.getElementById('dashboard-state-filter');
const dashboardCityFilter = document.getElementById('dashboard-city-filter');
const dashboardCategoryFilter = document.getElementById('dashboard-category-filter');
const dashboardResetFilters = document.getElementById('dashboard-reset-filters');
const mapSearch = document.getElementById('map-search');
const mapCityFilter = document.getElementById('map-city-filter');
const mapStateFilter = document.getElementById('map-state-filter');
const mapStatusFilter = document.getElementById('map-status-filter');
const mapCategoryFilter = document.getElementById('map-category-filter');
const reportDialog = document.getElementById('report-dialog');
const reportForm = document.getElementById('report-form');
const notificationButton = document.getElementById('notifications-button');
const profileButton = document.getElementById('profile-button');
const notificationPanel = document.getElementById('notifications-panel');
const profileMenu = document.getElementById('profile-menu');
const map = L.map('city-map-canvas', {
  center: [-14.235, -51.9253],
  zoom: 4,
  minZoom: 3,
  scrollWheelZoom: true,
  doubleClickZoom: true,
  touchZoom: true,
  dragging: true,
  keyboard: true,
  zoomControl: false
});
const mapMarkers = L.layerGroup().addTo(map);
const MAX_REPORT_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedReportImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getPublicReportImageUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    const isSupabaseImage = url.origin === 'https://rnfdliedxxmjakcgkhfc.supabase.co' &&
      url.pathname.startsWith('/storage/v1/object/public/occurrence-images/');
    const isDemoIllustration = url.origin === 'https://foxmount.github.io' &&
      url.pathname.startsWith('/HYLA/assets/demo-occurrences/');
    return url.protocol === 'https:' && (isSupabaseImage || isDemoIllustration) ? url.href : null;
  } catch {
    return null;
  }
}

L.control.zoom({ position: 'topright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  subdomains: 'abc',
  maxZoom: 19
}).addTo(map);

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function formatRelativeTime(timestamp) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000));
  if (elapsedMinutes < 1) return 'Agora';
  if (elapsedMinutes < 60) return `Há ${elapsedMinutes} min`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Há ${elapsedHours} h`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  return elapsedDays === 1 ? 'Ontem' : `Há ${elapsedDays} dias`;
}

function showDatabaseError(error, title = 'Erro ao acessar as ocorrências') {
  console.error(title, error);
  document.getElementById('connection-status').textContent = 'Erro de conexão';
  Swal.fire({
    icon: 'error',
    title,
    text: error.message || 'Verifique sua conexão e as configurações do Supabase.',
    confirmButtonColor: '#d7ff00'
  });
}

function renderReports() {
  const searchTerm = reportSearch.value.trim().toLocaleLowerCase('pt-BR');
  const visibleReports = reports.filter((report) => {
    const matchesStatus = activeFilter === 'all' || report.status === activeFilter;
    const matchesState = reportStateFilter.value === 'all' || report.state === reportStateFilter.value;
    const matchesCity = reportCityFilter.value === 'all' || `${report.state}|${report.city}` === reportCityFilter.value;
    const matchesCategory = reportCategoryFilter.value === 'all' || report.category === reportCategoryFilter.value;
    const searchableText = `${report.title} ${report.category} ${report.neighborhood} ${report.city} ${report.state}`.toLocaleLowerCase('pt-BR');
    return matchesStatus && matchesState && matchesCity && matchesCategory &&
      searchableText.includes(searchTerm) && (!showMine || (report.mine && !report.isDemo));
  });

  reportList.innerHTML = visibleReports.map((report) => {
    const status = statusDetails[report.status] || statusDetails.pending;
    const category = categoryDetails[report.category] || categoryDetails.Outros;
    return `
      <article class="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${category.classes}">
          <i data-lucide="${category.icon}" class="h-5 w-5"></i>
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-sm font-semibold text-slate-800">${escapeHTML(report.title)}</h3>
            ${report.mine ? '<span class="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Seu relato</span>' : ''}
            ${report.isDemo ? '<span class="demo-report-badge">Exemplo</span>' : ''}
          </div>
          <p class="mt-1 text-xs text-slate-500">${escapeHTML(report.category)} <span class="mx-1 text-slate-300">·</span> ${escapeHTML(report.neighborhood)} <span class="mx-1 text-slate-300">·</span> ${escapeHTML(report.city)} - ${escapeHTML(report.state)} <span class="mx-1 text-slate-300">·</span> ${escapeHTML(report.time)}</p>
        </div>
        ${report.imageUrl ? `<img class="report-list-image" src="${escapeHTML(report.imageUrl)}" alt="Foto: ${escapeHTML(report.title)}" loading="lazy">` : ''}
        <span class="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.classes}">
          <i data-lucide="${status.icon}" class="h-3.5 w-3.5"></i>
          ${status.label}
        </span>
      </article>
    `;
  }).join('');

  emptyState.classList.toggle('hidden', visibleReports.length > 0);
  reportList.classList.toggle('hidden', visibleReports.length === 0);
  document.getElementById('report-count').textContent =
    `${visibleReports.length} ${visibleReports.length === 1 ? 'ocorrência' : 'ocorrências'}`;
  renderMapMarkers();
  lucide.createIcons();
}

function renderRecentReports(visibleReports) {
  const recent = visibleReports.slice(0, 3);
  const container = document.getElementById('recent-reports');
  container.innerHTML = recent.map((report) => {
    const status = statusDetails[report.status] || statusDetails.pending;
    const activityClass = report.status === 'resolved' ? 'is-resolved' : report.status === 'progress' ? 'is-progress' : 'is-new';
    const icon = report.status === 'resolved' ? 'check' : report.status === 'progress' ? 'wrench' : 'plus';
    return `
      <div>
        <span class="activity-icon ${activityClass}"><i data-lucide="${icon}" class="h-4 w-4"></i></span>
        <p><strong>${escapeHTML(report.title)}</strong><small>${report.isDemo ? 'Exemplo · ' : ''}${escapeHTML(report.city)} - ${escapeHTML(report.state)} · ${escapeHTML(report.neighborhood)} · ${status.label} · ${escapeHTML(report.time)}</small></p>
      </div>
    `;
  }).join('');

  if (!recent.length) {
    container.innerHTML = '<p class="py-4 text-xs text-slate-500">Nenhum relato neste recorte.</p>';
  }
}

function formatAccountDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

async function invokeAdminAction(action, userId) {
  const { data, error } = await supabaseClient.functions.invoke('admin-users', {
    body: { action, userId }
  });
  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      const response = await error.context.json().catch(() => null);
      if (response?.error) message = response.error;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

async function loadAdminUsers() {
  const list = document.getElementById('admin-users-list');
  const count = document.getElementById('admin-users-count');
  list.innerHTML = '<tr><td colspan="5" class="admin-table-message">Carregando contas...</td></tr>';
  count.textContent = 'Carregando contas...';

  try {
    const data = await invokeAdminAction('list');
    const users = data.users || [];
    count.textContent = `${users.length} ${users.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}`;
    if (!users.length) {
      list.innerHTML = '<tr><td colspan="5" class="admin-table-message">Ainda não há contas cadastradas.</td></tr>';
      return;
    }

    list.innerHTML = users.map((user) => {
      const accessLabel = user.isAdmin ? 'Administrador' : user.suspended ? 'Suspensa' : 'Ativa';
      const accessClass = user.isAdmin ? 'is-admin' : user.suspended ? 'is-suspended' : '';
      const actions = user.isAdmin
        ? '<span aria-label="Conta administrativa">—</span>'
        : `
          <div class="admin-row-actions">
            <button type="button" class="admin-row-action" data-admin-action="send_recovery" data-user-id="${escapeHTML(user.id)}">Enviar recuperação</button>
            <button type="button" class="admin-row-action ${user.suspended ? '' : 'is-danger'}" data-admin-action="${user.suspended ? 'reactivate' : 'suspend'}" data-user-id="${escapeHTML(user.id)}">
              ${user.suspended ? 'Reativar' : 'Suspender'}
            </button>
          </div>
        `;
      const accountName = user.displayName
        ? `<span class="admin-user-name">${escapeHTML(user.displayName)}</span>`
        : '';
      const demoLabel = user.isDemo ? '<span class="admin-demo-label">Demonstração</span>' : '';
      return `
        <tr>
          <td>${accountName}<span class="admin-user-email">${escapeHTML(user.email || 'Conta sem e-mail')}</span>${demoLabel}</td>
          <td>${formatAccountDate(user.createdAt)}</td>
          <td>${formatAccountDate(user.lastSignInAt)}</td>
          <td><span class="admin-access-state ${accessClass}">${accessLabel}</span></td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Não foi possível carregar contas administrativas', error);
    count.textContent = 'Falha ao carregar';
    list.innerHTML = '<tr><td colspan="5" class="admin-table-message">Não foi possível carregar as contas. Verifique a função administrativa e tente novamente.</td></tr>';
    Swal.fire({
      icon: 'error',
      title: 'Falha ao carregar contas',
      text: error.message || 'Verifique a configuração da função administrativa.',
      confirmButtonColor: '#d7ff00'
    });
  }
}

document.getElementById('admin-seed-demo').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const confirmation = await Swal.fire({
    icon: 'question',
    title: 'Preparar dados fictícios?',
    text: 'Serão criadas ou atualizadas três contas de demonstração e inseridas seis ocorrências. As senhas temporárias serão redefinidas e exibidas apenas agora.',
    showCancelButton: true,
    confirmButtonText: 'Preparar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#d7ff00'
  });
  if (!confirmation.isConfirmed) return;

  button.disabled = true;
  try {
    const data = await invokeAdminAction('seed_demo');
    const credentialsMarkup = (data.credentials || []).map((account) => `
      <div style="margin:12px 0;padding:12px;border:1px solid #3a413a;border-radius:8px;text-align:left">
        <strong>${escapeHTML(account.name)}</strong>
        <div style="margin-top:5px">${escapeHTML(account.email)}</div>
        <code style="display:block;margin-top:6px;overflow-wrap:anywhere">${escapeHTML(account.password)}</code>
      </div>
    `).join('');
    await Swal.fire({
      icon: 'success',
      title: 'Demonstração preparada',
      html: `<p>Ocorrências novas: ${Number(data.reportsCreated) || 0}. As senhas abaixo são temporárias; copie-as agora para entrar como cada morador.</p>${credentialsMarkup}`,
      confirmButtonText: 'Entendi',
      confirmButtonColor: '#d7ff00',
      width: 'min(640px, 94vw)'
    });
    await loadAdminUsers();
  } catch (error) {
    console.error('Não foi possível preparar os dados de demonstração', error);
    await Swal.fire({
      icon: 'error',
      title: 'Falha ao preparar demonstração',
      text: error.message || 'Verifique a configuração da função administrativa.',
      confirmButtonColor: '#d7ff00'
    });
  } finally {
    button.disabled = false;
  }
});

document.getElementById('admin-refresh-users').addEventListener('click', loadAdminUsers);
document.getElementById('admin-users-list').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-admin-action]');
  if (!button || button.disabled) return;

  const action = button.dataset.adminAction;
  const userId = button.dataset.userId;
  const userRow = button.closest('tr');
  const email = userRow.cells[0].textContent;
  const isRecovery = action === 'send_recovery';
  const isSuspend = action === 'suspend';
  const result = await Swal.fire({
    icon: isSuspend ? 'warning' : 'question',
    title: isRecovery ? 'Enviar recuperação de acesso?' : isSuspend ? 'Suspender esta conta?' : 'Reativar esta conta?',
    text: isRecovery
      ? `Um link seguro será enviado para ${email}. O HYLA não acessa nem revela a senha.`
      : isSuspend
        ? `${email} perderá o acesso até ser reativada.`
        : `${email} poderá entrar novamente no HYLA.`,
    showCancelButton: true,
    confirmButtonText: isRecovery ? 'Enviar link' : isSuspend ? 'Suspender conta' : 'Reativar conta',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: isSuspend ? '#b4534b' : '#d7ff00',
    cancelButtonColor: '#64748b'
  });
  if (!result.isConfirmed) return;

  button.disabled = true;
  try {
    await invokeAdminAction(action, userId);
    await Swal.fire({
      icon: 'success',
      title: isRecovery ? 'Link enviado' : isSuspend ? 'Conta suspensa' : 'Conta reativada',
      text: isRecovery ? `O e-mail de recuperação foi enviado para ${email}.` : undefined,
      confirmButtonColor: '#d7ff00'
    });
    await loadAdminUsers();
  } catch (error) {
    console.error('Falha ao atualizar a conta', error);
    Swal.fire({
      icon: 'error',
      title: 'Não foi possível concluir a ação',
      text: error.message || 'Verifique a configuração e tente novamente.',
      confirmButtonColor: '#d7ff00'
    });
    button.disabled = false;
  }
});

function renderMapMarkers() {
  const searchTerm = mapSearch.value.trim().toLocaleLowerCase('pt-BR');
  const visibleReports = reports.filter((report) => {
    const matchesState = mapStateFilter.value === 'all' || report.state === mapStateFilter.value;
    const matchesCity = mapCityFilter.value === 'all' || `${report.state}|${report.city}` === mapCityFilter.value;
    const matchesStatus = mapStatusFilter.value === 'all' || report.status === mapStatusFilter.value;
    const matchesCategory = mapCategoryFilter.value === 'all' || report.category === mapCategoryFilter.value;
    const searchableText = `${report.title} ${report.category} ${report.neighborhood} ${report.city} ${report.state}`.toLocaleLowerCase('pt-BR');
    return matchesState && matchesCity && matchesStatus && matchesCategory && searchableText.includes(searchTerm);
  });

  mapMarkers.clearLayers();
  const mappedReports = visibleReports.filter((report) => report.location);
  document.getElementById('map-count').textContent = mappedReports.length;
  const unlocatedCount = visibleReports.length - mappedReports.length;
  const unlocatedLabel = document.getElementById('map-unlocated');
  unlocatedLabel.textContent = unlocatedCount ? `${unlocatedCount} sem localização` : '';
  unlocatedLabel.classList.toggle('hidden', unlocatedCount === 0);
  visibleReports.forEach((report) => {
    if (!report.location) return;
    const status = statusDetails[report.status] || statusDetails.pending;
    const markerIcon = L.divIcon({
      className: '',
      html: `<span class="map-marker map-marker-${report.status}" aria-label="${status.label}"></span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    const marker = L.marker(report.location, { icon: markerIcon });
    marker.bindPopup(`
      <div class="map-popup">
        ${report.imageUrl ? `<img class="map-popup-image" src="${escapeHTML(report.imageUrl)}" alt="Foto: ${escapeHTML(report.title)}" loading="lazy">` : ''}
        <p style="font-size:11px;color:#d7ff00;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${escapeHTML(report.category)}</p>
        <p style="margin-top:5px;font-weight:700">${escapeHTML(report.title)}</p>
        <p style="margin-top:4px;font-size:12px;color:#929991">${escapeHTML(report.neighborhood)} · ${escapeHTML(report.city)} - ${escapeHTML(report.state)} · ${status.label}</p>
      </div>
    `);
    mapMarkers.addLayer(marker);
  });

}

function populateStateFilter(select, allLabel) {
  const selectedState = select.value;
  const states = [...new Set(reports.map((report) => report.state))]
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second));

  select.replaceChildren(new Option(allLabel, 'all'));
  states.forEach((state) => select.add(new Option(state, state)));
  select.value = states.includes(selectedState) ? selectedState : 'all';
}

function populateCityFilter(citySelect, stateSelect, allLabel) {
  const selectedCity = citySelect.value;
  const cities = new Map();
  reports.forEach((report) => {
    if (stateSelect.value !== 'all' && report.state !== stateSelect.value) return;
    const key = `${report.state}|${report.city}`;
    cities.set(key, { city: report.city, state: report.state });
  });

  citySelect.replaceChildren(new Option(allLabel, 'all'));
  [...cities.entries()]
    .sort(([, first], [, second]) => first.state.localeCompare(second.state) || first.city.localeCompare(second.city, 'pt-BR'))
    .forEach(([key, location]) => {
      citySelect.add(new Option(`${location.city} - ${location.state}`, key));
    });

  citySelect.value = cities.has(selectedCity) ? selectedCity : 'all';
}

function updateLocationFilters() {
  populateStateFilter(mapStateFilter, 'Todos os estados');
  populateStateFilter(reportStateFilter, 'Todos os estados');
  populateStateFilter(dashboardStateFilter, 'Todos os estados');
  populateCityFilter(mapCityFilter, mapStateFilter, 'Todas as cidades');
  populateCityFilter(reportCityFilter, reportStateFilter, 'Todas as cidades');
  populateCityFilter(dashboardCityFilter, dashboardStateFilter, 'Todas as cidades');
}

function renderAnalyticsChart(container, entries, emptyMessage) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  if (!entries.length || total === 0) {
    container.innerHTML = `<div class="analytics-empty" role="listitem">${emptyMessage}</div>`;
    return;
  }

  container.innerHTML = entries.map((entry, index) => {
    const percentage = Math.round((entry.value / total) * 100);
    const barWidth = entry.value ? Math.max(percentage, 2) : 0;
    const barClass = entry.color || `analytics-bar-${index % 6}`;
    return `
      <div class="analytics-bar-row" role="listitem" aria-label="${escapeHTML(entry.label)}: ${entry.value} (${percentage}%)">
        <div class="analytics-bar-heading"><span>${escapeHTML(entry.label)}</span><strong>${entry.value}<small>${percentage}%</small></strong></div>
        <div class="analytics-track" role="progressbar" aria-label="${escapeHTML(entry.label)}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${entry.value}">
          <span class="analytics-bar ${barClass}" aria-hidden="true" style="width:${barWidth}%"></span>
        </div>
      </div>
    `;
  }).join('');
}

function renderAnalytics(visibleReports) {
  const statuses = Object.entries(statusDetails).map(([key, details]) => ({
    label: details.label,
    value: visibleReports.filter((report) => report.status === key).length,
    color: `analytics-status-${key}`
  }));
  const categories = Object.keys(categoryDetails)
    .map((category) => ({
      label: category,
      value: visibleReports.filter((report) => report.category === category).length
    }))
    .filter((entry) => entry.value > 0)
    .sort((first, second) => second.value - first.value);
  const regions = new Map();
  visibleReports.forEach((report) => {
    const key = `${report.city} - ${report.state}`;
    regions.set(key, (regions.get(key) || 0) + 1);
  });
  const topRegions = [...regions.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((first, second) => second.value - first.value || first.label.localeCompare(second.label, 'pt-BR'))
    .slice(0, 5);

  renderAnalyticsChart(document.getElementById('status-chart'), statuses, 'Nenhum relato para analisar.');
  renderAnalyticsChart(document.getElementById('category-chart'), categories, 'As categorias aparecerão após os primeiros relatos.');
  renderAnalyticsChart(document.getElementById('region-chart'), topRegions, 'As regiões aparecerão após os primeiros relatos.');
}

function getDashboardReports() {
  return reports.filter((report) =>
    (dashboardStateFilter.value === 'all' || report.state === dashboardStateFilter.value) &&
    (dashboardCityFilter.value === 'all' || `${report.state}|${report.city}` === dashboardCityFilter.value) &&
    (dashboardCategoryFilter.value === 'all' || report.category === dashboardCategoryFilter.value)
  );
}

function updateDashboardOverview() {
  const visibleReports = getDashboardReports();
  document.getElementById('stat-total').textContent = visibleReports.length;
  document.getElementById('stat-pending').textContent = visibleReports.filter((report) => report.status === 'pending').length;
  document.getElementById('stat-progress').textContent = visibleReports.filter((report) => report.status === 'progress').length;
  document.getElementById('stat-resolved').textContent = visibleReports.filter((report) => report.status === 'resolved').length;

  const scopeParts = [];
  if (dashboardCityFilter.value !== 'all') {
    scopeParts.push(dashboardCityFilter.selectedOptions[0].textContent);
  } else if (dashboardStateFilter.value !== 'all') {
    scopeParts.push(dashboardStateFilter.value);
  } else {
    scopeParts.push('Brasil inteiro');
  }
  if (dashboardCategoryFilter.value !== 'all') scopeParts.push(dashboardCategoryFilter.value);
  const countLabel = `${visibleReports.length} ${visibleReports.length === 1 ? 'registro' : 'registros'}`;
  document.getElementById('dashboard-filter-summary').textContent = `${scopeParts.join(' · ')} · ${countLabel}`;
  dashboardResetFilters.classList.toggle(
    'hidden',
    dashboardStateFilter.value === 'all' &&
      dashboardCityFilter.value === 'all' &&
      dashboardCategoryFilter.value === 'all'
  );

  renderAnalytics(visibleReports);
  renderRecentReports(visibleReports);
}

async function loadReports() {
  const { data, error } = await supabaseClient
    .from('ocorrencias')
    .select('id,user_id,title,description,category,neighborhood,city,state,status,latitude,longitude,image_url,created_at,is_demo')
    .order('created_at', { ascending: false });

  if (error) throw error;

  reports.splice(0, reports.length, ...data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    imageUrl: getPublicReportImageUrl(row.image_url),
    category: row.category,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    status: row.status,
    isDemo: row.is_demo,
    time: formatRelativeTime(row.created_at),
    mine: row.user_id === currentUser.id,
    location: row.latitude !== null && row.longitude !== null ? [row.latitude, row.longitude] : null
  })));

  updateLocationFilters();
  updateDashboardOverview();
  renderReports();
}

function switchPage(page) {
  if (page === 'admin' && !isAdmin) return;
  const view = page === 'mine' ? 'reports' : page;
  showMine = page === 'mine';

  document.querySelectorAll('.app-view').forEach((section) => {
    section.classList.toggle('hidden', section.id !== `view-${view}`);
  });
  document.querySelectorAll('[data-page-target]').forEach((button) => {
    const isActive = button.dataset.pageTarget === page;
    button.classList.toggle('is-active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  const pageTitles = {
    dashboard: 'Dashboard',
    map: 'Mapa do Brasil',
    reports: showMine ? 'Minhas ocorrências' : 'Ocorrências',
    admin: 'Administração'
  };
  document.getElementById('page-title').textContent = pageTitles[view];
  if (view === 'reports') {
    document.getElementById('reports-heading').textContent = pageTitles[view];
    renderReports();
  }
  if (view === 'admin') loadAdminUsers();
  if (view === 'map') requestAnimationFrame(() => map.invalidateSize());
}

document.querySelectorAll('[data-page-target]').forEach((button) => {
  button.addEventListener('click', () => switchPage(button.dataset.pageTarget));
});

function setActiveFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('[data-filter]').forEach((button) => {
    const isActive = button.dataset.filter === filter;
    button.setAttribute('aria-pressed', String(isActive));
    button.className = isActive
      ? 'shrink-0 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white'
      : 'shrink-0 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200';
  });
  renderReports();
}

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    setActiveFilter(button.dataset.filter);
  });
});

reportSearch.addEventListener('input', renderReports);
reportStateFilter.addEventListener('change', () => {
  populateCityFilter(reportCityFilter, reportStateFilter, 'Todas as cidades');
  renderReports();
});
reportCityFilter.addEventListener('change', renderReports);
reportCategoryFilter.addEventListener('change', renderReports);

dashboardStateFilter.addEventListener('change', () => {
  populateCityFilter(dashboardCityFilter, dashboardStateFilter, 'Todas as cidades');
  updateDashboardOverview();
});
dashboardCityFilter.addEventListener('change', updateDashboardOverview);
dashboardCategoryFilter.addEventListener('change', updateDashboardOverview);
dashboardResetFilters.addEventListener('click', () => {
  dashboardStateFilter.value = 'all';
  dashboardCategoryFilter.value = 'all';
  populateCityFilter(dashboardCityFilter, dashboardStateFilter, 'Todas as cidades');
  updateDashboardOverview();
  dashboardStateFilter.focus();
});

function focusMapOnLocations(locations) {
  if (!locations.length) {
    map.setView([-14.235, -51.9253], 4);
  } else if (locations.length === 1) {
    map.setView(locations[0], 13);
  } else {
    map.fitBounds(L.latLngBounds(locations), { padding: [40, 40], maxZoom: 13 });
  }
}

function getSelectedMapLocations() {
  return reports
    .filter((report) => {
      const matchesState = mapStateFilter.value === 'all' || report.state === mapStateFilter.value;
      const matchesCity = mapCityFilter.value === 'all' || `${report.state}|${report.city}` === mapCityFilter.value;
      return report.location && matchesState && matchesCity;
    })
    .map((report) => report.location);
}

mapStateFilter.addEventListener('change', () => {
  populateCityFilter(mapCityFilter, mapStateFilter, 'Todas as cidades');
  renderMapMarkers();
  focusMapOnLocations(getSelectedMapLocations());
});
mapCityFilter.addEventListener('change', () => {
  renderMapMarkers();
  focusMapOnLocations(getSelectedMapLocations());
});
mapSearch.addEventListener('input', renderMapMarkers);
mapStatusFilter.addEventListener('change', renderMapMarkers);
mapCategoryFilter.addEventListener('change', renderMapMarkers);

document.querySelectorAll('[data-open-report]').forEach((button) => {
  button.addEventListener('click', () => reportDialog.showModal());
});

function closeReportDialog() {
  reportDialog.close();
  reportForm.reset();
  document.getElementById('location-status').textContent =
    'Sem localização precisa, o relato aparece na lista, mas não recebe marcador no mapa.';
}

document.getElementById('close-report-dialog').addEventListener('click', closeReportDialog);
document.getElementById('cancel-report').addEventListener('click', closeReportDialog);

const reportImageInput = document.getElementById('report-image');
const reportImagePreview = document.getElementById('report-image-preview');
let reportImagePreviewUrl = null;

function clearReportImagePreview() {
  if (reportImagePreviewUrl) URL.revokeObjectURL(reportImagePreviewUrl);
  reportImagePreviewUrl = null;
  reportImagePreview.removeAttribute('src');
  reportImagePreview.classList.add('hidden');
}

reportForm.addEventListener('reset', clearReportImagePreview);
reportImageInput.addEventListener('change', () => {
  clearReportImagePreview();
  const [file] = reportImageInput.files || [];
  if (!file) return;
  if (!allowedReportImageTypes.has(file.type)) {
    reportImageInput.value = '';
    Swal.fire({
      icon: 'warning',
      title: 'Formato de imagem não aceito',
      text: 'Escolha uma imagem JPG, PNG ou WebP.',
      confirmButtonColor: '#d7ff00'
    });
    return;
  }
  if (file.size > MAX_REPORT_IMAGE_SIZE) {
    reportImageInput.value = '';
    Swal.fire({
      icon: 'warning',
      title: 'Imagem muito grande',
      text: 'Escolha uma imagem de até 5 MB.',
      confirmButtonColor: '#d7ff00'
    });
    return;
  }
  reportImagePreviewUrl = URL.createObjectURL(file);
  reportImagePreview.src = reportImagePreviewUrl;
  reportImagePreview.classList.remove('hidden');
});

document.getElementById('use-current-location').addEventListener('click', () => {
  const locationStatus = document.getElementById('location-status');
  if (!navigator.geolocation) {
    locationStatus.textContent = 'Este navegador não disponibiliza geolocalização.';
    return;
  }

  locationStatus.textContent = 'Obtendo localização...';
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      document.getElementById('report-latitude').value = coords.latitude;
      document.getElementById('report-longitude').value = coords.longitude;
      locationStatus.textContent = 'Localização adicionada. Ela ficará visível no mapa público.';
    },
    (error) => {
      locationStatus.textContent = error.code === error.PERMISSION_DENIED
        ? 'Permissão de localização negada. Você ainda pode enviar o relato sem marcador.'
        : 'Não foi possível obter a localização. Você ainda pode enviar o relato sem marcador.';
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
  );
});

reportForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = reportForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  const formData = new FormData(reportForm);
  const latitudeValue = formData.get('latitude');
  const longitudeValue = formData.get('longitude');
  const imageFile = reportImageInput.files[0] || null;
  let uploadedImagePath = null;
  if (imageFile && (
    !allowedReportImageTypes.has(imageFile.type) ||
    imageFile.size === 0 ||
    imageFile.size > MAX_REPORT_IMAGE_SIZE
  )) {
    submitButton.disabled = false;
    await Swal.fire({
      icon: 'warning',
      title: 'Imagem não aceita',
      text: 'Escolha uma imagem JPG, PNG ou WebP de até 5 MB.',
      confirmButtonColor: '#d7ff00'
    });
    return;
  }

  try {
    let imageUrl = null;
    if (imageFile) {
      const extensionByType = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
      };
      uploadedImagePath = `${currentUser.id}/${crypto.randomUUID()}.${extensionByType[imageFile.type]}`;
      const { error: uploadError } = await supabaseClient.storage
        .from('occurrence-images')
        .upload(uploadedImagePath, imageFile, {
          cacheControl: '3600',
          contentType: imageFile.type,
          upsert: false
        });
      if (uploadError) throw uploadError;
      imageUrl = supabaseClient.storage
        .from('occurrence-images')
        .getPublicUrl(uploadedImagePath).data.publicUrl;
    }

    const { error } = await supabaseClient.from('ocorrencias').insert({
      user_id: currentUser.id,
      title: formData.get('title').trim(),
      description: formData.get('description').trim(),
      category: formData.get('category'),
      neighborhood: formData.get('neighborhood').trim(),
      city: formData.get('city').trim(),
      state: formData.get('state'),
      status: 'pending',
      latitude: latitudeValue ? Number(latitudeValue) : null,
      longitude: longitudeValue ? Number(longitudeValue) : null,
      image_url: imageUrl
    });

    if (error) {
      if (uploadedImagePath) {
        const { error: cleanupError } = await supabaseClient.storage
          .from('occurrence-images')
          .remove([uploadedImagePath]);
        if (cleanupError) {
          console.error('Não foi possível remover a foto após falha ao salvar o relato', cleanupError);
        }
      }
      showDatabaseError(error, 'Não foi possível registrar a ocorrência');
      return;
    }

    closeReportDialog();
    await loadReports();
    Swal.fire({
      icon: 'success',
      title: 'Relato registrado!',
      text: 'Sua ocorrência foi salva e já está disponível para a comunidade.',
      confirmButtonColor: '#d7ff00'
    });
  } catch (error) {
    showDatabaseError(error, 'Não foi possível registrar a ocorrência');
  } finally {
    submitButton.disabled = false;
  }
});

function configurePopover(button, panel, focusTarget) {
  button.addEventListener('click', () => {
    const shouldOpen = panel.classList.contains('hidden');
    [notificationButton, profileButton].forEach((otherButton) => {
      const otherPanel = otherButton === notificationButton ? notificationPanel : profileMenu;
      otherPanel.classList.add('hidden');
      otherButton.setAttribute('aria-expanded', 'false');
    });

    if (shouldOpen) {
      panel.classList.remove('hidden');
      button.setAttribute('aria-expanded', 'true');
      focusTarget.focus();
    }
  });
}

configurePopover(notificationButton, notificationPanel, document.getElementById('notifications-heading'));
configurePopover(profileButton, profileMenu, document.getElementById('logout-button'));

document.addEventListener('pointerdown', (event) => {
  if (!(event.target instanceof Node)) return;
  [
    [notificationButton, notificationPanel],
    [profileButton, profileMenu]
  ].forEach(([button, panel]) => {
    if (!button.parentElement.contains(event.target)) {
      panel.classList.add('hidden');
      button.setAttribute('aria-expanded', 'false');
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  [
    [notificationButton, notificationPanel],
    [profileButton, profileMenu]
  ].forEach(([button, panel]) => {
    if (panel.classList.contains('hidden')) return;
    panel.classList.add('hidden');
    button.setAttribute('aria-expanded', 'false');
    button.focus();
  });
});

document.getElementById('logout-button').addEventListener('click', async () => {
  const result = await Swal.fire({
    icon: 'question',
    title: 'Deseja sair?',
    text: 'Você voltará para a tela de entrada.',
    showCancelButton: true,
    confirmButtonText: 'Sair',
    cancelButtonText: 'Continuar no painel',
    confirmButtonColor: '#d7ff00',
    cancelButtonColor: '#64748b'
  });
  if (!result.isConfirmed) return;

  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    showDatabaseError(error, 'Não foi possível encerrar a sessão');
    return;
  }
  window.location.href = 'index.html';
});

async function initializeDashboard() {
  document.getElementById('connection-status').textContent = 'Conectando...';
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    showDatabaseError(error, 'Não foi possível verificar sua sessão');
    window.location.href = 'index.html';
    return;
  }
  if (!data.session) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = data.session.user;
  document.getElementById('profile-email').textContent = currentUser.email || 'Conta autenticada';
  document.getElementById('connection-status').textContent = 'Conectado';

  try {
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', currentUser.id)
      .single();
    if (profileError) throw profileError;
    if (!profile.is_active) {
      await supabaseClient.auth.signOut();
      await Swal.fire({
        icon: 'warning',
        title: 'Acesso suspenso',
        text: 'Esta conta está suspensa. Fale com a equipe responsável se precisar de ajuda.',
        confirmButtonColor: '#d7ff00'
      });
      window.location.href = 'index.html';
      return;
    }
    isAdmin = profile.role === 'admin' && profile.is_active;
    document.getElementById('admin-nav').classList.toggle('hidden', !isAdmin);
    await loadReports();
  } catch (errorLoadingReports) {
    showDatabaseError(errorLoadingReports);
  }
}

switchPage('map');
initializeDashboard().catch((error) => showDatabaseError(error, 'Não foi possível iniciar o painel'));
window.addEventListener('load', () => map.invalidateSize());
