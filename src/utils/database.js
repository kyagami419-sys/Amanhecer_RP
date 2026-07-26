import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('data/tickets.db');

// =========================================================
// CONEXÃO E SETUP
// =========================================================
export function connect() {
    if (!fs.existsSync(path.resolve('data'))) {
        fs.mkdirSync(path.resolve('data'));
    }
    return new sqlite3.Database(DB_PATH);
}

export function setupDatabase() {
    const db = connect();

    console.log('[DB] Iniciando a rotina de criação de tabelas...');

    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS config (
            guild_id INTEGER PRIMARY KEY,
            logs_channel INTEGER
        )`, (err) => {
            if (err) console.error('❌ [DB ERRO] Falha ao criar "config":', err.message);
            else console.log('✅ [DB] Tabela "config" verificada/criada.');
        });

        db.run(`CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id INTEGER,
            nome TEXT,
            emoji TEXT,
            categoria_id TEXT,
            cargo_id TEXT,
            contador INTEGER DEFAULT 0
        )`, (err) => {
            if (err) console.error('❌ [DB ERRO] Falha ao criar "categorias":', err.message);
            else console.log('✅ [DB] Tabela "categorias" verificada/criada.');
        });

        db.run(`CREATE TABLE IF NOT EXISTS tickets (
            channel_id TEXT PRIMARY KEY,
            guild_id TEXT,
            user_id TEXT,
            categoria TEXT,
            ticket_number INTEGER,
            assumido_por TEXT
        )`, (err) => {
            if (err) console.error('❌ [DB ERRO] Falha ao criar "tickets":', err.message);
            else console.log('✅ [DB] Tabela "tickets" verificada/criada.');
        });

        db.run(`CREATE TABLE IF NOT EXISTS transcripts (
            id TEXT PRIMARY KEY,
            channel_id TEXT,
            guild_id TEXT,
            senha_hash TEXT,
            html_content TEXT,
            criado_em TEXT
        )`, (err) => {
            if (err) console.error('❌ [DB ERRO] Falha ao criar "transcripts":', err.message);
            else console.log('✅ [DB] Tabela "transcripts" verificada/criada.');
        });

        db.run(`CREATE TABLE IF NOT EXISTS painelstatus (
            id TEXT PRIMARY KEY,
            guild_id TEXT,
            channel_id TEXT,
            message_id TEXT,
            server_ip TEXT,
            server_port TEXT,
            max_slots TEXT
        )`, (err) => {
            if (err) console.error('❌ [DB ERRO] Falha ao criar "painelstatus":', err.message);
            else console.log('✅ [DB] Tabela "painelstatus" verificada/criada.');
        });

        db.run(`CREATE TABLE IF NOT EXISTS staff_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT,
            staff_id TEXT,
            staff_name TEXT,
            categoria TEXT,
            cargo_id TEXT,
            tickets_atendidos INTEGER DEFAULT 0,
            mes INTEGER,
            ano INTEGER
        )`, (err) => {
            if (err) console.error('❌ [DB ERRO CRÍTICO] Falha ao criar "staff_stats":', err.message);
            else console.log('🚀 [DB SUCESSO] Tabela "staff_stats" montada e pronta para uso!');
        });

        db.run(`CREATE TABLE IF NOT EXISTS tickets_assumidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id TEXT,
            guild_id TEXT,
            staff_id TEXT,
            staff_name TEXT,
            categoria TEXT,
            data_assumido TEXT,
            status TEXT DEFAULT 'aberto'
        )`, (err) => {
            if (err) console.error('❌ [DB ERRO CRÍTICO] Falha ao criar "tickets_assumidos":', err.message);
            else console.log('🚀 [DB SUCESSO] Tabela "tickets_assumidos" montada e pronta para uso!');
        });
    });

    // Enfileira o fechamento do banco para ocorrer apenas após todas as execuções acima
    db.close((err) => {
        if (err) {
            console.error('❌ [DB ERRO] Falha ao fechar o banco de dados de forma segura:', err.message);
        } else {
            console.log('🔒 [DB] Setup concluído e conexão fechada com segurança.');
        }
    });
}

// =========================================================
// FUNÇÕES DE TICKETS BÁSICOS
// =========================================================
export function createTicket(channel_id, guild_id, user_id, categoria, ticket_number) {
    return new Promise((resolve, reject) => {
        const db = connect();
        console.log(`[DEBUG TICKET] Tentando salvar ticket: Canal ${channel_id}, User: ${user_id}`);
        
        db.run(
            `INSERT INTO tickets (channel_id, guild_id, user_id, categoria, ticket_number) VALUES (?, ?, ?, ?, ?)`,
            [channel_id, guild_id, user_id, categoria, ticket_number],
            function(err) {
                db.close();
                if (err) {
                    console.error('❌ [ERRO AO SALVAR TICKET]:', err.message);
                    reject(err);
                } else {
                    console.log('✅ [TICKET SALVO] Ticket inserido no banco com sucesso!');
                    resolve(this.lastID);
                }
            }
        );
    });
}

export function getTicket(channel_id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.get(`SELECT * FROM tickets WHERE channel_id = ?`, [channel_id], (err, row) => {
            db.close();
            if (err) {
                console.error('❌ [ERRO AO BUSCAR TICKET]:', err.message);
                reject(err);
            } else {
                if (!row) console.log(`⚠️ [TICKET FANTASMA] Nenhuma informação encontrada para o canal: ${channel_id}`);
                resolve(row);
            }
        });
    });
}

export function claimTicket(channel_id, user_id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.run(`UPDATE tickets SET assumido_por = ? WHERE channel_id = ?`, [user_id, channel_id], function(err) {
            db.close();
            if (err) reject(err);
            else resolve();
        });
    });
}

// =========================================================
// FUNÇÕES DE CATEGORIAS E CONTADORES
// =========================================================
export function addCategoria(guild_id, nome, emoji, categoria_id, cargo_id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.run(
            `INSERT INTO categorias (guild_id, nome, emoji, categoria_id, cargo_id) VALUES (?, ?, ?, ?, ?)`,
            [guild_id, nome, emoji, categoria_id, cargo_id],
            function(err) {
                db.close();
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

export function getCategorias(guild_id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.all(`SELECT * FROM categorias WHERE guild_id = ?`, [guild_id], (err, rows) => {
            db.close();
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

export function removeCategoria(id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.run(`DELETE FROM categorias WHERE id = ?`, [id], function(err) {
            db.close();
            if (err) reject(err);
            else resolve();
        });
    });
}

export function nextTicketNumber(id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.run(`UPDATE categorias SET contador = contador + 1 WHERE id = ?`, [id], function(err) {
            if (err) {
                db.close();
                return reject(err);
            }
            db.get(`SELECT contador FROM categorias WHERE id = ?`, [id], (err, row) => {
                db.close();
                if (err) reject(err);
                else resolve(row ? row.contador : 1);
            });
        });
    });
}

// =========================================================
// FUNÇÕES DE TRANSCRIPTS
// =========================================================
export function salvarTranscript({ id, channel_id, guild_id, senha_hash, html_content }) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.run(
            `INSERT INTO transcripts (id, channel_id, guild_id, senha_hash, html_content, criado_em) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, channel_id, guild_id, senha_hash, html_content, new Date().toISOString()],
            function(err) {
                db.close();
                if (err) reject(err);
                else resolve(id);
            }
        );
    });
}

