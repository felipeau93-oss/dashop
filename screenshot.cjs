const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1920, height: 1080 } });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  const elements = await page.$$('button');
  for (const el of elements) {
    const text = await page.evaluate(e => e.textContent, el);
    if (text && text.includes('Simulador de Rotas')) {
      await el.click();
      break;
    }
  }
  
  await page.waitForTimeout(3000);
  
  const btnElements = await page.$$('button');
  for (const el of btnElements) {
    const text = await page.evaluate(e => e.textContent, el);
    if (text && text.includes('Simular Categoria + Dia')) {
      await el.click();
      break;
    }
  }
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/felip/.gemini/antigravity-ide/brain/2e53450f-82a7-48cf-8e0d-fc1ec75d4cf5/simulador_fixed_ui.png', fullPage: false });
  await browser.close();
})();
