import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('painelstatus')
        .setDescription('Envia o painel de status atualizável do servidor'),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const serverIp = '198.1.195.240';
        const serverPort = '30120';
        const maxSlots = '2048';
        const linkCfx = 'https://cfx.re/join/6my8637';

        const gerarEmbed = async () => {
            let jogadoresAtivos = '-';
            let statusText = '🔴 OFFLINE';
            let corEmbed = '#ED4245';

            try {
                const response = await fetch(`http://${serverIp}:${serverPort}/dynamic.json`, { 
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

            const horaAtual = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            return new EmbedBuilder()
                .setColor(corEmbed)
                .setTitle('Amanhecer RolePlay')
                .setThumbnail('https://media.discordapp.net/attachments/1526616370354196662/1528036538070601869/Sem_Titulo-1.png?ex=6a67626c&is=6a6610ec&hm=4d42b95270e76c5dabc2d98e1bea6269aa1020bd4e75073d371425937f292980&=&format=webp&quality=lossless&width=566&height=566') 
                .addFields(
                    { name: '┃ __Status__:', value: `\`\`\`\n${statusText}\n\`\`\``, inline: true },
                    { name: '┃ __Jogadores__:', value: `\`\`\`ini\n[ ${jogadoresAtivos}/${maxSlots} ]\n\`\`\``, inline: true },
                    { name: '┃ __IP FiveM__:', value: `\`\`\`bash\nconnect ${serverIp}\n\`\`\``, inline: false }
                )
                .setImage('https://media.discordapp.net/attachments/1526616370354196662/1528036538070601869/Sem_Titulo-1.png?ex=6a67626c&is=6a6610ec&hm=4d42b95270e76c5dabc2d98e1bea6269aa1020bd4e75073d371425937f292980&=&format=webp&quality=lossless&width=566&height=566') 
                .setFooter({ text: `Atualizado a cada 1 minuto | Ultima atualização: ${horaAtual}` });
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Conectar')
                .setURL(linkCfx)
                .setStyle(ButtonStyle.Link)
                .setEmoji('🔗'),
            new ButtonBuilder()
                .setLabel('Loja VIP')
                .setURL('https://sua-loja-aqui.com') 
                .setStyle(ButtonStyle.Link)
                .setEmoji('🛒'),
            new ButtonBuilder()
                .setLabel('Livro de Regras')
                .setURL('https://seudiscord.com/regras') 
                .setStyle(ButtonStyle.Link)
                .setEmoji('📚')
        );

        const embedInicial = await gerarEmbed();
        const painelMessage = await interaction.channel.send({ embeds: [embedInicial], components: [row] });
        
        // SALVA NO BANCO pra que o bot possa atualizar eternamente
        const { savePainelStatus } = await import('../utils/database.js');
        await savePainelStatus(
            `painel_${interaction.guild.id}`,
            interaction.guild.id,
            interaction.channel.id,
            painelMessage.id,
            serverIp,
            serverPort,
            maxSlots
        );

        await interaction.editReply('✅ Painel de Status criado! O bot atualizará automaticamente a cada 1 minuto.');
    }
};