export function getTranscript(id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.get(`SELECT * FROM transcripts WHERE id = ?`, [id], (err, row) => {
            db.close();
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// =========================================================
// FUNÇÕES DE PAINEL STATUS
// =========================================================
export function savePainelStatus(id, guild_id, channel_id, message_id, server_ip, server_port, max_slots) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.run(
            `INSERT OR REPLACE INTO painelstatus (id, guild_id, channel_id, message_id, server_ip, server_port, max_slots) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, guild_id, channel_id, message_id, server_ip, server_port, max_slots],
            function(err) {
                db.close();
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

export function getPainelStatus(guild_id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.get(`SELECT * FROM painelstatus WHERE guild_id = ?`, [guild_id], (err, row) => {
            db.close();
            if (err) reject(err);
            else resolve(row);
        });
    });
}

export function getAllPainelStatus() {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.all(`SELECT * FROM painelstatus`, (err, rows) => {
            db.close();
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

// =========================================================
// FUNÇÕES DE STAFF STATS
// =========================================================
export function saveStaffStats(guild_id, staff_id, staff_name, categoria, cargo_id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        const hoje = new Date();
        const mes = hoje.getMonth() + 1;
        const ano = hoje.getFullYear();

        // 1. Verifica se o staff já tem uma linha neste mês
        const checkQuery = `SELECT id FROM staff_stats WHERE guild_id = ? AND staff_id = ? AND categoria = ? AND mes = ? AND ano = ?`;
        
        db.get(checkQuery, [guild_id, staff_id, categoria, mes, ano], (err, row) => {
            if (err) {
                db.close();
                return reject(err);
            }

            if (row) {
                // Já existe! Não fazemos nada para não duplicar.
                db.close();
                resolve();
            } else {
                // Não existe! Criamos a primeira linha zerada.
                db.run(
                    `INSERT INTO staff_stats (guild_id, staff_id, staff_name, categoria, cargo_id, mes, ano, tickets_atendidos) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                    [guild_id, staff_id, staff_name, categoria, cargo_id, mes, ano],
                    function(err) {
                        db.close();
                        if (err) reject(err);
                        else resolve();
                    }
                );
            }
        });
    });
}

