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
  bBands: [[],[],[]], 
  operationMarkers: [] 
};


// Express Server configuration
const app = express();
app.use(express.static('public'));

setInterval(run, 20000);

// main
async function run() {
  let allocation = 0.00025;      // > 10/price

  //let endTime = new Date("2021/09/13 20:16:00").getTime();
  let endTime = new Date().getTime();
  let startTime = endTime - (12 * 3600 * 1000);   // 12 horas

  const klines = await api.candleStickData('BTCUSDT', '1m', startTime, endTime, 1000);
  dataPlot.openTime = klines.map(value => value[0]);
  dataPlot.open = klines.map(value => value[1]);
  dataPlot.high = klines.map(value => value[2]);
  dataPlot.low = klines.map(value => value[3]);
  dataPlot.close = klines.map(value => value[4]);
  dataPlot.bBandsvolume = klines.map(value => value[5]);

  const bbandsLength = 20;
  const stdDeviations = 3;
  dataPlot.bBands = await tulind.indicators.bbands.indicator([dataPlot.close], [bbandsLength, stdDeviations]);
  // console.log(dataPlot.bBands);
  
  const inPricesHigh = dataPlot.high.slice(dataPlot.openTime.length - dataPlot.bBands[0].length);
  const inPricesLow = dataPlot.low.slice(dataPlot.openTime.length - dataPlot.bBands[0].length);
  const {prices, operations, sellQty, buyQty, asset, base} = double7(inPricesHigh, inPricesLow, dataPlot.bBands, allocation);

  dataPlot.operationMarkers = operations.map((value, index, array) => {
    if (value !== NaN) return Math.abs(value) * prices[index];
    else return value = NaN;
  })
  // console.log(prices, operations, operationMarkers);

  profitCalculation(dataPlot.close, operations, sellQty, buyQty, asset, base, allocation);
}


// Bot
function double7(inPricesHigh, inPricesLow, bBands, allocation) {
  let prices = [];
  let operations = [];
  let status = 'SELL';
  let sellQty = 0;
  let buyQty = 0;
  let asset = 0;
  let base = 0;
 
  for (let i = 0; i < inPricesHigh.length; i++) {
    if (inPricesHigh[i] > bBands[2][i] && status == 'SELL') {
      status = 'BUY';
      operations[i] = -1;
      sellQty++;
      asset = asset - allocation;
      prices[i] = inPricesHigh[i];
      base = base + allocation * prices[i];
    } 
    else if (inPricesLow[i] < bBands[0][i] && status == 'BUY') {
      status = 'SELL';
      operations[i] = 1;
      buyQty++;
      asset = asset + allocation;
      prices[i] = inPricesLow[i];
      base = base - allocation * prices[i];
    } 
    else {
      operations[i] = NaN;
      prices[i] = NaN;
    }
  }  
  console.log(prices);
  return { prices, operations, sellQty, buyQty, asset, base };
}

function profitCalculation(prices, operations, sellQty, buyQty, asset, base, allocation) {
  console.log(`Operations: ${sellQty + buyQty}, Sells: ${sellQty}, Buys: ${buyQty}`);
  const initPrice = prices[0];
  const lastPrice = prices[prices.length-1];
  console.log(`Init price: ${parseFloat(initPrice).toFixed(2)}, last price: ${parseFloat(lastPrice).toFixed(2)}`);
  console.log(`Asset: ${asset}, Base: ${base}, Profit: ${parseFloat(asset*lastPrice + base).toFixed(2)}`);
  console.log('Estimated fees: ', (sellQty + buyQty) *  allocation * lastPrice * 0.00075);
}

app.use('/data', (req, res) => {
  //let dataPlot = { openTime: openTime, open: open, high: high, low: low, close: close, volume: volume, bBands: bBands, operationMarkers: operationMarkers };
  res.json(dataPlot);
})

app.listen(process.env.PORT, () => {
  console.log('App funcionando bien');
})