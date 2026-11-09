const reports = [
  { id: 1, title: 'Buraco na via próximo à praça', category: 'Buracos', neighborhood: 'Centro', status: 'pending', time: 'Há 35 min', mine: false, location: [-23.264, -47.299] },
  { id: 2, title: 'Poste de iluminação apagado', category: 'Iluminação', neighborhood: 'Vila Nova', status: 'progress', time: 'Há 2 horas', mine: false, location: [-23.251, -47.304] },
  { id: 3, title: 'Descarte irregular de resíduos', category: 'Lixo', neighborhood: 'Jardim Paraíso', status: 'pending', time: 'Há 5 horas', mine: false, location: [-23.252, -47.286] },
  { id: 4, title: 'Poda de árvore em área pública', category: 'Árvores', neighborhood: 'Parque Industrial', status: 'resolved', time: 'Ontem', mine: false, location: [-23.281, -47.307] },
  { id: 5, title: 'Faixa de pedestres apagada', category: 'Sinalização', neighborhood: 'Centro', status: 'progress', time: 'Ontem', mine: false, location: [-23.267, -47.295] },
  { id: 6, title: 'Calçada danificada perto da escola', category: 'Outros', neighborhood: 'Vila Nova', status: 'resolved', time: 'Há 2 dias', mine: false, location: [-23.247, -47.3] }
];

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
let activePage = 'map';

const reportList = document.getElementById('report-list');
const emptyState = document.getElementById('empty-state');
const reportSearch = document.getElementById('report-search');
const mapSearch = document.getElementById('map-search');
const mapStatusFilter = document.getElementById('map-status-filter');
const mapCategoryFilter = document.getElementById('map-category-filter');
const reportDialog = document.getElementById('report-dialog');
const reportForm = document.getElementById('report-form');
const map = L.map('city-map-canvas', {
  center: [-23.2645, -47.2992],
  zoom: 13,
  scrollWheelZoom: true,
  doubleClickZoom: true,
  touchZoom: true,
  dragging: true,
  keyboard: true,
  zoomControl: true
});
const mapMarkers = L.layerGroup().addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  subdomains: 'abc',
  maxZoom: 19
}).addTo(map);

