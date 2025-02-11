const PriceMonitor = require('./src/services/priceMonitor');
const config = require('./config/config');
const logger = require('./src/utils/logger');

async function runMonitor() {
    const monitor = new PriceMonitor(config);
    
    // Manejar señales de terminación
    process.on('SIGINT', () => {
        logger.info('Deteniendo monitor...');
        monitor.stop();
    });

    try {
        await monitor.start();
    } catch (error) {
        logger.error('Error iniciando monitor:', error);
    }
}

runMonitor();