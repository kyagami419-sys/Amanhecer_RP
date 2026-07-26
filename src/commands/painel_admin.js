import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('painel_admin')
        .setDescription('Painel geral de configurações do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Painel de Administração', iconURL: interaction.guild.iconURL({ dynamic: true }) })
            .setDescription('>>> Selecione abaixo qual módulo deseja configurar no servidor.')
            .setColor('#2b2d31')
            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }));

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_setup_logs').setLabel('Logs').setStyle(ButtonStyle.Primary).setEmoji('📂'),
            new ButtonBuilder().setCustomId('btn_setup_welcome').setLabel('Boas-Vindas').setStyle(ButtonStyle.Success).setEmoji('👋'),
            new ButtonBuilder().setCustomId('btn_setup_ticket').setLabel('Enviar Painel de Tickets').setStyle(ButtonStyle.Secondary).setEmoji('🎫')
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_ticket_add_cat').setLabel('Adicionar Categoria').setStyle(ButtonStyle.Success).setEmoji('➕'),
            new ButtonBuilder().setCustomId('btn_ticket_del_cat').setLabel('Remover Categoria').setStyle(ButtonStyle.Danger).setEmoji('➖')
        );

        await interaction.reply({ embeds: [embed], components: [row1, row2], flags: 64 });
    }
};