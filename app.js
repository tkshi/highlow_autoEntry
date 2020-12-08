// ライブラリのインポート
const fs = require('fs');
const webdriver = require('selenium-webdriver');
const { Builder, By, until, Dimension } = webdriver;
const { promisify } = require('util');
const { windowWidth, windowHeight, quitLine, restartLine, waitingTime } = require('./config');
const sleep = require('sleep');

// ブラウザの設定
const capabilities = webdriver.Capabilities.chrome(); //ブラウザの指定
const url = 'https://trade.highlow.com/';

let driver = new Builder().forBrowser('chrome').build();
let balance;

async function driverFunc() {
  driver = new Builder().forBrowser('chrome').build();
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

(async () => {
  while (true) {
    await driverFunc();
    await changeAttribute();
    await balanceFunc();
    if (balance > quitLine) {
      driver.quit();
    } else if (balance < restartLine) {
      driver.quit();
      await sleep.msleep(4000);
    } else {
      while (balance > restartLine) {
        while (balance > restartLine) {
          await entryFunc();
          await sleep.msleep(1500);
          await balanceFunc();
        }
        await sleep.msleep(45000);
        await balanceFunc();
      }
    }
  }
})();
// (async () => {
//   await driverFunc();
//   changeAttribute();
//   await balanceFunc();
//   while (true) {
//     if (balance > restartLine) {
//       await balanceFunc();
//       await driver.executeScript('document.querySelector(\'.defaultAmount[val="200000"]\').click()');
//       await driver.executeScript("document.querySelector('#up_button').click()");
//       await driver.executeScript("document.querySelector('#invest_now_button').click()");
//       await sleep.msleep(1000);
//     }
//     await sleep.msleep(waitingTime);
//   }
//   //20万円以上の場合は20万円以下になるまで購入を繰り返す
//   //20万円以下になったら購入をやめて35秒待つ
//   //35秒後に残高を判定
//   //20万円以上の場合は購入を繰り返す
// })();
