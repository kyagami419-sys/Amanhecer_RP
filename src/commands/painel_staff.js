import { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('painel_staff')
        .setDescription('Painel de desempenho do staff do mês')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Não precisamos mais puxar "getCategorias", o banco de stats já tem tudo!
        const { getStaffStats } = await import('../utils/database.js');
        const stats = await getStaffStats(interaction.guild.id);

        if (!stats || stats.length === 0) {
            // Uma resposta mais amigável visualmente quando o mês reseta
            const embedVazia = new EmbedBuilder()
                .setTitle('📊 Desempenho Staff')
                .setColor('#ED4245')
                .setDescription('Nenhuma estatística de atendimento registrada neste mês.');
            return await interaction.editReply({ embeds: [embedVazia] });
        }

        // 1. Agrupa por categoria de forma 100% DINÂMICA
        const statsPorCategoria = {};

        stats.forEach(stat => {
            // Pega o nome exato que está no banco (ou 'Geral' se houver falha)
            const catNome = stat.categoria || 'Geral';
            
            // Se a gaveta dessa categoria ainda não existe, cria ela agora
            if (!statsPorCategoria[catNome]) {
                statsPorCategoria[catNome] = [];
            }
            
            statsPorCategoria[catNome].push(stat);
        });

        const hoje = new Date();
        const mesNome = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        const embed = new EmbedBuilder()
            .setTitle(`📊 Desempenho Staff - ${mesNome}`)
            .setColor('#2ecc71')
            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }));

        // 2. Monta os fields lendo as gavetas que criamos dinamicamente
        for (const [categoria, staffList] of Object.entries(statsPorCategoria)) {
            
            // Organiza do maior número de tickets para o menor (Ranking top 1!)
            staffList.sort((a, b) => b.tickets_atendidos - a.tickets_atendidos);

            let fieldValue = '';
            staffList.forEach((staff, index) => {
                // Adicionei um destaque (inline code) na quantidade de tickets para ficar mais bonito
                fieldValue += `**${index + 1}.** <@${staff.staff_id}> - \`${staff.tickets_atendidos}\` tickets\n`;
            });

            embed.addFields({ name: `🏆 ${categoria}`, value: fieldValue, inline: false });
        }

        const proximoReset = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
        embed.setFooter({ text: `Próximo reset: ${proximoReset.toLocaleDateString('pt-BR')}` });

        await interaction.editReply({ embeds: [embed] });
    }
};