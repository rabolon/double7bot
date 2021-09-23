// Se remplaza la información de coingecko por la de binance

// Modules
const api = require('./api');
const express = require('express');
const path = require('path');
const tulind = require('tulind');

// Global variables
let dataPlot = {
  openTime: [],
  open: [],
  high: [],
  low: [],
  close: [],
  volume: [],
  bBands: [[], [], []],
  prices: []
};

let firstTime = true;
const allocation = 0.00025;
let status = 'SELL';
let sellQty = 0;
let buyQty = 0;
let asset = 0;
let base = 0;
let lastIndex;
let initPrice = 0;
let lastPrice = 0;
const bbandsLength = 20;
const stdDeviations = 1;
let tick = 1;


// Express Server configuration
const app = express();
app.use(express.static('public'));

setInterval(run, 2000);

// main
async function run() {
  if (firstTime) {
    //let endTime = new Date("2021/09/13 20:16:00").getTime();
    let endTime = new Date().getTime();
    let startTime = endTime - (4 * 3600 * 1000);

    const klines = await api.candleStickData('BTCUSDT', '1m', startTime, endTime, 1000);
    dataPlot.openTime = klines.map(value => value[0]);
    dataPlot.open = klines.map(value => value[1]);
    dataPlot.high = klines.map(value => value[2]);
    dataPlot.low = klines.map(value => value[3]);
    dataPlot.close = klines.map(value => value[4]);
    dataPlot.volume = klines.map(value => value[5]);

    dataPlot.bBands = await tulind.indicators.bbands.indicator([dataPlot.close], [bbandsLength, stdDeviations]);

    lastIndex = dataPlot.openTime.length - 1;

    dataPlot.prices.length = lastIndex + 1;
    dataPlot.prices.fill(NaN);
    
    initPrice = dataPlot.close[0];
    firstTime = false;
  }
  else {
    const newKline = await api.candleStickData('BTCUSDT', '1m', null, null, 2);
    // console.log(newKline[0][0], dataPlot.openTime[dataLength-1]);
    if (newKline[0][0] > dataPlot.openTime[lastIndex]) {
      dataPlot.openTime.shift();
      dataPlot.open.shift();
      dataPlot.high.shift();
      dataPlot.low.shift();
      dataPlot.close.shift();
      dataPlot.volume.shift();

      dataPlot.openTime.push(newKline[0][0]);
      dataPlot.open.push(newKline[0][1]);
      dataPlot.high.push(newKline[0][2]);
      dataPlot.low.push(newKline[0][3]);
      dataPlot.close.push(newKline[0][4]);
      dataPlot.volume.push(newKline[0][5]);

      dataPlot.bBands = await tulind.indicators.bbands.indicator([dataPlot.close], [bbandsLength, stdDeviations]);
      dataPlot.prices.shift();
      dataPlot.prices.push(NaN);
      lastPrice = dataPlot.close[lastIndex];


    }

    const price = await api.symbolPriceTicker('BTCUSDT');
    double7(price.price);

  
    console.log(`----------------------------------------------------------------------------------------`);
    console.log(`#${tick++}, Operations: ${sellQty + buyQty}, Sells: ${sellQty}, Buys: ${buyQty}`);
    console.log(`Init price: ${parseFloat(initPrice).toFixed(2)}, last close price: ${parseFloat(dataPlot.close[lastIndex]).toFixed(2)}, tick price: ${parseFloat(price.price).toFixed(2)}`);
    console.log(`Asset: ${asset}, Base: ${base}, Profit: ${parseFloat(asset * lastPrice + base).toFixed(2)}`);
    console.log('Estimated fees: ', (sellQty + buyQty) * allocation * lastPrice * 0.00075);
  }
}


// Bot
function double7(price) {
  //console.log(price, dataPlot.bBands[2][lastIndex - bbandsLength - 1], dataPlot.bBands[0][lastIndex - bbandsLength - 1], status);
  if (price > dataPlot.bBands[2][lastIndex - bbandsLength - 1] && status == 'SELL') {
    status = 'BUY';
    sellQty++;
    asset = asset - allocation;
    dataPlot.prices[lastIndex] = price;
    base = base + allocation * price;
  }
  else if (price < dataPlot.bBands[0][lastIndex - bbandsLength - 1] && status == 'BUY') {
    status = 'SELL';
    buyQty++;
    asset = asset + allocation;
    dataPlot.prices[lastIndex] = price;
    base = base - allocation * price;
  }
}


app.use('/data', (req, res) => {
  res.json(dataPlot);
})

app.listen(process.env.PORT, () => {
  console.log('App funcionando bien');
})