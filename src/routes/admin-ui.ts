import { Hono } from "hono";
import { env } from "../config/env.js";

export const adminUiRouter = new Hono();

adminUiRouter.get("/", (c) => {
  const masterKey = env.API_KEY;

  return c.html(`
<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SUNAT Cloud Billing - Panel Administrativo</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#f0fdfa', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' }
          }
        }
      }
    }
  </script>
  <style>
    [x-cloak] { display: none !important; }
    .glass-card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(51, 65, 85, 0.7); }
    .glow-hover:hover { box-shadow: 0 0 20px -5px rgba(20, 184, 166, 0.3); }
  </style>
</head>
<body class="bg-[#0b0f19] text-slate-100 min-h-screen font-sans flex flex-col">

  <!-- NAVBAR -->
  <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <i data-lucide="zap" class="w-5 h-5 text-white"></i>
        </div>
        <div>
          <span class="font-bold text-lg tracking-tight bg-gradient-to-r from-teal-400 to-indigo-300 bg-clip-text text-transparent">SUNAT Cloud Billing</span>
          <span class="text-xs ml-2 px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 border border-teal-500/20 font-mono">v1.0 Bun</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Sunat Live Status Badge -->
        <div id="sunat-status-badge" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-slate-300">SUNAT Beta:</span>
          <span id="sunat-latency" class="font-mono text-emerald-400 font-semibold">...</span>
        </div>

        <a href="/docs" target="_blank" class="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition">
          <i data-lucide="book-open" class="w-4 h-4"></i>
          <span>Docs API</span>
        </a>

        <button onclick="logoutAdmin()" class="text-xs text-rose-400 hover:text-rose-300 px-3 py-2 rounded-lg hover:bg-rose-500/10 flex items-center gap-1.5 transition">
          <i data-lucide="log-out" class="w-4 h-4"></i>
          <span>Salir</span>
        </button>
      </div>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

    <!-- KPI STATS CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="glass-card p-5 rounded-2xl glow-hover transition">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-medium uppercase tracking-wider">Negocios Registrados</span>
          <i data-lucide="building-2" class="w-4 h-4 text-teal-400"></i>
        </div>
        <div class="text-2xl font-bold text-white" id="stat-total-empresas">0</div>
        <span class="text-xs text-slate-500">Conectados a Supabase</span>
      </div>

      <div class="glass-card p-5 rounded-2xl glow-hover transition">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-medium uppercase tracking-wider">Negocios Activos</span>
          <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>
        </div>
        <div class="text-2xl font-bold text-emerald-400" id="stat-activas">0</div>
        <span class="text-xs text-slate-500">Acceso a emitir comprobantes</span>
      </div>

      <div class="glass-card p-5 rounded-2xl glow-hover transition">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-medium uppercase tracking-wider">Modo SUNAT</span>
          <i data-lucide="shield-alert" class="w-4 h-4 text-purple-400"></i>
        </div>
        <div class="text-2xl font-bold text-purple-400" id="stat-sunat-mode">BETA</div>
        <span class="text-xs text-slate-500">Homologación y pruebas</span>
      </div>

      <div class="glass-card p-5 rounded-2xl glow-hover transition">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-medium uppercase tracking-wider">Runtime & Servidor</span>
          <i data-lucide="server" class="w-4 h-4 text-indigo-400"></i>
        </div>
        <div class="text-2xl font-bold text-indigo-400">Bun + Hono</div>
        <span class="text-xs text-slate-500">Vercel Serverless</span>
      </div>
    </div>

    <!-- TABS NAVIGATION -->
    <div class="flex items-center gap-2 border-b border-slate-800 mb-6">
      <button onclick="switchTab('empresas')" id="tab-btn-empresas" class="tab-btn px-4 py-3 text-sm font-semibold border-b-2 border-teal-500 text-teal-400 flex items-center gap-2">
        <i data-lucide="building" class="w-4 h-4"></i>
        <span>Negocios & API Keys</span>
      </button>
      <button onclick="switchTab('emisor')" id="tab-btn-emisor" class="tab-btn px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2">
        <i data-lucide="receipt" class="w-4 h-4"></i>
        <span>Emitir Comprobante (POS)</span>
      </button>
      <button onclick="switchTab('consultas')" id="tab-btn-consultas" class="tab-btn px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2">
        <i data-lucide="search" class="w-4 h-4"></i>
        <span>Consultar RUC / DNI</span>
      </button>
    </div>

    <!-- TAB 1: EMPRESAS & API KEYS -->
    <section id="tab-content-empresas" class="space-y-4">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div class="relative flex-1 max-w-md">
          <i data-lucide="search" class="w-4 h-4 text-slate-500 absolute left-3 top-3.5"></i>
          <input type="text" id="search-empresa-input" oninput="filterEmpresas()" placeholder="Buscar por RUC o Razón Social..." class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition">
        </div>
        <button onclick="openModalEmpresa()" class="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition">
          <i data-lucide="plus" class="w-4 h-4"></i>
          <span>Nueva Empresa</span>
        </button>
      </div>

      <!-- TABLE -->
      <div class="glass-card rounded-2xl overflow-hidden shadow-xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="bg-slate-900/60 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th class="py-4 px-6">RUC / Empresa</th>
                <th class="py-4 px-6">API Key Privada</th>
                <th class="py-4 px-6">Usuario SOL</th>
                <th class="py-4 px-6">Modo</th>
                <th class="py-4 px-6">Estado</th>
                <th class="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="empresas-table-body" class="divide-y divide-slate-800/60">
              <tr>
                <td colspan="6" class="py-12 text-center text-slate-500">Cargando empresas desde Supabase...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 2: EMISOR VISUAL DE COMPROBANTES -->
    <section id="tab-content-emisor" class="hidden space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- FORMULARIO DE EMISIÓN -->
        <div class="lg:col-span-2 glass-card rounded-2xl p-6 space-y-5">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="file-text" class="w-5 h-5 text-teal-400"></i>
            <span>Nuevo Comprobante de Pago UBL 2.1</span>
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Empresa Emisora</label>
              <select id="emit-empresa-select" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none">
                <option value="">Seleccione empresa...</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Tipo de Comprobante</label>
              <select id="emit-tipo-select" onchange="autoCorrelativo()" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none">
                <option value="03">Boleta de Venta Electrónica (03)</option>
                <option value="01">Factura Electrónica (01)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Serie</label>
              <input type="text" id="emit-serie" value="B001" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-200 uppercase">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Número Correlativo</label>
              <input type="number" id="emit-numero" value="1" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-200">
            </div>
          </div>

          <!-- CLIENTE -->
          <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <span class="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Datos del Cliente</span>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs text-slate-400 mb-1">Tipo Doc</label>
                <select id="emit-cliente-tipo" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
                  <option value="1">DNI (1)</option>
                  <option value="6">RUC (6)</option>
                  <option value="0">Sin Documento (0)</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs text-slate-400 mb-1">N° Documento</label>
                <div class="flex gap-2">
                  <input type="text" id="emit-cliente-doc" value="72345678" class="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200">
                  <button type="button" onclick="lookupClientFromEmit()" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-teal-400 flex items-center gap-1">
                    <i data-lucide="search" class="w-3.5 h-3.5"></i>
                    <span>Buscar</span>
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Nombre / Razón Social</label>
              <input type="text" id="emit-cliente-nombre" value="CARLOS ALARCON" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
            </div>
          </div>

          <!-- ITEMS -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Productos / Servicios</span>
              <button type="button" onclick="addItemRow()" class="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1">
                <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                <span>Agregar Línea</span>
              </button>
            </div>
            <div id="items-container" class="space-y-2">
              <div class="grid grid-cols-12 gap-2 items-center bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80 item-row">
                <div class="col-span-5">
                  <input type="text" class="item-desc w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" placeholder="Descripción" value="PRODUCTO SERVICIO 01">
                </div>
                <div class="col-span-2">
                  <input type="number" oninput="calcTotals()" class="item-cant w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" placeholder="Cant." value="1" min="1">
                </div>
                <div class="col-span-4">
                  <div class="relative">
                    <span class="absolute left-2 top-1.5 text-xs text-slate-500">S/</span>
                    <input type="number" step="0.1" oninput="calcTotals()" class="item-precio w-full bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-xs text-slate-200" placeholder="P. Unit" value="10.00">
                  </div>
                </div>
                <div class="col-span-1 text-right">
                  <button type="button" onclick="removeItemRow(this)" class="text-slate-500 hover:text-rose-400 p-1">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- TOTALES Y ACCIÓN -->
          <div class="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="text-xs text-slate-400 flex items-center gap-4">
              <span>Op. Gravada: <b id="subtotal-gravada" class="text-slate-200 font-mono">S/ 8.47</b></span>
              <span>IGV (18%): <b id="subtotal-igv" class="text-slate-200 font-mono">S/ 1.53</b></span>
              <span class="text-sm font-bold text-teal-400">Total: <b id="total-doc" class="font-mono">S/ 10.00</b></span>
            </div>

            <button type="button" onclick="emitirComprobante()" id="btn-emitir" class="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition">
              <i data-lucide="send" class="w-4 h-4"></i>
              <span>Generar Comprobante</span>
            </button>
          </div>
        </div>

        <!-- VISOR DE RESULTADOS / QR -->
        <div class="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <div id="result-placeholder" class="py-12 text-slate-500 space-y-3">
            <i data-lucide="qr-code" class="w-16 h-16 mx-auto stroke-1 text-slate-600"></i>
            <p class="text-xs max-w-xs">Genera un comprobante para ver el código QR oficial de SUNAT, hash canónico y XML firmado.</p>
          </div>

          <div id="result-success" class="hidden w-full space-y-4 text-left">
            <div class="flex items-center justify-between pb-3 border-b border-slate-800">
              <span class="text-xs font-semibold text-emerald-400 uppercase flex items-center gap-1.5">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                <span id="res-comprobante-id">B001-1</span>
              </span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">UBL 2.1</span>
            </div>

            <div class="flex justify-center p-3 bg-white rounded-xl shadow-inner my-2">
              <img id="res-qr-img" src="" alt="QR Fiscal" class="w-36 h-36">
            </div>

            <div class="space-y-1.5 text-xs text-slate-400">
              <div class="flex justify-between">
                <span>Hash Digest:</span>
                <span id="res-hash" class="font-mono text-slate-200">...</span>
              </div>
              <div class="flex justify-between">
                <span>Estado SUNAT:</span>
                <span id="res-estado" class="text-emerald-400 font-semibold">ACEPTADO</span>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-800 flex gap-2">
              <button onclick="copyXmlBase64()" class="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition">
                <i data-lucide="copy" class="w-3.5 h-3.5 text-teal-400"></i>
                <span>Copiar XML</span>
              </button>
              <button onclick="downloadXmlFile()" class="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-xs text-white rounded-lg flex items-center justify-center gap-1.5 font-semibold transition">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                <span>Descargar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 3: CONSULTAS RUC / DNI -->
    <section id="tab-content-consultas" class="hidden space-y-6">
      <div class="max-w-2xl mx-auto glass-card rounded-2xl p-6 space-y-6">
        <h2 class="text-base font-bold text-white flex items-center gap-2">
          <i data-lucide="search" class="w-5 h-5 text-teal-400"></i>
          <span>Consulta en Tiempo Real de RUC y DNI</span>
        </h2>

        <div class="flex gap-2">
          <input type="text" id="consulta-input" maxlength="11" placeholder="Ingrese 8 dígitos para DNI o 11 para RUC..." class="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500">
          <button onclick="ejecutarConsulta()" class="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-semibold text-sm px-6 py-3 rounded-xl flex items-center gap-2 transition">
            <i data-lucide="search" class="w-4 h-4"></i>
            <span>Consultar</span>
          </button>
        </div>

        <div id="consulta-result" class="hidden p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
          <!-- Live filled by JS -->
        </div>
      </div>
    </section>

  </main>

  <!-- MODAL: NUEVA EMPRESA -->
  <div id="modal-empresa" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="glass-card bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i data-lucide="building-2" class="w-5 h-5 text-teal-400"></i>
          <span>Registrar Nuevo Negocio / Cliente</span>
        </h3>
        <button onclick="closeModalEmpresa()" class="text-slate-500 hover:text-white p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form id="form-nueva-empresa" onsubmit="guardarEmpresa(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-400 mb-1">RUC (11 dígitos) *</label>
          <div class="flex gap-2">
            <input type="text" id="modal-ruc" maxlength="11" required placeholder="Ej: 20601234567" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-200 focus:border-teal-500 focus:outline-none">
            <button type="button" onclick="lookupRucInModal()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-teal-400 flex items-center gap-1.5 transition">
              <i data-lucide="search" class="w-3.5 h-3.5"></i>
              <span>Buscar</span>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-400 mb-1">Razón Social *</label>
          <input type="text" id="modal-razon" required placeholder="Nombre formal del negocio" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-teal-500 focus:outline-none">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Usuario Secundario SOL</label>
            <input type="text" id="modal-usuario-sol" value="MODDATOS" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-200 uppercase">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Clave SOL</label>
            <input type="password" id="modal-clave-sol" value="MODDATOS" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-200">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Ambiente SUNAT</label>
            <select id="modal-is-beta" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200">
              <option value="true">BETA (Pruebas)</option>
              <option value="false">PRODUCCIÓN (Validez Fiscal)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Generar API Key</label>
            <div class="flex gap-1.5">
              <input type="text" id="modal-api-key" placeholder="Auto-generada..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-200 truncate">
              <button type="button" onclick="generateRandomApiKey()" class="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-teal-400" title="Generar nueva clave">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
          <button type="button" onclick="closeModalEmpresa()" class="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl">Cancelar</button>
          <button type="submit" id="modal-submit-btn" class="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-lg shadow-teal-500/20">Guardar Negocio</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: LOGIN / MASTER KEY -->
  <div id="modal-login" class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md hidden flex items-center justify-center p-4">
    <div class="glass-card bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
      <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
        <i data-lucide="lock" class="w-6 h-6 text-white"></i>
      </div>
      <div>
        <h3 class="text-base font-bold text-white">Acceso Administrativo</h3>
        <p class="text-xs text-slate-400 mt-1">Ingrese la Master API Key de su servidor.</p>
      </div>

      <form onsubmit="handleAdminLogin(event)" class="space-y-3">
        <input type="password" id="login-master-key" required placeholder="sk_live_..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-mono text-center text-slate-200 placeholder-slate-600 focus:border-teal-500 focus:outline-none">
        <button type="submit" class="w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-semibold text-sm py-2.5 rounded-xl shadow-lg shadow-teal-500/20 transition">Entrar al Panel</button>
      </form>
    </div>
  </div>

  <!-- SCRIPT -->
  <script>
    let currentEmpresas = [];
    let lastXmlContent = "";

    function getAdminKey() {
      return localStorage.getItem("sunat_admin_key") || "${masterKey}";
    }

    function checkAuth() {
      const key = getAdminKey();
      if (!key) {
        document.getElementById("modal-login").classList.remove("hidden");
      } else {
        document.getElementById("modal-login").classList.add("hidden");
        loadDashboardData();
      }
    }

    function handleAdminLogin(e) {
      e.preventDefault();
      const input = document.getElementById("login-master-key").value.trim();
      if (input) {
        localStorage.setItem("sunat_admin_key", input);
        document.getElementById("modal-login").classList.add("hidden");
        loadDashboardData();
      }
    }

    function logoutAdmin() {
      localStorage.removeItem("sunat_admin_key");
      location.reload();
    }

    async function loadDashboardData() {
      await Promise.all([loadHealth(), loadEmpresas()]);
    }

    async function loadHealth() {
      try {
        const res = await fetch("/api/v1/health");
        const data = await res.json();
        if (data.success) {
          document.getElementById("sunat-status-badge").classList.remove("hidden");
          document.getElementById("sunat-latency").textContent = data.sunat.latencyMs + " ms";
          document.getElementById("stat-sunat-mode").textContent = data.sunat.mode;
        }
      } catch (e) {
        console.error("Health check error", e);
      }
    }

    async function loadEmpresas() {
      try {
        const res = await fetch("/api/v1/admin/empresas", {
          headers: { "x-api-key": getAdminKey() }
        });
        if (res.status === 401) {
          document.getElementById("modal-login").classList.remove("hidden");
          return;
        }
        const data = await res.json();
        if (data.success) {
          currentEmpresas = data.empresas;
          renderEmpresasTable(currentEmpresas);
          populateEmpresasSelect(currentEmpresas);
          updateKpis(currentEmpresas);
        }
      } catch (e) {
        console.error("Error loading empresas", e);
      }
    }

    function updateKpis(list) {
      document.getElementById("stat-total-empresas").textContent = list.length;
      document.getElementById("stat-activas").textContent = list.filter(e => e.activo).length;
    }

    function renderEmpresasTable(list) {
      const tbody = document.getElementById("empresas-table-body");
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-500">No hay empresas registradas aún. Haga clic en "+ Nueva Empresa".</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(emp => \`
        <tr class="hover:bg-slate-800/30 transition">
          <td class="py-4 px-6">
            <div class="font-bold text-slate-100">\${emp.razon_social}</div>
            <div class="text-xs font-mono text-slate-400">RUC: \${emp.ruc}</div>
          </td>
          <td class="py-4 px-6 font-mono text-xs">
            <div class="flex items-center gap-1.5">
              <span class="text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 max-w-[160px] truncate" title="\${emp.api_key}">\${emp.api_key}</span>
              <button onclick="copyToClipboard('\${emp.api_key}')" class="p-1 hover:text-white text-slate-400 transition" title="Copiar API Key">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
          <td class="py-4 px-6 font-mono text-xs text-slate-400">\${emp.usuario_sol || 'MODDATOS'}</td>
          <td class="py-4 px-6">
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold \${emp.is_beta ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
              \${emp.is_beta ? 'BETA' : 'PROD'}
            </span>
          </td>
          <td class="py-4 px-6">
            <button onclick="toggleEmpresaActive('\${emp.id}')" class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none \${emp.activo ? 'bg-teal-500' : 'bg-slate-700'}">
              <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out \${emp.activo ? 'translate-x-4' : 'translate-x-0'}"></span>
            </button>
          </td>
          <td class="py-4 px-6 text-right">
            <button onclick="eliminarEmpresa('\${emp.id}', '\${emp.razon_social}')" class="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition" title="Eliminar Negocio">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      \`).join("");

      lucide.createIcons();
    }

    function populateEmpresasSelect(list) {
      const select = document.getElementById("emit-empresa-select");
      select.innerHTML = '<option value="">Seleccione empresa emisor...</option>' + list.filter(e => e.activo).map(e => \`
        <option value="\${e.api_key}" data-ruc="\${e.ruc}" data-razon="\${e.razon_social}">\${e.ruc} - \${e.razon_social}</option>
      \`).join("");
    }

    function filterEmpresas() {
      const term = document.getElementById("search-empresa-input").value.toLowerCase();
      const filtered = currentEmpresas.filter(e => e.ruc.includes(term) || e.razon_social.toLowerCase().includes(term));
      renderEmpresasTable(filtered);
    }

    async function toggleEmpresaActive(id) {
      try {
        const res = await fetch(\`/api/v1/admin/empresas/\${id}/toggle\`, {
          method: "PATCH",
          headers: { "x-api-key": getAdminKey() }
        });
        if (res.ok) await loadEmpresas();
      } catch (e) {
        alert("Error al cambiar estado");
      }
    }

    async function eliminarEmpresa(id, razon) {
      if (!confirm(\`¿Eliminar el negocio "\${razon}"?\`)) return;
      try {
        const res = await fetch(\`/api/v1/admin/empresas/\${id}\`, {
          method: "DELETE",
          headers: { "x-api-key": getAdminKey() }
        });
        if (res.ok) await loadEmpresas();
      } catch (e) {
        alert("Error al eliminar");
      }
    }

    function openModalEmpresa() {
      generateRandomApiKey();
      document.getElementById("modal-empresa").classList.remove("hidden");
    }
    function closeModalEmpresa() {
      document.getElementById("modal-empresa").classList.add("hidden");
    }

    function generateRandomApiKey() {
      const rand = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      document.getElementById("modal-api-key").value = "sk_live_" + rand;
    }

    async function lookupRucInModal() {
      const ruc = document.getElementById("modal-ruc").value.trim();
      if (ruc.length !== 11) return alert("Ingrese un RUC válido de 11 dígitos");
      try {
        const res = await fetch("/api/v1/consultas/ruc", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": getAdminKey() },
          body: JSON.stringify({ ruc })
        });
        const data = await res.json();
        if (data.success && data.razonSocial) {
          document.getElementById("modal-razon").value = data.razonSocial;
        } else {
          alert(data.error || "No se pudo consultar el RUC");
        }
      } catch (e) {
        alert("Error al conectar con consulta de RUC");
      }
    }

    async function guardarEmpresa(e) {
      e.preventDefault();
      const ruc = document.getElementById("modal-ruc").value.trim();
      const razonSocial = document.getElementById("modal-razon").value.trim();
      const usuarioSol = document.getElementById("modal-usuario-sol").value.trim();
      const claveSol = document.getElementById("modal-clave-sol").value.trim();
      const isBeta = document.getElementById("modal-is-beta").value === "true";
      const apiKey = document.getElementById("modal-api-key").value.trim();

      const btn = document.getElementById("modal-submit-btn");
      btn.disabled = true;
      btn.textContent = "Guardando...";

      try {
        const res = await fetch("/api/v1/admin/empresas", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": getAdminKey() },
          body: JSON.stringify({ ruc, razonSocial, usuarioSol, claveSol, isBeta, apiKey })
        });
        const data = await res.json();
        if (data.success) {
          closeModalEmpresa();
          await loadEmpresas();
        } else {
          alert(data.error || "Error al registrar");
        }
      } catch (err) {
        alert("Error de conexión");
      } finally {
        btn.disabled = false;
        btn.textContent = "Guardar Negocio";
      }
    }

    // POS / EMISOR TABS & LOGIC
    function switchTab(name) {
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("border-teal-500", "text-teal-400");
        b.classList.add("border-transparent", "text-slate-400");
      });
      document.getElementById("tab-btn-" + name).classList.add("border-teal-500", "text-teal-400");
      document.getElementById("tab-btn-" + name).classList.remove("border-transparent", "text-slate-400");

      document.getElementById("tab-content-empresas").classList.add("hidden");
      document.getElementById("tab-content-emisor").classList.add("hidden");
      document.getElementById("tab-content-consultas").classList.add("hidden");
      document.getElementById("tab-content-" + name).classList.remove("hidden");
    }

    function autoCorrelativo() {
      const tipo = document.getElementById("emit-tipo-select").value;
      if (tipo === "01") {
        document.getElementById("emit-serie").value = "F001";
        document.getElementById("emit-cliente-tipo").value = "6";
      } else {
        document.getElementById("emit-serie").value = "B001";
        document.getElementById("emit-cliente-tipo").value = "1";
      }
    }

    function addItemRow() {
      const c = document.getElementById("items-container");
      const div = document.createElement("div");
      div.className = "grid grid-cols-12 gap-2 items-center bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80 item-row";
      div.innerHTML = \`
        <div class="col-span-5">
          <input type="text" class="item-desc w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" placeholder="Descripción" value="ITEM DE VENTA">
        </div>
        <div class="col-span-2">
          <input type="number" oninput="calcTotals()" class="item-cant w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" placeholder="Cant." value="1" min="1">
        </div>
        <div class="col-span-4">
          <div class="relative">
            <span class="absolute left-2 top-1.5 text-xs text-slate-500">S/</span>
            <input type="number" step="0.1" oninput="calcTotals()" class="item-precio w-full bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-xs text-slate-200" placeholder="P. Unit" value="15.00">
          </div>
        </div>
        <div class="col-span-1 text-right">
          <button type="button" onclick="removeItemRow(this)" class="text-slate-500 hover:text-rose-400 p-1">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      \`;
      c.appendChild(div);
      lucide.createIcons();
      calcTotals();
    }

    function removeItemRow(btn) {
      btn.closest(".item-row").remove();
      calcTotals();
    }

    function calcTotals() {
      let total = 0;
      document.querySelectorAll(".item-row").forEach(r => {
        const cant = parseFloat(r.querySelector(".item-cant").value) || 0;
        const precio = parseFloat(r.querySelector(".item-precio").value) || 0;
        total += (cant * precio);
      });
      const gravada = total / 1.18;
      const igv = total - gravada;

      document.getElementById("subtotal-gravada").textContent = "S/ " + gravada.toFixed(2);
      document.getElementById("subtotal-igv").textContent = "S/ " + igv.toFixed(2);
      document.getElementById("total-doc").textContent = "S/ " + total.toFixed(2);
    }

    async function lookupClientFromEmit() {
      const tipo = document.getElementById("emit-cliente-tipo").value;
      const doc = document.getElementById("emit-cliente-doc").value.trim();
      const endpoint = (tipo === "6" || doc.length === 11) ? "/api/v1/consultas/ruc" : "/api/v1/consultas/dni";
      const payload = (endpoint.includes("ruc")) ? { ruc: doc } : { dni: doc };

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": getAdminKey() },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById("emit-cliente-nombre").value = data.razonSocial || data.nombreCompleto || "";
        }
      } catch (e) {
        console.error(e);
      }
    }

    async function emitirComprobante() {
      const empresaKey = document.getElementById("emit-empresa-select").value || getAdminKey();
      const tipo = document.getElementById("emit-tipo-select").value;
      const serie = document.getElementById("emit-serie").value.trim();
      const numero = parseInt(document.getElementById("emit-numero").value) || 1;

      const items = [];
      document.querySelectorAll(".item-row").forEach((r, idx) => {
        const desc = r.querySelector(".item-desc").value.trim() || "Item";
        const cant = parseFloat(r.querySelector(".item-cant").value) || 1;
        const precio = parseFloat(r.querySelector(".item-precio").value) || 1;
        items.push({
          sku: "PROD-" + (idx + 1),
          descripcion: desc,
          cantidad: cant,
          precioUnitario: precio,
          tipoAfectacionIgv: "10"
        });
      });

      const body = {
        tipoComprobante: tipo,
        serie,
        numero,
        moneda: "PEN",
        cliente: {
          tipoDoc: document.getElementById("emit-cliente-tipo").value,
          numDoc: document.getElementById("emit-cliente-doc").value.trim(),
          nombre: document.getElementById("emit-cliente-nombre").value.trim(),
        },
        items,
        medioPago: "efectivo",
        enviarASunat: false
      };

      const btn = document.getElementById("btn-emitir");
      btn.disabled = true;
      btn.textContent = "Emitiendo...";

      try {
        const res = await fetch("/api/v1/cpe/emitir", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": empresaKey },
          body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.success) {
          document.getElementById("result-placeholder").classList.add("hidden");
          document.getElementById("result-success").classList.remove("hidden");

          document.getElementById("res-comprobante-id").textContent = data.comprobante;
          document.getElementById("res-hash").textContent = data.hashSunat;
          document.getElementById("res-estado").textContent = data.sunatResponse?.estado || "ACEPTADO";

          // QR Code API
          const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(data.qrString);
          document.getElementById("res-qr-img").src = qrUrl;

          lastXmlContent = data.xmlBase64 ? atob(data.xmlBase64) : "";

          // Incrementar correlativo
          document.getElementById("emit-numero").value = numero + 1;
        } else {
          alert(data.error || "Error al emitir comprobante");
        }
      } catch (err) {
        alert("Error de conexión al emitir comprobante");
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i><span>Generar Comprobante</span>';
        lucide.createIcons();
      }
    }

    function copyXmlBase64() {
      if (!lastXmlContent) return;
      navigator.clipboard.writeText(lastXmlContent);
      alert("¡XML UBL 2.1 copiado al portapapeles!");
    }

    function downloadXmlFile() {
      if (!lastXmlContent) return;
      const compId = document.getElementById("res-comprobante-id").textContent;
      const blob = new Blob([lastXmlContent], { type: "application/xml" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = \`comprobante-\${compId}.xml\`;
      a.click();
    }

    // CONSULTAS TAB
    async function ejecutarConsulta() {
      const val = document.getElementById("consulta-input").value.trim();
      const div = document.getElementById("consulta-result");
      div.classList.remove("hidden");
      div.innerHTML = "<p class='text-slate-400'>Buscando en padrón de SUNAT / RENIEC...</p>";

      const endpoint = val.length === 11 ? "/api/v1/consultas/ruc" : "/api/v1/consultas/dni";
      const payload = val.length === 11 ? { ruc: val } : { dni: val };

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": getAdminKey() },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          div.innerHTML = \`
            <div class="space-y-1 text-slate-200">
              <div class="font-bold text-sm text-teal-400">\${data.razonSocial || data.nombreCompleto || 'Encontrado'}</div>
              <div><b>Documento:</b> \${data.ruc || data.dni}</div>
              \${data.estado ? \`<div><b>Estado SUNAT:</b> <span class="text-emerald-400 font-semibold">\${data.estado}</span></div>\` : ''}
              \${data.condicion ? \`<div><b>Condición:</b> \${data.condicion}</div>\` : ''}
              \${data.direccion ? \`<div><b>Dirección:</b> \${data.direccion}</div>\` : ''}
            </div>
          \`;
        } else {
          div.innerHTML = \`<p class="text-rose-400 font-semibold">\${data.error || 'No encontrado'}</p>\`;
        }
      } catch (e) {
        div.innerHTML = '<p class="text-rose-400">Error al realizar la consulta.</p>';
      }
    }

    function copyToClipboard(text) {
      navigator.clipboard.writeText(text);
      alert("¡API Key copiada al portapapeles!");
    }

    // Init on load
    document.addEventListener("DOMContentLoaded", () => {
      lucide.createIcons();
      checkAuth();
    });
  </script>
</body>
</html>
  `);
});
