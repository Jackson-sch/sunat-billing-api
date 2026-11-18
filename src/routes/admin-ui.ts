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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
          colors: {
            brand: { 50: '#f0fdfa', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' }
          }
        }
      }
    }
  </script>
  <style>
    body {
      background-color: #0b0f19;
      background-image: 
        radial-gradient(at 15% 15%, rgba(13, 148, 136, 0.08) 0px, transparent 40%),
        radial-gradient(at 85% 20%, rgba(99, 102, 241, 0.08) 0px, transparent 40%);
      background-attachment: fixed;
    }
    .glass-card { 
      background: rgba(17, 24, 39, 0.7); 
      backdrop-filter: blur(14px); 
      border: 1px solid rgba(51, 65, 85, 0.65); 
    }
    .glow-hover:hover { 
      box-shadow: 0 0 25px -5px rgba(20, 184, 166, 0.25); 
    }
    /* Estilos para Toasts */
    .toast-item {
      transform: translateY(16px) scale(0.95);
      opacity: 0;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast-item.show {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    .toast-item.hide {
      transform: translateY(12px) scale(0.95);
      opacity: 0;
    }
    /* Ticket térmico y reglas de impresión física */
    #printable-ticket {
      width: 80mm;
      max-width: 100%;
      color: #000;
      background: #fff;
    }
    #printable-ticket.ticket-58mm {
      width: 58mm;
      font-size: 9px;
    }
    @media print {
      body * { 
        visibility: hidden !important; 
      }
      #printable-ticket, #printable-ticket * { 
        visibility: visible !important; 
      }
      #printable-ticket { 
        position: fixed !important; 
        left: 0 !important; 
        top: 0 !important; 
        margin: 0 !important;
        padding: 2mm 3mm !important;
        width: 80mm !important;
        box-shadow: none !important;
        border: none !important;
      }
      #printable-ticket.ticket-58mm {
        width: 58mm !important;
      }
      @page {
        size: auto;
        margin: 0mm;
      }
    }
  </style>
