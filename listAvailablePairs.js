const axios = require('axios');
const logger = require('./src/utils/logger');

async function listAvailablePairs() {
    try {
        logger.info('=== Iniciando búsqueda de pares ===');

        // Binance
        logger.info('1. Conectando con Binance...');
        const binancePairs = await getBinancePairs();
        logger.info(`Encontrados ${binancePairs.length} pares en Binance`);
        logger.info('\nPrimeros 10 pares de Binance:');
        binancePairs.slice(0, 10).sort().forEach(pair => {
            logger.info(`   ${pair}`);
        });

        // Huobi
        logger.info('\n2. Conectando con Huobi...');
        const huobiPairs = await getHuobiPairs();
        logger.info(`Encontrados ${huobiPairs.length} pares en Huobi`);
        if (huobiPairs.length > 0) {
            logger.info('\nPrimeros 10 pares de Huobi:');
            huobiPairs.slice(0, 10).sort().forEach(pair => {
                logger.info(`   ${pair}`);
            });
        }

        // Pares comunes
        const commonPairs = binancePairs.filter(pair => huobiPairs.includes(pair));
        logger.info(`\n3. Análisis de pares comunes:`);
        logger.info(`   Total de pares comunes: ${commonPairs.length}`);
        
        if (commonPairs.length > 0) {
            logger.info('\nPares comunes encontrados:');
            commonPairs.sort().forEach(pair => {
                logger.info(`   ${pair}`);
            });

            const fs = require('fs');
            fs.writeFileSync(
                'common_pairs.json', 
                JSON.stringify({
                    totalPairs: commonPairs.length,
                    pairs: commonPairs,
                    timestamp: new Date().toISOString()
                }, null, 2)
            );
            logger.info('\nPares comunes guardados en common_pairs.json');
        }

    } catch (error) {
        logger.error('\n❌ Error en la obtención de pares:');
        logger.error(`   Mensaje: ${error.message}`);
    }
}

async function getBinancePairs() {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
        return response.data.symbols
            .filter(symbol => symbol.status === 'TRADING')
            .map(symbol => `${symbol.baseAsset}-${symbol.quoteAsset}`);
    } catch (error) {
        logger.error('Error obteniendo pares de Binance:', error.message);
        return [];
    }
}

async function getHuobiPairs() {
    try {
        logger.info('Solicitando datos a Huobi...');
        const response = await axios.get('https://api.huobi.pro/v1/common/symbols');
        
        if (!response.data || !response.data.data) {
            logger.error('Respuesta de Huobi no tiene el formato esperado');
            return [];
        }

        // Mostrar estructura de los primeros datos
     //   logger.info('\nEstructura de ejemplo de Huobi:');
     //   logger.info(JSON.stringify(response.data.data[0], null, 2));

        const pairs = response.data.data
            .filter(symbol => symbol.state === 'online')
            .map(symbol => {
                // Verificar los campos y su contenido
               // logger.debug(`Procesando símbolo: ${JSON.stringify(symbol)}`);
                
                // En Huobi los campos son 'base-currency' y 'quote-currency'
                const baseCurrency = symbol['base-currency'];
                const quoteCurrency = symbol['quote-currency'];
                
                if (!baseCurrency || !quoteCurrency) {
                    logger.debug('Campos faltantes en el símbolo');
                    return null;
                }
                
                return `${baseCurrency.toUpperCase()}-${quoteCurrency.toUpperCase()}`;
            })
            .filter(pair => pair !== null);

        logger.info(`Pares procesados de Huobi: ${pairs.length}`);
        return pairs;
    } catch (error) {
        logger.error('Error obteniendo pares de Huobi:', error.message);
        if (error.response) {
            logger.error('Respuesta de error de Huobi:', error.response.data);
        }
        return [];
    }
}

logger.info('Iniciando búsqueda de pares...\n');
listAvailablePairs();