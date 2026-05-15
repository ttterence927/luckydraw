import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const outputDir = path.join(process.cwd(), 'public', 'docs');
const browserExecutablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

// 9 mock winners already recorded — leaves only the last Consolation Prize to draw.
// Employee IDs 1-9 are used so employees 10+ remain available in the reel.
const NINE_MOCK_WINNERS = [
  { employee: { id: '3', name: 'David Chen', title: 'Technician', avatar: 'https://i.pravatar.cc/150?u=david', birthday: '1992-03-09' }, prize: 'Third Prize: AirPods Pro', prizeImage: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=400&fit=crop' },
  { employee: { id: '5', name: 'Michael Ho', title: 'Operations Lead', avatar: 'https://i.pravatar.cc/150?u=michael', birthday: '1987-05-28' }, prize: 'Third Prize: AirPods Pro', prizeImage: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=400&fit=crop' },
  { employee: { id: '7', name: 'Kevin Yip', title: 'Maintenance Tech', avatar: 'https://i.pravatar.cc/150?u=kevin', birthday: '1989-07-19' }, prize: 'Third Prize: AirPods Pro', prizeImage: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=400&fit=crop' },
  { employee: { id: '9', name: 'Tom Baker', title: 'Systems Engineer', avatar: 'https://i.pravatar.cc/150?u=tom', birthday: '1990-09-12' }, prize: 'Third Prize: AirPods Pro', prizeImage: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=400&fit=crop' },
  { employee: { id: '1', name: 'Alex Wong', title: 'Senior Engineer', avatar: 'https://i.pravatar.cc/150?u=alex', birthday: '1990-01-14' }, prize: 'Third Prize: AirPods Pro', prizeImage: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=400&fit=crop' },
  { employee: { id: '2', name: 'Sarah Lee', title: 'Project Manager', avatar: 'https://i.pravatar.cc/150?u=sarah', birthday: '1988-02-22' }, prize: 'Second Prize: iPad Air', prizeImage: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop' },
  { employee: { id: '4', name: 'Emily Cheung', title: 'Safety Officer', avatar: 'https://i.pravatar.cc/150?u=emily', birthday: '1991-04-17' }, prize: 'Second Prize: iPad Air', prizeImage: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop' },
  { employee: { id: '6', name: 'Jessica Lau', title: 'Quality Inspector', avatar: 'https://i.pravatar.cc/150?u=jessica', birthday: '1993-06-05' }, prize: 'Second Prize: iPad Air', prizeImage: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop' },
  { employee: { id: '8', name: 'Rachel Chan', title: 'HR Specialist', avatar: 'https://i.pravatar.cc/150?u=rachel', birthday: '1994-08-30' }, prize: 'Grand Prize: iPhone 15', prizeImage: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop' },
];

async function waitForApp(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=RAIL');
  await page.waitForTimeout(1200);
}

async function openSettings(page) {
  await page.locator('div.absolute.top-6.right-6.z-50 > div.relative > button').click();
  await page.waitForSelector('text=Draw Mode');
  await page.waitForTimeout(250);
}

async function closeSettings(page) {
  const settingsPanel = page.locator('div.absolute.top-14.right-0.rounded-2xl');
  if (await settingsPanel.isVisible()) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.mouse.click(40, 40);
    await page.waitForTimeout(250);
  }
}

async function screenshot(page, name, options = {}) {
  await page.screenshot({
    path: path.join(outputDir, name),
    fullPage: false,
    animations: 'disabled',
    ...options,
  });
}

async function screenshotSettingsPanel(page, name) {
  const panel = page.locator('div.absolute.top-14.right-0.rounded-2xl');
  await panel.screenshot({
    path: path.join(outputDir, name),
    animations: 'disabled',
  });
}

const browser = await chromium.launch({
  executablePath: browserExecutablePath,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

try {
  // ── 1. Home screen ────────────────────────────────────────────────────────
  await waitForApp(page);
  await screenshot(page, 'readme-home.png');

  // ── 2. Draw mode switcher ─────────────────────────────────────────────────
  await openSettings(page);
  await screenshotSettingsPanel(page, 'readme-mode-switch.png');

  // ── 3. Switch to birthday mode WHILE mode section is still open ───────────
  await page.getByRole('button', { name: /^birthday$/i }).click();
  await page.waitForSelector('text=Birthday Party');
  await page.waitForTimeout(600);

  // ── 4. Animation speed control ────────────────────────────────────────────
  await openSettings(page);
  await page.getByRole('button', { name: 'Animation Speed' }).click();
  await page.waitForTimeout(300);
  await screenshotSettingsPanel(page, 'readme-speed.png');

  // ── 5. Birthday filter ────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Birthday Filter' }).click();
  await page.waitForTimeout(300);
  await screenshotSettingsPanel(page, 'readme-birthday-filter.png');

  // ── 6. Background image ───────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Background Image' }).click();
  await page.waitForTimeout(250);
  await screenshotSettingsPanel(page, 'readme-backgrounds.png');

  // ── 7. Background music ───────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Background Music' }).click();
  await page.waitForTimeout(250);
  await screenshotSettingsPanel(page, 'readme-bgm.png');

  // ── 8. Upload data (shows XLS + background + CSV upload buttons) ──────────
  await page.getByRole('button', { name: 'Upload Data' }).click();
  await page.waitForTimeout(300);
  await screenshotSettingsPanel(page, 'readme-uploads.png');

  await closeSettings(page);

  // ── 9. Birthday home ──────────────────────────────────────────────────────
  await screenshot(page, 'readme-birthday-home.png');

  // ── 10. Participants dialog ───────────────────────────────────────────────
  await page.locator('button').filter({ hasText: /participants left/i }).click();
  await page.waitForTimeout(700);
  await screenshot(page, 'readme-participants.png');
  await page.getByRole('button', { name: /close/i }).click();
  await page.waitForTimeout(300);

  // ── 11. Winner reveal screen ──────────────────────────────────────────────
  // Switch to annual, clear winners, do a real draw to capture the reveal ticket.
  await page.evaluate(() => {
    localStorage.setItem('luckyDrawMode', 'annual');
    localStorage.removeItem('luckyDrawWinners');
    localStorage.removeItem('luckyDrawExcludedEmployees');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('text=RAIL');
  await page.waitForTimeout(1200);

  await page.getByRole('button', { name: 'START' }).click();
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: 'STOP' }).click();
  await page.waitForSelector('text=GOLDEN TICKET', { timeout: 14000 });
  await page.waitForTimeout(1000);
  await screenshot(page, 'readme-reveal.png');

  // ── 12. Summary / all-winners screen ─────────────────────────────────────
  // Inject 9 mock winners (9 of 10 prizes drawn), reload, draw the final prize,
  // then wait for the auto-transition to the summary screen.
  await page.evaluate((winners) => {
    localStorage.setItem('luckyDrawMode', 'annual');
    localStorage.setItem('luckyDrawWinners', JSON.stringify(winners));
    localStorage.setItem('luckyDrawExcludedEmployees', JSON.stringify(winners.map(w => w.employee.id)));
  }, NINE_MOCK_WINNERS);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('text=RAIL');
  await page.waitForTimeout(1200);

  await page.getByRole('button', { name: 'START' }).click();
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: 'STOP' }).click();
  // The final prize reveal will auto-transition to summary after 8 s
  await page.waitForSelector('text=GOLDEN TICKET', { timeout: 14000 });
  await page.waitForTimeout(9500); // wait for 8s auto-transition + buffer
  await screenshot(page, 'readme-summary.png');

  const generated = [
    'readme-home.png',
    'readme-mode-switch.png',
    'readme-speed.png',
    'readme-birthday-filter.png',
    'readme-backgrounds.png',
    'readme-bgm.png',
    'readme-uploads.png',
    'readme-birthday-home.png',
    'readme-participants.png',
    'readme-reveal.png',
    'readme-summary.png',
  ];
  console.log('Generated screenshots:', generated.join(', '));
} finally {
  await browser.close();
}