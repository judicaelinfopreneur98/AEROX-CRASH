import http from 'http';
import next from 'next';
import { SocketServer } from '../websocket/SocketServer';
import { GameEngine } from '../game-engine/GameEngine';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function bootstrap() {
  try {
    await app.prepare();

    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    // Initialisation du serveur WebSocket temps réel
    const socketServer = SocketServer.getInstance();
    socketServer.init(server);

    // Démarrage de la boucle de jeu autoritaire
    const gameEngine = GameEngine.getInstance();
    gameEngine.start();

    server.listen(port, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 AEROX CRASH : PLATEFORME TEMPS RÉEL PRÊTE`);
      console.log(`🌐 Application Web : http://localhost:${port}`);
      console.log(`⚡ WebSocket Server : ws://localhost:${port}/ws`);
      console.log(`🛡️ Provably Fair    : http://localhost:${port}/provably-fair`);
      console.log(`👑 Dashboard Admin   : http://localhost:${port}/admin`);
      console.log(`======================================================\n`);
    });

    const shutdown = () => {
      console.log('Arrêt sécurisé du serveur AEROX...');
      gameEngine.stop();
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Erreur critique au démarrage du serveur:', err);
    process.exit(1);
  }
}

bootstrap();
