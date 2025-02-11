const logger = require('./src/utils/logger');
const priceService = require('./src/services/priceService');

async function verifyUpdates(duration = 5, interval = 60) {
    const startTime = Date.now();
    const endTime = startTime + (duration * 60 * 1000);
    let iteration = 1;
    let successfulIterations = 0;
    let failedIterations = 0;

    logger.info(`
Iniciando verificación de actualizaciones de precios
Duración: ${duration} minutos
Intervalo: ${interval} segundos
Tiempo inicio: ${new Date(startTime).toISOString()}
Tiempo fin esperado: ${new Date(endTime).toISOString()}
`);

    while (Date.now() < endTime) {
        logger.info(`\n=== Iteración ${iteration} ===`);
        
        try {
            const iterationStart = Date.now();
            
            // Verificar conexión básica primero
            logger.info('Verificando conexión con exchanges...');
            
            const marketData = await priceService.getMarketData();
            
            const binancePairs = Object.keys(marketData.binance).length;
            const huobiPairs = Object.keys(marketData.huobi).length;
            
            if (binancePairs === 0) {
                throw new Error('No se obtuvieron datos de Binance');
            }

            logger.info(`
Datos obtenidos en ${Date.now() - iterationStart}ms
Binance: ${binancePairs} pares
Huobi: ${huobiPairs} pares
Timestamp: ${new Date(marketData.timestamp).toISOString()}
            `);

            // Seguimiento de pares principales
            const samplePairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
            samplePairs.forEach(pair => {
                const binancePrice = marketData.binance[pair]?.price;
                const huobiPrice = marketData.huobi[pair]?.price;
                
                logger.info(`${pair}:
    Binance: ${binancePrice ? `$${binancePrice.toFixed(2)}` : 'N/A'}
    Huobi: ${huobiPrice ? `$${huobiPrice.toFixed(2)}` : 'N/A'}
    Diff: ${binancePrice && huobiPrice ? 
        ((Math.abs(binancePrice - huobiPrice) / binancePrice) * 100).toFixed(4) + '%' 
        : 'N/A'}`);
            });

            successfulIterations++;
        } catch (error) {
            failedIterations++;
            logger.error(`Error en iteración ${iteration}:`, error.message);
            
            // Esperar un poco más si hay error
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        iteration++;
        // Calcular tiempo hasta la próxima iteración
        const timeToNext = Math.max(1000, (interval * 1000) - ((Date.now() - startTime) % (interval * 1000)));
        await new Promise(resolve => setTimeout(resolve, timeToNext));
    }

    logger.info(`
Verificación completada
Total iteraciones: ${iteration - 1}
Exitosas: ${successfulIterations}
Fallidas: ${failedIterations}
Tiempo total: ${((Date.now() - startTime) / 1000).toFixed(1)}s
`);
}

// Ejecutar verificación
verifyUpdates(5, 60).catch(error => {
    logger.error('Error fatal en verificación:', error);
});