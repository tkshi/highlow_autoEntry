// ライブラリのインポート
const fs = require('fs');
const webdriver = require('selenium-webdriver');
const { Builder, By, until, Dimension } = webdriver;
const { promisify } = require('util');
const { windowWidth, windowHeight, quitLine, waitingTime } = require('./config');
const sleep = require('sleep');

// ブラウザの設定
const capabilities = webdriver.Capabilities.chrome(); //ブラウザの指定
const url = 'https://trade.highlow.com/';

let driver = new Builder().forBrowser('chrome').build();
let balance;
let restartLine;

async function driverStart() {
  driver;
}

async function driverFunc() {
  await driver.manage().window().setRect({
    width: windowWidth,
    height: windowHeight,
  });
  await driver.get(url); //ハイローオーストラリアを開く
  await driver.wait(until.elementLocated(By.css('#strike')), 10000); //レートの要素が読み込み終わるまで待つ
  await driver.findElement(By.css('#header a.highlight.hidden-xs.outlineNone')).click();
  await driver.wait(until.elementLocated(By.css('.cashback-tooltip.active')), 10000); //キャッシュバック通知が読み込み終わるまで待つ
  await driver.findElement(By.css('.exit-onboarding')).click(); //キャッシュバック通知をクリックして閉じる
  await driver.findElement(By.id('ChangingStrikeOOD')).click(); // Turboに切り替え
  await driver.executeScript('window.scrollTo(0, 200);');
}

// 5万円のボタンのval属性を20万円に変更
async function changeAttribute() {
  driver.executeScript("document.querySelector('.defaultAmount[val=\"50000\"]').setAttribute('val', '200000')");
}

async function balanceFunc() {
  balance = await driver.findElement(By.css('#balance')).getText();
  balance = balance.replace('¥', '').replace(/,/g, '');
  balance = Number(balance);
}

async function entryFunc() {
  await driver.executeScript('document.querySelector(\'.defaultAmount[val="200000"]\').click()');
  await driver.executeScript("document.querySelector('#up_button').click()");
  await driver.executeScript("document.querySelector('#invest_now_button').click()");
}

async function updateRestartLine() {
  restartLine = balance;
}

(async () => {
  while (true) {
    await driverFunc();
    await changeAttribute();
    await balanceFunc();
    await updateRestartLine();
    if (balance > quitLine) {
      console.log('quit');
      driver.quit();
    } else if (balance < restartLine) {
      console.log('restart');
      driver.quit();

      await sleep.msleep(4000);
    } else {
      console.log('entry');
      while (balance > restartLine) {
        while (balance > restartLine) {
          await entryFunc();
          await sleep.msleep(1500);
          await balanceFunc();
        }
        await sleep.msleep(45000);
        await balanceFunc();
        // await updateRestartLine();
      }
    }
  }
})();
