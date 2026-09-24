import { Hono } from "hono";
import { env } from "../config/env.js";

export const adminUiRouter = new Hono();

adminUiRouter.get("/", (c) => {
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
    .glass-card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(51, 65, 85, 0.7); }
    .glow-hover:hover { box-shadow: 0 0 20px -5px rgba(20, 184, 166, 0.3); }
    @media print {
      body * { visibility: hidden; }
      #printable-ticket, #printable-ticket * { visibility: visible; }
      #printable-ticket { position: absolute; left: 0; top: 0; width: 80mm; }
    }
  </style>
</head>
<body class="bg-[#0b0f19] text-slate-100 min-h-screen font-sans flex flex-col selection:bg-teal-500/20 selection:text-teal-300">

  <!-- LOGIN SCREEN (PANTALLA DE ACCESO PROTEGIDO) -->
  <div id="login-screen" class="min-h-screen flex items-center justify-center p-4">
    <div class="glass-card max-w-md w-full p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden bg-slate-900/90 backdrop-blur-2xl">
      <!-- Decoración luminosa -->
      <div class="absolute -top-12 -right-12 w-36 h-36 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-12 -left-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="text-center space-y-2">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-teal-500/25">
          <i data-lucide="shield-check" class="w-7 h-7 text-white"></i>
        </div>
        <h2 class="text-xl font-bold text-white tracking-tight">Acceso Administrativo</h2>
        <p class="text-xs text-slate-400">Ingrese sus credenciales de administrador para acceder al panel de control.</p>
      </div>

      <!-- ALERTA DE ERROR -->
      <div id="login-error-alert" class="hidden p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
        <i data-lucide="alert-circle" class="w-4 h-4 shrink-0"></i>
        <span id="login-error-msg">Usuario o contraseña incorrectos.</span>
      </div>

      <form onsubmit="handleAdminLogin(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1.5">Usuario</label>
          <div class="relative">
            <input type="text" id="login-input-user" value="admin" required placeholder="admin" autocomplete="username" class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition">
            <i data-lucide="user" class="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5"></i>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-medium text-slate-300">Contraseña</label>
          </div>
          <div class="relative">
            <input type="password" id="login-input-pass" required placeholder="••••••••" autocomplete="current-password" class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition">
            <i data-lucide="lock" class="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5"></i>
            <button type="button" onclick="togglePasswordVisibility()" class="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition" title="Mostrar/Ocultar">
              <i id="eye-icon" data-lucide="eye" class="w-4 h-4"></i>
            </button>
          </div>
          <p class="text-[11px] text-slate-500 mt-1.5">
            Usuario: <span class="text-teal-400 font-mono">admin</span> &bull; Clave: <span class="text-teal-400 font-mono">ADMIN_PASSWORD</span> o <span class="text-teal-400 font-mono">API_KEY</span>
          </p>
        </div>

        <button type="submit" id="login-btn-submit" class="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold text-sm py-3 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition hover:-translate-y-0.5">
          <i data-lucide="log-in" class="w-4 h-4"></i>
          <span id="login-btn-text">Iniciar Sesión</span>
        </button>
      </form>

      <div class="pt-2 text-center border-t border-slate-800/80">
        <a href="/" class="text-xs text-slate-500 hover:text-teal-400 inline-flex items-center gap-1.5 transition">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
          <span>Volver al inicio público</span>
        </a>
      </div>
    </div>
  </div>

  <!-- ADMIN APP DASHBOARD (OCULTO HASTA AUTENTICARSE) -->
  <div id="admin-app" class="hidden min-h-screen flex flex-col flex-1">
    <!-- NAVBAR -->
    <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <i data-lucide="zap" class="w-5 h-5 text-white"></i>
        </div>
        <div>
          <span class="font-bold text-lg tracking-tight bg-gradient-to-r from-teal-400 to-indigo-300 bg-clip-text text-transparent">SUNAT Cloud Billing</span>
          <span class="text-xs ml-2 px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 border border-teal-500/20 font-mono">v1.2 SaaS</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Sunat Live Status Badge -->
        <div id="sunat-status-badge" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-slate-300">SUNAT:</span>
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
        <span class="text-xs text-slate-500">En Supabase PostgreSQL</span>
      </div>

      <div class="glass-card p-5 rounded-2xl glow-hover transition">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-medium uppercase tracking-wider">Comprobantes Emitidos</span>
          <i data-lucide="file-check-2" class="w-4 h-4 text-emerald-400"></i>
        </div>
        <div class="text-2xl font-bold text-emerald-400" id="stat-total-comprobantes">0</div>
        <span class="text-xs text-slate-500">Historial fiscal global</span>
      </div>

      <div class="glass-card p-5 rounded-2xl glow-hover transition">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-medium uppercase tracking-wider">Monto Total Facturado</span>
          <i data-lucide="dollar-sign" class="w-4 h-4 text-indigo-400"></i>
        </div>
        <div class="text-2xl font-bold text-indigo-400" id="stat-total-monto">S/ 0.00</div>
        <span class="text-xs text-slate-500">Ventas procesadas</span>
      </div>

      <div class="glass-card p-5 rounded-2xl glow-hover transition">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-medium uppercase tracking-wider">Modo SUNAT</span>
          <i data-lucide="shield-alert" class="w-4 h-4 text-purple-400"></i>
        </div>
        <div class="text-2xl font-bold text-purple-400" id="stat-sunat-mode">BETA</div>
        <span class="text-xs text-slate-500">Ambiente de Pruebas</span>
      </div>
    </div>

    <!-- TABS NAVIGATION -->
    <div class="flex items-center gap-2 border-b border-slate-800 mb-6 overflow-x-auto">
      <button onclick="switchTab('empresas')" id="tab-btn-empresas" class="tab-btn px-4 py-3 text-sm font-semibold border-b-2 border-teal-500 text-teal-400 flex items-center gap-2 shrink-0">
        <i data-lucide="building" class="w-4 h-4"></i>
        <span>Negocios & API Keys (CRUD)</span>
      </button>
      <button onclick="switchTab('comprobantes')" id="tab-btn-comprobantes" class="tab-btn px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2 shrink-0">
        <i data-lucide="history" class="w-4 h-4"></i>
        <span>Historial de Comprobantes</span>
      </button>
      <button onclick="switchTab('emisor')" id="tab-btn-emisor" class="tab-btn px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2 shrink-0">
        <i data-lucide="receipt" class="w-4 h-4"></i>
        <span>Emitir Comprobante (POS)</span>
      </button>
      <button onclick="switchTab('consultas')" id="tab-btn-consultas" class="tab-btn px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2 shrink-0">
        <i data-lucide="search" class="w-4 h-4"></i>
        <span>Consultar RUC / DNI</span>
      </button>
      <button onclick="switchTab('guia')" id="tab-btn-guia" class="tab-btn px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2 shrink-0">
        <i data-lucide="book-open-check" class="w-4 h-4 text-emerald-400"></i>
        <span>Guía de Producción</span>
      </button>
    </div>

    <!-- TAB 1: NEGOCIOS & API KEYS (CRUD COMPLETO) -->
    <section id="tab-content-empresas" class="space-y-4">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div class="relative flex-1 max-w-md">
          <i data-lucide="search" class="w-4 h-4 text-slate-500 absolute left-3 top-3.5"></i>
          <input type="text" id="search-empresa-input" oninput="filterEmpresas()" placeholder="Buscar por RUC o Razón Social..." class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition">
        </div>
        <button onclick="openModalEmpresa()" class="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition">
          <i data-lucide="plus" class="w-4 h-4"></i>
          <span>Nuevo Negocio</span>
        </button>
      </div>

      <!-- TABLE EMPRESAS -->
      <div class="glass-card rounded-2xl overflow-hidden shadow-xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="bg-slate-900/60 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th class="py-4 px-6">Negocio / RUC</th>
                <th class="py-4 px-6">API Key Privada</th>
                <th class="py-4 px-6">Emisiones</th>
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

    <!-- TAB 2: HISTORIAL DE COMPROBANTES EMITIDOS -->
    <section id="tab-content-comprobantes" class="hidden space-y-4">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <select id="hist-filter-empresa" onchange="loadComprobantes()" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none">
            <option value="">Todas las empresas...</option>
          </select>
          <select id="hist-filter-tipo" onchange="loadComprobantes()" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none">
            <option value="">Todos los tipos...</option>
            <option value="01">Factura (01)</option>
            <option value="03">Boleta (03)</option>
            <option value="07">Nota de Crédito (07)</option>
            <option value="09">Guía Remisión (09)</option>
          </select>
          <button onclick="loadComprobantes()" class="p-2 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded-xl transition" title="Refrescar">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- TABLE COMPROBANTES -->
      <div class="glass-card rounded-2xl overflow-hidden shadow-xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="bg-slate-900/60 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th class="py-4 px-6">Comprobante</th>
                <th class="py-4 px-6">Emisor (RUC)</th>
                <th class="py-4 px-6">Cliente</th>
                <th class="py-4 px-6">Fecha</th>
                <th class="py-4 px-6">Total</th>
                <th class="py-4 px-6">Estado SUNAT</th>
                <th class="py-4 px-6 text-right">Archivos / Ticket</th>
              </tr>
            </thead>
            <tbody id="comprobantes-table-body" class="divide-y divide-slate-800/60">
              <tr>
                <td colspan="7" class="py-12 text-center text-slate-500">Cargando comprobantes emitidos...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 3: EMISOR VISUAL DE COMPROBANTES -->
    <section id="tab-content-emisor" class="hidden space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 glass-card rounded-2xl p-6 space-y-5">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="file-text" class="w-5 h-5 text-teal-400"></i>
            <span>Nuevo Comprobante de Pago UBL 2.1</span>
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Empresa Emisora *</label>
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

    <!-- TAB 4: CONSULTAS RUC / DNI -->
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

        <div id="consulta-result" class="hidden p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs"></div>
      </div>
    </section>

    <!-- TAB 5: GUÍA PASO A PRODUCCIÓN SUNAT -->
    <section id="tab-content-guia" class="hidden space-y-6">
      <!-- HEADER BANNER -->
      <div class="glass-card p-6 rounded-2xl relative overflow-hidden border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
              <span>Guía Oficial SUNAT UBL 2.1</span>
            </div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <span>Cómo Emitir Comprobantes Reales en Producción</span>
            </h2>
            <p class="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Sigue esta guía paso a paso para configurar tu empresa con validez tributaria ante SUNAT (SEE - Del Contribuyente) y emitir tus primeras facturas y boletas legales.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700">
              Web Service: <span class="text-emerald-400 font-bold">e-factura</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 4 STEPS GRID -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- PASO 1: REQUISITOS SUNAT -->
        <div class="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 class="font-bold text-white text-sm">Requisitos Previos en SUNAT</h3>
              <p class="text-xs text-slate-400">Trámites ante SUNAT Operaciones en Línea</p>
            </div>
          </div>

          <div class="space-y-3 text-xs text-slate-300">
            <div class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"></i>
              <div>
                <b class="text-slate-100">RUC Activo y Habido:</b>
                <p class="text-slate-400 mt-0.5">La empresa debe estar inscrita en Régimen MYPE Tributario, Especial o General.</p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <i data-lucide="user-plus" class="w-4 h-4 text-teal-400 shrink-0 mt-0.5"></i>
              <div>
                <b class="text-slate-100">Crear Usuario Secundario SOL:</b>
                <p class="text-slate-400 mt-0.5">En el portal SOL de SUNAT, ve a <i>Administración de Usuarios Secundarios</i> &rarr; <i>Crear Usuario</i>. Asígnale permisos en el menú <b>Comprobantes de Pago Electrónicos (SEE)</b>. Nunca uses tu clave principal.</p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <i data-lucide="award" class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"></i>
              <div>
                <b class="text-slate-100">Certificado Digital Tributario (CDT):</b>
                <p class="text-slate-400 mt-0.5">SUNAT otorga un <b>Certificado Digital Gratuito</b> a empresas con ingresos de hasta 300 UIT. Solicítalo en SOL en: <i>Empresas &rarr; Comprobantes de Pago &rarr; Certificado Digital Tributario</i>.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- PASO 2: REGISTRO EN PANEL -->
        <div class="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h3 class="font-bold text-white text-sm">Registrar el Negocio en el Panel</h3>
              <p class="text-xs text-slate-400">Configuración en la pestaña "Negocios & API Keys"</p>
            </div>
          </div>

          <div class="space-y-3 text-xs text-slate-300">
            <div class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <i data-lucide="search" class="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"></i>
              <div>
                <b class="text-slate-100">1. Buscar por RUC:</b>
                <p class="text-slate-400 mt-0.5">Haz clic en <b>"+ Nuevo Negocio"</b>, ingresa el RUC de 11 dígitos y presiona <b>Buscar</b> para autocompletar la Razón Social y Dirección.</p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <i data-lucide="key" class="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"></i>
              <div>
                <b class="text-slate-100">2. Credenciales SOL Secundarias:</b>
                <p class="text-slate-400 mt-0.5">Ingresa el nombre del Usuario Secundario (ej. <code class="text-indigo-300">MODFACT1</code>) y su respectiva Clave SOL.</p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/30">
              <i data-lucide="toggle-right" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"></i>
              <div>
                <b class="text-emerald-300">3. Cambiar a PRODUCCIÓN:</b>
                <p class="text-slate-400 mt-0.5">En el selector de Ambiente, cambia de <b>BETA (Pruebas)</b> a <b>PRODUCCIÓN (Validez Fiscal)</b>. Guarda los cambios y copia la <b>API Key Privada</b> generada (<code class="text-teal-400">sk_live_...</code>).</p>
              </div>
            </div>
          </div>
        </div>

        <!-- PASO 3: PRIMERA EMISIÓN -->
        <div class="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h3 class="font-bold text-white text-sm">Emitir la Primera Prueba Real</h3>
              <p class="text-xs text-slate-400">Recomendaciones para evitar contingencias</p>
            </div>
          </div>

          <div class="space-y-3 text-xs text-slate-300">
            <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
              <div class="font-semibold flex items-center gap-1.5 mb-1">
                <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400"></i>
                <span>Recomendación Práctica:</span>
              </div>
              <p class="text-xs text-slate-300">
                Emite primero una <b>Boleta de Venta Electrónica (B001-1)</b> por un monto de <b>S/ 1.00</b> (con concepto "Servicio de prueba de facturación").
              </p>
            </div>

            <div class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <i data-lucide="file-check" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"></i>
              <div>
                <b class="text-slate-100">Verificar CDR de SUNAT:</b>
                <p class="text-slate-400 mt-0.5">Al emitir, SUNAT debe devolver estado <span class="text-emerald-400 font-bold">ACEPTADO</span> con código de respuesta <code class="text-slate-200">0</code>.</p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <i data-lucide="printer" class="w-4 h-4 text-teal-400 shrink-0 mt-0.5"></i>
              <div>
                <b class="text-slate-100">Auditar en el Historial:</b>
                <p class="text-slate-400 mt-0.5">En la pestaña <b>Historial de Comprobantes</b> podrás ver el documento registrado en Supabase, descargar el XML firmado y abrir el ticket térmico con su código QR oficial.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- PASO 4: SERIES Y ANULACIONES -->
        <div class="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <div>
              <h3 class="font-bold text-white text-sm">Series, Plazos y Anulaciones</h3>
              <p class="text-xs text-slate-400">Reglas tributarias esenciales de SUNAT</p>
            </div>
          </div>

          <div class="space-y-3 text-xs text-slate-300">
            <div class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <i data-lucide="clock" class="w-4 h-4 text-purple-400 shrink-0 mt-0.5"></i>
              <div>
                <b class="text-slate-100">Plazo de Envío a SUNAT:</b>
                <p class="text-slate-400 mt-0.5">Las Facturas deben enviarse a SUNAT en un plazo máximo de <b>3 días calendario</b> a partir de la fecha de emisión.</p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <i data-lucide="hash" class="w-4 h-4 text-purple-400 shrink-0 mt-0.5"></i>
              <div>
                <b class="text-slate-100">Nomenclatura de Series:</b>
                <p class="text-slate-400 mt-0.5">
                  &bull; Facturas: <code class="text-purple-300 font-mono">F001</code>, <code class="text-purple-300 font-mono">F002</code>...<br>
                  &bull; Boletas: <code class="text-purple-300 font-mono">B001</code>, <code class="text-purple-300 font-mono">B002</code>...<br>
                  &bull; Notas de Crédito: <code class="text-purple-300 font-mono">FC01</code> (Facturas), <code class="text-purple-300 font-mono">BC01</code> (Boletas).
                </p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <i data-lucide="file-x" class="w-4 h-4 text-rose-400 shrink-0 mt-0.5"></i>
              <div>
                <b class="text-slate-100">¿Cómo Anular un Comprobante?:</b>
                <p class="text-slate-400 mt-0.5">Para Facturas y Boletas ya aceptadas por SUNAT, se emite una <b>Nota de Crédito Electrónica</b> con motivo <i>"01: Anulación de la operación"</i>.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- EJEMPLO DE CÓDIGO REST API -->
      <div class="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i data-lucide="terminal" class="w-5 h-5 text-teal-400"></i>
            <h3 class="font-bold text-white text-sm">Ejemplo de Petición HTTP (Emisión Real vía API)</h3>
          </div>
          <button onclick="copyToClipboard(document.getElementById('code-curl-sample').innerText)" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs rounded-xl flex items-center gap-1.5 transition">
            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            <span>Copiar cURL</span>
          </button>
        </div>

        <pre id="code-curl-sample" class="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">curl -X POST https://sunat-billing-api.vercel.app/api/v1/cpe/emitir \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_TU_EMPRESA_KEY" \
  -d '{
    "tipoComprobante": "03",
    "serie": "B001",
    "numero": 1,
    "moneda": "PEN",
    "cliente": {
      "tipoDoc": "1",
      "numDoc": "44556677",
      "nombre": "CLIENTE DE PRUEBA"
    },
    "items": [
      {
        "sku": "SERV01",
        "descripcion": "Servicio de prueba de facturación",
        "cantidad": 1,
        "precioUnitario": 1.00
      }
    ],
    "medioPago": "efectivo",
    "enviarASunat": true
  }'</pre>
      </div>
    </section>

  </main>
  </div> <!-- END #admin-app -->

  <!-- MODAL: NUEVA / EDITAR EMPRESA -->
  <div id="modal-empresa" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="glass-card bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 id="modal-empresa-title" class="text-base font-bold text-white flex items-center gap-2">
          <i data-lucide="building-2" class="w-5 h-5 text-teal-400"></i>
          <span>Registrar Nuevo Negocio</span>
        </h3>
        <button onclick="closeModalEmpresa()" class="text-slate-500 hover:text-white p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form id="form-empresa" onsubmit="guardarEmpresa(event)" class="space-y-4">
        <input type="hidden" id="modal-empresa-id">
        <div>
          <label class="block text-xs font-medium text-slate-400 mb-1">RUC (11 dígitos) *</label>
          <div class="flex gap-2">
            <input type="text" id="modal-ruc" maxlength="11" required placeholder="Ej: 20601234567" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-200 focus:border-teal-500 focus:outline-none">
            <button type="button" id="modal-ruc-btn" onclick="lookupRucInModal()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-teal-400 flex items-center gap-1.5 transition">
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
          <div id="modal-api-key-container">
            <label class="block text-xs font-medium text-slate-400 mb-1">API Key</label>
            <div class="flex gap-1.5">
              <input type="text" id="modal-api-key" placeholder="Auto-generada..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-200 truncate">
              <button type="button" onclick="generateRandomApiKey()" class="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-teal-400" title="Generar clave">
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

  <!-- MODAL: VISOR / IMPRESIÓN DE TICKET TÉRMICO -->
  <div id="modal-ticket" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="glass-card bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between pb-2 border-b border-slate-800">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i data-lucide="printer" class="w-4 h-4 text-teal-400"></i>
          <span>Vista de Ticket 80mm</span>
        </h3>
        <button onclick="closeModalTicket()" class="text-slate-500 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- TICKET PREVIEW CANVAS -->
      <div id="printable-ticket" class="bg-white text-black p-4 rounded-xl font-mono text-[11px] leading-tight space-y-2 shadow-inner">
        <div class="text-center border-b pb-2">
          <div class="font-bold text-xs" id="ticket-emisor-razon">EMPRESA S.A.C.</div>
          <div id="ticket-emisor-ruc">RUC: 20000000001</div>
          <div class="font-bold text-xs mt-1" id="ticket-tipo-num">BOLETA B001-1</div>
        </div>
        <div class="text-[10px] space-y-0.5">
          <div><b>Fecha:</b> <span id="ticket-fecha">2026-09-24</span></div>
          <div><b>Cliente:</b> <span id="ticket-cliente-nombre">CLIENTE GENERAL</span></div>
          <div><b>Doc:</b> <span id="ticket-cliente-doc">72345678</span></div>
        </div>
        <div class="border-t border-b py-1.5 space-y-1">
          <div class="flex justify-between font-bold text-[10px]">
            <span>TOTAL</span>
            <span id="ticket-total">S/ 10.00</span>
          </div>
        </div>
        <div class="text-center pt-1">
          <img id="ticket-qr" src="" alt="QR" class="w-28 h-28 mx-auto">
          <div class="text-[8px] text-gray-600 mt-1" id="ticket-hash">Hash: ...</div>
          <div class="text-[9px] font-bold mt-1 text-gray-800">Representación Impresa del CPE</div>
        </div>
      </div>

      <div class="flex gap-2 pt-2">
        <button onclick="window.print()" class="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition">
          <i data-lucide="printer" class="w-4 h-4"></i>
          <span>Imprimir Ticket</span>
        </button>
      </div>
    </div>
  </div>

  <!-- JAVASCRIPT LOGIC -->
  <script>
    let currentEmpresas = [];
    let currentComprobantes = [];
    let lastXmlContent = "";

    function getAdminKey() {
      return sessionStorage.getItem("sunat_admin_key") || localStorage.getItem("sunat_admin_key") || "";
    }

    function showLoginScreen(error) {
      document.getElementById("login-screen").classList.remove("hidden");
      document.getElementById("admin-app").classList.add("hidden");
      const alertBox = document.getElementById("login-error-alert");
      const alertMsg = document.getElementById("login-error-msg");
      if (error) {
        alertBox.classList.remove("hidden");
        alertMsg.textContent = error;
      } else {
        alertBox.classList.add("hidden");
      }
      lucide.createIcons();
    }

    function showAdminApp() {
      document.getElementById("login-screen").classList.add("hidden");
      document.getElementById("admin-app").classList.remove("hidden");
      lucide.createIcons();
    }

    function togglePasswordVisibility() {
      const input = document.getElementById("login-input-pass");
      const icon = document.getElementById("eye-icon");
      if (input.type === "password") {
        input.type = "text";
        icon.setAttribute("data-lucide", "eye-off");
      } else {
        input.type = "password";
        icon.setAttribute("data-lucide", "eye");
      }
      lucide.createIcons();
    }

    async function checkAuth() {
      const key = getAdminKey();
      if (!key) {
        showLoginScreen();
        return;
      }

      try {
        const res = await fetch("/api/v1/admin/empresas", {
          headers: { "x-api-key": key }
        });
        if (res.ok) {
          showAdminApp();
          loadDashboardData();
        } else {
          sessionStorage.removeItem("sunat_admin_key");
          localStorage.removeItem("sunat_admin_key");
          showLoginScreen("Sesión expirada o credencial no autorizada.");
        }
      } catch (err) {
        showLoginScreen("Error al verificar credenciales con el servidor.");
      }
    }

    async function handleAdminLogin(e) {
      e.preventDefault();
      const username = document.getElementById("login-input-user").value.trim();
      const password = document.getElementById("login-input-pass").value.trim();
      if (!password) return;

      const btn = document.getElementById("login-btn-submit");
      const btnText = document.getElementById("login-btn-text");
      const alertBox = document.getElementById("login-error-alert");
      const alertMsg = document.getElementById("login-error-msg");

      alertBox.classList.add("hidden");
      btn.disabled = true;
      btnText.textContent = "Iniciando sesión...";

      try {
        const res = await fetch("/api/v1/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok && data.success && data.token) {
          sessionStorage.setItem("sunat_admin_key", data.token);
          localStorage.setItem("sunat_admin_key", data.token);
          showAdminApp();
          loadDashboardData();
        } else {
          alertBox.classList.remove("hidden");
          alertMsg.textContent = data.error || "Usuario o contraseña incorrectos.";
          document.getElementById("login-input-pass").focus();
          document.getElementById("login-input-pass").select();
        }
      } catch (err) {
        alertBox.classList.remove("hidden");
        alertMsg.textContent = "Error de conexión con el servidor.";
      } finally {
        btn.disabled = false;
        btnText.textContent = "Iniciar Sesión";
        lucide.createIcons();
      }
    }

    function logoutAdmin() {
      sessionStorage.removeItem("sunat_admin_key");
      localStorage.removeItem("sunat_admin_key");
      document.getElementById("login-input-pass").value = "";
      showLoginScreen();
    }

    async function loadDashboardData() {
      await Promise.all([loadHealth(), loadEmpresas(), loadComprobantes()]);
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
          logoutAdmin();
          return;
        }
        const data = await res.json();
        if (data.success) {
          currentEmpresas = data.empresas;
          renderEmpresasTable(currentEmpresas);
          populateEmpresasSelect(currentEmpresas);
          updateKpis();
        }
      } catch (e) {
        console.error("Error loading empresas", e);
      }
    }

    async function loadComprobantes() {
      try {
        const ruc = document.getElementById("hist-filter-empresa")?.value || "";
        const tipo = document.getElementById("hist-filter-tipo")?.value || "";
        const url = \`/api/v1/admin/comprobantes?ruc=\${ruc}&tipo=\${tipo}\`;

        const res = await fetch(url, {
          headers: { "x-api-key": getAdminKey() }
        });
        const data = await res.json();
        if (data.success) {
          currentComprobantes = data.comprobantes;
          renderComprobantesTable(currentComprobantes);
          updateKpis();
        }
      } catch (e) {
        console.error("Error loading comprobantes", e);
      }
    }

    function updateKpis() {
      document.getElementById("stat-total-empresas").textContent = currentEmpresas.length;
      document.getElementById("stat-total-comprobantes").textContent = currentComprobantes.length;

      const totalMonto = currentComprobantes.reduce((acc, c) => acc + parseFloat(c.total || 0), 0);
      document.getElementById("stat-total-monto").textContent = "S/ " + totalMonto.toLocaleString("es-PE", { minimumFractionDigits: 2 });
    }

    function renderEmpresasTable(list) {
      const tbody = document.getElementById("empresas-table-body");
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-500">No hay empresas registradas aún. Haga clic en "+ Nuevo Negocio".</td></tr>';
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
              <span class="text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 max-w-[150px] truncate" title="\${emp.api_key}">\${emp.api_key}</span>
              <button onclick="copyToClipboard('\${emp.api_key}')" class="p-1 hover:text-white text-slate-400 transition" title="Copiar API Key">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
          <td class="py-4 px-6">
            <span class="font-bold text-slate-200">\${emp.total_docs || 0} docs</span>
            <div class="text-xs text-slate-400 font-mono">S/ \${parseFloat(emp.total_monto || 0).toFixed(2)}</div>
          </td>
          <td class="py-4 px-6">
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold \${emp.is_beta ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
              \${emp.is_beta ? 'BETA' : 'PROD'}
            </span>
          </td>
          <td class="py-4 px-6">
            <button onclick="toggleEmpresaActive('\${emp.id}')" class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none \${emp.activo ? 'bg-teal-500' : 'bg-slate-700'}" title="Activar/Desactivar">
              <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out \${emp.activo ? 'translate-x-4' : 'translate-x-0'}"></span>
            </button>
          </td>
          <td class="py-4 px-6 text-right">
            <div class="flex items-center justify-end gap-1">
              <button onclick="openEditModalEmpresa('\${emp.id}')" class="p-1.5 text-slate-400 hover:text-teal-400 rounded-lg hover:bg-teal-500/10 transition" title="Editar Empresa">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button onclick="regenerateApiKey('\${emp.id}', '\${emp.razon_social}')" class="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-amber-500/10 transition" title="Regenerar / Rotar API Key">
                <i data-lucide="key" class="w-4 h-4"></i>
              </button>
              <button onclick="eliminarEmpresa('\${emp.id}', '\${emp.razon_social}')" class="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition" title="Eliminar Negocio">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      \`).join("");

      lucide.createIcons();
    }

    function renderComprobantesTable(list) {
      const tbody = document.getElementById("comprobantes-table-body");
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-500">No se han emitido comprobantes aún.</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(c => {
        const tipoLabel = c.tipo_comprobante === "01" ? "Factura" : (c.tipo_comprobante === "03" ? "Boleta" : "CPE");
        const tipoBadge = c.tipo_comprobante === "01" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-teal-500/10 text-teal-400 border border-teal-500/20";
        return \`
          <tr class="hover:bg-slate-800/30 transition">
            <td class="py-4 px-6">
              <span class="px-2 py-0.5 rounded text-xs font-semibold \${tipoBadge} mr-1">\${tipoLabel}</span>
              <span class="font-mono font-bold text-slate-100">\${c.serie}-\${c.numero}</span>
            </td>
            <td class="py-4 px-6 font-mono text-xs text-slate-300">\${c.empresa_ruc}</td>
            <td class="py-4 px-6">
              <div class="text-slate-200 text-xs font-semibold truncate max-w-[180px]">\${c.cliente_nombre || 'VARIOS'}</div>
              <div class="text-[11px] font-mono text-slate-400">\${c.cliente_num_doc || '00000000'}</div>
            </td>
            <td class="py-4 px-6 text-xs text-slate-400 font-mono">\${c.fecha_emision}</td>
            <td class="py-4 px-6 font-mono font-bold text-slate-100">S/ \${parseFloat(c.total).toFixed(2)}</td>
            <td class="py-4 px-6">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold \${c.estado_sunat === 'ACEPTADO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                \${c.estado_sunat}
              </span>
            </td>
            <td class="py-4 px-6 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="openTicketModal('\${c.id}')" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded-lg transition" title="Ver Ticket">
                  <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="downloadComprobanteXml('\${c.id}')" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition" title="Descargar XML">
                  <i data-lucide="file-code" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </td>
          </tr>
        \`;
      }).join("");

      lucide.createIcons();
    }

    function populateEmpresasSelect(list) {
      const select = document.getElementById("emit-empresa-select");
      select.innerHTML = '<option value="">Seleccione empresa emisor...</option>' + list.filter(e => e.activo).map(e => \`
        <option value="\${e.api_key}" data-ruc="\${e.ruc}" data-razon="\${e.razon_social}">\${e.ruc} - \${e.razon_social}</option>
      \`).join("");

      const filterSelect = document.getElementById("hist-filter-empresa");
      if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Todas las empresas...</option>' + list.map(e => \`
          <option value="\${e.ruc}">\${e.ruc} - \${e.razon_social}</option>
        \`).join("");
      }
    }

    function filterEmpresas() {
      const term = document.getElementById("search-empresa-input").value.toLowerCase();
      const filtered = currentEmpresas.filter(e => e.ruc.includes(term) || e.razon_social.toLowerCase().includes(term));
      renderEmpresasTable(filtered);
    }

    // CRUD ACTIONS
    function openModalEmpresa() {
      document.getElementById("modal-empresa-id").value = "";
      document.getElementById("modal-empresa-title").innerHTML = '<i data-lucide="building-2" class="w-5 h-5 text-teal-400"></i><span>Registrar Nuevo Negocio</span>';
      document.getElementById("modal-ruc").value = "";
      document.getElementById("modal-ruc").disabled = false;
      document.getElementById("modal-ruc-btn").classList.remove("hidden");
      document.getElementById("modal-razon").value = "";
      document.getElementById("modal-usuario-sol").value = "MODDATOS";
      document.getElementById("modal-clave-sol").value = "MODDATOS";
      document.getElementById("modal-is-beta").value = "true";
      document.getElementById("modal-api-key-container").classList.remove("hidden");
      generateRandomApiKey();
      document.getElementById("modal-empresa").classList.remove("hidden");
      lucide.createIcons();
    }

    function openEditModalEmpresa(id) {
      const emp = currentEmpresas.find(e => e.id === id);
      if (!emp) return;

      document.getElementById("modal-empresa-id").value = emp.id;
      document.getElementById("modal-empresa-title").innerHTML = '<i data-lucide="edit" class="w-5 h-5 text-teal-400"></i><span>Editar Negocio: ' + emp.razon_social + '</span>';
      document.getElementById("modal-ruc").value = emp.ruc;
      document.getElementById("modal-ruc").disabled = true;
      document.getElementById("modal-ruc-btn").classList.add("hidden");
      document.getElementById("modal-razon").value = emp.razon_social;
      document.getElementById("modal-usuario-sol").value = emp.usuario_sol || "MODDATOS";
      document.getElementById("modal-clave-sol").value = emp.clave_sol || "MODDATOS";
      document.getElementById("modal-is-beta").value = emp.is_beta ? "true" : "false";
      document.getElementById("modal-api-key-container").classList.add("hidden");
      document.getElementById("modal-empresa").classList.remove("hidden");
      lucide.createIcons();
    }

    function closeModalEmpresa() {
      document.getElementById("modal-empresa").classList.add("hidden");
    }

    async function guardarEmpresa(e) {
      e.preventDefault();
      const id = document.getElementById("modal-empresa-id").value;
      const ruc = document.getElementById("modal-ruc").value.trim();
      const razonSocial = document.getElementById("modal-razon").value.trim();
      const usuarioSol = document.getElementById("modal-usuario-sol").value.trim();
      const claveSol = document.getElementById("modal-clave-sol").value.trim();
      const isBeta = document.getElementById("modal-is-beta").value === "true";
      const apiKey = document.getElementById("modal-api-key").value.trim();

      const btn = document.getElementById("modal-submit-btn");
      btn.disabled = true;
      btn.textContent = "Guardando...";

      const url = id ? \`/api/v1/admin/empresas/\${id}\` : "/api/v1/admin/empresas";
      const method = id ? "PUT" : "POST";
      const payload = id ? { razonSocial, usuarioSol, claveSol, isBeta } : { ruc, razonSocial, usuarioSol, claveSol, isBeta, apiKey };

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", "x-api-key": getAdminKey() },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          closeModalEmpresa();
          await loadEmpresas();
        } else {
          alert(data.error || "Error al procesar negocio");
        }
      } catch (err) {
        alert("Error de conexión");
      } finally {
        btn.disabled = false;
        btn.textContent = "Guardar Negocio";
      }
    }

    async function regenerateApiKey(id, razon) {
      if (!confirm(\`¿Regenerar la API Key de "\${razon}"?\\nLa clave anterior dejará de funcionar inmediatamente.\`)) return;

      try {
        const res = await fetch(\`/api/v1/admin/empresas/\${id}/regenerate-key\`, {
          method: "POST",
          headers: { "x-api-key": getAdminKey() }
        });
        const data = await res.json();
        if (data.success) {
          alert(\`¡Nueva API Key generada con éxito!\\n\\n\${data.api_key}\`);
          await loadEmpresas();
        } else {
          alert(data.error || "Error al rotar clave");
        }
      } catch (e) {
        alert("Error de conexión");
      }
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
      if (!confirm(\`¿Eliminar definitivamente el negocio "\${razon}"?\`)) return;
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

    // TABS LOGIC
    function switchTab(name) {
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("border-teal-500", "text-teal-400");
        b.classList.add("border-transparent", "text-slate-400");
      });
      document.getElementById("tab-btn-" + name).classList.add("border-teal-500", "text-teal-400");
      document.getElementById("tab-btn-" + name).classList.remove("border-transparent", "text-slate-400");

      document.getElementById("tab-content-empresas").classList.add("hidden");
      document.getElementById("tab-content-comprobantes").classList.add("hidden");
      document.getElementById("tab-content-emisor").classList.add("hidden");
      document.getElementById("tab-content-consultas").classList.add("hidden");
      document.getElementById("tab-content-guia").classList.add("hidden");
      document.getElementById("tab-content-" + name).classList.remove("hidden");

      if (name === "comprobantes") loadComprobantes();
      lucide.createIcons();
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

          const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(data.qrString);
          document.getElementById("res-qr-img").src = qrUrl;

          lastXmlContent = data.xmlBase64 ? atob(data.xmlBase64) : "";
          document.getElementById("emit-numero").value = numero + 1;
          await loadComprobantes();
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

    // TICKET MODAL PREVIEW
    async function openTicketModal(id) {
      try {
        const res = await fetch(\`/api/v1/admin/comprobantes/\${id}\`, {
          headers: { "x-api-key": getAdminKey() }
        });
        const data = await res.json();
        if (data.success && data.comprobante) {
          const c = data.comprobante;
          const emp = currentEmpresas.find(e => e.ruc === c.empresa_ruc);

          document.getElementById("ticket-emisor-razon").textContent = emp?.razon_social || "EMPRESA FISCAL S.A.C.";
          document.getElementById("ticket-emisor-ruc").textContent = "RUC: " + c.empresa_ruc;
          document.getElementById("ticket-tipo-num").textContent = (c.tipo_comprobante === "01" ? "FACTURA " : "BOLETA ") + c.serie + "-" + c.numero;
          document.getElementById("ticket-fecha").textContent = c.fecha_emision + " " + (c.hora_emision || "");
          document.getElementById("ticket-cliente-nombre").textContent = c.cliente_nombre || "CLIENTES VARIOS";
          document.getElementById("ticket-cliente-doc").textContent = c.cliente_num_doc || "00000000";
          document.getElementById("ticket-total").textContent = "S/ " + parseFloat(c.total).toFixed(2);
          document.getElementById("ticket-hash").textContent = "Hash: " + (c.hash_sunat || "---");

          if (c.qr_string) {
            document.getElementById("ticket-qr").src = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" + encodeURIComponent(c.qr_string);
          }

          document.getElementById("modal-ticket").classList.remove("hidden");
          lucide.createIcons();
        }
      } catch (e) {
        alert("Error al cargar ticket");
      }
    }

    function closeModalTicket() {
      document.getElementById("modal-ticket").classList.add("hidden");
    }

    async function downloadComprobanteXml(id) {
      try {
        const res = await fetch(\`/api/v1/admin/comprobantes/\${id}\`, {
          headers: { "x-api-key": getAdminKey() }
        });
        const data = await res.json();
        if (data.success && data.comprobante?.xml_base64) {
          const xml = atob(data.comprobante.xml_base64);
          const blob = new Blob([xml], { type: "application/xml" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = \`\${data.comprobante.empresa_ruc}-\${data.comprobante.tipo_comprobante}-\${data.comprobante.serie}-\${data.comprobante.numero}.xml\`;
          a.click();
        } else {
          alert("XML no disponible");
        }
      } catch (e) {
        alert("Error al descargar XML");
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

    document.addEventListener("DOMContentLoaded", () => {
      lucide.createIcons();
      checkAuth();
    });
  </script>
</body>
</html>
  `);
});
