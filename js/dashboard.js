// Show alerts above any open <dialog> (modal dialogs sit in the top layer and would hide them).
const originalSwalFire = Swal.fire.bind(Swal);
Swal.fire = (options, ...rest) => {
  const openDialog = document.querySelector('dialog[open]');
  if (openDialog && options && typeof options === 'object' && !options.target) {
    return originalSwalFire({ ...options, target: openDialog }, ...rest);
  }
  return originalSwalFire(options, ...rest);
};

const reports = [];
const categories = [];
const places = [];

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
const includeArchivedMap = document.getElementById('include-archived-map');
const includeArchivedReports = document.getElementById('include-archived-reports');
const categoryDialog = document.getElementById('category-dialog');
const categoryForm = document.getElementById('category-form');
const categoryIdInput = document.getElementById('category-id');
const categoryNameInput = document.getElementById('category-name');
const categoryDescriptionInput = document.getElementById('category-description');
const categoryList = document.getElementById('categories-list');
const placeDialog = document.getElementById('place-dialog');
const placeForm = document.getElementById('place-form');
const placeIdInput = document.getElementById('place-id');
const placeList = document.getElementById('places-list');
const reportCategorySelect = document.getElementById('report-category');
const reportPlaceSelect = document.getElementById('report-place');
const reportDialog = document.getElementById('report-dialog');
const reportForm = document.getElementById('report-form');
let geocodeCandidates = [];
let nextGeocodeRequestAt = 0;
let originalReportImageUrl = null;
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

// Outline Brazil, dim the rest of the world and keep the map inside the country.
fetch('assets/brazil.geo.json')
  .then((response) => response.json())
  .then((geojson) => {
    const ring = geojson.features[0].geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
    const world = [[-89, -179], [-89, 179], [89, 179], [89, -179]];
    const mask = L.polygon([world, ring], { stroke: false, fillColor: '#000', fillOpacity: 0.55, interactive: false }).addTo(map);
    L.polygon(ring, { color: '#d7ff00', weight: 1.5, opacity: 0.8, fill: false, interactive: false }).addTo(map);
    map.setMaxBounds(L.latLngBounds(ring).pad(0.25));
    const toggleMask = () => {
      if (map.getZoom() >= 7) mask.remove(); else mask.addTo(map);
    };
    map.on('zoomend', toggleMask);
    toggleMask();
  })
  .catch((error) => console.error('Não foi possível carregar o contorno do Brasil', error));
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

