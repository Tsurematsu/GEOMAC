import { LitElement, html, unsafeCSS, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import styles from './main-app.css?inline';
import '../pages/page-viewmac/page-viewmac';
import '../pages/pager-registmac/pager-registmac';

@customElement('main-app')
export class MainApp extends LitElement {
  @state()
  private currentPage: 'home' | 'register' | 'view' = 'home';

  render(): TemplateResult {
    return html`
      <div class="app-container">
        <header class="app-header glass-panel">
          <h1>GEOMAC</h1>
          <p>MAC Tracking System</p>
        </header>

        <main class="app-content">
          ${this.renderPage()}
        </main>

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
      </div>
    `;
  }

  private renderPage() {
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
