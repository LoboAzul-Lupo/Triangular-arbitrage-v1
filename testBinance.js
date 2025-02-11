const axios = require('axios');
const logger = require('./src/utils/logger');

async function testBinanceConnection() {
    try {
        logger.info('=== Test Básico de Conexión a Binance ===');

        // Test 1: Ping
        logger.info('1. Probando ping...');
        const pingResponse = await axios.get('https://api.binance.com/api/v3/ping', {
            timeout: 5000
        });
        logger.info(`Ping exitoso: ${pingResponse.status}`);

        // Test 2: Tiempo del servidor
        logger.info('\n2. Verificando tiempo del servidor...');
        const timeResponse = await axios.get('https://api.binance.com/api/v3/time');
        const serverTime = timeResponse.data.serverTime;
        const localTime = Date.now();
        const timeDiff = Math.abs(serverTime - localTime);
        logger.info(`Diferencia de tiempo: ${timeDiff}ms`);

        // Test 3: Precio de BTC
        logger.info('\n3. Obteniendo precio de BTC...');
        const btcResponse = await axios.get('https://api.binance.com/api/v3/ticker/price', {
            params: { symbol: 'BTCUSDT' }
        });
        logger.info('Datos BTC completos:', JSON.stringify(btcResponse.data, null, 2));
        logger.info(`Precio BTC: $${parseFloat(btcResponse.data.price).toLocaleString()}`);

        // Test 4: Datos detallados de BTC
        logger.info('\n4. Obteniendo datos 24h de BTC...');
        const btcTickerResponse = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
            params: { symbol: 'BTCUSDT' }
        });
        logger.info('Datos de trading 24h:', {
            precio: `$${parseFloat(btcTickerResponse.data.lastPrice).toLocaleString()}`,
            volumen: `$${parseFloat(btcTickerResponse.data.quoteVolume).toLocaleString()}`,
            cambio24h: `${btcTickerResponse.data.priceChangePercent}%`,
            numeroTrades: btcTickerResponse.data.count
        });

        // Test 5: Order Book
        logger.info('\n5. Obteniendo order book de BTC...');
        const bookResponse = await axios.get('https://api.binance.com/api/v3/depth', {
            params: { 
                symbol: 'BTCUSDT',
                limit: 5
            }
        });
        
        logger.info('Order Book Top 5:');
        logger.info('Bids (Compra):');
        bookResponse.data.bids.forEach(bid => {
            logger.info(`  Precio: $${parseFloat(bid[0]).toLocaleString()} - Cantidad: ${bid[1]} BTC`);
        });
        
        logger.info('Asks (Venta):');
        bookResponse.data.asks.forEach(ask => {
            logger.info(`  Precio: $${parseFloat(ask[0]).toLocaleString()} - Cantidad: ${ask[1]} BTC`);
        });

        // Test 6: Resumen de todos los pares
        logger.info('\n6. Obteniendo todos los pares de trading...');
        const allTickersResponse = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
        const validTickers = allTickersResponse.data.filter(ticker => 
            parseFloat(ticker.quoteVolume) > 1000000 // Solo pares con volumen > $1M
        );
        
        logger.info(`Total pares activos con volumen significativo: ${validTickers.length}`);
        logger.info('Top 5 por volumen:');
        validTickers
            .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, 5)
            .forEach(ticker => {
                logger.info(`${ticker.symbol}:
    Precio: $${parseFloat(ticker.lastPrice).toLocaleString()}
    Volumen 24h: $${parseFloat(ticker.quoteVolume).toLocaleString()}
    Cambio 24h: ${ticker.priceChangePercent}%`);
            });

    } catch (error) {
        logger.error('Error en test:', {
            message: error.message,
            code: error.code,
            response: {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            },
            request: {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers
            }
        });
    }
}

// Ejecutar test
logger.info('Iniciando test de conexión...');
testBinanceConnection()
    .then(() => logger.info('Test completado'))
    .catch(error => logger.error('Error fatal:', error));