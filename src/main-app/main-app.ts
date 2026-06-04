import { LitElement, html, unsafeCSS, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import styles from './main-app.css?inline';
import '../pages/page-viewmac/page-viewmac';
import '../pages/pager-registmac/pager-registmac';
import RegistMacScript from '../pages/pager-registmac/RegistMacScript';
import { validateAccess } from '../modulos/authGuard';
import globalVar from '../modulos/globalVar';
import mqttClient from '../modulos/mqttClient';
import '../components/qr-scanner/qr-scanner';

@customElement('main-app')
export class MainApp extends LitElement {
  @state()
  private currentPage: 'home' | 'register' | 'view' = 'home';

  @state()
  private isAppLoading: boolean = true;

  async connectedCallback() {
    super.connectedCallback();
    
    // Validar el acceso por URL de forma asíncrona (obtiene la llave de la DB primero)
    await validateAccess();

    if (!globalVar.isAuthorized) {
        this.isAppLoading = false;
        return; // Detenemos la carga de la base de datos si no está autorizado
    }

    // Inicializar la conexión en tiempo real con el backend de escritorio
    mqttClient.init();

    try {
      console.log('🔄 Cargando datos desde NeonDB (/api/geomac)...');
      await RegistMacScript.fetchInitialData();
      console.log('✅ Base de datos cargada correctamente.');
    } catch (error) {
      console.error('❌ Error al cargar datos de NeonDB:', error);
    } finally {
      this.isAppLoading = false;
    }
  }

  render(): TemplateResult {
    if (this.isAppLoading) {
        return html`
            <div class="app-container" style="display:flex; justify-content:center; align-items:center; height:100vh;">
                <div class="spinner"></div>
            </div>
        `;
    }

    return html`
      <div class="app-container">
        <header class="app-header glass-panel">
          <h1>GEOMAC</h1>
          <p>MAC Tracking System</p>
        </header>

        <main class="app-content">
          ${!globalVar.isAuthorized ? this.renderUnauthorized() : this.renderPage()}
        </main>

        ${globalVar.isAuthorized ? html`
            <nav class="bottom-nav glass-panel">
            <button 
                class="nav-btn ${this.currentPage === 'home' ? 'active' : ''}" 
                @click=${() => this.setPage('home')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span>Home</span>
            </button>
            <button 
                class="nav-btn ${this.currentPage === 'register' ? 'active' : ''}" 
                @click=${() => this.setPage('register')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>Registrar</span>
            </button>
            <button 
                class="nav-btn ${this.currentPage === 'view' ? 'active' : ''}" 
                @click=${() => this.setPage('view')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3"/></svg>
                <span>Ver MACs</span>
            </button>
            </nav>
        ` : ''}
      </div>
    `;
  }

  private handleQrScanned(e: CustomEvent) {
    let token = e.detail.token;
    if (!token) return;

    try {
        // Si el QR contiene la URL completa (ej. https://.../?share-key=ABC)
        // extraemos solo la llave para mantenernos en el dominio actual (útil para localhost)
        const urlObj = new URL(token);
        const extractedKey = urlObj.searchParams.get('share-key');
        if (extractedKey) {
            token = extractedKey;
        }
    } catch (err) {
        // Si falla el parseo de URL, asumimos que el QR era solo el token de texto plano
    }

    // Redirigir inyectando la llave en la URL actual
    window.location.href = '/?share-key=' + encodeURIComponent(token);
  }

  private renderUnauthorized(): TemplateResult {
    return html`
      <div class="welcome-card glass-panel" style="text-align: center; margin-top: 2rem;">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem;"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <h2 style="color: var(--danger);">Acceso Restringido</h2>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">Debes ingresar a esta aplicación web a través del cliente oficial de escritorio para establecer una conexión segura.</p>
        
        <qr-scanner @qr-scanned=${this.handleQrScanned}></qr-scanner>

        <a href="https://github.com/Tsurematsu/AUTOMAC" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: transparent; border: 1px solid var(--accent); color: var(--accent); text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s ease; margin-top: 16px; width: 100%; justify-content: center; box-sizing: border-box;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
            Visitar el Repositorio
        </a>
      </div>
    `;
  }

  private renderPage(): TemplateResult {
    switch (this.currentPage) {
      case 'register':
        return html`<pager-registmac></pager-registmac>`;
      case 'view':
        return html`<page-viewmac></page-viewmac>`;
      case 'home':
      default:
        return html`
          <div class="home-page fade-in">
            <div class="hero-card glass-panel">
              <h2>Bienvenido a GEOMAC</h2>
              <p>El sistema definitivo para rastrear y asociar direcciones MAC a puntos geográficos.</p>
              
              <div class="actions">
                <button class="btn btn-primary" @click=${() => this.setPage('register')}>
                  Comenzar a Registrar
                </button>
              </div>
            </div>
          </div>
        `;
    }
  }

  private setPage(page: 'home' | 'register' | 'view') {
    this.currentPage = page;
  }

  static styles = unsafeCSS(styles);
}

declare global {
  interface HTMLElementTagNameMap {
    'main-app': MainApp;
  }
}
