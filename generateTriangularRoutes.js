const fs = require('fs');
const axios = require('axios');
const logger = require('./src/utils/logger');

async function getBinanceData() {
    try {
        const serverTimeResponse = await axios.get('https://api.binance.com/api/v3/time');
        const serverTime = serverTimeResponse.data.serverTime;
        logger.info(`Tiempo servidor Binance sincronizado: ${new Date(serverTime).toISOString()}`);

        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        const marketData = {};
        response.data.forEach(ticker => {
            marketData[ticker.symbol] = {
                price: parseFloat(ticker.lastPrice),
                volume: parseFloat(ticker.quoteVolume),
                bid: parseFloat(ticker.bidPrice),
                ask: parseFloat(ticker.askPrice),
                timestamp: serverTime
            };
        });

        return marketData;
    } catch (error) {
        logger.error('Error en Binance:', error.message);
        if (error.response) {
            logger.error('Respuesta de error:', error.response.data);
        }
        throw error;
    }
}

async function getHuobiData() {
    try {
        const response = await axios.get('https://api.huobi.pro/market/tickers', {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Cache-Control': 'no-cache'
            }
        });

        const marketData = {};
        response.data.data.forEach(ticker => {
            const symbol = ticker.symbol.toUpperCase();
            marketData[symbol] = {
                price: parseFloat(ticker.close),
                volume: parseFloat(ticker.vol) * parseFloat(ticker.close), // Convertir a USDT
                bid: parseFloat(ticker.bid),
                ask: parseFloat(ticker.ask),
                timestamp: Date.now()
            };
        });

        return marketData;
    } catch (error) {
        logger.error('Error en Huobi:', error.message);
        if (error.response) {
            logger.error('Respuesta de error:', error.response.data);
        }
        throw error;
    }
}

async function getExchangeData() {
    try {
        const startTime = Date.now();
        logger.info(`Iniciando obtención de datos: ${new Date(startTime).toISOString()}`);

        // Obtener datos de ambos exchanges en paralelo
        const [binanceData, huobiData] = await Promise.all([
            getBinanceData(),
            getHuobiData()
        ]);

        // Validar datos
        const validBinanceData = validateExchangeData(binanceData, 'Binance');
        const validHuobiData = validateExchangeData(huobiData, 'Huobi');

        logger.info('\nResumen de datos obtenidos:');
        logger.info(`Binance: ${Object.keys(validBinanceData).length} pares válidos`);
        logger.info(`Huobi: ${Object.keys(validHuobiData).length} pares válidos`);

        return {
            binance: validBinanceData,
            huobi: validHuobiData,
            timestamp: startTime
        };
    } catch (error) {
        logger.error('Error obteniendo datos de exchanges:', error.message);
        throw error;
    }
}

function validateExchangeData(data, exchangeName) {
    const validData = {};
    let invalidCount = 0;

    for (const [symbol, info] of Object.entries(data)) {
        if (isValidMarketData(info)) {
            validData[symbol] = info;
        } else {
            invalidCount++;
            logger.debug(`Datos inválidos en ${exchangeName} para ${symbol}:`, info);
        }
    }

    if (invalidCount > 0) {
        logger.warn(`${invalidCount} pares ignorados en ${exchangeName} por datos inválidos`);
    }

    return validData;
}

function isValidMarketData(data) {
    return data &&
           typeof data.price === 'number' && data.price > 0 &&
           typeof data.volume === 'number' && data.volume > 0;
}

// ... resto del código igual que antes ...
// ... resto del código anterior ...

