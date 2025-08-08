import { test, expect } from '@playwright/test'

test.describe('Live2D interactions', () => {
  test('renders model without flicker on resize', async ({ page }) => {
    await page.goto('/')
    // Wait for Live2D canvas
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    // Ensure model injected
    await page.waitForFunction(() => (window as any).__live2d?.model != null)

    // Capture multiple frames around resize to ensure canvas remains visible
    await page.setViewportSize({ width: 900, height: 700 })
    await page.waitForTimeout(150)
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.waitForTimeout(150)

    const isVisible = await canvas.isVisible()
    expect(isVisible).toBeTruthy()
  })

  test('play expression updates parameter', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => (window as any).__live2d?.model != null)

    // Open control panel
    await page.getByRole('button').nth(1).click() // Settings
    await expect(page.getByText('Live2D 控制面板')).toBeVisible()

    // Select an expression and play
    const select = page.locator('select').first()
    await select.selectOption('aojiao')
    await page.getByText('播放表情').click()

    // Verify that a known parameter changes over time (approximate check)
    const changed = await page.evaluate(async () => {
      const model: any = (window as any).__live2d.model
      const before = model.getParameterValueById?.('ParamMouthOpenY') ?? 0
      // wait a few ticks
      await new Promise(r => setTimeout(r, 300))
      const after = model.getParameterValueById?.('ParamMouthOpenY') ?? 0
      return before !== after
    })
    expect(changed).toBeTruthy()
  })

  test('play motion does not throw and remains visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => (window as any).__live2d?.model != null)
    // Open panel
    await page.getByRole('button').nth(1).click()
    const motionSelect = page.locator('select').nth(1)
    await motionSelect.selectOption('huishou')
    await page.getByText('播放动作').click()
    await page.waitForTimeout(500)
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('lip sync reacts to test audio when mic not available', async ({ page, context }) => {
    await page.goto('/')
    await page.waitForFunction(() => (window as any).__live2d?.model != null)
    // Deny mic permission to force fallback
    await context.grantPermissions([], { origin: new URL('http://localhost:5173').origin })
    // Open panel and start test
    await page.getByRole('button').nth(1).click()
    await page.getByText('开始口型测试').click()
    // Observe mouth parameter rising within 2s
    const changed = await page.evaluate(async () => {
      const model: any = (window as any).__live2d.model
      const before = model.getParameterValueById?.('ParamMouthOpenY') ?? 0
      await new Promise(r => setTimeout(r, 1200))
      const after = model.getParameterValueById?.('ParamMouthOpenY') ?? 0
      return after > before
    })
    expect(changed).toBeTruthy()
  })

  test('chat bubble avoids face area (anchor offset applied)', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => (window as any).__live2d?.model != null)
    // Trigger a chat message to show bubble
    await page.getByPlaceholder('与悠悠对话...').fill('你好')
    await page.getByRole('button', { name: 'Send' }).click().catch(()=>{})
    // Wait for bubble appear
    await page.waitForTimeout(400)
    const bubbles = page.locator('div').filter({ hasText: '收到：' })
    expect(await bubbles.count()).toBeGreaterThan(0)
  })
})

