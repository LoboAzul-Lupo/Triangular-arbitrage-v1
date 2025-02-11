const logger = require('../utils/logger');
const fs = require('fs');

class TriangularArbitrage {
    constructor() {
        this.feeRates = {
            binance: 0.001,
            huobi: 0.002
        };

        // Cargar rutas desde archivo
        try {
            const routesData = JSON.parse(fs.readFileSync('triangular_routes.json', 'utf8'));
            this.triangularRoutes = routesData.routes;
            logger.info(`Rutas triangulares cargadas: ${this.triangularRoutes.length}`);
            logger.info(`Última actualización: ${routesData.lastUpdated}`);
        } catch (error) {
            logger.error('Error cargando rutas triangulares:', error);
            this.triangularRoutes = [];
        }
    }

    findArbitrageOpportunities(prices, volumes) {
        const opportunities = [];
        logger.debug('Analizando rutas triangulares...');

        for (const route of this.triangularRoutes) {
            for (const exchange of ['binance', 'huobi']) {
                try {
                    const opportunity = this.calculateTriangularArbitrage(
                        route,
                        exchange,
                        prices[exchange],
                        volumes[exchange]
                    );

                    if (opportunity && opportunity.profitPercent > 0.1) {
                        opportunities.push(opportunity);
                    }
                } catch (error) {
                    logger.debug(`Error en ruta ${route.pairs.join('->')}: ${error.message}`);
                }
            }
        }

        return opportunities;
    }

    // ... resto del código de triangularArbitrage.js ...
}

module.exports = new TriangularArbitrage();