async function findArbitrageOpportunities(marketData) {
    try {
        const opportunities = [];
        const minVolume = 10000; // $10,000 mínimo

        for (const symbol in marketData.binance) {
            const binanceData = marketData.binance[symbol];
            const huobiData = marketData.huobi[symbol];

            if (binanceData?.price && huobiData?.price) {
                const binancePrice = parseFloat(binanceData.price);
                const huobiPrice = parseFloat(huobiData.price);
                const binanceVol = parseFloat(binanceData.volume);
                const huobiVol = parseFloat(huobiData.volume);

                if (binancePrice > 0 && huobiPrice > 0 && 
                    binanceVol >= minVolume && huobiVol >= minVolume) {

                    // Determinar dirección del arbitraje
                    const spread = Math.abs(huobiPrice - binancePrice);
                    const avgPrice = (binancePrice + huobiPrice) / 2;
                    const spreadPercent = (spread / avgPrice) * 100;

                    // Calcular volumen máximo seguro
                    const maxTradeVolume = Math.min(
                        binanceVol * 0.05,  // 5% del volumen
                        huobiVol * 0.05,    // 5% del volumen
                        50000               // Máximo $50,000 por operación
                    );

                    // Calcular ganancias y fees
                    const unitsToTrade = maxTradeVolume / avgPrice;
                    const grossProfit = spread * unitsToTrade;
                    
                    const binanceFee = maxTradeVolume * 0.001; // 0.1%
                    const huobiFee = maxTradeVolume * 0.002;   // 0.2%
                    const totalFees = binanceFee + huobiFee;
                    
                    const netProfit = grossProfit - totalFees;
                    const roi = (netProfit / maxTradeVolume) * 100;

                    if (spreadPercent >= 0.1 && netProfit > 0) {
                        opportunities.push({
                            symbol,
                            binancePrice,
                            huobiPrice,
                            spreadPercent,
                            availableVolume: Math.min(binanceVol, huobiVol),
                            maxTradeVolume,
                            direction: huobiPrice > binancePrice ? 'Binance->Huobi' : 'Huobi->Binance',
                            tradeUnits: unitsToTrade,
                            grossProfit,
                            fees: {
                                binance: binanceFee,
                                huobi: huobiFee,
                                total: totalFees
                            },
                            netProfit,
                            roi,
                            timestamp: Date.now()
                        });
                    }
                }
            }
        }

        return opportunities.sort((a, b) => b.netProfit - a.netProfit);
    } catch (error) {
        logger.error('Error en análisis:', error);
        return [];
    }
}

function formatOutput(opportunity) {
    return `
#${opportunity.symbol}
    Binance: ${formatUSD(opportunity.binancePrice)}
    Huobi: ${formatUSD(opportunity.huobiPrice)}
    Spread: ${opportunity.spreadPercent.toFixed(2)}%
    Dirección: ${opportunity.direction}
    Volumen Disponible: ${formatUSD(opportunity.availableVolume)}
    Volumen Máximo Trading: ${formatUSD(opportunity.maxTradeVolume)}
    Unidades a Tradear: ${opportunity.tradeUnits.toFixed(6)}
    Ganancia Bruta: ${formatUSD(opportunity.grossProfit)}
    Fees:
        Binance (0.1%): ${formatUSD(opportunity.fees.binance)}
        Huobi (0.2%): ${formatUSD(opportunity.fees.huobi)}
        Total: ${formatUSD(opportunity.fees.total)}
    Ganancia Neta: ${formatUSD(opportunity.netProfit)}
    ROI: ${opportunity.roi.toFixed(2)}%
    Timestamp: ${new Date(opportunity.timestamp).toLocaleTimeString()}`;
}

function formatUSD(num) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: num < 1 ? 6 : 2
    }).format(num);
}

function standardizeHuobiSymbols(huobiData) {
    const standardized = {};
    for (const [symbol, data] of Object.entries(huobiData)) {
        // Convertir formato de Huobi a formato de Binance
        const standardSymbol = symbol.toUpperCase();
        standardized[standardSymbol] = {
            ...data,
            price: parseFloat(data.price),
            volume: parseFloat(data.volume)
        };
    }
    return standardized;
}

// ... resto del código posterior ...

// ... código anterior igual ...

function formatNumber(number) {
    if (number === undefined || number === null) return 'N/A';
    return number.toLocaleString('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}



async function main() {
    try {
        logger.info('=== Iniciando búsqueda de oportunidades de arbitraje ===');
        
        const marketData = await getExchangeData();
        
        logger.info('\nResumen de datos obtenidos:');
        logger.info(`Binance: ${Object.keys(marketData.binance).length} pares válidos`);
        logger.info(`Huobi: ${Object.keys(marketData.huobi).length} pares válidos`);

        const opportunities = await findArbitrageOpportunities(marketData);
        logger.info(`\nOportunidades encontradas: ${opportunities.length}`);
        
        if (opportunities.length > 0) {
            logger.info('\nMejores oportunidades:');
            opportunities.slice(0, 5).forEach((opp, index) => {
                logger.info(`\n#${index + 1}${formatOutput(opp)}`);
            });
        }

        // Guardar resultados
        fs.writeFileSync(
            'arbitrage_opportunities.json', 
            JSON.stringify({
                timestamp: new Date().toISOString(),
                totalOpportunities: opportunities.length,
                topOpportunities: opportunities.slice(0, 10)
            }, null, 2)
        );

    } catch (error) {
        logger.error('Error en proceso principal:', error);
    }
}

// ... resto del código igual ...

main().catch(error => {
    logger.error('Error fatal:', {
        message: error.message,
        stack: error.stack
    });
});