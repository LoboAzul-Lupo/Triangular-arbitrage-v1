const TriangularArbitrage = require('./core/TriangularArbitrage');
const logger = require('./utils/logger');
const config = require('../config/config');

// Logs de prueba usando console.log
console.log('Iniciando programa...');
console.log('Logger:', logger);
console.log('Config:', config);

async function main() {
    try {
        // Log simple con console.log
        console.log('Iniciando sistema de arbitraje triangular');
        
        // Crear instancia del sistema
        const arbitrageBot = new TriangularArbitrage(config);
        console.log('Bot creado exitosamente');

    } catch (error) {
        // Log de error simple
        console.error('Error en el sistema:', error.message);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Error en main:', error.message);
    process.exit(1);
});