const neighborhoodLocations = [
  { name: 'centro', location: [-23.2645, -47.2992] },
  { name: 'vila nova', location: [-23.251, -47.304] },
  { name: 'jardim paraiso', location: [-23.252, -47.286] },
  { name: 'parque industrial', location: [-23.281, -47.307] }
];

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderReports() {
  const searchTerm = reportSearch.value.trim().toLocaleLowerCase('pt-BR');
  const visibleReports = reports.filter((report) => {
    const matchesStatus = activeFilter === 'all' || report.status === activeFilter;
    const matchesSearch = `${report.title} ${report.category} ${report.neighborhood}`
      .toLocaleLowerCase('pt-BR')
      .includes(searchTerm);
    return matchesStatus && matchesSearch && (!showMine || report.mine);
  });

  reportList.innerHTML = visibleReports.map((report) => {
    const status = statusDetails[report.status];
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
          </div>
          <p class="mt-1 text-xs text-slate-500">${escapeHTML(report.category)} <span class="mx-1 text-slate-300">·</span> ${escapeHTML(report.neighborhood)} <span class="mx-1 text-slate-300">·</span> ${escapeHTML(report.time)}</p>
        </div>
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

function renderMapMarkers() {
  const searchTerm = mapSearch.value.trim().toLocaleLowerCase('pt-BR');
  const visibleReports = reports.filter((report) => {
    const matchesStatus = mapStatusFilter.value === 'all' || report.status === mapStatusFilter.value;
    const matchesCategory = mapCategoryFilter.value === 'all' || report.category === mapCategoryFilter.value;
    const searchableText = `${report.title} ${report.category} ${report.neighborhood}`.toLocaleLowerCase('pt-BR');
    return matchesStatus && matchesCategory && searchableText.includes(searchTerm);
  });

  mapMarkers.clearLayers();
  document.getElementById('map-count').textContent = visibleReports.length;
  visibleReports.forEach((report) => {
    const status = statusDetails[report.status];
    const markerIcon = L.divIcon({
      className: '',
      html: `<span class="map-marker map-marker-${report.status}" aria-label="${status.label}"></span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    const marker = L.marker(report.location, { icon: markerIcon });
    marker.bindPopup(`
      <div class="map-popup">
        <p style="font-size:11px;color:#d7ff00;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${escapeHTML(report.category)}</p>
        <p style="margin-top:5px;font-weight:700">${escapeHTML(report.title)}</p>
        <p style="margin-top:4px;font-size:12px;color:#929991">${escapeHTML(report.neighborhood)} · ${status.label} · localização aproximada</p>
      </div>
    `);
    mapMarkers.addLayer(marker);
  });
}

function switchPage(page) {
  const view = page === 'mine' ? 'reports' : page;
  activePage = view;
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
    map: 'Mapa da cidade',
    reports: showMine ? 'Minhas ocorrências' : 'Ocorrências'
  };
  document.getElementById('page-title').textContent = pageTitles[view];
  document.getElementById('reports-heading').textContent = pageTitles[view] === 'Minhas ocorrências'
    ? 'Minhas ocorrências'
    : 'Ocorrências';
  renderReports();
  if (view === 'map') requestAnimationFrame(() => map.invalidateSize());
}

document.querySelectorAll('[data-page-target]').forEach((button) => {
  button.addEventListener('click', () => switchPage(button.dataset.pageTarget));
});

function updateStats() {
  document.getElementById('stat-total').textContent = reports.length;
  document.getElementById('stat-pending').textContent = reports.filter((report) => report.status === 'pending').length;
  document.getElementById('stat-progress').textContent = reports.filter((report) => report.status === 'progress').length;
  document.getElementById('stat-resolved').textContent = reports.filter((report) => report.status === 'resolved').length;
}

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
    showMine = false;
    document.getElementById('reports-heading').textContent = 'Ocorrências';
    setActiveFilter(button.dataset.filter);
  });
});

reportSearch.addEventListener('input', renderReports);
mapSearch.addEventListener('input', renderMapMarkers);
mapStatusFilter.addEventListener('change', renderMapMarkers);
mapCategoryFilter.addEventListener('change', renderMapMarkers);

document.querySelectorAll('[data-open-report]').forEach((button) => {
  button.addEventListener('click', () => reportDialog.showModal());
});

function closeReportDialog() {
  reportDialog.close();
  reportForm.reset();
}

document.getElementById('close-report-dialog').addEventListener('click', closeReportDialog);
document.getElementById('cancel-report').addEventListener('click', closeReportDialog);

reportForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(reportForm);
  reports.unshift({
    id: Date.now(),
    title: formData.get('title').trim(),
    category: formData.get('category'),
    neighborhood: formData.get('neighborhood').trim(),
    description: formData.get('description').trim(),
    status: 'pending',
    time: 'Agora',
    mine: true,
    location: neighborhoodLocations.find((item) =>
      item.name === formData.get('neighborhood').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
    )?.location || [-23.2645, -47.2992]
  });

  closeReportDialog();
  showMine = false;
  setActiveFilter('all');
  updateStats();
  renderMapMarkers();
  if (activePage === 'reports') renderReports();
  Swal.fire({
    icon: 'success',
    title: 'Relato registrado!',
    text: 'Sua ocorrência foi adicionada à lista demonstrativa.',
    confirmButtonColor: '#2563eb'
  });
});

document.getElementById('notifications-button').addEventListener('click', () => {
  Swal.fire({
    icon: 'info',
    title: 'Tudo em dia!',
    text: 'Não há novas notificações neste protótipo.',
    confirmButtonColor: '#2563eb'
  });
});

document.getElementById('logout-button').addEventListener('click', () => {
  Swal.fire({
    icon: 'question',
    title: 'Deseja sair?',
    text: 'Você voltará para a tela de entrada.',
    showCancelButton: true,
    confirmButtonText: 'Sair',
    cancelButtonText: 'Continuar no painel',
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#64748b'
  }).then((result) => {
    if (result.isConfirmed) window.location.href = 'index.html';
  });
});

updateStats();
renderReports();
switchPage('map');
window.addEventListener('load', () => map.invalidateSize());
