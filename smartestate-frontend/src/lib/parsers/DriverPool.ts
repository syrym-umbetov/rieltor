import { WebDriver, Builder } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome'
import firefox from 'selenium-webdriver/firefox'

interface DriverPoolItem {
  driver: WebDriver
  inUse: boolean
  lastUsed: number
}

class DriverPool {
  private pool: DriverPoolItem[] = []
  private readonly maxSize = 3
  private readonly idleTimeout = 5 * 60 * 1000 // 5 минут

  async getDriver(): Promise<WebDriver> {
    // Найти свободный драйвер
    const availableItem = this.pool.find(item => !item.inUse)
    
    if (availableItem) {
      availableItem.inUse = true
      availableItem.lastUsed = Date.now()
      console.log('Reusing existing driver from pool')
      return availableItem.driver
    }

    // Создать новый драйвер если пул не полон
    if (this.pool.length < this.maxSize) {
      const driver = await this.createDriver()
      const item: DriverPoolItem = {
        driver,
        inUse: true,
        lastUsed: Date.now()
      }
      this.pool.push(item)
      console.log(`Created new driver, pool size: ${this.pool.length}`)
      return driver
    }

    // Ждать освобождения драйвера
    console.log('Pool is full, waiting for available driver...')
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const availableItem = this.pool.find(item => !item.inUse)
        if (availableItem) {
          clearInterval(checkInterval)
          availableItem.inUse = true
          availableItem.lastUsed = Date.now()
          resolve(availableItem.driver)
        }
      }, 100)
    })
  }

  private async createDriver(): Promise<WebDriver> {
    console.log('Creating new WebDriver...')
    
    // Сначала пробуем Firefox
    try {
      console.log('Trying Firefox with GeckoDriver...')
      const firefoxOptions = new firefox.Options()
      firefoxOptions.addArguments('--headless')
      firefoxOptions.addArguments('--width=1920')
      firefoxOptions.addArguments('--height=1080')
      
      const firefoxService = new firefox.ServiceBuilder('/opt/homebrew/bin/geckodriver')
      
      const driver = await new Builder()
        .forBrowser('firefox')
        .setFirefoxOptions(firefoxOptions)
        .setFirefoxService(firefoxService)
        .build()
        
      console.log('Firefox WebDriver created successfully')
      await driver.manage().setTimeouts({ implicit: 10000, pageLoad: 20000 })
      return driver
      
    } catch (firefoxError) {
      console.log('Firefox failed, trying Chrome...', firefoxError.message)
      
      // Если Firefox не работает, пробуем Chrome
      const chromeOptions = new chrome.Options()
      chromeOptions.addArguments('--headless')
      chromeOptions.addArguments('--no-sandbox')
      chromeOptions.addArguments('--disable-dev-shm-usage')
      chromeOptions.addArguments('--disable-gpu')
      chromeOptions.addArguments('--window-size=1920,1080')
      
      const chromeService = new chrome.ServiceBuilder('/opt/homebrew/bin/chromedriver')
      
      const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .setChromeService(chromeService)
        .build()
        
      console.log('Chrome WebDriver created successfully')
      await driver.manage().setTimeouts({ implicit: 10000, pageLoad: 20000 })
      return driver
    }
  }

  releaseDriver(driver: WebDriver): void {
    const item = this.pool.find(item => item.driver === driver)
    if (item) {
      item.inUse = false
      item.lastUsed = Date.now()
      console.log('Driver released back to pool')
    }
  }

  async cleanup(): void {
    console.log('Cleaning up idle drivers...')
    const now = Date.now()
    const toRemove: number[] = []

    for (let i = 0; i < this.pool.length; i++) {
      const item = this.pool[i]
      if (!item.inUse && (now - item.lastUsed > this.idleTimeout)) {
        try {
          await item.driver.quit()
          toRemove.push(i)
          console.log(`Closed idle driver ${i}`)
        } catch (error) {
          console.log(`Error closing driver ${i}:`, error.message)
        }
      }
    }

    // Удаляем закрытые драйверы из пула (в обратном порядке)
    toRemove.reverse().forEach(index => {
      this.pool.splice(index, 1)
    })
  }

  async closeAll(): void {
    console.log('Closing all drivers in pool...')
    for (const item of this.pool) {
      try {
        await item.driver.quit()
      } catch (error) {
        console.log('Error closing driver:', error.message)
      }
    }
    this.pool.length = 0
  }

  getStats() {
    return {
      total: this.pool.length,
      inUse: this.pool.filter(item => item.inUse).length,
      available: this.pool.filter(item => !item.inUse).length
    }
  }
}

export const driverPool = new DriverPool()

// Очистка неиспользуемых драйверов каждые 2 минуты
setInterval(() => {
  driverPool.cleanup()
}, 2 * 60 * 1000)

// Закрытие всех драйверов при завершении процесса
process.on('SIGINT', async () => {
  await driverPool.closeAll()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await driverPool.closeAll()
  process.exit(0)
})