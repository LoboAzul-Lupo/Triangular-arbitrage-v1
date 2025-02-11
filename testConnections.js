const priceService = require('./src/services/priceService');
const logger = require('./src/utils/logger');

async function testExchangeConnections() {
    try {
        logger.info('Iniciando prueba de conexiones...');
        
        const pairs = ['BTC-USDT', 'ETH-USDT', 'ETH-BTC'];
        logger.info('Consultando pares:', pairs);

        const binancePrices = await priceService.getBinancePrices(pairs);
        logger.info('Precios Binance:', binancePrices);

        const huobiPrices = await priceService.getHuobiPrices(pairs);
        logger.info('Precios Huobi:', huobiPrices);

        const allPrices = {
            binance: binancePrices,
            huobi: huobiPrices
        };

        console.log('Todos los precios:', JSON.stringify(allPrices, null, 2));
    } catch (error) {
        logger.error('Error durante la prueba:', error.message);
        if (error.response) {
            logger.error('Respuesta del exchange:', error.response.data);
        }
    }
}

testExchangeConnections();