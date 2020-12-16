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
let random;

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
  if (random == 0) {
    await driver.executeScript("document.querySelector('#up_button').click()");
  } else {
    await driver.executeScript("document.querySelector('#down_button').click()");
  }
  await driver.executeScript("document.querySelector('#invest_now_button').click()");
}

//最初に行う
async function preFunc() {
  await driver.findElement(By.id('4036')).click(); // EUR/USDに切り替える
  await driver.executeScript('document.querySelector(\'.defaultAmount[val="200000"]\').click()');
  for (let i = 0; i < 2; i++) {
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
  const headerContent = fs.readFileSync('./header.html', 'utf-8').toString();
  const navContent = fs.readFileSync('./nav.html', 'utf-8').toString();
  await driver.executeScript(`document.querySelector('#layout-header').outerHTML="${headerContent}"`);
  await driver.executeScript(`document.querySelector("#layout-before-main > div > div > article > ul > li.current.demo-login-visible").style.cssText = 'display : block !important;visibility:visible !important'`);
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
      if (returnBalance >= quitLine) {
        //残高が目標とする金額に達成した場合
        console.log(`残高が目標に達したので終了します。`);
        await sleep.msleep(20000); //終了までの待機時間（ミリ秒）
        try {
          await driver.quit();
        } catch (error) {
          console.log('エラー：終了出来ませんでした');
        }
        break;
      } else if (restartLine > returnBalance) {
        //エントリー時の残高が60万以下だった場合
        console.log(`残高が${restartLine}円以下のため再起動します`);
        try {
          await driver.quit();
        } catch (error) {
          console.log('エラー：再起動出来ませんでした');
        }
        break;
      } else {
        while (returnBalance >= restartLine) {
          //エントリー時の残高が取引終了後の残高以下の場合（儲けた）
          console.log('取引を開始します');
          entryBalance = balance; // エントリー時の残高を保存
          console.log(`取引前の残高：${entryBalance}`);
          random = Math.floor(Math.random() * 2);
          while (balance > 200000) {
            //残高20万以下になるまでベット
            await entryFunc();
            await sleep.msleep(1500);
            await balanceTxtToNumber();
          }
          await sleep.msleep(waitingTime); //最後のBETから待つ
          await balanceTxtToNumber();
          returnBalance = balance;
          console.log(`取引後の残高：${returnBalance}`);
          if (restartLine > returnBalance) {
            break;
          }
        }
      }
      if (balance >= quitLine) {
        break;
      }
    }
    if (balance >= quitLine) {
      break;
    }
  }
})();
