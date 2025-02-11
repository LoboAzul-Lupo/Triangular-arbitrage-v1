const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../../config/config');

class PriceService {
    constructor() {
        this.binanceClient = axios.create({
            baseURL: 'https://api.binance.com/api/v3',
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        this.huobiClient = axios.create({
            baseURL: 'https://api.huobi.pro',
            timeout: 5000,
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
    }

    async getMarketData() {
        try {
            const startTime = Date.now();
            logger.info(`Iniciando obtención de datos: ${new Date(startTime).toISOString()}`);

            // Obtener datos de ambos exchanges en paralelo
            const [binanceData, huobiData] = await Promise.all([
                this.getBinanceData(),
                this.getHuobiData()
            ]);

            logger.info(`\nDatos obtenidos en ${Date.now() - startTime}ms`);
            return {
                binance: binanceData,
                huobi: huobiData,
                timestamp: startTime
            };
        } catch (error) {
            logger.error('Error obteniendo datos de mercado:', error);
            throw error;
        }
    }

    async getBinanceData() {
        try {
            // Verificar tiempo del servidor
            const serverTimeResponse = await this.binanceClient.get('/time');
            const serverTime = serverTimeResponse.data.serverTime;
            logger.info(`Tiempo servidor Binance sincronizado: ${new Date(serverTime).toISOString()}`);

            const response = await this.binanceClient.get('/ticker/24hr');
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

            logger.info(`Binance: ${Object.keys(marketData).length} pares obtenidos`);
            return marketData;
        } catch (error) {
            logger.error('Error en Binance:', error.message);
            throw error;
        }
    }

    async getHuobiData() {
        try {
            const response = await this.huobiClient.get('/market/tickers');
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

            logger.info(`Huobi: ${Object.keys(marketData).length} pares obtenidos`);
            return marketData;
        } catch (error) {
            logger.error('Error en Huobi:', error.message);
            throw error;
        }
    }

    standardizePair(pair) {
        return pair.toUpperCase();
    }
}

module.exports = new PriceService();