function getOccurrenceImagePath(value) {
  const imageUrl = getPublicReportImageUrl(value);
  if (!imageUrl || !imageUrl.startsWith('https://rnfdliedxxmjakcgkhfc.supabase.co/')) return null;

  const path = new URL(imageUrl).pathname
    .replace('/storage/v1/object/public/occurrence-images/', '');
  try {
    return path.split('/').map(decodeURIComponent).join('/');
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

function formatReportAddress(report) {
  const streetLine = [report.street, report.streetNumber].filter(Boolean).join(', ');
  const cityLine = [report.city, report.state].filter(Boolean).join(' - ');
  return [
    streetLine,
    report.complement,
    report.neighborhood,
    cityLine,
    report.postalCode ? `CEP ${report.postalCode}` : ''
  ].filter(Boolean).join(' · ');
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
    const matchesCategory = reportCategoryFilter.value === 'all' || report.categoryId === reportCategoryFilter.value;
    const searchableText = `${report.title} ${report.category} ${report.street} ${report.streetNumber} ${report.complement} ${report.postalCode} ${report.neighborhood} ${report.city} ${report.state}`.toLocaleLowerCase('pt-BR');
    return (includeArchivedReports.checked || !report.isArchived) &&
      matchesStatus && matchesState && matchesCity && matchesCategory &&
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
          <p class="mt-1 text-xs text-slate-500">${escapeHTML(report.category)} <span class="mx-1 text-slate-300">·</span> ${escapeHTML(formatReportAddress(report))} <span class="mx-1 text-slate-300">·</span> ${escapeHTML(report.time)}</p>
        </div>
        ${report.imageUrl ? `<img class="report-list-image" src="${escapeHTML(report.imageUrl)}" alt="Foto: ${escapeHTML(report.title)}" loading="lazy">` : ''}
        ${report.isArchived ? '<span class="archived-report-badge">Arquivada</span>' : ''}
        <span class="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.classes}">
          <i data-lucide="${status.icon}" class="h-3.5 w-3.5"></i>
          ${status.label}
        </span>
        ${(isAdmin || (report.mine && !report.isDemo)) ? `<button type="button" class="report-edit-button" data-edit-report="${escapeHTML(report.id)}" aria-label="Editar ocorrência: ${escapeHTML(report.title)}" title="Editar ocorrência"><i data-lucide="pencil" class="h-4 w-4"></i></button>` : ''}
        ${(isAdmin || (report.mine && !report.isDemo)) ? `<button type="button" class="report-delete-button" data-delete-report="${escapeHTML(report.id)}" aria-label="Excluir ocorrência: ${escapeHTML(report.title)}" title="Excluir ocorrência"><i data-lucide="trash-2" class="h-4 w-4"></i></button>` : ''}
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
    const matchesCategory = mapCategoryFilter.value === 'all' || report.categoryId === mapCategoryFilter.value;
    const searchableText = `${report.title} ${report.category} ${report.street} ${report.streetNumber} ${report.complement} ${report.postalCode} ${report.neighborhood} ${report.city} ${report.state}`.toLocaleLowerCase('pt-BR');
    return (includeArchivedMap.checked || !report.isArchived) &&
      matchesState && matchesCity && matchesStatus && matchesCategory && searchableText.includes(searchTerm);
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
      <div class="map-popup-card">
        ${report.imageUrl ? `<img class="map-popup-image" src="${escapeHTML(report.imageUrl)}" alt="Ilustração da ocorrência: ${escapeHTML(report.title)}" loading="lazy">` : '<div class="map-popup-image-placeholder"><span>HYLA</span><i data-lucide="map-pin" class="h-6 w-6"></i></div>'}
        <div class="map-popup-content">
          <div class="map-popup-topline">
            <span class="map-popup-category">${escapeHTML(report.category)}</span>
            <span class="map-popup-status map-popup-status-${escapeHTML(report.status)}">${status.label}</span>
          </div>
          <h3 class="map-popup-title">${escapeHTML(report.title)}</h3>
          ${report.description ? `<p class="map-popup-description">${escapeHTML(report.description)}</p>` : ''}
          <div class="map-popup-location"><i data-lucide="map-pin" class="h-3.5 w-3.5"></i><span>${escapeHTML(formatReportAddress(report))}</span></div>
          <div class="map-popup-footer">
            <span>${escapeHTML(report.time)}</span>
            ${report.isDemo ? '<span class="map-popup-example">Exemplo</span>' : ''}
            ${report.isArchived ? '<span class="map-popup-archived">Arquivada</span>' : ''}
          </div>
        </div>
      </div>
    `, { maxWidth: 340, minWidth: 270 });
    marker.on('popupopen', () => lucide.createIcons());
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
  const categories = [...new Set(visibleReports.map((report) => report.category))]
    .map((category) => ({
      label: category,
      value: visibleReports.filter((report) => report.category === category).length
    }))
    .sort((first, second) => second.value - first.value || first.label.localeCompare(second.label, 'pt-BR'));
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
    !report.isArchived &&
    (dashboardStateFilter.value === 'all' || report.state === dashboardStateFilter.value) &&
    (dashboardCityFilter.value === 'all' || `${report.state}|${report.city}` === dashboardCityFilter.value) &&
    (dashboardCategoryFilter.value === 'all' || report.categoryId === dashboardCategoryFilter.value)
  );
}

function updateDashboardOverview() {
  const visibleReports = getDashboardReports();
  const total = visibleReports.length;
  const pending = visibleReports.filter((report) => report.status === 'pending').length;
  const progress = visibleReports.filter((report) => report.status === 'progress').length;
  const resolved = visibleReports.filter((report) => report.status === 'resolved').length;
  const percentage = (value) => `${total ? Math.round((value / total) * 100) : 0}%`;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-progress').textContent = progress;
  document.getElementById('stat-resolved').textContent = resolved;
  document.getElementById('stat-pending-share').textContent = percentage(pending);
  document.getElementById('stat-progress-share').textContent = percentage(progress);
  document.getElementById('stat-resolved-share').textContent = percentage(resolved);

  const scopeParts = [];
  if (dashboardCityFilter.value !== 'all') {
    scopeParts.push(dashboardCityFilter.selectedOptions[0].textContent);
  } else if (dashboardStateFilter.value !== 'all') {
    scopeParts.push(dashboardStateFilter.value);
  } else {
    scopeParts.push('Brasil inteiro');
  }
  if (dashboardCategoryFilter.value !== 'all') {
    scopeParts.push(dashboardCategoryFilter.selectedOptions[0].textContent);
  }
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
  lucide.createIcons();
}

function updateCatalogSelects() {
  const selectedCategory = reportCategorySelect.value;
  const filterSelections = new Map([
    [reportCategoryFilter, reportCategoryFilter.value],
    [mapCategoryFilter, mapCategoryFilter.value],
    [dashboardCategoryFilter, dashboardCategoryFilter.value]
  ]);
  reportCategorySelect.replaceChildren(new Option('Selecione uma categoria', ''));
  categories.forEach((category) => reportCategorySelect.add(new Option(category.name, category.id)));
  reportCategorySelect.value = categories.some((category) => category.id === selectedCategory)
    ? selectedCategory
    : '';

  filterSelections.forEach((selectedValue, select) => {
    select.replaceChildren(new Option('Todas as categorias', 'all'));
    categories.forEach((category) => select.add(new Option(category.name, category.id)));
    select.value = categories.some((category) => category.id === selectedValue)
      ? selectedValue
      : 'all';
  });

  const selectedPlace = reportPlaceSelect.value;
  reportPlaceSelect.replaceChildren(new Option('Digite um endereço ou selecione um local salvo', ''));
  places.forEach((place) => reportPlaceSelect.add(new Option(
    `${[place.street, place.streetNumber].filter(Boolean).join(', ') || place.neighborhood} · ${place.city} - ${place.state}`,
    place.id
  )));
  reportPlaceSelect.value = places.some((place) => place.id === selectedPlace) ? selectedPlace : '';
  document.getElementById('report-place-hint').textContent = places.length
    ? 'Selecione um endereço salvo para preencher os campos; confirme as coordenadas da ocorrência separadamente.'
    : 'Você pode digitar o endereço ou cadastrá-lo na seção Locais para reutilizá-lo.';
}

function renderCatalogs() {
  const categoryUsage = new Map();
  const placeUsage = new Map();
  reports.forEach((report) => {
    if (report.categoryId) categoryUsage.set(report.categoryId, (categoryUsage.get(report.categoryId) || 0) + 1);
    if (report.placeId) placeUsage.set(report.placeId, (placeUsage.get(report.placeId) || 0) + 1);
  });

  document.getElementById('categories-count').textContent =
    `${categories.length} ${categories.length === 1 ? 'categoria disponível' : 'categorias disponíveis'}`;
  categoryList.innerHTML = categories.map((category) => {
    const canManage = category.createdBy === currentUser.id || (category.createdBy === null && isAdmin);
    const usage = categoryUsage.get(category.id) || 0;
    return `
      <article class="catalog-card">
        <span class="catalog-card-icon"><i data-lucide="${categoryDetails[category.name]?.icon || 'tag'}" class="h-5 w-5"></i></span>
        <div class="catalog-card-copy">
          <div class="catalog-card-title-row"><h3>${escapeHTML(category.name)}</h3>${category.createdBy === null ? '<span class="catalog-shared-badge">Compartilhada</span>' : ''}</div>
          <p>${escapeHTML(category.description || 'Sem descrição adicional.')}</p>
          <small>${usage} ${usage === 1 ? 'ocorrência vinculada' : 'ocorrências vinculadas'}</small>
        </div>
        ${canManage ? `<div class="catalog-actions"><button type="button" class="catalog-action" data-edit-category="${escapeHTML(category.id)}" aria-label="Editar categoria ${escapeHTML(category.name)}" title="Editar"><i data-lucide="pencil" class="h-4 w-4"></i></button><button type="button" class="catalog-action is-danger" data-delete-category="${escapeHTML(category.id)}" aria-label="Excluir categoria ${escapeHTML(category.name)}" title="Excluir"><i data-lucide="trash-2" class="h-4 w-4"></i></button></div>` : ''}
      </article>
    `;
  }).join('') || '<p class="catalog-empty">Nenhuma categoria cadastrada.</p>';

  document.getElementById('places-count').textContent =
    `${places.length} ${places.length === 1 ? 'local disponível' : 'locais disponíveis'}`;
  document.getElementById('places-list').innerHTML = places.map((place) => {
    const canManage = place.createdBy === currentUser.id || (place.createdBy === null && isAdmin);
    const usage = placeUsage.get(place.id) || 0;
    const streetLine = [place.street, place.streetNumber].filter(Boolean).join(', ');
    const hasCoordinates = place.latitude !== null && place.longitude !== null;
    return `
      <article class="catalog-card">
        <span class="catalog-card-icon"><i data-lucide="map-pin" class="h-5 w-5"></i></span>
        <div class="catalog-card-copy">
          <div class="catalog-card-title-row"><h3>${escapeHTML(place.neighborhood)}</h3>${place.createdBy === null ? '<span class="catalog-shared-badge">Compartilhado</span>' : ''}</div>
          <p>${streetLine ? `${escapeHTML(streetLine)}${place.complement ? ` (${escapeHTML(place.complement)})` : ''} · ` : ''}${escapeHTML(place.neighborhood)} · ${escapeHTML(place.city)} - ${escapeHTML(place.state)}${place.postalCode ? ` · CEP ${escapeHTML(place.postalCode)}` : ''}</p>
          <small>${usage} ${usage === 1 ? 'ocorrência vinculada' : 'ocorrências vinculadas'} · ${hasCoordinates ? 'Localização no mapa' : 'Sem coordenadas'}</small>
        </div>
        ${canManage ? `<div class="catalog-actions"><button type="button" class="catalog-action" data-edit-place="${escapeHTML(place.id)}" aria-label="Editar local ${escapeHTML(place.neighborhood)}" title="Editar"><i data-lucide="pencil" class="h-4 w-4"></i></button><button type="button" class="catalog-action is-danger" data-delete-place="${escapeHTML(place.id)}" aria-label="Excluir local ${escapeHTML(place.neighborhood)}" title="Excluir"><i data-lucide="trash-2" class="h-4 w-4"></i></button></div>` : ''}
      </article>
    `;
  }).join('') || '<p class="catalog-empty">Nenhum local cadastrado.</p>';

  updateCatalogSelects();
  lucide.createIcons();
}

async function loadCatalogs() {
  const [categoryResult, placeResult] = await Promise.all([
    supabaseClient.from('hyla_categories').select('id,created_by,name,description,created_at').order('name'),
    supabaseClient.from('hyla_places').select('id,created_by,postal_code,street,street_number,complement,neighborhood,city,state,latitude,longitude,created_at').order('state').order('city').order('neighborhood')
  ]);
  if (categoryResult.error) throw categoryResult.error;
  if (placeResult.error) throw placeResult.error;

  categories.splice(0, categories.length, ...categoryResult.data.map((row) => ({
    id: row.id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description,
    createdAt: row.created_at
  })));
  places.splice(0, places.length, ...placeResult.data.map((row) => ({
    id: row.id,
    createdBy: row.created_by,
    postalCode: row.postal_code,
    street: row.street,
    streetNumber: row.street_number,
    complement: row.complement,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at
  })));
  renderCatalogs();
}

function openCategoryDialog(category = null) {
  categoryForm.reset();
  categoryIdInput.value = category?.id || '';
  categoryNameInput.value = category?.name || '';
  categoryDescriptionInput.value = category?.description || '';
  document.getElementById('category-dialog-title').textContent =
    category ? 'Editar categoria' : 'Nova categoria';
  categoryDialog.showModal();
}

function openPlaceDialog(place = null) {
  placeForm.reset();
  placeIdInput.value = place?.id || '';
  document.getElementById('place-postal-code').value = place?.postalCode || '';
  document.getElementById('place-street').value = place?.street || '';
  document.getElementById('place-street-number').value = place?.streetNumber || '';
  document.getElementById('place-complement').value = place?.complement || '';
  document.getElementById('place-neighborhood').value = place?.neighborhood || '';
  document.getElementById('place-city').value = place?.city || '';
  document.getElementById('place-state').value = place?.state || '';
  document.getElementById('place-latitude').value = place?.latitude ?? '';
  document.getElementById('place-longitude').value = place?.longitude ?? '';
  document.getElementById('place-dialog-title').textContent =
    place ? 'Editar local' : 'Novo local';
  placeDialog.showModal();
}

async function saveCatalogRecord(dialog, button, request, successTitle) {
  button.disabled = true;
  let saved = false;
  try {
    const { data, error } = await request();
    if (error) throw error;
    if (!data) throw new Error('O cadastro não foi atualizado. Verifique suas permissões.');
    saved = true;
    dialog.close();
    try {
      await loadCatalogs();
      await loadReports();
    } catch (refreshError) {
      console.error('Cadastro salvo, mas as listas não puderam ser atualizadas', refreshError);
      await Swal.fire({
        icon: 'warning',
        title: 'Cadastro salvo',
        text: 'Não foi possível atualizar as listas agora. Atualize a página para ver as alterações.',
        confirmButtonColor: '#d7ff00'
      });
      return;
    }
    await Swal.fire({
      icon: 'success',
      title: successTitle,
      confirmButtonColor: '#d7ff00'
    });
  } catch (error) {
    console.error(`Não foi possível salvar ${successTitle.toLocaleLowerCase('pt-BR')}`, error);
    await Swal.fire({
      icon: 'error',
      title: saved ? 'Cadastro salvo' : 'Não foi possível salvar',
      text: error.message || 'Verifique sua conexão e tente novamente.',
      confirmButtonColor: '#d7ff00'
    });
  } finally {
    button.disabled = false;
  }
}

categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = categoryForm.querySelector('[type="submit"]');
  const id = categoryIdInput.value;
  const values = {
    name: categoryNameInput.value.trim(),
    description: categoryDescriptionInput.value.trim()
  };
  await saveCatalogRecord(categoryDialog, button, () => {
    if (id) {
      return supabaseClient.from('hyla_categories').update(values).eq('id', id).select('id').maybeSingle();
    }
    return supabaseClient.from('hyla_categories')
      .insert({ ...values, created_by: isAdmin ? null : currentUser.id }).select('id').single();
  }, id ? 'Categoria atualizada' : 'Categoria cadastrada');
});

placeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = placeForm.querySelector('[type="submit"]');
  const id = placeIdInput.value;
  const latitude = document.getElementById('place-latitude').value;
  const longitude = document.getElementById('place-longitude').value;
  const values = {
    postal_code: document.getElementById('place-postal-code').value.trim() || null,
    street: document.getElementById('place-street').value.trim(),
    street_number: document.getElementById('place-street-number').value.trim() || null,
    complement: document.getElementById('place-complement').value.trim() || null,
    neighborhood: document.getElementById('place-neighborhood').value.trim(),
    city: document.getElementById('place-city').value.trim(),
    state: document.getElementById('place-state').value,
    latitude: latitude ? Number(latitude) : null,
    longitude: longitude ? Number(longitude) : null
  };
  await saveCatalogRecord(placeDialog, button, () => {
    if (id) {
      return supabaseClient.from('hyla_places').update(values).eq('id', id).select('id').maybeSingle();
    }
    return supabaseClient.from('hyla_places')
      .insert({ ...values, created_by: isAdmin ? null : currentUser.id }).select('id').single();
  }, id ? 'Local atualizado' : 'Local cadastrado');
});

async function deleteCatalogRecord(table, id, label) {
  const confirmation = await Swal.fire({
    icon: 'warning',
    title: `Excluir ${label}?`,
    text: 'Essa ação é permanente. Cadastros relacionados a ocorrências não podem ser removidos.',
    showCancelButton: true,
    confirmButtonText: 'Excluir',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#b4534b',
    cancelButtonColor: '#64748b'
  });
  if (!confirmation.isConfirmed) return;

  try {
    const { data, error } = await supabaseClient.from(table).delete().eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Você não tem permissão para excluir este cadastro.');
    try {
      await loadCatalogs();
      await loadReports();
    } catch (refreshError) {
      console.error('Cadastro excluído, mas as listas não puderam ser atualizadas', refreshError);
      await Swal.fire({
        icon: 'warning',
        title: 'Cadastro excluído',
        text: 'Não foi possível atualizar as listas agora. Atualize a página para ver as alterações.',
        confirmButtonColor: '#d7ff00'
      });
      return;
    }
    await Swal.fire({
      icon: 'success',
      title: 'Cadastro excluído',
      confirmButtonColor: '#d7ff00'
    });
  } catch (error) {
    console.error(`Não foi possível excluir ${label}`, error);
    await Swal.fire({
      icon: 'error',
      title: 'Não foi possível excluir',
      text: error.code === '23503'
        ? 'Este cadastro está vinculado a ocorrências. Edite ou mantenha os registros relacionados.'
        : error.message || 'Verifique sua conexão e tente novamente.',
      confirmButtonColor: '#d7ff00'
    });
  }
}

document.getElementById('create-category').addEventListener('click', () => openCategoryDialog());
document.getElementById('create-place').addEventListener('click', () => openPlaceDialog());
document.getElementById('refresh-categories').addEventListener('click', async () => {
  try {
    await loadCatalogs();
  } catch (error) {
    showDatabaseError(error, 'Não foi possível atualizar as categorias');
  }
});
document.getElementById('refresh-places').addEventListener('click', async () => {
  try {
    await loadCatalogs();
  } catch (error) {
    showDatabaseError(error, 'Não foi possível atualizar os locais');
  }
});
categoryList.addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-edit-category]');
  const deleteButton = event.target.closest('[data-delete-category]');
  if (editButton) {
    const category = categories.find((item) => item.id === editButton.dataset.editCategory);
    if (category) openCategoryDialog(category);
  } else if (deleteButton) {
    deleteCatalogRecord('hyla_categories', deleteButton.dataset.deleteCategory, 'esta categoria');
  }
});
placeList.addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-edit-place]');
  const deleteButton = event.target.closest('[data-delete-place]');
  if (editButton) {
    const place = places.find((item) => item.id === editButton.dataset.editPlace);
    if (place) openPlaceDialog(place);
  } else if (deleteButton) {
    deleteCatalogRecord('hyla_places', deleteButton.dataset.deletePlace, 'este local');
  }
});
document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog).close());
});

reportPlaceSelect.addEventListener('change', () => {
  const place = places.find((item) => item.id === reportPlaceSelect.value);
  if (!place) return;
  document.getElementById('report-postal-code').value = place.postalCode || '';
  document.getElementById('report-street').value = place.street || '';
  document.getElementById('report-street-number').value = place.streetNumber || '';
  document.getElementById('report-complement').value = place.complement || '';
  document.getElementById('report-neighborhood').value = place.neighborhood || '';
  document.getElementById('report-city').value = place.city || '';
  document.getElementById('report-state').value = place.state || '';
  document.getElementById('report-latitude').value = '';
  document.getElementById('report-longitude').value = '';
  geocodeCandidates = [];
  document.getElementById('report-geo-candidates').replaceChildren();
  if (place) {
    document.getElementById('location-status').textContent =
      'Endereço preenchido. Confirme a posição da ocorrência pela busca ou GPS; as coordenadas do local salvo não serão usadas automaticamente.';
  }
});

async function loadReports() {
  const { data, error } = await supabaseClient
    .from('ocorrencias')
    .select('id,user_id,title,description,category,category_id,place_id,postal_code,street,street_number,complement,neighborhood,city,state,status,latitude,longitude,image_url,created_at,resolved_at,is_demo')
    .order('created_at', { ascending: false });

  if (error) throw error;

  reports.splice(0, reports.length, ...data.map((row) => {
    const category = categories.find((item) => item.id === row.category_id);
    const place = places.find((item) => item.id === row.place_id);
    const latitude = row.latitude ?? place?.latitude ?? null;
    const longitude = row.longitude ?? place?.longitude ?? null;
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      imageUrl: getPublicReportImageUrl(row.image_url),
      imageUrlValue: row.image_url,
      categoryId: row.category_id,
      placeId: row.place_id,
      category: category?.name || row.category,
      postalCode: row.postal_code || place?.postalCode || '',
      street: row.street || place?.street || '',
      streetNumber: row.street_number || place?.streetNumber || '',
      complement: row.complement || place?.complement || '',
      neighborhood: place?.neighborhood || row.neighborhood,
      city: place?.city || row.city,
      state: place?.state || row.state,
      status: row.status,
      isDemo: row.is_demo,
      isArchived: row.status === 'resolved' && row.resolved_at !== null &&
        Date.now() - new Date(row.resolved_at).getTime() >= 30 * 24 * 60 * 60 * 1000,
      time: formatRelativeTime(row.created_at),
      mine: row.user_id === currentUser.id,
      location: latitude !== null && longitude !== null ? [latitude, longitude] : null
    };
  }));

  renderCatalogs();
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
    categories: 'Categorias',
    places: 'Locais',
    admin: 'Administração'
  };
  document.getElementById('page-title').textContent = pageTitles[view];
  if (view === 'reports') {
    document.getElementById('reports-heading').textContent = pageTitles[view];
    document.getElementById('reports-list-title').textContent = showMine ? 'Seus relatos' : 'Todos os relatos';
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
      return report.location &&
        (includeArchivedMap.checked || !report.isArchived) &&
        matchesState &&
        matchesCity;
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
includeArchivedMap.addEventListener('change', renderMapMarkers);
includeArchivedReports.addEventListener('change', renderReports);

reportList.addEventListener('click', async (event) => {
  const editButton = event.target.closest('button[data-edit-report]');
  if (editButton) {
    const report = reports.find((item) => item.id === editButton.dataset.editReport);
    if (report && (isAdmin || (report.mine && !report.isDemo))) openReportDialog(report);
    return;
  }

  const button = event.target.closest('button[data-delete-report]');
  if (!button || button.disabled) return;

  const report = reports.find((item) => item.id === button.dataset.deleteReport);
  if (!report || (!isAdmin && (!report.mine || report.isDemo))) return;

  const result = await Swal.fire({
    icon: 'warning',
    title: 'Excluir esta ocorrência?',
    text: 'Essa ação é permanente e o relato deixará de aparecer para todos.',
    showCancelButton: true,
    confirmButtonText: 'Excluir ocorrência',
    cancelButtonText: 'Manter ocorrência',
    confirmButtonColor: '#b4534b',
    cancelButtonColor: '#64748b'
  });
  if (!result.isConfirmed) return;

  button.disabled = true;
  try {
    const { data, error } = await supabaseClient
      .from('ocorrencias')
      .delete()
      .eq('id', report.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Você não tem permissão para excluir esta ocorrência.');

    reports.splice(reports.indexOf(report), 1);
    updateLocationFilters();
    updateDashboardOverview();
    renderReports();

    const imagePath = getOccurrenceImagePath(report.imageUrl);
    if (imagePath) {
      const { error: imageError } = await supabaseClient.storage
        .from('occurrence-images')
        .remove([imagePath]);
      if (imageError) {
        console.error('Ocorrência excluída, mas não foi possível remover sua imagem', imageError);
        await Swal.fire({
          icon: 'warning',
          title: 'Relato excluído',
          text: 'A ocorrência foi removida, mas a imagem não pôde ser apagada do armazenamento.',
          confirmButtonColor: '#d7ff00'
        });
        return;
      }
    }

    await Swal.fire({
      icon: 'success',
      title: 'Ocorrência excluída',
      confirmButtonColor: '#d7ff00'
    });
  } catch (error) {
    console.error('Não foi possível excluir a ocorrência', error);
    await Swal.fire({
      icon: 'error',
      title: 'Não foi possível excluir',
      text: error.message || 'Verifique sua conexão e tente novamente.',
      confirmButtonColor: '#d7ff00'
    });
    button.disabled = false;
  }
});

document.querySelectorAll('[data-open-report]').forEach((button) => {
  button.addEventListener('click', () => openReportDialog());
});

function openReportDialog(report = null) {
  reportForm.reset();
  document.getElementById('report-id').value = report?.id || '';
  document.getElementById('report-title').value = report?.title || '';
  reportCategorySelect.value = report?.categoryId || '';
  reportPlaceSelect.value = report?.placeId || '';
  document.getElementById('report-postal-code').value = report?.postalCode || '';
  document.getElementById('report-street').value = report?.street || '';
  document.getElementById('report-street-number').value = report?.streetNumber || '';
  document.getElementById('report-complement').value = report?.complement || '';
  document.getElementById('report-neighborhood').value = report?.neighborhood || '';
  document.getElementById('report-city').value = report?.city || '';
  document.getElementById('report-state').value = report?.state || '';
  document.getElementById('report-latitude').value = report?.location?.[0] ?? '';
  document.getElementById('report-longitude').value = report?.location?.[1] ?? '';
  document.getElementById('report-description').value = report?.description || '';
  document.getElementById('report-dialog-title').textContent =
    report ? 'Editar ocorrência' : 'Registrar ocorrência';
  document.getElementById('save-report-label').textContent =
    report ? 'Salvar alterações' : 'Enviar relato';
  if (report?.imageUrl) {
    reportImagePreview.src = report.imageUrl;
    reportImagePreview.classList.remove('hidden');
  }
  document.getElementById('location-status').textContent = report?.location
    ? 'A posição salva foi carregada. Se você alterar o endereço, será necessário confirmar as coordenadas novamente.'
    : 'Confirme um resultado da busca ou use o GPS no local da ocorrência antes de salvar.';
  reportDialog.showModal();
  updatePickMap();
}

function closeReportDialog() {
  reportDialog.close();
  reportForm.reset();
  document.getElementById('report-id').value = '';
  document.getElementById('report-dialog-title').textContent = 'Registrar ocorrência';
  document.getElementById('save-report-label').textContent = 'Enviar relato';
  document.getElementById('location-status').textContent =
    'Confirme um resultado da busca ou use o GPS no local da ocorrência antes de salvar.';
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

let pickMap = null;
let pickMarker = null;

function setPickedLocation(lat, lng) {
  document.getElementById("report-latitude").value = lat.toFixed(6);
  document.getElementById("report-longitude").value = lng.toFixed(6);
  document.getElementById("location-status").textContent =
    "Posição ajustada manualmente. Confira se o pino está no local exato da ocorrência; as coordenadas serão públicas.";
}

function updatePickMap() {
  const container = document.getElementById("report-pick-map");
  const hint = document.getElementById("report-pick-hint");
  const latText = document.getElementById("report-latitude").value;
  const lat = Number(latText);
  const lng = Number(document.getElementById("report-longitude").value);
  const hasCoords = latText !== "" && Number.isFinite(lat) && Number.isFinite(lng);
  container.classList.toggle("hidden", !hasCoords);
  hint.classList.toggle("hidden", !hasCoords);
  if (!hasCoords) return;
  if (!pickMap) {
    pickMap = L.map(container).setView([lat, lng], 18);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(pickMap);
    pickMarker = L.marker([lat, lng], { draggable: true }).addTo(pickMap);
    pickMarker.on("dragend", () => {
      const { lat: newLat, lng: newLng } = pickMarker.getLatLng();
      setPickedLocation(newLat, newLng);
    });
    pickMap.on("click", (event) => {
      pickMarker.setLatLng(event.latlng);
      setPickedLocation(event.latlng.lat, event.latlng.lng);
    });
  } else {
    pickMarker.setLatLng([lat, lng]);
    pickMap.setView([lat, lng], 18);
  }
  setTimeout(() => pickMap.invalidateSize(), 50);
}

function clearGeocodeCandidates() {
  geocodeCandidates = [];
  document.getElementById('report-geo-candidates').replaceChildren();
}

function invalidateReportLocation() {
  document.getElementById('report-latitude').value = '';
  document.getElementById('report-longitude').value = '';
  document.getElementById('location-status').textContent =
    'O endereço mudou. Confirme novamente a posição no mapa ou use o GPS no local da ocorrência.';
  clearGeocodeCandidates();
  updatePickMap();
  reportPlaceSelect.value = '';
}

reportForm.addEventListener('reset', () => {
  clearReportImagePreview();
  clearGeocodeCandidates();
});
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

[
  'report-postal-code',
  'report-street',
  'report-street-number',
  'report-complement',
  'report-neighborhood',
  'report-city',
  'report-state'
].forEach((id) => {
  const field = document.getElementById(id);
  field.addEventListener('input', invalidateReportLocation);
  field.addEventListener('change', invalidateReportLocation);
});

document.getElementById('lookup-postal-code').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const postalCode = document.getElementById('report-postal-code').value.replace(/\D/g, '');
  if (!/^\d{8}$/.test(postalCode)) {
    await Swal.fire({
      icon: 'warning',
      title: 'CEP inválido',
      text: 'Informe os 8 números do CEP para fazer a consulta.',
      confirmButtonColor: '#d7ff00'
    });
    return;
  }

  button.disabled = true;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`);
    if (!response.ok) throw new Error(`O serviço ViaCEP respondeu com o status ${response.status}.`);
    const result = await response.json();
    if (result.erro) throw new Error('O CEP não foi encontrado no ViaCEP.');

    document.getElementById('report-postal-code').value = result.cep || `${postalCode.slice(0, 5)}-${postalCode.slice(5)}`;
    if (result.logradouro) document.getElementById('report-street').value = result.logradouro;
    if (result.bairro) document.getElementById('report-neighborhood').value = result.bairro;
    if (result.localidade) document.getElementById('report-city').value = result.localidade;
    if (result.uf) document.getElementById('report-state').value = result.uf;
    invalidateReportLocation();
    document.getElementById('location-status').textContent =
      'Endereço preenchido pelo ViaCEP. Confira os dados e confirme a posição no mapa.';
  } catch (error) {
    console.error('Não foi possível consultar o CEP', error);
    await Swal.fire({
      icon: 'error',
      title: 'Não foi possível buscar o CEP',
      text: error.message || 'Verifique sua conexão e tente novamente.',
      confirmButtonColor: '#d7ff00'
    });
  } finally {
    button.disabled = false;
  }
});

