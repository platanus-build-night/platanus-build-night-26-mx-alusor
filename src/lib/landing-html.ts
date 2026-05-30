// AUTO-GENERATED from the reviewed landing mockup, then hand-owned here.
// Self-contained marketing page served at "/" by src/app/route.ts. It carries
// its own <head>/styles, so it is intentionally NOT wrapped by the app layout.
// CTAs link to /builder; a "Panel" nav link points to the dashboard (/panel).
// Hero art lives at public/assets/hero-operations.png. Edit this file directly.
export const LANDING_HTML = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DocToApp | Digitaliza tus operaciones</title>
    <meta
      name="description"
      content="Convierte formatos, checklists y documentos operativos en web apps listas para compartir. Sin prompt inicial y sin constructor visual."
    />
    <link
      rel="icon"
      href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%232f6846'/%3E%3Cpath d='M8 25c11-1 16-6 17-17-11 1-16 6-17 17Z' fill='none' stroke='white' stroke-width='2'/%3E%3Cpath d='M12 21 21 12' stroke='white' stroke-width='2'/%3E%3C/svg%3E"
    />
    <style>
      :root {
        --ink: #171717;
        --muted: #666760;
        --soft: #f7f3ea;
        --paper: #fffdf8;
        --line: #ded8ca;
        --green: #2f6846;
        --green-2: #e3efdf;
        --blue: #215ea8;
        --blue-2: #e8f1fb;
        --amber: #c9821e;
        --amber-2: #fff0d7;
        --shadow: 0 22px 70px rgba(42, 36, 25, 0.16);
        --radius: 8px;
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        background: var(--soft);
        color: var(--ink);
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
        letter-spacing: 0;
        overflow-x: hidden;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      button,
      input {
        font: inherit;
      }

      .site-shell {
        min-height: 100vh;
        overflow: hidden;
      }

      .nav {
        position: fixed;
        inset: 0 0 auto;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 72px;
        padding: 0 clamp(20px, 4vw, 64px);
        border-bottom: 1px solid rgba(31, 28, 22, 0.1);
        background: rgba(255, 253, 248, 0.84);
        backdrop-filter: blur(20px);
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        font-weight: 700;
        font-size: 20px;
      }

      .brand-mark {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: var(--green);
        color: white;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.26);
      }

      .brand-mark svg {
        width: 18px;
        height: 18px;
      }

      .nav-links {
        display: flex;
        align-items: center;
        gap: 32px;
        color: #272721;
        font-size: 15px;
      }

      .nav-cta,
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 46px;
        border: 1px solid transparent;
        border-radius: var(--radius);
        padding: 0 18px;
        cursor: pointer;
        font-weight: 650;
        text-align: center;
        transition:
          transform 160ms ease,
          border-color 160ms ease,
          background 160ms ease,
          box-shadow 160ms ease;
      }

      .nav-cta,
      .button.primary {
        background: var(--green);
        color: #fff;
        box-shadow: 0 12px 28px rgba(47, 104, 70, 0.24);
      }

      .button.secondary {
        background: rgba(255, 253, 248, 0.9);
        border-color: rgba(47, 104, 70, 0.4);
        color: #1f382a;
      }

      .button:hover,
      .nav-cta:hover {
        transform: translateY(-1px);
      }

      .hero {
        position: relative;
        min-height: 100vh;
        padding: 132px clamp(20px, 4vw, 64px) 0;
        background:
          linear-gradient(
            90deg,
            rgba(247, 243, 234, 0.98) 0%,
            rgba(247, 243, 234, 0.92) 29%,
            rgba(247, 243, 234, 0.24) 58%,
            rgba(247, 243, 234, 0) 100%
          ),
          linear-gradient(
            180deg,
            rgba(247, 243, 234, 0) 72%,
            rgba(247, 243, 234, 1) 98%
          ),
          url("/assets/hero-operations.png") right 72px top 86px / min(1060px, 72vw)
            auto no-repeat;
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: 18%;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(247, 243, 234, 0), var(--soft));
      }

      .hero-copy {
        position: relative;
        z-index: 1;
        width: min(620px, 100%);
        min-width: 0;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 22px;
        color: #204d34;
        font-size: 14px;
        font-weight: 700;
      }

      .eyebrow::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--green);
      }

      h1,
      h2,
      h3 {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-weight: 500;
        line-height: 0.98;
        letter-spacing: 0;
      }

      h1 {
        max-width: 620px;
        font-size: clamp(54px, 7vw, 96px);
      }

      .hero-lede {
        max-width: 575px;
        margin: 26px 0 0;
        color: #272721;
        font-size: clamp(18px, 2.1vw, 25px);
        line-height: 1.38;
        overflow-wrap: break-word;
      }

      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 34px;
      }

      .trust-line {
        display: grid;
        gap: 10px;
        margin-top: 26px;
        color: #34342e;
        font-size: 16px;
      }

      .trust-item {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }

      .trust-item svg,
      .button svg,
      .nav-cta svg {
        flex: 0 0 auto;
        width: 19px;
        height: 19px;
      }

      .hero-panel {
        position: relative;
        z-index: 2;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 18px;
        width: min(920px, calc(100vw - 40px));
        margin: clamp(32px, 5vh, 52px) auto 0;
        padding: 18px;
        border: 1px solid rgba(222, 216, 202, 0.84);
        border-radius: 14px;
        background: rgba(255, 253, 248, 0.9);
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
      }

      .upload-card,
      .schema-card,
      .phone-card,
      .metric-card,
      .example-card {
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: rgba(255, 253, 248, 0.94);
      }

      .upload-card {
        display: grid;
        min-height: 245px;
        place-items: center;
        border-style: dashed;
        border-color: rgba(47, 104, 70, 0.56);
        padding: 26px;
        text-align: center;
      }

      .file-icon {
        display: grid;
        place-items: center;
        width: 58px;
        height: 68px;
        margin: 0 auto 18px;
        border: 1px solid #cfd8e3;
        border-radius: 8px;
        background: linear-gradient(180deg, #fff, #f5f8fc);
        color: var(--blue);
        font-weight: 800;
      }

      .upload-card strong {
        display: block;
        margin-bottom: 8px;
        font-size: 21px;
      }

      .upload-card p {
        margin: 0 0 20px;
        color: var(--muted);
        line-height: 1.5;
      }

      .upload-control {
        position: relative;
      }

      .upload-control input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }

      .file-status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
        margin-top: 16px;
        padding: 0 12px;
        border-radius: 999px;
        background: var(--blue-2);
        color: #174a86;
        font-size: 13px;
        font-weight: 650;
      }

      .panel-right {
        display: grid;
        gap: 12px;
      }

      .schema-card {
        padding: 16px;
      }

      .card-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        font-weight: 750;
      }

      .schema-row {
        display: grid;
        grid-template-columns: 22px minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        min-height: 34px;
        border-top: 1px solid #eee8dd;
        color: #2f302b;
        font-size: 14px;
      }

      .schema-row:first-of-type {
        border-top: 0;
      }

      .field-type {
        color: var(--muted);
        font-size: 12px;
      }

      .phone-card {
        padding: 16px;
      }

      .mini-phone {
        width: 100%;
        border: 8px solid #1c1c1c;
        border-radius: 30px;
        background: #fffdf8;
        padding: 18px 16px 16px;
        box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
      }

      .mini-phone h3 {
        margin-bottom: 14px;
        color: #143721;
        font-size: 24px;
      }

      .mini-field {
        height: 34px;
        margin-top: 8px;
        border: 1px solid #e1dbcf;
        border-radius: 7px;
        background: white;
      }

      .mini-label {
        display: block;
        margin-top: 12px;
        color: #292924;
        font-size: 12px;
        font-weight: 750;
      }

      .mini-button {
        display: grid;
        place-items: center;
        height: 40px;
        margin-top: 14px;
        border-radius: 7px;
        background: var(--green);
        color: #fff;
        font-size: 13px;
        font-weight: 750;
      }

      section {
        position: relative;
        padding: 92px clamp(20px, 4vw, 64px);
      }

      .section-inner {
        width: min(1180px, 100%);
        margin: 0 auto;
      }

      .section-kicker {
        margin-bottom: 12px;
        color: var(--green);
        font-size: 14px;
        font-weight: 800;
      }

      .section-title {
        max-width: 820px;
        font-size: clamp(38px, 5vw, 68px);
      }

      .section-copy {
        max-width: 680px;
        margin: 20px 0 0;
        color: var(--muted);
        font-size: 19px;
        line-height: 1.55;
      }

      .steps {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 18px;
        margin-top: 42px;
      }

      .step {
        min-height: 220px;
        padding: 24px;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: var(--paper);
      }

      .step-icon,
      .example-icon {
        display: grid;
        place-items: center;
        width: 52px;
        height: 52px;
        margin-bottom: 24px;
        border-radius: 8px;
      }

      .step:nth-child(1) .step-icon,
      .example-card:nth-child(1) .example-icon,
      .example-card:nth-child(4) .example-icon {
        background: var(--green-2);
        color: var(--green);
      }

      .step:nth-child(2) .step-icon,
      .example-card:nth-child(2) .example-icon,
      .example-card:nth-child(5) .example-icon {
        background: var(--amber-2);
        color: var(--amber);
      }

      .step:nth-child(3) .step-icon,
      .example-card:nth-child(3) .example-icon {
        background: var(--blue-2);
        color: var(--blue);
      }

      .step svg,
      .example-icon svg {
        width: 24px;
        height: 24px;
      }

      .step h3 {
        margin-bottom: 12px;
        font-family: inherit;
        font-size: 21px;
        font-weight: 760;
        line-height: 1.2;
      }

      .step p,
      .example-card p,
      .feature p {
        margin: 0;
        color: var(--muted);
        line-height: 1.55;
      }

      .product-section {
        background: #fffaf1;
      }

      .product-grid {
        display: grid;
        grid-template-columns: 0.86fr 1.14fr;
        gap: 34px;
        align-items: start;
        margin-top: 44px;
      }

      .feature-list {
        display: grid;
        gap: 14px;
      }

      .feature {
        padding: 20px;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: rgba(255, 253, 248, 0.74);
      }

      .feature h3 {
        margin-bottom: 8px;
        font-family: inherit;
        font-size: 18px;
        font-weight: 760;
        line-height: 1.25;
      }

      .demo-window {
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: var(--paper);
        box-shadow: var(--shadow);
      }

      .demo-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 54px;
        padding: 0 16px;
        border-bottom: 1px solid #e9e2d7;
      }

      .demo-body {
        display: grid;
        grid-template-columns: 0.95fr 1.05fr;
        min-height: 420px;
      }

      .demo-left,
      .demo-right {
        padding: 22px;
      }

      .demo-left {
        border-right: 1px solid #e9e2d7;
      }

      .chat-bubble {
        margin-bottom: 14px;
        padding: 14px;
        border: 1px solid #e4ded2;
        border-radius: var(--radius);
        background: #fff;
        color: #2c2c27;
        line-height: 1.45;
      }

      .detected-card {
        padding: 14px;
        border: 1px solid #d8d1c4;
        border-radius: var(--radius);
        background: #fffdf8;
      }

      .detected-card h3 {
        margin-bottom: 10px;
        font-family: inherit;
        font-size: 16px;
        font-weight: 760;
      }

      .preview-screen {
        max-width: 290px;
        margin: 0 auto;
        padding: 18px;
        border: 9px solid #191919;
        border-radius: 32px;
        background: #fffdf8;
      }

      .examples {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 14px;
        margin-top: 42px;
      }

      .example-card {
        min-height: 210px;
        padding: 20px;
      }

      .example-card h3 {
        margin-bottom: 10px;
        font-family: inherit;
        font-size: 18px;
        font-weight: 760;
        line-height: 1.2;
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 18px;
        margin-top: 42px;
      }

      .metric-card {
        padding: 28px;
      }

      .metric {
        display: block;
        margin-bottom: 10px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 54px;
        line-height: 1;
        color: #183b27;
      }

      .final-cta {
        padding-bottom: 110px;
        text-align: center;
      }

      .final-cta .section-title,
      .final-cta .section-copy {
        margin-left: auto;
        margin-right: auto;
      }

      .final-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 14px;
        margin-top: 32px;
      }

      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 28px clamp(20px, 4vw, 64px);
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 14px;
      }

      .mobile-menu {
        display: none;
      }

      @media (max-width: 980px) {
        .nav-links {
          display: none;
        }

        .mobile-menu {
          display: inline-flex;
        }

        .hero {
          min-height: auto;
          padding-top: 124px;
          background:
            linear-gradient(
              180deg,
              rgba(247, 243, 234, 0.96) 0%,
              rgba(247, 243, 234, 0.78) 52%,
              rgba(247, 243, 234, 1) 100%
            ),
            url("/assets/hero-operations.png") center top 360px / 980px auto
              no-repeat;
        }

        .hero-copy {
          width: 100%;
        }

        .hero-panel,
        .product-grid,
        .demo-body {
          grid-template-columns: 1fr;
        }

        .hero-panel {
          margin-top: 360px;
        }

        .demo-left {
          border-right: 0;
          border-bottom: 1px solid #e9e2d7;
        }

        .steps,
        .metrics {
          grid-template-columns: 1fr;
        }

        .examples {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 640px) {
        .nav {
          height: 64px;
          padding-inline: 16px;
        }

        .brand {
          font-size: 18px;
        }

        .nav-cta {
          min-height: 40px;
          padding-inline: 12px;
        }

        .nav-cta span {
          display: none;
        }

        .hero {
          padding: 112px 16px 0;
          overflow: hidden;
          background:
            linear-gradient(
              180deg,
              rgba(247, 243, 234, 0.98) 0%,
              rgba(247, 243, 234, 0.88) 58%,
              rgba(247, 243, 234, 1) 100%
            ),
            url("/assets/hero-operations.png") center top 420px / 820px auto
              no-repeat;
        }

        h1 {
          max-width: 100%;
          font-size: 48px;
        }

        .hero-copy,
        .hero-lede {
          width: 100%;
          max-width: 100%;
        }

        .hero-lede {
          font-size: 20px;
        }

        .hero-actions,
        .final-actions {
          display: grid;
        }

        .button {
          width: 100%;
          white-space: normal;
        }

        .hero-panel {
          grid-template-columns: 1fr;
          width: 100%;
          margin-top: 300px;
          padding: 12px;
        }

        .panel-right {
          grid-template-columns: 1fr;
        }

        section {
          padding: 72px 16px;
        }

        .examples {
          grid-template-columns: 1fr;
        }

        .footer {
          align-items: flex-start;
          flex-direction: column;
          padding-inline: 16px;
        }
      }
    </style>
  </head>
  <body>
    <div class="site-shell">
      <header class="nav" aria-label="Navegacion principal">
        <a class="brand" href="#top" aria-label="DocToApp inicio">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 19c8.5-.8 13-5.2 14-14-8.8 1-13.2 5.5-14 14Z"
                stroke="currentColor"
                stroke-width="1.8"
              />
              <path d="M8 16 16 8" stroke="currentColor" stroke-width="1.8" />
            </svg>
          </span>
          DocToApp
        </a>
        <nav class="nav-links" aria-label="Secciones">
          <a href="#producto">Producto</a>
          <a href="#casos">Casos</a>
          <a href="#seguridad">Seguridad</a>
          <a href="#precios">Precios</a>
          <a href="/sign-in">Iniciar sesión</a>
        </nav>
        <a class="nav-cta" href="/builder">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 15V4m0 0 4 4m-4-4-4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Probar gratis</span>
        </a>
      </header>

      <main id="top">
        <section class="hero" aria-labelledby="hero-title">
          <div class="hero-copy">
            <div class="eyebrow">Digitalizador de operaciones</div>
            <h1 id="hero-title">Digitaliza tus operaciones</h1>
            <p class="hero-lede">
              Sube un formato, checklist o documento. DocToApp detecta los
              campos y crea una web app lista para compartir.
            </p>
            <div class="hero-actions" id="comenzar">
              <a class="button primary" href="/builder">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 15V4m0 0 4 4m-4-4-4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Subir mi primer archivo
              </a>
              <a class="button secondary" href="#producto">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Ver ejemplo
              </a>
            </div>
            <div class="trust-line" aria-label="Beneficios clave">
              <span class="trust-item">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m5 12 4 4L19 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Sin prompt inicial.
              </span>
              <span class="trust-item">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m5 12 4 4L19 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Sin constructor visual.
              </span>
              <span class="trust-item">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m5 12 4 4L19 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Sin empezar desde cero.
              </span>
            </div>
          </div>

          <div class="hero-panel" aria-label="Demo de carga y vista previa">
            <div class="upload-card">
              <div>
                <span class="file-icon">W</span>
                <strong>Carga tu formato</strong>
                <p>
                  Arrastra un documento de Word, PDF o checklist. La app se
                  arma desde la estructura que ya usas.
                </p>
                <a class="button primary" href="/builder">
                  Seleccionar archivo
                </a>
                <span class="file-status" id="fileStatus">.docx · .pdf · .xlsx</span>
              </div>
            </div>
            <div class="panel-right">
              <div class="schema-card">
                <div class="card-head">
                  <span>Campos detectados</span>
                  <span class="field-type">Editar</span>
                </div>
                <div class="schema-row"><span>1</span><span>Fecha</span><span class="field-type">Fecha</span></div>
                <div class="schema-row"><span>2</span><span>Responsable</span><span class="field-type">Texto</span></div>
                <div class="schema-row"><span>3</span><span>Estado</span><span class="field-type">Opcion</span></div>
                <div class="schema-row"><span>4</span><span>Observaciones</span><span class="field-type">Texto largo</span></div>
              </div>
              <div class="phone-card">
                <div class="mini-phone">
                  <h3>Inspeccion</h3>
                  <label class="mini-label">Responsable</label>
                  <div class="mini-field"></div>
                  <label class="mini-label">Estado</label>
                  <div class="mini-field"></div>
                  <label class="mini-label">Observaciones</label>
                  <div class="mini-field"></div>
                  <div class="mini-button">Guardar registro</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="steps-title">
          <div class="section-inner">
            <div class="section-kicker">De documento a operacion</div>
            <h2 class="section-title" id="steps-title">Empieza con el archivo que ya existe.</h2>
            <p class="section-copy">
              DocToApp convierte formatos operativos en herramientas que la
              gente puede usar desde el celular, sin pedirle a tu equipo que
              aprenda prompts, plantillas o builders.
            </p>
            <div class="steps">
              <article class="step">
                <span class="step-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 15V4m0 0 4 4m-4-4-4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                <h3>1. Carga</h3>
                <p>
                  Sube el formato que ya usas: Word, PDF, checklist o una hoja
                  estructurada. No necesitas explicar la idea desde cero.
                </p>
              </article>
              <article class="step">
                <span class="step-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M15 4 5 14l-1 5 5-1L19 8m-4-4 4 4m-6 12h8"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                <h3>2. Ajusta</h3>
                <p>
                  La IA detecta campos, tipos de respuesta y pantallas. Ajustas
                  lo necesario con cambios simples y vista previa viva.
                </p>
              </article>
              <article class="step">
                <span class="step-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                <h3>3. Comparte</h3>
                <p>
                  Obtienes una app web con link, QR y vista movil para tu
                  equipo, clientes o pacientes.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section class="product-section" id="producto" aria-labelledby="product-title">
          <div class="section-inner">
            <div class="section-kicker">Producto</div>
            <h2 class="section-title" id="product-title">
              No le pidas a tu equipo que piense como builder.
            </h2>
            <p class="section-copy">
              El punto de entrada es operacional: un documento con preguntas,
              pasos, campos y decisiones. DocToApp lo transforma en una
              herramienta funcional y editable.
            </p>

            <div class="product-grid">
              <div class="feature-list">
                <article class="feature">
                  <h3>File-first, no prompt-first</h3>
                  <p>
                    La primera accion es subir el archivo. La conversacion con
                    IA aparece cuando ya hay una estructura que revisar.
                  </p>
                </article>
                <article class="feature">
                  <h3>Vista previa viva</h3>
                  <p>
                    Cada ajuste actualiza la app que vera el usuario final, en
                    movil o escritorio.
                  </p>
                </article>
                <article class="feature">
                  <h3>Operaciones compartibles</h3>
                  <p>
                    Link, QR, historial y resultados sin montar una herramienta
                    interna desde cero.
                  </p>
                </article>
              </div>

              <div class="demo-window" aria-label="Ejemplo de builder DocToApp">
                <div class="demo-bar">
                  <span class="brand">
                    <span class="brand-mark" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 19c8.5-.8 13-5.2 14-14-8.8 1-13.2 5.5-14 14Z"
                          stroke="currentColor"
                          stroke-width="1.8"
                        />
                        <path d="M8 16 16 8" stroke="currentColor" stroke-width="1.8" />
                      </svg>
                    </span>
                    DocToApp
                  </span>
                  <span class="file-status">Construyendo UI</span>
                </div>
                <div class="demo-body">
                  <div class="demo-left">
                    <div class="chat-bubble">
                      Detecte un formato de inspeccion con 8 campos y una seccion
                      de evidencia.
                    </div>
                    <div class="detected-card">
                      <h3>Esquema editable</h3>
                      <div class="schema-row"><span>1</span><span>Area / Equipo</span><span class="field-type">Texto</span></div>
                      <div class="schema-row"><span>2</span><span>Estado</span><span class="field-type">Opcion</span></div>
                      <div class="schema-row"><span>3</span><span>Foto</span><span class="field-type">Imagen</span></div>
                      <div class="schema-row"><span>4</span><span>Firma</span><span class="field-type">Firma</span></div>
                    </div>
                  </div>
                  <div class="demo-right">
                    <div class="preview-screen">
                      <h3>Inspeccion diaria</h3>
                      <label class="mini-label">Area / Equipo</label>
                      <div class="mini-field"></div>
                      <label class="mini-label">Estado</label>
                      <div class="mini-field"></div>
                      <label class="mini-label">Evidencia</label>
                      <div class="mini-field"></div>
                      <div class="mini-button">Enviar reporte</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="casos" aria-labelledby="cases-title">
          <div class="section-inner">
            <div class="section-kicker">Casos</div>
            <h2 class="section-title" id="cases-title">Formatos que ya usas.</h2>
            <p class="section-copy">
              Ideal para operaciones que hoy viven en archivos, capturas,
              PDFs, formularios impresos o documentos que alguien tiene que
              perseguir por chat.
            </p>
            <div class="examples">
              <article class="example-card">
                <span class="example-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" stroke="currentColor" stroke-width="2" />
                    <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" stroke-width="2" />
                  </svg>
                </span>
                <h3>Consentimientos</h3>
                <p>Autoriza, firma y guarda respuestas sin papel.</p>
              </article>
              <article class="example-card">
                <span class="example-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="m9 11 3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" stroke-width="2" />
                  </svg>
                </span>
                <h3>Checklists</h3>
                <p>Estandariza inspecciones, tareas y revisiones.</p>
              </article>
              <article class="example-card">
                <span class="example-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 19V5m6 14V9m6 10V3m4 16H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </span>
                <h3>Seguimiento</h3>
                <p>Captura progreso y visualiza historial sin hojas sueltas.</p>
              </article>
              <article class="example-card">
                <span class="example-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 5h16M4 12h16M4 19h16M8 5v14M16 5v14" stroke="currentColor" stroke-width="2" />
                  </svg>
                </span>
                <h3>Inventarios</h3>
                <p>Pasa registros manuales a captura compartida.</p>
              </article>
              <article class="example-card">
                <span class="example-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-.8.7-1.2 1.5-1.2 2.2H9.2C9.2 15.5 8.8 14.7 8 14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </span>
                <h3>Evaluaciones</h3>
                <p>Convierte cuestionarios en flujos simples para responder.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="seguridad" class="product-section" aria-labelledby="security-title">
          <div class="section-inner">
            <div class="section-kicker">Confianza</div>
            <h2 class="section-title" id="security-title">Hecho para operaciones reales, no demos perfectos.</h2>
            <p class="section-copy">
              Puedes revisar lo que detecta la IA, ajustar campos antes de
              compartir y mantener cada app alineada con la forma en que tu
              equipo trabaja.
            </p>
            <div class="metrics">
              <article class="metric-card">
                <span class="metric">1</span>
                <p>archivo para iniciar el proceso.</p>
              </article>
              <article class="metric-card">
                <span class="metric">0</span>
                <p>prompts necesarios antes de ver una primera app.</p>
              </article>
              <article class="metric-card">
                <span class="metric">24h</span>
                <p>para prototipar operaciones que antes quedaban pendientes.</p>
              </article>
            </div>
          </div>
        </section>

        <section class="final-cta" id="precios" aria-labelledby="final-title">
          <div class="section-inner">
            <div class="section-kicker">Empieza practico</div>
            <h2 class="section-title" id="final-title">
              Tu siguiente app probablemente ya existe como archivo.
            </h2>
            <p class="section-copy">
              Carga un documento operativo y deja que DocToApp proponga la
              primera version. Despues ajustas, compartes y aprendes con uso real.
            </p>
            <div class="final-actions">
              <a class="button primary" href="/builder">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 15V4m0 0 4 4m-4-4-4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Cargar archivo
              </a>
              <a class="button secondary" href="#casos">Explorar casos</a>
            </div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <a class="brand" href="#top">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 19c8.5-.8 13-5.2 14-14-8.8 1-13.2 5.5-14 14Z"
                stroke="currentColor"
                stroke-width="1.8"
              />
              <path d="M8 16 16 8" stroke="currentColor" stroke-width="1.8" />
            </svg>
          </span>
          DocToApp
        </a>
        <span>Digitalizador de operaciones file-first.</span>
      </footer>
    </div>

  </body>
</html>
`;
