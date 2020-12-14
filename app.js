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

//残高を取得しStringからNumberへ変換
async function balanceTxtToNumber() {
  balance = await driver.findElement(By.css('#balance')).getText();
  balance = balance.replace('¥', '').replace(/,/g, '');
  balance = Number(balance);
}

//連続エントリー処理
async function entryFunc() {
  await driver.executeScript('document.querySelector(\'.defaultAmount[val="200000"]\').click()');
  await driver.executeScript("document.querySelector('#up_button').click()");
  await driver.executeScript("document.querySelector('#invest_now_button').click()");
}

async function preFunc() {
  await driver.findElement(By.id('4036')).click(); // EUR/USDに切り替える
  await driver.executeScript('document.querySelector(\'.defaultAmount[val="200000"]\').click()');
  for (let i = 0; i < 6; i++) {
    // 上と下を同時にエントリー（計6回）
    if (i % 2 != 0) {
      await driver.executeScript("document.querySelector('#up_button').click()");
    } else {
      await driver.executeScript("document.querySelector('#down_button').click()");
    }
    await driver.executeScript("document.querySelector('#invest_now_button').click()");
    await sleep.msleep(1000);
  }
  await sleep.msleep(waitingTime); // 40秒待つ
  await balanceTxtToNumber();
  returnBalance = balance;
  await driver.findElement(By.id('4056')).click(); // JPY/USDに切り替える
  await driver.executeScript('window.scrollTo(0, -200);'); // 最上部にスクロール
  await sleep.msleep(20000);
}

async function replaceHtml() {
  await driver.executeScript("document.querySelector('#layout-header').innerHTML=''");
  await driver.executeScript("document.querySelector('#layout-before-main article ul.nav').innerHTML=''");
}

(async () => {
  while (true) {
    await driverFunc();
    await replaceHtml();
    await changeAttribute();
    await balanceTxtToNumber();
    await preFunc();
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