document.getElementById('geocode-address').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const street = document.getElementById('report-street').value.trim();
  const streetNumber = document.getElementById('report-street-number').value.trim();
  const neighborhood = document.getElementById('report-neighborhood').value.trim();
  const city = document.getElementById('report-city').value.trim();
  const state = document.getElementById('report-state').value;
  const postalCode = document.getElementById('report-postal-code').value.trim();
  const locationStatus = document.getElementById('location-status');
  if (!street || !neighborhood || !city || !state) {
    locationStatus.textContent = 'Preencha rua, bairro, cidade e UF antes de buscar no mapa.';
    return;
  }

  const waitTime = nextGeocodeRequestAt - Date.now();
  if (waitTime > 0) {
    locationStatus.textContent = 'Aguarde um segundo antes de fazer outra busca no mapa.';
    return;
  }

  const query = [
    [street, streetNumber].filter(Boolean).join(', '),
    neighborhood,
    city,
    state,
    postalCode,
    'Brasil'
  ].filter(Boolean).join(', ');
  const parameters = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'br',
    limit: '5'
  });

  button.disabled = true;
  locationStatus.textContent = 'Buscando endereços correspondentes...';
  clearGeocodeCandidates();
  nextGeocodeRequestAt = Date.now() + 1100;
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${parameters}`);
    if (!response.ok) throw new Error(`O serviço de mapas respondeu com o status ${response.status}.`);
    const results = await response.json();
    if (!Array.isArray(results)) throw new Error('O serviço de mapas retornou uma resposta inválida.');
    geocodeCandidates = results.filter((result) =>
      result.address?.country_code?.toLocaleLowerCase('en') === 'br' &&
      Number.isFinite(Number(result.lat)) &&
      Number.isFinite(Number(result.lon)) &&
      Number(result.lat) >= -90 && Number(result.lat) <= 90 &&
      Number(result.lon) >= -180 && Number(result.lon) <= 180
    );

    const candidatesList = document.getElementById('report-geo-candidates');
    geocodeCandidates.forEach((candidate, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.dataset.geocodeCandidate = String(index);
      option.setAttribute('aria-pressed', 'false');
      const address = candidate.address || {};
      const stateCode = (address['ISO3166-2-lvl4'] || '').replace('BR-', '');
      const main = document.createElement('span');
      main.className = 'candidate-main';
      main.textContent = [
        [address.road || candidate.name, address.house_number].filter(Boolean).join(', '),
        address.suburb || address.neighbourhood || address.city_district
      ].filter(Boolean).join(' · ') || candidate.display_name;
      const sub = document.createElement('span');
      sub.className = 'candidate-sub';
      sub.textContent = [
        [address.city || address.town || address.village || address.municipality, stateCode].filter(Boolean).join(' - '),
        address.postcode ? `CEP ${address.postcode}` : ''
      ].filter(Boolean).join(' · ');
      option.title = candidate.display_name;
      option.append(main, sub);
      candidatesList.append(option);
    });
    if (geocodeCandidates.length) {
      locationStatus.textContent = 'Encontramos ' + geocodeCandidates.length + (geocodeCandidates.length === 1 ? ' endereço' : ' endereços') + '. Clique no que corresponde à ocorrência.';
    } else if (city) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const cityParameters = new URLSearchParams({
        q: [city, state, 'Brasil'].filter(Boolean).join(', '),
        format: 'jsonv2',
        countrycodes: 'br',
        limit: '1'
      });
      nextGeocodeRequestAt = Date.now() + 1100;
      const cityResponse = await fetch(`https://nominatim.openstreetmap.org/search?${cityParameters}`);
      const cityResults = cityResponse.ok ? await cityResponse.json() : [];
      if (Array.isArray(cityResults) && cityResults[0]) {
        document.getElementById('report-latitude').value = cityResults[0].lat;
        document.getElementById('report-longitude').value = cityResults[0].lon;
        updatePickMap();
        if (pickMap) pickMap.setZoom(14);
        locationStatus.textContent = 'A rua não foi encontrada no mapa. O pino foi colocado na cidade: arraste-o ou clique no mapa no local exato da ocorrência.';
      } else {
        locationStatus.textContent = 'Nenhum resultado foi encontrado. Confira a cidade e a UF e tente novamente.';
      }
    } else {
      locationStatus.textContent = 'Nenhum resultado foi encontrado. Confira o endereço e tente novamente.';
    }
  } catch (error) {
    console.error('Não foi possível buscar o endereço no mapa', error);
    locationStatus.textContent = 'A busca no mapa falhou. Confira sua conexão ou tente novamente mais tarde.';
    await Swal.fire({
      icon: 'error',
      title: 'Não foi possível buscar o endereço',
      text: error.message || 'O serviço de mapas está indisponível. Você pode tentar novamente ou usar o GPS.',
      confirmButtonColor: '#d7ff00'
    });
  } finally {
    button.disabled = false;
  }
});

