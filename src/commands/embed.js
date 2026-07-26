import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Criar uma embed personalizada no canal')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction) {
        // 1. Cria a janela do formulário
        const modal = new ModalBuilder()
            .setCustomId('modal_autoembed')
            .setTitle('Criar Embed');

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('embed_titulo').setLabel('Título').setStyle(TextInputStyle.Short).setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('embed_descricao').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('embed_imagem').setLabel('Imagem URL').setStyle(TextInputStyle.Short).setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('embed_footer').setLabel('Footer').setStyle(TextInputStyle.Short).setRequired(false))
        );

        // Abre a janela para si
        await interaction.showModal(modal);

        // 2. Fica "à escuta" da sua resposta neste mesmo ficheiro
        const filter = (i) => i.customId === 'modal_autoembed' && i.user.id === interaction.user.id;

        try {
            // O bot aguarda até você clicar em "Enviar"
            const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 300000 });

            // 3. Captura o que você escreveu
            const titulo = modalInteraction.fields.getTextInputValue('embed_titulo');
            const descricao = modalInteraction.fields.getTextInputValue('embed_descricao');
            const imagem = modalInteraction.fields.getTextInputValue('embed_imagem');
            const footer = modalInteraction.fields.getTextInputValue('embed_footer');

            // 4. Monta o visual "Container"
            const customEmbed = new EmbedBuilder()
                .setColor('#ff7300') // Cor escura invisível do Discord
                .setDescription(descricao);

            if (titulo) customEmbed.setTitle(titulo);
            if (imagem) customEmbed.setImage(imagem);
            if (footer) customEmbed.setFooter({ text: footer });

            // 5. Envia no canal e responde silenciosamente para não dar erro
            await modalInteraction.channel.send({ embeds: [customEmbed] });
            await modalInteraction.reply({ content: '✅ Embed criado com sucesso!', ephemeral: true });

        } catch (error) {
            console.log('Tempo esgotado ou erro ao preencher o modal da embed.', error);
        }
    }
};