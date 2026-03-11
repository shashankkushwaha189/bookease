import { chromium } from 'playwright';

const WEB_BASE = process.env.WEB_BASE ?? 'http://localhost:5173';
const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';

function nowIso() {
  return new Date().toISOString();
}

function errToString(e) {
  if (!e) return 'Unknown error';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return `${e.name}: ${e.message}\n${e.stack ?? ''}`.trim();
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

async function withStep(report, name, fn) {
  const startedAt = nowIso();
  try {
    const result = await fn();
    report.steps.push({ name, startedAt, endedAt: nowIso(), status: 'pass', result });
    return result;
  } catch (e) {
    report.steps.push({ name, startedAt, endedAt: nowIso(), status: 'fail', error: errToString(e) });
    throw e;
  }
}

async function ensureNoViteOverlay(page, context) {
  const overlay = page.locator('vite-error-overlay, [data-testid=\"vite-error-overlay\"]');
  if (await overlay.count()) {
    const visible = await overlay.first().isVisible().catch(() => false);
    if (visible) {
      const overlayText = await overlay.first().innerText().catch(() => '(unable to read overlay text)');
      throw new Error(`${context}: Vite error overlay visible: ${overlayText}`.trim());
    }
  }
}

async function ensureNotBlank(page, context) {
  await page.waitForLoadState('domcontentloaded');
  await ensureNoViteOverlay(page, context);

  const bodyText = (await page.locator('body').innerText().catch(() => '')).trim();
  if (!bodyText || bodyText.length < 10) {
    throw new Error(`${context}: page appears blank (body text too short)`);
  }
}

async function maybeClickPrimaryAction(page) {
  const candidates = [
    /^(new|add|create|import|export)\b/i,
    /\b(new|add|create|import|export)\b/i,
  ];

  for (const re of candidates) {
    const btn = page.getByRole('button', { name: re }).filter({ hasNot: page.locator('[disabled]') }).first();
    if (await btn.count()) {
      const visible = await btn.isVisible().catch(() => false);
      if (!visible) continue;
      await btn.click({ timeout: 5000 }).catch(() => {});

      const dialog = page.getByRole('dialog').first();
      if (await dialog.count()) {
        const dialogVisible = await dialog.isVisible().catch(() => false);
        if (dialogVisible) {
          await page.keyboard.press('Escape').catch(() => {});
        }
      }
      return true;
    }
  }
  return false;
}

async function login(page, { email, password }) {
  await page.goto(`${WEB_BASE}/login`, { waitUntil: 'domcontentloaded' });
  await ensureNotBlank(page, 'Login page');

  const fillForUser =
    email.toLowerCase() === 'admin@demo.com'
      ? page.getByRole('button', { name: /^fill admin$/i })
      : email.toLowerCase() === 'staff@demo.com'
        ? page.getByRole('button', { name: /^fill staff$/i })
        : page.getByRole('button', { name: /^fill customer$/i });

  if (await fillForUser.count()) {
    const visible = await fillForUser.first().isVisible().catch(() => false);
    if (visible) await fillForUser.first().click().catch(() => {});
  }

  const emailInput = page.getByLabel(/email/i).or(page.locator('input[type=\"email\"]')).first();
  const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type=\"password\"]')).first();

  await emailInput.fill(email);
  await passwordInput.fill(password);

  const submit = page.getByRole('button', { name: /(sign in|login)/i }).first();
  await submit.click();

  const submitError = page.getByText(/invalid email or password|an error occurred|too many attempts/i).first();
  await Promise.race([
    page.waitForURL((u) => u.pathname !== '/login', { timeout: 15000 }),
    submitError.waitFor({ state: 'visible', timeout: 15000 }),
  ]).catch(() => {});

  if ((await submitError.count()) && (await submitError.isVisible().catch(() => false))) {
    throw new Error(`Login failed: ${await submitError.innerText().catch(() => 'unknown error')}`);
  }
}

async function clickSidebarRoute(page, linkNameOrRe, expectedPathPrefix) {
  const link =
    typeof linkNameOrRe === 'string'
      ? page.getByRole('link', { name: new RegExp(`^${linkNameOrRe}$`, 'i') })
      : page.getByRole('link', { name: linkNameOrRe });

  await link.first().click({ timeout: 5000 });
  await page.waitForURL((u) => u.pathname.startsWith(expectedPathPrefix), { timeout: 10000 });
  await ensureNotBlank(page, `Route ${expectedPathPrefix}`);
  await maybeClickPrimaryAction(page);
}

async function run() {
  const report = {
    startedAt: nowIso(),
    webBase: WEB_BASE,
    apiBase: API_BASE,
    fatalError: null,
    consoleErrors: [],
    requestFailures: [],
    responses4xx5xx: [],
    steps: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      report.consoleErrors.push({
        at: nowIso(),
        url: page.url(),
        text: msg.text(),
      });
    }
  });

  page.on('requestfailed', (req) => {
    report.requestFailures.push({
      at: nowIso(),
      url: page.url(),
      requestUrl: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText ?? 'unknown failure',
    });
  });

  page.on('response', async (res) => {
    const status = res.status();
    if (status < 400) return;
    const url = res.url();
    if (!url.startsWith(API_BASE)) return;
    report.responses4xx5xx.push({
      at: nowIso(),
      url: page.url(),
      status,
      responseUrl: url,
      method: res.request().method(),
    });
  });

  try {
    try {
      await withStep(report, 'Login admin', async () => {
        await login(page, { email: 'admin@demo.com', password: 'demo123456' });
        await page.waitForURL((u) => u.pathname.startsWith('/admin/dashboard'), { timeout: 20000 });
        await ensureNotBlank(page, 'Admin dashboard');
        return { url: page.url() };
      });
    } catch (e) {
      report.fatalError = { step: 'Login admin', error: errToString(e), url: page.url() };
      return report;
    }

    const adminPages = [
      { name: /business profile/i, path: '/admin/business' },
      { name: /dashboard/i, path: '/admin/dashboard' },
      { name: /appointments/i, path: '/admin/appointments' },
      { name: /calendar/i, path: '/admin/calendar' },
      { name: /services/i, path: '/admin/services' },
      { name: /staff/i, path: '/admin/staff' },
      { name: /customers/i, path: '/admin/customers' },
      { name: /reports/i, path: '/admin/reports' },
      { name: /config/i, path: '/admin/config' },
      { name: /import\/export/i, path: '/admin/import-export' },
    ];

    try {
      await withStep(report, 'Admin: click all sidebar pages', async () => {
        for (const p of adminPages) {
          await clickSidebarRoute(page, p.name, p.path);
        }
        return { visited: adminPages.map((p) => p.path) };
      });
    } catch (e) {
      report.fatalError = { step: 'Admin: click all sidebar pages', error: errToString(e), url: page.url() };
      return report;
    }

    try {
      await withStep(report, 'Logout', async () => {
        const logout =
          page.getByRole('button', { name: /logout/i }).or(page.getByRole('link', { name: /logout/i })).first();
        await logout.click({ timeout: 5000 });
        await page.waitForURL((u) => u.pathname.startsWith('/login'), { timeout: 15000 });
        await ensureNotBlank(page, 'After logout');
        return { url: page.url() };
      });
    } catch (e) {
      report.fatalError = { step: 'Logout', error: errToString(e), url: page.url() };
      return report;
    }

    try {
      await withStep(report, 'Login staff', async () => {
        await login(page, { email: 'staff@demo.com', password: 'demo123456' });
        await page.waitForURL((u) => u.pathname.startsWith('/staff/'), { timeout: 15000 });
        await ensureNotBlank(page, 'Staff landing');
        return { url: page.url() };
      });
    } catch (e) {
      report.fatalError = { step: 'Login staff', error: errToString(e), url: page.url() };
      return report;
    }

    try {
      await withStep(report, 'Staff: /staff/schedule', async () => {
        await page.goto(`${WEB_BASE}/staff/schedule`, { waitUntil: 'domcontentloaded' });
        await ensureNotBlank(page, 'Staff schedule');
        await maybeClickPrimaryAction(page);
        return { url: page.url() };
      });
    } catch (e) {
      report.fatalError = { step: 'Staff: /staff/schedule', error: errToString(e), url: page.url() };
      return report;
    }

    try {
      await withStep(report, 'Staff: /staff/appointments', async () => {
        await page.goto(`${WEB_BASE}/staff/appointments`, { waitUntil: 'domcontentloaded' });
        await ensureNotBlank(page, 'Staff appointments');
        await maybeClickPrimaryAction(page);
        return { url: page.url() };
      });
    } catch (e) {
      report.fatalError = { step: 'Staff: /staff/appointments', error: errToString(e), url: page.url() };
      return report;
    }

    try {
      await withStep(report, 'Staff: navigating to /admin/dashboard redirects to /403', async () => {
        await page.goto(`${WEB_BASE}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
        await page.waitForURL((u) => u.pathname.startsWith('/403'), { timeout: 15000 });
        await ensureNotBlank(page, 'Forbidden page');
        return { url: page.url() };
      });
    } catch (e) {
      report.fatalError = { step: 'Staff: navigating to /admin/dashboard redirects to /403', error: errToString(e), url: page.url() };
      return report;
    }
  } finally {
    report.endedAt = nowIso();
    await browser.close().catch(() => {});
  }

  return report;
}

const report = await run();
const hadIssues =
  report.steps.some((s) => s.status === 'fail') ||
  report.consoleErrors.length > 0 ||
  report.requestFailures.length > 0 ||
  report.responses4xx5xx.length > 0 ||
  !!report.fatalError;

console.log(JSON.stringify({ ok: !hadIssues, ...report }, null, 2));
process.exitCode = hadIssues ? 1 : 0;

