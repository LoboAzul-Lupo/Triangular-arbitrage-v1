const logger = require('../utils/logger');
const priceService = require('./priceService');
const triangularArbitrage = require('./triangularArbitrage');

class PriceMonitor {
    constructor(config) {
        this.config = config;
        this.isRunning = false;
        this.initialPairs = [
            'BTC-USDT',
            'ETH-USDT',
            'ETH-BTC',
            'BNB-USDT',
            'XRP-USDT',
            'SOL-USDT'
        ];
        this.lastPrices = {};
        this.updateInterval = config.updateInterval || 2000;
        this.checkCount = 0;
        this.lastLoggedCycle = -1;
        this.minProfitPercent = 0.1; // Bajado a 0.1% para pruebas
        this.minVolume = {
            'BTC-USDT': 100000,
            'ETH-USDT': 50000,
            'ETH-BTC': 50000,
            'BNB-USDT': 25000,
            'XRP-USDT': 10000,
            'SOL-USDT': 25000
        };
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        logger.info(`Iniciando monitoreo de precios:
        - Margen mínimo: ${this.minProfitPercent}%
        - Pares monitoreados: ${this.initialPairs.join(', ')}
        - Volumen mínimo requerido (USDT)`);
        Object.entries(this.minVolume).forEach(([pair, vol]) => {
            logger.info(`  ${pair}: ${vol.toLocaleString()}`);
        });

        while (this.isRunning) {
            try {
                await this.monitorPrices();
                this.checkCount++;
                if (this.checkCount % 10 === 0 && this.checkCount !== this.lastLoggedCycle) {
                    logger.info(`Monitor activo - Ciclo ${this.checkCount} - ${new Date().toLocaleTimeString()}`);
                    this.lastLoggedCycle = this.checkCount;
                }
                await new Promise(resolve => setTimeout(resolve, this.updateInterval));
            } catch (error) {
                logger.error('Error en ciclo de monitoreo:', error);
                await new Promise(resolve => setTimeout(resolve, this.updateInterval * 2));
            }
        }
    }

    async monitorPrices() {
        try {
            const marketData = await priceService.getMarketData(this.initialPairs);
            
            logger.debug('Analizando oportunidades directas y triangulares...');
            
            const directOpportunities = this.analyzeOpportunities(marketData);
            const triangularOpportunities = triangularArbitrage.findArbitrageOpportunities(
                marketData.prices,
                marketData.volumes
            );

            logger.debug(`Análisis completado:
            - Oportunidades directas: ${directOpportunities.length}
            - Oportunidades triangulares: ${triangularOpportunities.length}`);

            // Mostrar precios cada 100 ciclos
            if (this.checkCount % 400 === 0) {
                this.logCurrentPrices(marketData);
            }

            // Mostrar oportunidades directas
            if (directOpportunities.length > 0) {
                this.logDirectOpportunities(directOpportunities);
            }

            // Mostrar oportunidades triangulares
            if (triangularOpportunities.length > 0) {
                this.logTriangularOpportunities(triangularOpportunities);
            }

        } catch (error) {
            logger.error('Error al monitorear precios:', error);
        }
    }

    logCurrentPrices(marketData) {
        logger.info('\n=== Precios Actuales ===');
        for (const pair of this.initialPairs) {
            logger.info(`${pair}:`);
            logger.info(`    Binance: ${marketData.prices.binance[pair].toFixed(4)} (Vol: ${(marketData.volumes.binance[pair] || 0).toLocaleString(undefined, {maximumFractionDigits: 2})} USDT)`);
            logger.info(`    Huobi:   ${marketData.prices.huobi[pair].toFixed(4)} (Vol: ${(marketData.volumes.huobi[pair] || 0).toLocaleString(undefined, {maximumFractionDigits: 2})} USDT)`);
        }
        logger.info('========================\n');
    }

    logDirectOpportunities(opportunities) {
        opportunities.forEach(opp => {
            logger.info(`
🔄 Oportunidad de Arbitraje Directo:
    Par: ${opp.pair}
    ${opp.exchange1}: ${parseFloat(opp.price1).toFixed(4)}
    ${opp.exchange2}: ${parseFloat(opp.price2).toFixed(4)}
    Diferencia: ${opp.diffPercent}%
    Volumen disponible: ${Math.min(opp.volume1, opp.volume2).toLocaleString(undefined, {maximumFractionDigits: 2})} USDT
    Ganancia potencial: ${opp.potentialProfit > 0.01 ? opp.potentialProfit.toFixed(4) : '< 0.01'} USDT`);
        });
    }

    logTriangularOpportunities(opportunities) {
        opportunities.forEach(opp => {
            logger.info(`
🔺 Oportunidad de Arbitraje Triangular:
    Exchange: ${opp.exchange}
    Ruta: ${opp.route}
    Pasos:
        1. ${opp.steps[0].pair}: ${opp.steps[0].rate.toFixed(6)} (${opp.steps[0].amount.toFixed(4)})
        2. ${opp.steps[1].pair}: ${opp.steps[1].rate.toFixed(6)} (${opp.steps[1].amount.toFixed(4)})
        3. ${opp.steps[2].pair}: ${opp.steps[2].rate.toFixed(6)} (${opp.steps[2].amount.toFixed(4)})
    Monto inicial: ${opp.initialAmount} USDT
    Monto final: ${opp.finalAmount.toFixed(4)} USDT
    Beneficio: ${opp.profitLoss.toFixed(4)} USDT (${opp.profitPercent.toFixed(2)}%)
    Liquidez mínima: ${opp.availableLiquidity.toLocaleString()} USDT
    Comisiones totales: ${opp.fees.total.toFixed(4)} USDT (${(opp.fees.rate * 100).toFixed(3)}% por operación)`);
        });
    }

    analyzeOpportunities(marketData) {
        const opportunities = [];
        const exchanges = Object.keys(marketData.prices);

        this.initialPairs.forEach(pair => {
            exchanges.forEach((exchange1, i) => {
                exchanges.slice(i + 1).forEach(exchange2 => {
                    const price1 = parseFloat(marketData.prices[exchange1][pair]);
                    const price2 = parseFloat(marketData.prices[exchange2][pair]);
                    const volume1 = parseFloat(marketData.volumes[exchange1][pair]);
                    const volume2 = parseFloat(marketData.volumes[exchange2][pair]);

                    if (!price1 || !price2 || isNaN(volume1) || isNaN(volume2)) return;

                    const diff = Math.abs(price1 - price2);
                    const diffPercent = (diff / Math.min(price1, price2)) * 100;

                    const minVolume = Math.min(volume1, volume2);
                    const tradeAmount = Math.min(minVolume * 0.1, this.minVolume[pair] || 10000);
                    const potentialProfit = (diff * tradeAmount);

                    if (diffPercent >= this.minProfitPercent) {
                        opportunities.push({
                            pair,
                            exchange1,
                            exchange2,
                            price1: price1.toFixed(6),
                            price2: price2.toFixed(6),
                            volume1,
                            volume2,
                            diffPercent: diffPercent.toFixed(3),
                            potentialProfit,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            });
        });

        return opportunities;
    }

    stop() {
        this.isRunning = false;
        logger.info('Monitor de precios detenido');
    }
}

module.exports = PriceMonitor;