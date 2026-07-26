export default {
    name: 'ready',
    once: false,
    async execute(client) {
        console.log(`✅ Bot pronto! Conectado como ${client.user.tag}`);

        const { getAllPainelStatus, resetStaffStats } = await import('../utils/database.js');

        // ============= ATUALIZAR PAINÉIS DE STATUS =============
        const atualizarPainel = async (painel) => {
            try {
                const guild = client.guilds.cache.get(painel.guild_id);
                if (!guild) return;

                const channel = guild.channels.cache.get(painel.channel_id);
                if (!channel) return;

                const message = await channel.messages.fetch(painel.message_id);
                if (!message) return;

                let jogadoresAtivos = '-';
                let statusText = '🔴 OFFLINE';
                let corEmbed = '#ED4245';

                try {
                    const response = await fetch(`http://${painel.server_ip}:${painel.server_port}/dynamic.json`, { 
                        signal: AbortSignal.timeout(3000) 
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.clients !== undefined) {
                            jogadoresAtivos = data.clients;
                            statusText = '🟢 ONLINE';
                            corEmbed = '#2ecc71';
                        }
                    }
                } catch (error) {
                    statusText = '🔴 OFFLINE';
                    corEmbed = '#ED4245';
                    jogadoresAtivos = '-';
                }

                const { EmbedBuilder } = await import('discord.js');
                const horaAtual = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

                const novoEmbed = new EmbedBuilder()
                    .setColor(corEmbed)
                    .setTitle('Amanhecer Roleplay')
                    .setThumbnail('https://media.discordapp.net/attachments/1526616370354196662/1528036538070601869/Sem_Titulo-1.png?ex=6a67626c&is=6a6610ec&hm=4d42b95270e76c5dabc2d98e1bea6269aa1020bd4e75073d371425937f292980&=&format=webp&quality=lossless&width=566&height=566') 
                    .addFields(
                        { name: '┃ __Status__:', value: `\`\`\`\n${statusText}\n\`\`\``, inline: true },
                        { name: '┃ __Jogadores__:', value: `\`\`\`ini\n[ ${jogadoresAtivos}/${painel.max_slots} ]\n\`\`\``, inline: true },
                        { name: '┃ __IP FiveM__:', value: `\`\`\`bash\nconnect ${painel.server_ip}\n\`\`\``, inline: false }
                    )
                    .setImage('https://media.discordapp.net/attachments/1526616370354196662/1528036538070601869/Sem_Titulo-1.png?ex=6a67626c&is=6a6610ec&hm=4d42b95270e76c5dabc2d98e1bea6269aa1020bd4e75073d371425937f292980&=&format=webp&quality=lossless&width=566&height=566') 
                    .setFooter({ text: `Atualizado a cada 1 minuto | Ultima atualização: ${horaAtual}` });

                await message.edit({ embeds: [novoEmbed] });
            } catch (err) {
                console.error(`Erro ao atualizar painel ${painel.message_id}:`, err.message);
            }
        };

        setInterval(async () => {
            const paineis = await getAllPainelStatus();
            for (const painel of paineis) {
                await atualizarPainel(painel);
                await new Promise(r => setTimeout(r, 500));
            }
        }, 60000);

        // ============= RESET MENSAL DE STATS =============
        // Verifica todo dia se é o 1º do mês
        const verificarReset = async () => {
            const agora = new Date();
            if (agora.getDate() === 1) {
                console.log('🔄 Resetando estatísticas de staff do mês anterior...');
                for (const guild of client.guilds.cache.values()) {
                    try {
                        await resetStaffStats(guild.id);
                        console.log(`✅ Stats resetadas para guild ${guild.name}`);
                    } catch (err) {
                        console.error(`Erro ao resetar stats da guild ${guild.name}:`, err);
                    }
                }
            }
        };

        // Checa a cada 1 hora se deve resetar
        setInterval(verificarReset, 3600000);
        verificarReset(); // Checa logo na inicialização
    }
};