document.getElementById('report-geo-candidates').addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const candidateButton = event.target.closest('[data-geocode-candidate]');
  if (!candidateButton) return;
  const candidate = geocodeCandidates[Number(candidateButton.dataset.geocodeCandidate)];
  if (!candidate) return;

  document.getElementById('report-latitude').value = candidate.lat;
  document.getElementById('report-longitude').value = candidate.lon;
  updatePickMap();
  document.querySelectorAll('[data-geocode-candidate]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button === candidateButton));
  });
  document.getElementById('location-status').textContent =
    '✓ Posição definida. Confira o pino no mapa abaixo e arraste-o se precisar ajustar.';
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
      updatePickMap();
      locationStatus.textContent = `GPS selecionado (precisão estimada de ${Math.round(coords.accuracy)} m). Confirme que você está no local da ocorrência; as coordenadas serão públicas.`;
    },
    (error) => {
      locationStatus.textContent = error.code === error.PERMISSION_DENIED
        ? 'Permissão de localização negada. Faça a busca pelo endereço para posicionar o relato.'
        : 'Não foi possível obter a localização. Faça a busca pelo endereço para posicionar o relato.';
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
});

function showReportFormError(message) {
  const box = document.getElementById('report-form-error');
  box.textContent = message || '';
  box.classList.toggle('hidden', !message);
  if (message) box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

reportForm.addEventListener('invalid', (event) => {
  const field = event.target;
  const label = reportForm.querySelector(`label[for="${field.id}"]`)?.textContent.replace(/(.*)/, '').trim() || field.name;
  showReportFormError(`Preencha o campo obrigatório: ${label}.`);
}, true);

reportForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showReportFormError('');
  const submitButton = reportForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  const formData = new FormData(reportForm);
  const reportId = formData.get('id');
  const existingReport = reportId ? reports.find((report) => report.id === reportId) : null;
  const latitudeValue = formData.get('latitude');
  const longitudeValue = formData.get('longitude');
  const imageFile = reportImageInput.files[0] || null;
  let uploadedImagePath = null;
  let reportSaved = false;
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
      const imageOwnerId = existingReport?.userId || currentUser.id;
      uploadedImagePath = `${imageOwnerId}/${crypto.randomUUID()}.${extensionByType[imageFile.type]}`;
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
    } else {
      imageUrl = existingReport?.imageUrlValue || null;
    }

    const selectedCategory = categories.find((category) => category.id === formData.get('category_id'));
    const selectedPlace = places.find((place) => place.id === formData.get('place_id'));
    if (!selectedCategory) {
      throw new Error('Selecione uma categoria.');
    }
    if (!latitudeValue || !longitudeValue) {
      throw new Error('Confirme a posição no mapa: clique em buscar o endereço e escolha um resultado, ou use o GPS.');
    }
    const field = (name) => (formData.get(name) || '').toString().trim();

    const reportValues = {
      title: formData.get('title').trim(),
      description: formData.get('description').trim(),
      category: selectedCategory.name,
      category_id: selectedCategory.id,
      place_id: selectedPlace?.id || null,
      postal_code: field('postal_code') || null,
      street: field('street'),
      street_number: field('street_number') || null,
      complement: field('complement') || null,
      neighborhood: field('neighborhood'),
      city: field('city'),
      state: field('state').toUpperCase(),
      latitude: latitudeValue ? Number(latitudeValue) : null,
      longitude: longitudeValue ? Number(longitudeValue) : null,
      image_url: imageUrl
    };

    const result = reportId
      ? await supabaseClient.from('ocorrencias').update(reportValues).eq('id', reportId).select('id').maybeSingle()
      : await supabaseClient.from('ocorrencias').insert({
        ...reportValues,
        user_id: currentUser.id,
        status: 'pending'
      });
    if (result.error) throw result.error;
    if (reportId && !result.data) {
      throw new Error('Você não tem permissão para editar esta ocorrência.');
    }
    reportSaved = true;

    let oldImageCleanupFailed = false;
    if (imageFile && existingReport?.imageUrl) {
      const oldImagePath = getOccurrenceImagePath(existingReport.imageUrl);
      if (oldImagePath) {
        const { error: removeError } = await supabaseClient.storage
          .from('occurrence-images')
          .remove([oldImagePath]);
        if (removeError) {
          console.error('Ocorrência atualizada, mas não foi possível remover a imagem anterior', removeError);
          oldImageCleanupFailed = true;
        }
      }
    }

    closeReportDialog();
    try {
      await loadReports();
    } catch (refreshError) {
      console.error('Ocorrência salva, mas a lista não pôde ser atualizada', refreshError);
      showDatabaseError(refreshError, 'Ocorrência salva, mas a lista não pôde ser atualizada');
      return;
    }
    Swal.fire(oldImageCleanupFailed ? {
      icon: 'warning',
      title: 'Ocorrência atualizada',
      text: 'As alterações foram salvas, mas a foto anterior não pôde ser removida do armazenamento.',
      confirmButtonColor: '#d7ff00'
    } : {
      icon: 'success',
      title: reportId ? 'Ocorrência atualizada' : 'Relato registrado!',
      text: reportId
        ? 'As alterações foram salvas.'
        : 'Sua ocorrência foi salva e já está disponível para a comunidade.',
      confirmButtonColor: '#d7ff00'
    });
  } catch (error) {
    if (uploadedImagePath && !reportSaved) {
      const { error: cleanupError } = await supabaseClient.storage
        .from('occurrence-images')
        .remove([uploadedImagePath]);
      if (cleanupError) {
        console.error('Não foi possível remover a foto após falha ao salvar a ocorrência', cleanupError);
      }
    }
    showReportFormError(`Não foi possível enviar: ${error.message || error}`);
    showDatabaseError(error, reportId ? 'Não foi possível atualizar a ocorrência' : 'Não foi possível registrar a ocorrência');
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
    await loadCatalogs();
    await loadReports();
  } catch (errorLoadingReports) {
    showDatabaseError(errorLoadingReports);
  }
}

switchPage('map');
initializeDashboard().catch((error) => showDatabaseError(error, 'Não foi possível iniciar o painel'));
window.addEventListener('load', () => map.invalidateSize());

document.getElementById('toggle-saved-place').addEventListener('click', () => {
  document.getElementById('saved-place-wrapper').classList.toggle('hidden');
});