export function incrementStaffTickets(guild_id, staff_id, categoria, staff_name) {
    return new Promise((resolve, reject) => {
        const db = connect();
        const hoje = new Date();
        const mes = hoje.getMonth() + 1;
        const ano = hoje.getFullYear();

        // A MÁGICA ESTÁ AQUI: Adicionamos o "AND categoria = ?" no final do código.
        // Assim, é impossível ele dar o ponto na categoria errada.
        const query = `
            UPDATE staff_stats 
            SET tickets_atendidos = tickets_atendidos + 1 
            WHERE guild_id = ? AND staff_id = ? AND categoria = ? AND mes = ? AND ano = ?
        `;

        db.run(query, [guild_id, staff_id, categoria, mes, ano], function(err) {
            db.close();
            if (err) {
                console.error('❌ [ERRO DB] Falha ao incrementar o ponto do staff:', err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export function getStaffStats(guild_id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        const hoje = new Date();
        const mes = hoje.getMonth() + 1;
        const ano = hoje.getFullYear();

        db.all(
            `SELECT * FROM staff_stats WHERE guild_id = ? AND mes = ? AND ano = ? ORDER BY categoria, tickets_atendidos DESC`,
            [guild_id, mes, ano],
            (err, rows) => {
                db.close();
                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

export function saveTicketAssumido(channel_id, guild_id, staff_id, staff_name, categoria) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.run(
            `INSERT INTO tickets_assumidos (channel_id, guild_id, staff_id, staff_name, categoria, data_assumido) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [channel_id, guild_id, staff_id, staff_name, categoria, new Date().toISOString()],
            function(err) {
                db.close();
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

export function getTicketsAssumidos(guild_id, staff_id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.all(
            `SELECT * FROM tickets_assumidos WHERE guild_id = ? AND staff_id = ? AND status = 'aberto'`,
            [guild_id, staff_id],
            (err, rows) => {
                db.close();
                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

export function closeTicketAssumido(channel_id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        db.run(
            `UPDATE tickets_assumidos SET status = 'fechado' WHERE channel_id = ?`,
            [channel_id],
            function(err) {
                db.close();
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

export function resetStaffStats(guild_id) {
    return new Promise((resolve, reject) => {
        const db = connect();
        const hoje = new Date();
        const mesAnterior = hoje.getMonth();
        const ano = hoje.getFullYear();

        db.run(
            `DELETE FROM staff_stats WHERE guild_id = ? AND mes = ? AND ano = ?`,
            [guild_id, mesAnterior, ano],
            function(err) {
                db.close();
                if (err) reject(err);
                else resolve();
            }
        );
    });
}