</head>
<body class="text-slate-100 min-h-screen font-sans flex flex-col selection:bg-teal-500/20 selection:text-teal-300">

  <!-- TOAST NOTIFICATION CONTAINER -->
  <div id="toast-container" class="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full"></div>

  <!-- LOGIN SCREEN (PANTALLA DE ACCESO PROTEGIDO) -->
  <div id="login-screen" class="min-h-screen flex items-center justify-center p-4">
    <div class="glass-card max-w-md w-full p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden bg-slate-900/90 backdrop-blur-2xl">
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

        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Database Live Status Badge -->
          <div id="db-status-badge" class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs shadow-sm" title="Estado de la base de datos PostgreSQL">
            <span id="db-dot" class="w-2 h-2 rounded-full bg-slate-500"></span>
            <span class="text-slate-400">DB:</span>
            <span id="db-status-text" class="font-medium text-slate-300">Verificando...</span>
          </div>

          <!-- Sunat Live Status Badge -->
          <div id="sunat-status-badge" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs shadow-sm" title="Latencia y disponibilidad con servidores de SUNAT">
            <span id="sunat-dot" class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-slate-400">SUNAT:</span>
            <span id="sunat-latency" class="font-mono text-emerald-400 font-semibold">...</span>
          </div>

          <a href="/docs" target="_blank" class="hidden md:flex text-xs text-slate-400 hover:text-white px-3 py-2 rounded-xl hover:bg-slate-800 items-center gap-1.5 transition">
            <i data-lucide="book-open" class="w-4 h-4"></i>
            <span>Docs API</span>
          </a>

          <button onclick="logoutAdmin()" class="text-xs text-rose-400 hover:text-rose-300 px-3 py-2 rounded-xl hover:bg-rose-500/10 flex items-center gap-1.5 transition">
            <i data-lucide="log-out" class="w-4 h-4"></i>
            <span class="hidden sm:inline">Salir</span>
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
          <span class="text-xs text-slate-500" id="stat-db-mode-label">En Base de Datos</span>
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
            <span class="text-xs font-medium uppercase tracking-wider">Ambiente SUNAT</span>
            <i data-lucide="shield-alert" class="w-4 h-4 text-purple-400"></i>
          </div>
          <div class="text-2xl font-bold text-purple-400" id="stat-sunat-mode">BETA</div>
          <span class="text-xs text-slate-500" id="stat-sunat-subtext">Ambiente de Pruebas</span>
        </div>
      </div>

      <!-- TABS NAVIGATION -->
      <div class="flex items-center gap-2 border-b border-slate-800 mb-6 overflow-x-auto pb-1">
        <button onclick="switchTab('empresas')" id="tab-btn-empresas" class="tab-btn px-4 py-3 text-sm font-semibold border-b-2 border-teal-500 text-teal-400 flex items-center gap-2 shrink-0">
          <i data-lucide="building" class="w-4 h-4"></i>
          <span>Negocios & API Keys</span>
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
            <i data-lucide="search" class="w-4 h-4 text-slate-500 absolute left-3.5 top-3"></i>
            <input type="text" id="search-empresa-input" oninput="filterEmpresas()" placeholder="Buscar por RUC o Razón Social..." class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition">
          </div>
          <button onclick="openModalEmpresa()" class="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition hover:-translate-y-0.5">
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
                  <td colspan="6" class="py-12 text-center text-slate-500">Cargando empresas...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 2: HISTORIAL DE COMPROBANTES EMITIDOS -->
      <section id="tab-content-comprobantes" class="hidden space-y-4">
        <!-- TOOLBAR DE HISTORIAL -->
        <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <!-- Buscador general de comprobantes -->
          <div class="relative flex-1 max-w-md">
            <i data-lucide="search" class="w-4 h-4 text-slate-500 absolute left-3.5 top-3"></i>
            <input type="text" id="hist-filter-search" oninput="filterComprobantesLocally()" placeholder="Buscar serie, correlativo, cliente o RUC..." class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition">
          </div>

          <!-- Filtros de fecha, tipo y exportación -->
          <div class="flex flex-wrap items-center gap-2">
            <select id="hist-filter-empresa" onchange="loadComprobantes()" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500">
              <option value="">Todas las empresas...</option>
            </select>

            <select id="hist-filter-tipo" onchange="loadComprobantes()" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500">
              <option value="">Todos los tipos...</option>
              <option value="01">Factura (01)</option>
              <option value="03">Boleta (03)</option>
              <option value="07">Nota de Crédito (07)</option>
              <option value="09">Guía Remisión (09)</option>
            </select>

            <select id="hist-filter-periodo" onchange="filterComprobantesLocally()" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500">
              <option value="all">Todo el período</option>
              <option value="today">Emitidos Hoy</option>
              <option value="7days">Últimos 7 días</option>
              <option value="month">Este mes</option>
            </select>

            <button onclick="loadComprobantes()" class="p-2 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded-xl transition border border-slate-700/60" title="Refrescar datos">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>

            <!-- Exportar a CSV compatible con Excel -->
            <button onclick="exportComprobantesCSV()" class="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 hover:from-teal-500/20 hover:to-emerald-500/20 border border-teal-500/30 text-teal-300 hover:text-white rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm" title="Descargar archivo CSV listo para Microsoft Excel">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        <!-- RESUMEN DINÁMICO DE FILTRADO -->
        <div id="hist-summary-bar" class="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
          <div>Mostrando <span id="hist-filtered-count" class="font-bold text-slate-200">0</span> comprobante(s)</div>
          <div>Monto acumulado: <span id="hist-filtered-monto" class="font-bold font-mono text-teal-400">S/ 0.00</span></div>
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

      <!-- TAB 3: EMISOR VISUAL DE COMPROBANTES (POS) -->
      <section id="tab-content-emisor" class="hidden space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 glass-card rounded-2xl p-6 space-y-5">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <i data-lucide="file-text" class="w-5 h-5 text-teal-400"></i>
                <span>Nuevo Comprobante de Pago UBL 2.1</span>
              </h2>
              <button type="button" onclick="resetEmisorForm()" class="text-xs text-slate-400 hover:text-teal-300 flex items-center gap-1.5 transition px-2.5 py-1.5 rounded-lg hover:bg-slate-800 border border-slate-800">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                <span>Limpiar Formulario</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">Empresa Emisora *</label>
                <select id="emit-empresa-select" onchange="autoCorrelativo()" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:border-teal-500 focus:outline-none">
                  <option value="">Seleccione empresa...</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">Tipo de Comprobante</label>
                <select id="emit-tipo-select" onchange="autoCorrelativo()" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:border-teal-500 focus:outline-none">
                  <option value="03">Boleta de Venta Electrónica (03)</option>
                  <option value="01">Factura Electrónica (01)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">Serie</label>
                <input type="text" id="emit-serie" value="B001" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 uppercase">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">Número Correlativo</label>
                <input type="number" id="emit-numero" value="1" min="1" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200">
              </div>
            </div>

            <!-- CLIENTE -->
            <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Datos del Cliente / Adquiriente</span>
                <button type="button" onclick="setClienteAnonimo()" class="text-[11px] text-teal-400 hover:text-teal-300 transition">
                  + Clientes Varios (Sin Documento)
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 mb-1">Tipo Doc</label>
                  <select id="emit-cliente-tipo" onchange="handleClienteTipoChange()" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
                    <option value="1">DNI (1)</option>
                    <option value="6">RUC (6)</option>
                    <option value="0">Sin Documento (0)</option>
                  </select>
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs text-slate-400 mb-1">N° Documento</label>
                  <div class="flex gap-2">
                    <input type="text" id="emit-cliente-doc" value="72345678" onkeydown="if(event.key==='Enter'){event.preventDefault();lookupClientFromEmit();}" placeholder="8 dígitos DNI o 11 RUC" class="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200">
                    <button type="button" id="btn-buscar-cliente" onclick="lookupClientFromEmit()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-teal-400 flex items-center gap-1.5 transition">
                      <i data-lucide="search" class="w-3.5 h-3.5"></i>
                      <span>Buscar</span>
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1">Nombre / Razón Social</label>
                <input type="text" id="emit-cliente-nombre" value="CARLOS ALARCON" placeholder="Razón social o nombre completo del cliente" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
              </div>
            </div>

            <!-- ITEMS -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-300 uppercase tracking-wider">Productos / Servicios a Facturar</span>
                <button type="button" onclick="addItemRow()" class="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition">
                  <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                  <span>Agregar Línea</span>
                </button>
              </div>

              <!-- Encabezado de columnas de items -->
              <div class="grid grid-cols-12 gap-2 text-[11px] text-slate-400 px-2 font-medium">
                <div class="col-span-5">Descripción</div>
                <div class="col-span-2">Cant.</div>
                <div class="col-span-2">P. Unitario</div>
                <div class="col-span-2">Afectación IGV</div>
                <div class="col-span-1 text-right">Quitar</div>
              </div>

              <div id="items-container" class="space-y-2">
                <div class="grid grid-cols-12 gap-2 items-center bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80 item-row">
                  <div class="col-span-5">
                    <input type="text" class="item-desc w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" placeholder="Descripción" value="PRODUCTO / SERVICIO 01">
                  </div>
                  <div class="col-span-2">
                    <input type="number" oninput="calcTotals()" class="item-cant w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" placeholder="Cant." value="1" min="1">
                  </div>
                  <div class="col-span-2">
                    <div class="relative">
                      <span class="absolute left-2 top-1.5 text-xs text-slate-500">S/</span>
                      <input type="number" step="0.1" oninput="calcTotals()" class="item-precio w-full bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-xs text-slate-200" placeholder="P. Unit" value="10.00">
                    </div>
                  </div>
                  <div class="col-span-2">
                    <select onchange="calcTotals()" class="item-afectacion w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200">
                      <option value="10">Gravado (18%)</option>
                      <option value="20">Exonerado (0%)</option>
                      <option value="30">Inafecto (0%)</option>
                    </select>
                  </div>
                  <div class="col-span-1 text-right">
                    <button type="button" onclick="removeItemRow(this)" class="text-slate-500 hover:text-rose-400 p-1 transition" title="Eliminar ítem">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- TOTALES Y ACCIÓN -->
            <div class="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div class="text-xs text-slate-400 flex flex-wrap items-center gap-4">
                <span>Op. Gravada: <b id="subtotal-gravada" class="text-slate-200 font-mono">S/ 8.47</b></span>
                <span id="subtotal-exonerada-container" class="hidden">Op. Exonerada: <b id="subtotal-exonerada" class="text-slate-200 font-mono">S/ 0.00</b></span>
                <span>IGV (18%): <b id="subtotal-igv" class="text-slate-200 font-mono">S/ 1.53</b></span>
                <span class="text-sm font-bold text-teal-400">Total: <b id="total-doc" class="font-mono">S/ 10.00</b></span>
              </div>

              <button type="button" onclick="emitirComprobante()" id="btn-emitir" class="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition hover:-translate-y-0.5">
                <i data-lucide="send" class="w-4 h-4"></i>
                <span>Generar Comprobante</span>
              </button>
            </div>
          </div>

          <!-- VISOR DE RESULTADOS / QR -->
          <div class="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div id="result-placeholder" class="py-12 text-slate-500 space-y-3">
              <i data-lucide="qr-code" class="w-16 h-16 mx-auto stroke-1 text-slate-600"></i>
              <p class="text-xs max-w-xs">Genera un comprobante para ver el código QR oficial de SUNAT, hash canónico y descargar el XML firmado.</p>
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
                  <span id="res-hash" class="font-mono text-slate-200 truncate max-w-[170px]" title="">...</span>
                </div>
                <div class="flex justify-between">
                  <span>Estado SUNAT:</span>
                  <span id="res-estado" class="text-emerald-400 font-semibold">ACEPTADO</span>
                </div>
              </div>

              <!-- Botones rápidos de ticket y descarga -->
              <div class="space-y-2 pt-2 border-t border-slate-800">
                <button type="button" id="btn-ver-ticket-emitido" class="w-full py-2.5 px-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20 transition">
                  <i data-lucide="printer" class="w-4 h-4"></i>
                  <span>Ver / Imprimir Ticket Térmico</span>
                </button>
                <div class="flex gap-2">
                  <button type="button" onclick="downloadLastPdf('a4')" class="flex-1 py-2 px-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs text-indigo-300 border border-indigo-500/30 rounded-xl flex items-center justify-center gap-1.5 font-semibold transition">
                    <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
                    <span>PDF A4</span>
                  </button>
                  <button type="button" onclick="downloadLastPdf('ticket')" class="flex-1 py-2 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-xs text-amber-300 border border-amber-500/30 rounded-xl flex items-center justify-center gap-1.5 font-semibold transition">
                    <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
                    <span>PDF Ticket</span>
                  </button>
                </div>
                <div class="flex gap-2">
                  <button type="button" onclick="copyXmlBase64()" class="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition">
                    <i data-lucide="copy" class="w-3.5 h-3.5 text-teal-400"></i>
                    <span>Copiar XML</span>
                  </button>
                  <button type="button" onclick="downloadXmlFile()" class="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs text-teal-300 rounded-xl flex items-center justify-center gap-1.5 font-semibold transition">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                    <span>Descargar XML</span>
                  </button>
                </div>
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
            <input type="text" id="consulta-input" maxlength="11" onkeydown="if(event.key==='Enter'){event.preventDefault();ejecutarConsulta();}" placeholder="Ingrese 8 dígitos para DNI o 11 para RUC..." class="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500">
            <button onclick="ejecutarConsulta()" class="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-semibold text-xs px-6 py-3 rounded-xl flex items-center gap-2 transition hover:-translate-y-0.5">
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
                  <p class="text-slate-400 mt-0.5">Ingresa el nombre del Usuario Secundario (ej. <code class="text-indigo-300 font-mono">MODFACT1</code>) y su respectiva Clave SOL.</p>
                </div>
              </div>

              <div class="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/30">
                <i data-lucide="toggle-right" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"></i>
                <div>
                  <b class="text-emerald-300">3. Cambiar a PRODUCCIÓN:</b>
                  <p class="text-slate-400 mt-0.5">En el selector de Ambiente, cambia de <b>BETA (Pruebas)</b> a <b>PRODUCCIÓN (Validez Fiscal)</b>. Guarda los cambios y copia la <b>API Key Privada</b> generada (<code class="text-teal-400 font-mono">sk_live_...</code>).</p>
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
                  <p class="text-slate-400 mt-0.5">Al emitir, SUNAT debe devolver estado <span class="text-emerald-400 font-bold">ACEPTADO</span> con código de respuesta <code class="text-slate-200 font-mono">0</code>.</p>
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

          <pre id="code-curl-sample" class="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">curl -X POST https://sunat-billing-api.vercel.app/api/v1/cpe/emitir \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: sk_live_TU_EMPRESA_KEY" \\
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
        "precioUnitario": 1.00,
        "tipoAfectacionIgv": "10"
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
  <div id="modal-empresa" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm hidden flex items-center justify-center p-4">
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
            <input type="text" id="modal-ruc" maxlength="11" required placeholder="Ej: 20601234567" onkeydown="if(event.key==='Enter'){event.preventDefault();lookupRucInModal();}" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-teal-500 focus:outline-none">
            <button type="button" id="modal-ruc-btn" onclick="lookupRucInModal()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-teal-400 flex items-center gap-1.5 transition">
              <i data-lucide="search" class="w-3.5 h-3.5"></i>
              <span>Buscar</span>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-400 mb-1">Razón Social *</label>
          <input type="text" id="modal-razon" required placeholder="Nombre formal del negocio" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-teal-500 focus:outline-none">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Usuario Secundario SOL</label>
            <input type="text" id="modal-usuario-sol" value="MODDATOS" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 uppercase">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Clave SOL</label>
            <input type="password" id="modal-clave-sol" value="MODDATOS" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Ambiente SUNAT</label>
            <select id="modal-is-beta" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
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
    <div class="glass-card bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between pb-2 border-b border-slate-800">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i data-lucide="printer" class="w-4 h-4 text-teal-400"></i>
          <span>Ticket Fiscal</span>
        </h3>
        <!-- Selector de Ancho 80mm / 58mm -->
        <div class="flex items-center gap-1 bg-slate-800 p-1 rounded-lg text-[10px]">
          <button type="button" id="btn-size-80" onclick="setTicketWidth('80')" class="px-2 py-0.5 rounded bg-teal-500 text-white font-bold">80mm</button>
          <button type="button" id="btn-size-58" onclick="setTicketWidth('58')" class="px-2 py-0.5 rounded text-slate-400 hover:text-white">58mm</button>
        </div>
        <button onclick="closeModalTicket()" class="text-slate-500 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- TICKET PREVIEW CANVAS (FONDO BLANCO, LETRAS NEGRAS TÉRMICO) -->
      <div class="max-h-[70vh] overflow-y-auto flex justify-center p-1 bg-slate-950/50 rounded-xl">
        <div id="printable-ticket" class="p-4 font-mono text-[11px] leading-tight space-y-2 shadow-lg border border-slate-200">
          <!-- CABECERA -->
          <div class="text-center pb-2 border-b border-dashed border-gray-400">
            <div class="font-extrabold text-xs tracking-tight" id="ticket-emisor-razon">EMPRESA S.A.C.</div>
            <div class="text-[10px] text-gray-700" id="ticket-emisor-ruc">RUC: 20000000001</div>
            <div class="text-[9px] text-gray-600" id="ticket-emisor-dir">LIMA - PERÚ</div>
            <div class="font-bold text-xs mt-1.5 uppercase" id="ticket-tipo-num">BOLETA DE VENTA B001-1</div>
          </div>

          <!-- CLIENTE Y FECHA -->
          <div class="text-[10px] space-y-0.5 border-b border-dashed border-gray-400 pb-2">
            <div><b>Fecha y Hora:</b> <span id="ticket-fecha">2026-11-07 10:00:00</span></div>
            <div><b>Cliente:</b> <span id="ticket-cliente-nombre">CLIENTES VARIOS</span></div>
            <div><b>Doc. Identidad:</b> <span id="ticket-cliente-doc">00000000</span></div>
            <div><b>Moneda:</b> <span id="ticket-moneda">SOLES (PEN)</span></div>
          </div>

          <!-- TABLA DE ITEMS -->
          <div class="text-[10px] border-b border-dashed border-gray-400 pb-2">
            <div class="flex justify-between font-bold border-b border-gray-300 pb-1 mb-1">
              <span>Cant. / Descripción</span>
              <span>Total</span>
            </div>
            <div id="ticket-items-list" class="space-y-1">
              <!-- Generado dinámicamente -->
            </div>
          </div>

          <!-- DESGLOSE TRIBUTARIO -->
          <div class="text-[10px] space-y-1 border-b border-dashed border-gray-400 pb-2">
            <div class="flex justify-between">
              <span>Op. Gravada:</span>
              <span id="ticket-gravada">S/ 0.00</span>
            </div>
            <div class="flex justify-between" id="ticket-row-exonerada">
              <span>Op. Exonerada:</span>
              <span id="ticket-exonerada">S/ 0.00</span>
            </div>
            <div class="flex justify-between">
              <span>IGV (18%):</span>
              <span id="ticket-igv">S/ 0.00</span>
            </div>
            <div class="flex justify-between font-bold text-xs pt-1 border-t border-gray-300">
              <span>IMPORTE TOTAL:</span>
              <span id="ticket-total">S/ 0.00</span>
            </div>
          </div>

          <!-- PIE FISCAL SUNAT -->
          <div class="text-center pt-1 space-y-1">
            <img id="ticket-qr" src="" alt="Código QR SUNAT" class="w-28 h-28 mx-auto border border-gray-200 p-0.5">
            <div class="text-[8px] text-gray-600 font-mono" id="ticket-hash">Hash: ...</div>
            <div class="text-[9px] font-bold text-gray-800">Representación Impresa del CPE</div>
            <div class="text-[8px] text-gray-600">Consulte su validez en www.sunat.gob.pe</div>
          </div>
        </div>
      </div>

      <div class="flex gap-2 pt-1">
        <button onclick="window.print()" class="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-teal-500/20">
          <i data-lucide="printer" class="w-4 h-4"></i>
          <span>Imprimir</span>
        </button>
        <button onclick="downloadCurrentTicketPdf('ticket')" class="px-3 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-700" title="Descargar PDF Ticket">
          <i data-lucide="receipt" class="w-4 h-4"></i>
          <span>PDF Ticket</span>
        </button>
        <button onclick="downloadCurrentTicketPdf('a4')" class="px-3 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-700" title="Descargar PDF A4">
          <i data-lucide="file-text" class="w-4 h-4"></i>
          <span>PDF A4</span>
        </button>
      </div>
    </div>
  </div>

  <!-- JAVASCRIPT LOGIC -->
  <script>
    let currentEmpresas = [];
    let currentComprobantes = [];
    let filteredComprobantesList = [];
    let lastXmlContent = "";
    let lastGeneratedComprobanteId = "";

    // TOAST NOTIFICATIONS MANAGER
    function showToast(message, type = "info", duration = 3500) {
      const container = document.getElementById("toast-container");
      if (!container) return;

      const toast = document.createElement("div");
      const colors = {
        success: "bg-slate-900/95 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10",
        error: "bg-slate-900/95 border-rose-500/40 text-rose-300 shadow-rose-500/10",
        warning: "bg-slate-900/95 border-amber-500/40 text-amber-300 shadow-amber-500/10",
        info: "bg-slate-900/95 border-teal-500/40 text-teal-300 shadow-teal-500/10"
      };
      const icons = {
        success: "check-circle-2",
        error: "alert-circle",
        warning: "alert-triangle",
        info: "info"
      };

      toast.className = \`toast-item pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-xl shadow-xl \${colors[type] || colors.info}\`;
      toast.innerHTML = \`
        <i data-lucide="\${icons[type] || 'info'}" class="w-4 h-4 shrink-0 mt-0.5"></i>
        <div class="flex-1 text-xs leading-relaxed font-medium text-slate-200">\${message}</div>
        <button type="button" onclick="this.closest('.toast-item').remove()" class="text-slate-400 hover:text-white p-0.5 transition">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      \`;
      container.appendChild(toast);
      lucide.createIcons();

      requestAnimationFrame(() => {
        toast.classList.add("show");
      });

      setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hide");
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

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
          showToast("Sesión iniciada correctamente", "success");
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
      showToast("Sesión cerrada", "info");
    }

    async function loadDashboardData() {
      await Promise.all([loadHealth(), loadEmpresas(), loadComprobantes()]);
    }

    async function loadHealth() {
      try {
        const res = await fetch("/api/v1/health");
        const data = await res.json();
        if (data.success) {
          // SUNAT Badge
          document.getElementById("sunat-status-badge").classList.remove("hidden");
          const latEl = document.getElementById("sunat-latency");
          const sunatDot = document.getElementById("sunat-dot");
          latEl.textContent = data.sunat.latencyMs + " ms";
          if (data.sunat.status === "operativo") {
            sunatDot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
            latEl.className = "font-mono text-emerald-400 font-semibold";
          } else {
            sunatDot.className = "w-2 h-2 rounded-full bg-amber-400";
            latEl.className = "font-mono text-amber-400 font-semibold";
          }
          document.getElementById("stat-sunat-mode").textContent = data.sunat.mode.toUpperCase();
          document.getElementById("stat-sunat-subtext").textContent = data.sunat.mode === "production" ? "Ambiente Oficial SUNAT" : "Ambiente de Pruebas";

          // Database Badge
          if (data.database) {
            updateDbBadge(data.database.connected, data.database.engine);
          }
        }
      } catch (e) {
        console.error("Health check error", e);
      }
    }

    function updateDbBadge(connected, engine) {
      const dbDot = document.getElementById("db-dot");
      const dbText = document.getElementById("db-status-text");
      const dbLabel = document.getElementById("stat-db-mode-label");
      const isPostgres = engine && engine.includes("PostgreSQL");

      if (isPostgres) {
        dbDot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
        dbText.className = "font-medium text-emerald-400";
        dbText.textContent = "Conectada (Supabase)";
        if (dbLabel) dbLabel.textContent = "Supabase PostgreSQL";
      } else {
        dbDot.className = "w-2 h-2 rounded-full bg-teal-400 animate-pulse";
        dbText.className = "font-medium text-teal-400";
        dbText.textContent = "SQLite Local (Activa)";
        if (dbLabel) dbLabel.textContent = "Almacenamiento Local SQLite";
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
          if (typeof data.dbConnected === "boolean") {
            updateDbBadge(data.dbConnected, data.engine);
          }
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
          filterComprobantesLocally();
          updateKpis();
        }
      } catch (e) {
        console.error("Error loading comprobantes", e);
      }
    }

    function filterComprobantesLocally() {
      const search = (document.getElementById("hist-filter-search")?.value || "").trim().toLowerCase();
      const periodo = document.getElementById("hist-filter-periodo")?.value || "all";
      const now = new Date();

      filteredComprobantesList = currentComprobantes.filter(c => {
        // Filtro por texto (serie, correlativo, cliente, ruc)
        if (search) {
          const matchSerie = (c.serie + "-" + c.numero).toLowerCase().includes(search);
          const matchCliente = (c.cliente_nombre || "").toLowerCase().includes(search);
          const matchDoc = (c.cliente_num_doc || "").toLowerCase().includes(search);
          const matchRuc = (c.empresa_ruc || "").toLowerCase().includes(search);
          if (!matchSerie && !matchCliente && !matchDoc && !matchRuc) return false;
        }

        // Filtro por fecha / período
        if (periodo !== "all" && c.fecha_emision) {
          const compDate = new Date(c.fecha_emision + "T00:00:00");
          if (periodo === "today") {
            const todayStr = now.toISOString().slice(0, 10);
            if (c.fecha_emision !== todayStr) return false;
          } else if (periodo === "7days") {
            const diffDays = (now - compDate) / (1000 * 60 * 60 * 24);
            if (diffDays > 7 || diffDays < 0) return false;
          } else if (periodo === "month") {
            if (compDate.getMonth() !== now.getMonth() || compDate.getFullYear() !== now.getFullYear()) {
              return false;
            }
          }
        }
        return true;
      });

      renderComprobantesTable(filteredComprobantesList);
    }

    function exportComprobantesCSV() {
      const list = filteredComprobantesList.length > 0 ? filteredComprobantesList : currentComprobantes;
      if (!list || list.length === 0) {
        showToast("No hay comprobantes para exportar con los filtros actuales", "warning");
        return;
      }

      const headers = [
        "Tipo",
        "Serie",
        "Numero",
        "RUC Emisor",
        "Doc Cliente",
        "Nombre Cliente",
        "Fecha Emision",
        "Hora Emision",
        "Op Gravada",
        "IGV (18%)",
        "Total",
        "Estado SUNAT",
        "Codigo SUNAT",
        "Hash Firma"
      ];

      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return \`"\${str}"\`;
      };

      const rows = list.map(c => [
        escapeCSV(c.tipo_comprobante === "01" ? "Factura (01)" : (c.tipo_comprobante === "03" ? "Boleta (03)" : c.tipo_comprobante)),
        escapeCSV(c.serie),
        escapeCSV(c.numero),
        escapeCSV(c.empresa_ruc),
        escapeCSV(c.cliente_num_doc || ""),
        escapeCSV(c.cliente_nombre || "CLIENTES VARIOS"),
        escapeCSV(c.fecha_emision),
        escapeCSV(c.hora_emision || ""),
        escapeCSV(parseFloat(c.total_gravadas || 0).toFixed(2)),
        escapeCSV(parseFloat(c.total_igv || 0).toFixed(2)),
        escapeCSV(parseFloat(c.total || 0).toFixed(2)),
        escapeCSV(c.estado_sunat || "ACEPTADO"),
        escapeCSV(c.sunat_code || "0"),
        escapeCSV(c.hash_sunat || "")
      ].join(","));

      // \uFEFF fuerza a Excel a abrir el archivo en codificación UTF-8 pura
      const csvContent = "\\uFEFF" + [headers.join(","), ...rows].join("\\r\\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = \`comprobantes-sunat-\${dateStr}.csv\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(\`Se exportaron \${list.length} comprobantes a Excel / CSV\`, "success");
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
      const countEl = document.getElementById("hist-filtered-count");
      const montoEl = document.getElementById("hist-filtered-monto");

      countEl.textContent = list.length;
      const totalFiltered = list.reduce((acc, c) => acc + parseFloat(c.total || 0), 0);
      montoEl.textContent = "S/ " + totalFiltered.toLocaleString("es-PE", { minimumFractionDigits: 2 });

      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-500">No se encontraron comprobantes con los filtros seleccionados.</td></tr>';
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
              <div class="text-slate-200 text-xs font-semibold truncate max-w-[180px]">\${c.cliente_nombre || 'CLIENTES VARIOS'}</div>
              <div class="text-[11px] font-mono text-slate-400">\${c.cliente_num_doc || '00000000'}</div>
            </td>
            <td class="py-4 px-6 text-xs text-slate-400 font-mono">\${c.fecha_emision}</td>
            <td class="py-4 px-6 font-mono font-bold text-slate-100">S/ \${parseFloat(c.total).toFixed(2)}</td>
            <td class="py-4 px-6">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold \${c.estado_sunat === 'ACEPTADO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                \${c.estado_sunat || 'ACEPTADO'}
              </span>
            </td>
            <td class="py-4 px-6 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="openTicketModal('\${c.id}')" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded-lg transition" title="Ver Ticket Térmico">
                  <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="downloadPdf('\${c.id}', 'a4')" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg transition" title="Descargar PDF A4">
                  <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="downloadPdf('\${c.id}', 'ticket')" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition" title="Descargar PDF Ticket (80mm)">
                  <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
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
      const histSelect = document.getElementById("hist-filter-empresa");

      const options = list.filter(e => e.activo).map(e => \`
        <option value="\${e.api_key}">\${e.razon_social} (\${e.ruc})</option>
      \`).join("");

      select.innerHTML = '<option value="">Seleccione empresa emisora...</option>' + options;
      histSelect.innerHTML = '<option value="">Todas las empresas...</option>' + list.map(e => \`
        <option value="\${e.ruc}">\${e.razon_social} (\${e.ruc})</option>
      \`).join("");

      if (list.length > 0) {
        select.selectedIndex = 1;
        autoCorrelativo();
      }
    }

    function filterEmpresas() {
      const q = document.getElementById("search-empresa-input").value.trim().toLowerCase();
      const filtered = currentEmpresas.filter(e => 
        e.ruc.toLowerCase().includes(q) || e.razon_social.toLowerCase().includes(q)
      );
      renderEmpresasTable(filtered);
    }

    function openModalEmpresa() {
      document.getElementById("modal-empresa-title").innerHTML = '<i data-lucide="building-2" class="w-5 h-5 text-teal-400"></i><span>Registrar Nuevo Negocio</span>';
      document.getElementById("form-empresa").reset();
      document.getElementById("modal-empresa-id").value = "";
      document.getElementById("modal-ruc").readOnly = false;
      document.getElementById("modal-ruc-btn").classList.remove("hidden");
      document.getElementById("modal-api-key-container").classList.remove("hidden");
      generateRandomApiKey();
      document.getElementById("modal-empresa").classList.remove("hidden");
      lucide.createIcons();
    }

    function openEditModalEmpresa(id) {
      const emp = currentEmpresas.find(e => e.id === id);
      if (!emp) return;

      document.getElementById("modal-empresa-title").innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-teal-400"></i><span>Editar Datos del Negocio</span>';
      document.getElementById("modal-empresa-id").value = emp.id;
      document.getElementById("modal-ruc").value = emp.ruc;
      document.getElementById("modal-ruc").readOnly = true;
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
          showToast(id ? "Negocio actualizado con éxito" : "Nuevo negocio registrado correctamente", "success");
        } else {
          showToast(data.error || "Error al procesar negocio", "error");
        }
      } catch (err) {
        showToast("Error de conexión con el servidor", "error");
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
          showToast("¡Nueva API Key generada con éxito!", "success");
          await loadEmpresas();
        } else {
          showToast(data.error || "Error al rotar clave", "error");
        }
      } catch (e) {
        showToast("Error de conexión con el servidor", "error");
      }
    }

    async function toggleEmpresaActive(id) {
      try {
        const res = await fetch(\`/api/v1/admin/empresas/\${id}/toggle\`, {
          method: "PATCH",
          headers: { "x-api-key": getAdminKey() }
        });
        if (res.ok) {
          await loadEmpresas();
          showToast("Estado de empresa actualizado", "info");
        }
      } catch (e) {
        showToast("Error al cambiar estado", "error");
      }
    }

    async function eliminarEmpresa(id, razon) {
      if (!confirm(\`¿Eliminar definitivamente el negocio "\${razon}"?\`)) return;
      try {
        const res = await fetch(\`/api/v1/admin/empresas/\${id}\`, {
          method: "DELETE",
          headers: { "x-api-key": getAdminKey() }
        });
        if (res.ok) {
          await loadEmpresas();
          showToast("Negocio eliminado correctamente", "info");
        }
      } catch (e) {
        showToast("Error al eliminar negocio", "error");
      }
    }

    function generateRandomApiKey() {
      const rand = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      document.getElementById("modal-api-key").value = "sk_live_" + rand;
    }

    async function lookupRucInModal() {
      const ruc = document.getElementById("modal-ruc").value.trim();
      if (ruc.length !== 11) {
        showToast("Ingrese un RUC válido de 11 dígitos", "warning");
        return;
      }
      const btn = document.getElementById("modal-ruc-btn");
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>...</span>';
      lucide.createIcons();

      try {
        const res = await fetch("/api/v1/consultas/ruc", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": getAdminKey() },
          body: JSON.stringify({ ruc })
        });
        const data = await res.json();
        if (data.success && data.razonSocial) {
          document.getElementById("modal-razon").value = data.razonSocial;
          showToast(\`RUC encontrado: \${data.razonSocial}\`, "success");
        } else {
          showToast(data.error || "No se pudo consultar el RUC en SUNAT", "error");
        }
      } catch (e) {
        showToast("Error al conectar con consulta de RUC", "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="search" class="w-3.5 h-3.5"></i><span>Buscar</span>';
        lucide.createIcons();
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
      const serieInput = document.getElementById("emit-serie");
      const tipoDocCliente = document.getElementById("emit-cliente-tipo");

      if (tipo === "01") {
        serieInput.value = "F001";
        tipoDocCliente.value = "6"; // RUC por defecto para Facturas
      } else {
        serieInput.value = "B001";
        tipoDocCliente.value = "1"; // DNI por defecto para Boletas
      }

      // Sugerir el siguiente correlativo basado en comprobantes ya emitidos
      const serie = serieInput.value;
      const compsDeSerie = currentComprobantes.filter(c => c.serie === serie);
      if (compsDeSerie.length > 0) {
        const maxNum = Math.max(...compsDeSerie.map(c => parseInt(c.numero) || 0));
        document.getElementById("emit-numero").value = maxNum + 1;
      } else {
        document.getElementById("emit-numero").value = 1;
      }
    }

    function handleClienteTipoChange() {
      const tipo = document.getElementById("emit-cliente-tipo").value;
      const docInput = document.getElementById("emit-cliente-doc");
      const nombreInput = document.getElementById("emit-cliente-nombre");

      if (tipo === "0") {
        docInput.value = "00000000";
        nombreInput.value = "CLIENTES VARIOS";
      } else if (tipo === "1") {
        if (docInput.value === "00000000") docInput.value = "";
        docInput.placeholder = "8 dígitos DNI";
      } else if (tipo === "6") {
        if (docInput.value === "00000000") docInput.value = "";
        docInput.placeholder = "11 dígitos RUC";
      }
    }

    function setClienteAnonimo() {
      document.getElementById("emit-cliente-tipo").value = "0";
      document.getElementById("emit-cliente-doc").value = "00000000";
      document.getElementById("emit-cliente-nombre").value = "CLIENTES VARIOS";
      showToast("Datos de cliente anónimo completados", "info");
    }

    function resetEmisorForm() {
      document.getElementById("emit-cliente-tipo").value = "1";
      document.getElementById("emit-cliente-doc").value = "72345678";
      document.getElementById("emit-cliente-nombre").value = "CARLOS ALARCON";
      const container = document.getElementById("items-container");
      container.innerHTML = \`
        <div class="grid grid-cols-12 gap-2 items-center bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80 item-row">
          <div class="col-span-5">
            <input type="text" class="item-desc w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" placeholder="Descripción" value="PRODUCTO / SERVICIO 01">
          </div>
          <div class="col-span-2">
            <input type="number" oninput="calcTotals()" class="item-cant w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" placeholder="Cant." value="1" min="1">
          </div>
          <div class="col-span-2">
            <div class="relative">
              <span class="absolute left-2 top-1.5 text-xs text-slate-500">S/</span>
              <input type="number" step="0.1" oninput="calcTotals()" class="item-precio w-full bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-xs text-slate-200" placeholder="P. Unit" value="10.00">
            </div>
          </div>
          <div class="col-span-2">
            <select onchange="calcTotals()" class="item-afectacion w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200">
              <option value="10">Gravado (18%)</option>
              <option value="20">Exonerado (0%)</option>
              <option value="30">Inafecto (0%)</option>
            </select>
          </div>
          <div class="col-span-1 text-right">
            <button type="button" onclick="removeItemRow(this)" class="text-slate-500 hover:text-rose-400 p-1 transition" title="Eliminar ítem">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      \`;
      document.getElementById("result-placeholder").classList.remove("hidden");
      document.getElementById("result-success").classList.add("hidden");
      autoCorrelativo();
      calcTotals();
      lucide.createIcons();
      showToast("Formulario limpio listo para emitir", "info");
    }

    function addItemRow() {
      const c = document.getElementById("items-container");
      const div = document.createElement("div");
      div.className = "grid grid-cols-12 gap-2 items-center bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80 item-row";
      div.innerHTML = \`
        <div class="col-span-5">
          <input type="text" class="item-desc w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" placeholder="Descripción" value="NUEVO ÍTEM">
        </div>
        <div class="col-span-2">
          <input type="number" oninput="calcTotals()" class="item-cant w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" placeholder="Cant." value="1" min="1">
        </div>
        <div class="col-span-2">
          <div class="relative">
            <span class="absolute left-2 top-1.5 text-xs text-slate-500">S/</span>
            <input type="number" step="0.1" oninput="calcTotals()" class="item-precio w-full bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-xs text-slate-200" placeholder="P. Unit" value="10.00">
          </div>
        </div>
        <div class="col-span-2">
          <select onchange="calcTotals()" class="item-afectacion w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200">
            <option value="10">Gravado (18%)</option>
            <option value="20">Exonerado (0%)</option>
            <option value="30">Inafecto (0%)</option>
          </select>
        </div>
        <div class="col-span-1 text-right">
          <button type="button" onclick="removeItemRow(this)" class="text-slate-500 hover:text-rose-400 p-1 transition" title="Eliminar ítem">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      \`;
      c.appendChild(div);
      lucide.createIcons();
      calcTotals();
    }

    function removeItemRow(btn) {
      const rows = document.querySelectorAll(".item-row");
      if (rows.length <= 1) {
        showToast("Debe existir al menos un producto o servicio", "warning");
        return;
      }
      btn.closest(".item-row").remove();
      calcTotals();
    }

    function calcTotals() {
      let totalGravada = 0;
      let totalExonerada = 0;
      let totalDoc = 0;

      document.querySelectorAll(".item-row").forEach(r => {
        const cant = parseFloat(r.querySelector(".item-cant").value) || 0;
        const precio = parseFloat(r.querySelector(".item-precio").value) || 0;
        const afectacion = r.querySelector(".item-afectacion")?.value || "10";
        const lineTotal = cant * precio;

        if (afectacion === "10") {
          const valorSinIgv = lineTotal / 1.18;
          totalGravada += valorSinIgv;
        } else {
          totalExonerada += lineTotal;
        }
        totalDoc += lineTotal;
      });

      const totalIgv = totalGravada * 0.18;

      document.getElementById("subtotal-gravada").textContent = "S/ " + totalGravada.toFixed(2);
      document.getElementById("subtotal-igv").textContent = "S/ " + totalIgv.toFixed(2);
      document.getElementById("total-doc").textContent = "S/ " + totalDoc.toFixed(2);

      const exonContainer = document.getElementById("subtotal-exonerada-container");
      const exonVal = document.getElementById("subtotal-exonerada");
      if (totalExonerada > 0) {
        exonContainer.classList.remove("hidden");
        exonVal.textContent = "S/ " + totalExonerada.toFixed(2);
      } else {
        exonContainer.classList.add("hidden");
      }
    }

    async function lookupClientFromEmit() {
      const tipo = document.getElementById("emit-cliente-tipo").value;
      const doc = document.getElementById("emit-cliente-doc").value.trim();
      if (!doc || doc === "00000000") {
        showToast("Ingrese un número de documento válido", "warning");
        return;
      }

      const btn = document.getElementById("btn-buscar-cliente");
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i>';
      lucide.createIcons();

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
          const nombre = data.razonSocial || data.nombreCompleto || "";
          document.getElementById("emit-cliente-nombre").value = nombre;
          showToast(\`Cliente encontrado: \${nombre}\`, "success");
        } else {
          showToast(data.error || "No se encontró el documento", "warning");
        }
      } catch (e) {
        showToast("Error de conexión al consultar cliente", "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="search" class="w-3.5 h-3.5"></i><span>Buscar</span>';
        lucide.createIcons();
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
        const afectacion = r.querySelector(".item-afectacion")?.value || "10";
        items.push({
          sku: "PROD-" + (idx + 1),
          descripcion: desc,
          cantidad: cant,
          precioUnitario: precio,
          tipoAfectacionIgv: afectacion
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
      btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Emitiendo UBL...</span>';
      lucide.createIcons();

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
          document.getElementById("res-hash").title = data.hashSunat;
          document.getElementById("res-estado").textContent = data.sunatResponse?.estado || "ACEPTADO";

          const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(data.qrString);
          document.getElementById("res-qr-img").src = qrUrl;

          lastXmlContent = data.xmlBase64 ? atob(data.xmlBase64) : "";
          lastGeneratedComprobanteId = data.comprobante;

          // Asignar acción al botón de ticket
          document.getElementById("btn-ver-ticket-emitido").onclick = () => {
            renderTicketDirect({
              serie,
              numero,
              tipo_comprobante: tipo,
              empresa_ruc: currentEmpresas.find(e => e.api_key === empresaKey)?.ruc || env_ruc_fallback,
              cliente_nombre: body.cliente.nombre,
              cliente_num_doc: body.cliente.numDoc,
              fecha_emision: new Date().toISOString().slice(0, 10),
              hora_emision: new Date().toTimeString().slice(0, 8),
              total_gravadas: items.filter(i => i.tipoAfectacionIgv === "10").reduce((a, b) => a + (b.cantidad * b.precioUnitario / 1.18), 0),
              total_igv: items.filter(i => i.tipoAfectacionIgv === "10").reduce((a, b) => a + (b.cantidad * b.precioUnitario - (b.cantidad * b.precioUnitario / 1.18)), 0),
              total: items.reduce((a, b) => a + (b.cantidad * b.precioUnitario), 0),
              hash_sunat: data.hashSunat,
              qr_string: data.qrString,
              items: items
            });
          };

          document.getElementById("emit-numero").value = numero + 1;
          await loadComprobantes();
          showToast(\`¡Comprobante \${data.comprobante} emitido con éxito!\`, "success");
        } else {
          showToast(data.error || "Error al emitir comprobante", "error");
        }
      } catch (err) {
        showToast("Error de conexión al emitir comprobante", "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i><span>Generar Comprobante</span>';
        lucide.createIcons();
      }
    }

    const env_ruc_fallback = "${env.SUNAT_RUC}";

    // TICKET MODAL PREVIEW & PRINT
    function setTicketWidth(size) {
      const ticket = document.getElementById("printable-ticket");
      const btn80 = document.getElementById("btn-size-80");
      const btn58 = document.getElementById("btn-size-58");

      if (size === "58") {
        ticket.classList.add("ticket-58mm");
        btn58.className = "px-2 py-0.5 rounded bg-teal-500 text-white font-bold";
        btn80.className = "px-2 py-0.5 rounded text-slate-400 hover:text-white";
      } else {
        ticket.classList.remove("ticket-58mm");
        btn80.className = "px-2 py-0.5 rounded bg-teal-500 text-white font-bold";
        btn58.className = "px-2 py-0.5 rounded text-slate-400 hover:text-white";
      }
    }

    let currentModalComprobanteId = "";

    function downloadPdf(id, format = 'a4') {
      const url = '/api/v1/admin/comprobantes/' + encodeURIComponent(id) + '/pdf?format=' + format + '&apiKey=' + encodeURIComponent(getAdminKey());
      window.open(url, '_blank');
    }

    function downloadCurrentTicketPdf(format = 'ticket') {
      if (!currentModalComprobanteId) return;
      downloadPdf(currentModalComprobanteId, format);
    }

    function downloadLastPdf(format = 'a4') {
      if (!lastGeneratedComprobanteId) return;
      downloadPdf(lastGeneratedComprobanteId, format);
    }

    function renderTicketDirect(c) {
      currentModalComprobanteId = c.id || (c.serie + '-' + c.numero);
      const emp = currentEmpresas.find(e => e.ruc === c.empresa_ruc);
      document.getElementById("ticket-emisor-razon").textContent = emp?.razon_social || "EMPRESA FISCAL S.A.C.";
      document.getElementById("ticket-emisor-ruc").textContent = "RUC: " + (c.empresa_ruc || env_ruc_fallback);
      
      const tipoNombre = c.tipo_comprobante === "01" ? "FACTURA ELECTRÓNICA" : "BOLETA DE VENTA ELECTRÓNICA";
      document.getElementById("ticket-tipo-num").textContent = tipoNombre + " " + c.serie + "-" + c.numero;
      document.getElementById("ticket-fecha").textContent = (c.fecha_emision || "") + " " + (c.hora_emision || "");
      document.getElementById("ticket-cliente-nombre").textContent = c.cliente_nombre || "CLIENTES VARIOS";
      document.getElementById("ticket-cliente-doc").textContent = c.cliente_num_doc || "00000000";

      // Renderizar líneas de items
      const itemsContainer = document.getElementById("ticket-items-list");
      if (c.items && c.items.length > 0) {
        itemsContainer.innerHTML = c.items.map(item => \`
          <div class="flex justify-between items-start">
            <span class="truncate max-w-[160px]">\${item.cantidad}x \${item.descripcion}</span>
            <span class="font-mono font-bold">S/ \${(item.cantidad * item.precioUnitario).toFixed(2)}</span>
          </div>
        \`).join("");
      } else {
        itemsContainer.innerHTML = \`
          <div class="flex justify-between items-start">
            <span>1x VENTA GENERAL DE MERCADERÍA</span>
            <span class="font-mono font-bold">S/ \${parseFloat(c.total).toFixed(2)}</span>
          </div>
        \`;
      }

      document.getElementById("ticket-gravada").textContent = "S/ " + parseFloat(c.total_gravadas || 0).toFixed(2);
      const exonerada = parseFloat(c.total_exoneradas || 0);
      const rowExon = document.getElementById("ticket-row-exonerada");
      if (exonerada > 0) {
        rowExon.classList.remove("hidden");
        document.getElementById("ticket-exonerada").textContent = "S/ " + exonerada.toFixed(2);
      } else {
        rowExon.classList.add("hidden");
      }
      document.getElementById("ticket-igv").textContent = "S/ " + parseFloat(c.total_igv || 0).toFixed(2);
      document.getElementById("ticket-total").textContent = "S/ " + parseFloat(c.total).toFixed(2);
      document.getElementById("ticket-hash").textContent = "Hash: " + (c.hash_sunat || "---");

      if (c.qr_string) {
        document.getElementById("ticket-qr").src = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" + encodeURIComponent(c.qr_string);
      }

      document.getElementById("modal-ticket").classList.remove("hidden");
      lucide.createIcons();
    }

    async function openTicketModal(id) {
      try {
        const res = await fetch(\`/api/v1/admin/comprobantes/\${id}\`, {
          headers: { "x-api-key": getAdminKey() }
        });
        const data = await res.json();
        if (data.success && data.comprobante) {
          const c = data.comprobante;
          let parsedItems = [];

          // Extraer items del XML si está disponible
          if (c.xml_base64) {
            try {
              const xmlText = atob(c.xml_base64);
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlText, "text/xml");
              const lines = xmlDoc.getElementsByTagNameNS("*", "InvoiceLine");
              for (let i = 0; i < lines.length; i++) {
                const qty = lines[i].getElementsByTagNameNS("*", "InvoicedQuantity")[0]?.textContent || "1";
                const desc = lines[i].getElementsByTagNameNS("*", "Description")[0]?.textContent || "Ítem";
                const price = lines[i].getElementsByTagNameNS("*", "PriceAmount")[0]?.textContent || "0";
                parsedItems.push({
                  cantidad: parseFloat(qty),
                  descripcion: desc,
                  precioUnitario: parseFloat(price)
                });
              }
            } catch (errXml) {
              console.warn("Could not parse XML items", errXml);
            }
          }

          c.items = parsedItems;
          renderTicketDirect(c);
        } else {
          showToast(data.error || "No se encontró el comprobante", "error");
        }
      } catch (e) {
        showToast("Error al cargar datos del ticket", "error");
      }
    }

    function closeModalTicket() {
      document.getElementById("modal-ticket").classList.add("hidden");
    }

    async function downloadComprobanteXml(id) {
      try {
        showToast("Preparando descarga de XML...", "info", 1500);
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
          showToast("XML descargado correctamente", "success");
        } else {
          showToast("El XML de este comprobante no está disponible", "warning");
        }
      } catch (e) {
        showToast("Error al descargar el XML", "error");
      }
    }

    function copyXmlBase64() {
      if (!lastXmlContent) return;
      navigator.clipboard.writeText(lastXmlContent);
      showToast("¡XML UBL 2.1 copiado al portapapeles!", "success");
    }

    function downloadXmlFile() {
      if (!lastXmlContent) return;
      const compId = document.getElementById("res-comprobante-id").textContent;
      const blob = new Blob([lastXmlContent], { type: "application/xml" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = \`comprobante-\${compId}.xml\`;
      a.click();
      showToast("XML descargado", "success");
    }

    // CONSULTAS TAB
    async function ejecutarConsulta() {
      const val = document.getElementById("consulta-input").value.trim();
      const div = document.getElementById("consulta-result");
      if (!val) {
        showToast("Ingrese un número de documento para consultar", "warning");
        return;
      }

      div.classList.remove("hidden");
      div.innerHTML = "<p class='text-slate-400 flex items-center gap-2'><i data-lucide='loader-2' class='w-4 h-4 animate-spin text-teal-400'></i><span>Buscando en padrón de SUNAT / RENIEC...</span></p>";
      lucide.createIcons();

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
            <div class="space-y-2 text-slate-200">
              <div class="font-bold text-sm text-teal-400">\${data.razonSocial || data.nombreCompleto || 'Encontrado'}</div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div><b>Documento:</b> <span class="font-mono">\${data.ruc || data.dni}</span></div>
                \${data.estado ? \`<div><b>Estado SUNAT:</b> <span class="text-emerald-400 font-semibold">\${data.estado}</span></div>\` : ''}
                \${data.condicion ? \`<div><b>Condición:</b> <span class="text-teal-300">\${data.condicion}</span></div>\` : ''}
                \${data.ubigeo ? \`<div><b>Ubigeo:</b> <span class="font-mono">\${data.ubigeo}</span></div>\` : ''}
              </div>
              \${data.direccion ? \`<div class="text-xs pt-1 border-t border-slate-800 text-slate-300"><b>Dirección Fiscal:</b> \${data.direccion}</div>\` : ''}
            </div>
          \`;
          showToast("Consulta completada", "success");
        } else {
          div.innerHTML = \`<p class="text-rose-400 font-semibold">\${data.error || 'No encontrado en el padrón'}</p>\`;
          showToast(data.error || "No se encontraron resultados", "warning");
        }
      } catch (e) {
        div.innerHTML = '<p class="text-rose-400">Error al realizar la consulta.</p>';
        showToast("Error al conectar con el servicio de consulta", "error");
      } finally {
        lucide.createIcons();
      }
    }

    function copyToClipboard(text) {
      navigator.clipboard.writeText(text);
      showToast("¡API Key copiada al portapapeles!", "success");
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
