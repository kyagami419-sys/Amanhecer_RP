import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { startWebServer } from './web/server.js';

// IMPORTAÇÃO CRUCIAL DA BASE DE DADOS
import { setupDatabase } from './utils/database.js'; 

// ==========================================
// LOAD ENV
// ==========================================
dotenv.config();
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
    console.error("❌ ERRO: O TOKEN não foi encontrado. Verifica o teu ficheiro .env!");
    process.exit(1);
}

// Adicione isto no topo do index.js
const PREFIX = "/"; // Ou o prefixo que você usa, se não usar, coloque qualquer coisa como "!"
global.PREFIX = PREFIX; // Torna o prefixo acessível em todos os arquivos

// ==========================================
// INTENTS
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

startWebServer();

// ==========================================
// CARREGAR COMANDOS E EVENTOS
// ==========================================
async function loadCommandsAndEvents() {
    const commandsPath = path.resolve('src/commands');
    if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = (await import(`./commands/${file}`)).default;
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                console.log(`[COMANDO] Carregado: /${command.data.name}`);
            }
        }
    }

    const eventsPath = path.resolve('src/events');
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const event = (await import(`./events/${file}`)).default;
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`[EVENTO] Carregado: ${event.name}`);
        }
    }
}

// ==========================================
// READY E SINCRONIZAÇÃO DE COMANDOS
// ==========================================
client.once('ready', async () => {
    console.log("=".repeat(50));
    console.log(`✅ LOGADO COMO: ${client.user.tag}`);
    console.log("=".repeat(50));
    
    try {
        const commandsArray = client.commands.map(cmd => cmd.data.toJSON());
        await client.application.commands.set(commandsArray);
        console.log(`🔄 COMANDOS SINCRONIZADOS: ${commandsArray.length}`);
    } catch (error) {
        console.error("❌ ERRO AO SINCRONIZAR COMANDOS:", error);
    }
    console.log("=".repeat(50));
});

client.on('messageCreate', async (message) => {
    // IGNORA TUDO O QUE NÃO FOR COMANDO DE TEXTO ANTIGO
    if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;
    
    // SE NÃO ESTÁ A USAR COMANDOS DE TEXTO (APENAS SLASH), APAGUE TODO ESTE BLOCO!
    // Se quiser manter comandos de texto, aqui deveria estar a lógica de execução.
    console.log(`Comando de texto detetado: ${message.content}`);
});
// client.login(process.env.TOKEN);

// ==========================================
// INICIAR O BOT E A BASE DE DADOS
// ==========================================
try {
    // ESTA LINHA CRIA AS TABELAS QUE ESTAVAM A FALTAR!
    setupDatabase(); 
    console.log("📂 Banco de dados SQLite (Tickets) configurado com sucesso.");
} catch (error) {
    console.error("❌ ERRO NO BANCO DE DADOS:", error);
}

loadCommandsAndEvents().then(() => {
    client.login(TOKEN);
}).catch(err => {
    console.error("❌ ERRO FATAL AO INICIAR O BOT:", err);
});



// ==========================================
// SISTEMA ANTI-CRASH GERAL (NÃO DEIXA O BOT DESLIGAR)
// ==========================================
process.on('unhandledRejection', (reason, promise) => {
    console.log('⚠️ [ANTI-CRASH] Erro ignorado para manter o bot online:', reason);
});

process.on('uncaughtException', (err, origin) => {
    console.log('⚠️ [ANTI-CRASH] Exceção crítica ignorada:', err);
});