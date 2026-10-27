const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  // First load any page to get the origin set
  await page.goto('http://localhost:4201/login', { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Inject a mock token + user so guards pass
  await page.evaluate(() => {
    const fakeUser = JSON.stringify({
      _id: 'test123', firstName: 'Test', lastName: 'User',
      email: 'test@test.com', role: 'admin', isActive: true
    });
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0MTIzIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.fake';
    localStorage.setItem('accessToken', fakeToken);
    localStorage.setItem('currentUser', fakeUser);
    localStorage.setItem('rememberMe', '1');
  });

  // Now navigate to orders page
  await page.goto('http://localhost:4201/orders', { waitUntil: 'networkidle', timeout: 15000 }).catch(e => console.log('nav error:', e.message));
  await page.screenshot({ path: '/tmp/ss_01_orders.png' });
  console.log('1. Orders page URL:', page.url());

  const addBtn = page.locator('button.add-order-btn').first();
  const addVisible = await addBtn.isVisible().catch(() => false);
  console.log('Add Order button visible:', addVisible);

  if (!addVisible) {
    // check what's on page
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log('Page body excerpt:', bodyText.slice(0, 200));
    await browser.close();
    return;
  }

  await addBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/ss_02_dialog.png' });
  console.log('2. Dialog opened');

  // Type non-matching company
  const companyInput = page.locator('p-autoComplete[formControlName="companyName"] input').first();
  const inputVisible = await companyInput.isVisible().catch(() => false);
  console.log('Company input visible:', inputVisible);

  if (!inputVisible) {
    console.log('Company input not found');
    await browser.close();
    return;
  }

  await companyInput.fill('ZZZNOMATCH');
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/ss_03_nomatch.png' });

  const createBtn = page.locator('.btn-create-customer').first();
  const createBtnVisible = await createBtn.isVisible().catch(() => false);
  console.log('Create Customer button visible:', createBtnVisible);

  if (!createBtnVisible) {
    await browser.close();
    return;
  }

  await createBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/ss_04_modal.png' });
  console.log('4. Create Customer modal screenshot taken');

  // Scroll top
  await page.evaluate(() => {
    const dc = [...document.querySelectorAll('.p-dialog-content')];
    if (dc.length) dc[dc.length-1].scrollTop = 0;
  });
  await page.screenshot({ path: '/tmp/ss_05_modal_top.png' });

  // Scroll bottom
  await page.evaluate(() => {
    const dc = [...document.querySelectorAll('.p-dialog-content')];
    if (dc.length) dc[dc.length-1].scrollTop = 9999;
  });
  await page.screenshot({ path: '/tmp/ss_06_modal_bottom.png' });

  // Collect layout info
  const info = await page.evaluate(() => {
    const q = s => document.querySelector(s);
    const box = el => el ? `${el.offsetWidth}x${el.offsetHeight}` : 'not found';
    const cs = (el, p) => el ? getComputedStyle(el).getPropertyValue(p).trim() : 'n/a';

    const root      = q('.create-customer-from-order-modal');
    const formGrid  = q('.create-customer-from-order-modal .form-grid');
    const conSec    = q('.create-customer-from-order-modal .contacts-section');
    const conCard   = q('.create-customer-from-order-modal .contact-card');
    const conLabel  = q('.create-customer-from-order-modal .contacts-label');
    const fieldsGrd = q('.create-customer-from-order-modal .contact-fields-grid');
    const cardHdr   = q('.create-customer-from-order-modal .contact-card-header');
    const footer    = q('.create-customer-from-order-modal .modal-footer');
    const btnCancel = q('.create-customer-from-order-modal .btn-cancel');
    const btnCreate = q('.create-customer-from-order-modal .btn-create');

    return {
      root:      { exists: !!root },
      formGrid:  { size: box(formGrid), cols: cs(formGrid,'grid-template-columns'), gap: cs(formGrid,'gap'), display: cs(formGrid,'display') },
      conSec:    { size: box(conSec),   display: cs(conSec,'display'), flex: cs(conSec,'flex-direction') },
      conCard:   { size: box(conCard),  bg: cs(conCard,'background-color'), border: cs(conCard,'border-radius') },
      conLabel:  { size: box(conLabel), display: cs(conLabel,'display') },
      fieldsGrd: { size: box(fieldsGrd), cols: cs(fieldsGrd,'grid-template-columns') },
      cardHdr:   { size: box(cardHdr),   display: cs(cardHdr,'display') },
      footer:    { size: box(footer),    display: cs(footer,'display'), justify: cs(footer,'justify-content'), borderTop: cs(footer,'border-top-width') },
      btnCancel: { size: box(btnCancel), display: cs(btnCancel,'display') },
      btnCreate: { size: box(btnCreate), bg: cs(btnCreate,'background-color'), display: cs(btnCreate,'display') },
    };
  });
  console.log('Layout info:\n', JSON.stringify(info, null, 2));

  await browser.close();
})();
