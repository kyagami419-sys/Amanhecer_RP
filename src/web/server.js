import express from 'express';
import bcrypt from 'bcryptjs';
import { getTranscript } from '../utils/database.js';

export function startWebServer() {
    const app = express();
    app.use(express.urlencoded({ extended: true }));

    app.get('/transcript/:id', async (req, res) => {
        try {
            const transcript = await getTranscript(req.params.id);
            if (!transcript) return res.status(404).send(paginaMensagem('❌ Transcript não encontrado ou já expirou.'));
            res.send(paginaSenha(req.params.id));
        } catch (err) {
            console.error('Erro ao carregar transcript:', err);
            res.status(500).send(paginaMensagem('❌ Erro interno ao carregar o transcript.'));
        }
    });

    app.post('/transcript/:id', async (req, res) => {
        try {
            const transcript = await getTranscript(req.params.id);
            if (!transcript) return res.status(404).send(paginaMensagem('❌ Transcript não encontrado ou já expirou.'));

            const senhaCorreta = await bcrypt.compare(String(req.body.senha || ''), transcript.senha_hash);
            if (!senhaCorreta) return res.status(401).send(paginaSenha(req.params.id, true));

            res.send(transcript.html_content);
        } catch (err) {
            console.error('Erro ao validar senha do transcript:', err);
            res.status(500).send(paginaMensagem('❌ Erro interno ao validar a senha.'));
        }
    });

    app.use((req, res) => res.status(404).send(paginaMensagem('❌ Página não encontrada.')));

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Servidor de transcripts rodando na porta ${PORT}`);
    });
}

function paginaSenha(id, erro = false) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Acesso ao Transcript</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    body { background:#1e1f22; color:#f2f3f5; font-family:'Segoe UI',Arial,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
    .card { background:#2b2d31; padding:40px; border-radius:12px; width:320px; text-align:center; box-shadow:0 8px 24px rgba(0,0,0,0.4); }
    h1 { font-size:20px; margin-bottom:8px; }
    p { color:#949ba4; font-size:14px; margin-bottom:24px; }
    input { width:100%; padding:12px; border-radius:8px; border:none; background:#1e1f22; color:#fff; font-size:16px; text-align:center; letter-spacing:2px; box-sizing:border-box; margin-bottom:16px; }
    button { width:100%; padding:12px; border-radius:8px; border:none; background:#2ecc71; color:#0b1f14; font-weight:bold; font-size:15px; cursor:pointer; }
    button:hover { background:#27ae60; }
    .erro { color:#ed4245; font-size:13px; margin-bottom:16px; }
</style>
</head>
<body>
    <div class="card">
        <h1>🔒 Transcript Protegido</h1>
        <p>Digite a senha enviada na sua DM para acessar o histórico do atendimento.</p>
        ${erro ? '<div class="erro">❌ Senha incorreta. Tente novamente.</div>' : ''}
        <form method="POST" action="/transcript/${id}">
            <input type="text" name="senha" placeholder="Senha de acesso" autofocus required maxlength="20">
            <button type="submit">Acessar Transcript</button>
        </form>
    </div>
</body>
</html>`;
}

function paginaMensagem(msg) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Valkyria Optimization</title>
<style>
    body { background:#1e1f22; color:#f2f3f5; font-family:'Segoe UI',Arial,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
    .card { background:#2b2d31; padding:32px 40px; border-radius:12px; text-align:center; }
</style>
</head>
<body><div class="card">${msg}</div></body>
</html>`;
}