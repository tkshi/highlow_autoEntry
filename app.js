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

let driver;
let balance;
let entryBalance;
let returnBalance;

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

async function balanceTxtToNumber() {
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
    await balanceTxtToNumber();
    entryBalance = balance; // エントリー時の残高を保存
    returnBalance = balance; // エントリー時の残高を保存
    while (true) {
      if (balance > quitLine) {
        console.log(`残高が一定値以上に達したので終了します。`);
        await driver.quit();
        break;
      } else if (returnBalance < entryBalance) {
        //エントリー時の残高が取引終了後の残高より高い場合（損した）
        console.log(`残高がエントリー時より下がったため再起動します`);
        await driver.quit();
        break;
      } else {
        while (returnBalance >= entryBalance) {
          //エントリー時の残高が取引終了後の残高以下の場合（儲けた）
          console.log('取引します');
          entryBalance = balance; // エントリー時の残高を保存
          console.log(`取引前の残高：${entryBalance}`);
          while (balance > restartLine) {
            await entryFunc();
            await sleep.msleep(1500);
            await balanceTxtToNumber();
          }
          await sleep.msleep(waitingTime);
          await balanceTxtToNumber();
          returnBalance = balance;
          console.log(`取引後の残高：${returnBalance}`);
        }
      }
    }
  }
})();
