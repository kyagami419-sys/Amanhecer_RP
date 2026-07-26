import { 
    EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, MessageFlags,
    ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType, 
    UserSelectMenuBuilder, StringSelectMenuBuilder, PermissionsBitField,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder,AttachmentBuilder
} from 'discord.js';
import fs from 'fs';
import path from 'path';

export default {
    name: 'interactionCreate',
    async execute(interaction, client) {

        console.log(`[DEBUG] Interação recebida: ${interaction.customId || 'Sem ID'} | Tipo: ${interaction.type}`);
        
        // ==========================================
        // 0. EXECUTAR SLASH COMMANDS
        // ==========================================
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`❌ Erro no comando ${interaction.commandName}:`, error.message);
                try {
                    const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
                    await interaction[replyMethod]({ content: '❌ Ocorreu um erro ao executar este comando. A administração foi notificada.', flags: MessageFlags.Ephemeral });
                } catch (fallbackError) {
                    console.error('⚠️ A interação expirou antes de podermos enviar a mensagem de erro.');
                }
            }
        }

        // ==========================================
        // 1. PROCESSAMENTO DE BOTÕES
        // ==========================================
        else if (interaction.isButton()) {

            // ------------------------------------------
            // TRAVA DE SEGURANÇA (BOTÕES DE ATENDIMENTO)
            // ------------------------------------------
            const botoesStaff = [
                'btn_ticket_chamar', 'btn_ticket_add_user', 'btn_ticket_rem_user', 
                'btn_ticket_mover', 'btn_ticket_rename', 'btn_fechar_ticket', 'btn_assumir_ticket'
            ];

            if (botoesStaff.includes(interaction.customId)) {
                const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
                let isStaff = false;

                const { getTicket, getCategorias } = await import('../utils/database.js');
                const ticket = await getTicket(interaction.channel.id);

                if (ticket) {
                    const categorias = await getCategorias(interaction.guild.id);
                    const categoria = categorias.find(cat => cat.nome === ticket.categoria);
                    if (categoria && interaction.member.roles.cache.has(categoria.cargo_id)) {
                        isStaff = true;
                    }
                }

                if (!isAdmin && !isStaff) {
                    return interaction.reply({ 
                        content: '❌ **Acesso Negado:** Apenas a equipa da Valkyria pode usar estes controlos.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }

            // AVALIAÇÃO DE TICKET
            if (interaction.customId.startsWith('avaliar_ticket_')) {
                const staffId = interaction.customId.replace('avaliar_ticket_', '');
                
                try {
                    const modalAvaliacao = new ModalBuilder()
                        .setCustomId(`modal_avaliacao_${staffId}`)
                        .setTitle('Avaliação do Suporte');

                    const notaInput = new TextInputBuilder()
                        .setCustomId('nota_staff')
                        .setLabel('Nota de 1 a 5 (Sendo 5 Excelente)')
                        .setPlaceholder('Ex: 5')
                        .setMaxLength(1)
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    const feedbackInput = new TextInputBuilder()
                        .setCustomId('feedback_staff')
                        .setLabel('Deixe um comentário (Opcional)')
                        .setPlaceholder('O atendimento foi muito rápido e eficiente!')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false);

                    modalAvaliacao.addComponents(
                        new ActionRowBuilder().addComponents(notaInput),
                        new ActionRowBuilder().addComponents(feedbackInput)
                    );

                    await interaction.showModal(modalAvaliacao);
                } catch (error) {
                    // Prevenção de duplo clique
                }
            }

            // PAINEL ADMIN (LOGS, WELCOME, TICKETS)
            else if (interaction.customId === 'btn_setup_logs') {
                const row1 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('cfg_log_entrada').setPlaceholder('Canal de Entrada (Welcome)').setChannelTypes(ChannelType.GuildText));
                const row2 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('cfg_log_saida').setPlaceholder('Canal de Saída (Leave)').setChannelTypes(ChannelType.GuildText));
                const row3 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('cfg_log_ticket').setPlaceholder('Canal de Logs de Tickets').setChannelTypes(ChannelType.GuildText));
                
                await interaction.reply({ 
                    content: '📂 **Configuração de Logs**\nSelecione os canais abaixo para registrar as atividades:', 
                    components: [row1, row2, row3],
                    flags: MessageFlags.Ephemeral
                });
            }
            else if (interaction.customId === 'btn_setup_welcome') {
                try {
                    const modal = new ModalBuilder().setCustomId('modal_welcome').setTitle('Configurar Boas Vindas');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('welcome_msg').setLabel('Mensagem').setStyle(TextInputStyle.Paragraph).setPlaceholder('Bem-vindo {member} à nossa loja!')),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('welcome_img').setLabel('Imagem URL (Banner)').setStyle(TextInputStyle.Short).setRequired(false))
                    );
                    await interaction.showModal(modal);
                } catch (e) {}
            }
            else if (interaction.customId === 'btn_setup_ticket') {
                try {
                    const modal = new ModalBuilder().setCustomId('modal_ticket_setup').setTitle('Configurar Painel Ticket');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('painel_titulo').setLabel('Título').setPlaceholder('Central de Atendimento').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('painel_descricao').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('painel_imagem').setLabel('URL da imagem').setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('painel_footer').setLabel('Footer').setStyle(TextInputStyle.Short).setRequired(false))
                    );
                    await interaction.showModal(modal);
                } catch (e) {}
            }

            else if (interaction.customId === 'btn_ticket_del_cat') {
    const { getCategorias } = await import('../utils/database.js');
    const categorias = await getCategorias(interaction.guild.id);

    if (categorias.length === 0) {
        return interaction.reply({ 
            content: '❌ Nenhum departamento cadastrado para remover.', 
            flags: MessageFlags.Ephemeral 
        });
    }

    const selectDel = new StringSelectMenuBuilder()
        .setCustomId('select_del_categoria')
        .setPlaceholder('🗑️ Selecione o departamento para remover');

    categorias.forEach(cat => {
        selectDel.addOptions({
            label: cat.nome,
            value: String(cat.id), // ID único da linha no banco
            emoji: cat.emoji || '🎟️'
        });
    });

    await interaction.reply({
        content: '⚠️ Selecione abaixo o departamento que deseja **remover permanentemente**:',
        components: [new ActionRowBuilder().addComponents(selectDel)],
        flags: MessageFlags.Ephemeral
    });
}

// 1. Botão Iniciar
else if (interaction.customId === 'btn_ticket_add_cat') {
    await interaction.reply({ 
        content: '✏️ Digite o nome do departamento no chat:', 
        flags: MessageFlags.Ephemeral 
    });
    
    const filter = (m) => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async (m) => {
        const nome = m.content;
        m.delete().catch(() => {});

        const catMenu = new ChannelSelectMenuBuilder()
            .setCustomId(`wizard_cat_${nome}`)
            .setPlaceholder('📁 Selecione a categoria')
            .setChannelTypes(ChannelType.GuildCategory);

        await interaction.followUp({
            content: `✅ Nome: **${nome}**. Selecione a categoria:`,
            components: [new ActionRowBuilder().addComponents(catMenu)],
            flags: MessageFlags.Ephemeral
        });
    });
}

// 2. Selecionou Categoria
// 2. Selecionou Categoria
else if (interaction.customId.startsWith('wizard_cat_')) {
    const nome = interaction.customId.replace('wizard_cat_', '');
    const catId = interaction.values[0];
    
    const roleMenu = new RoleSelectMenuBuilder()
        .setCustomId(`wizard_role_${catId}_${nome}`)
        .setPlaceholder('👮 Selecione o cargo');

    // MODO ULTRA SIMPLES: Sem Container, sem Embed, sem Flags V2
    await interaction.update({
        content: `Departamento: **${nome}**\nAgora selecione o cargo responsável:`,
        components: [new ActionRowBuilder().addComponents(roleMenu)],
        embeds: [], // Garante que não há embeds
        flags: 0    // Força a remoção de qualquer flag V2
    });
}

// 3. Finalização
else if (interaction.customId.startsWith('wizard_role_')) {
    const partes = interaction.customId.replace('wizard_role_', '').split('_');
    const catId = partes[0];
    const nome = partes.slice(1).join('_');
    const cargoId = interaction.values[0];

    const { addCategoria } = await import('../utils/database.js');
    try {
        await addCategoria(interaction.guild.id, nome, '🎟️', catId, cargoId);

        // A SOLUÇÃO DEFINITIVA:
        // 1. Avisamos o Discord que recebemos o clique
        await interaction.deferUpdate();
        
        // 2. Apagamos a mensagem do menu que está com o formato "bugado" preso nela
        await interaction.deleteReply().catch(() => {});

        // 3. Enviamos a confirmação como uma MENSAGEM NOVA. Sem bugs, sem conflitos!
        await interaction.followUp({
            content: `✅ Departamento **${nome}** configurado com sucesso!`,
            flags: MessageFlags.Ephemeral
        });
        
    } catch (error) {
        console.error(error);
        if (!interaction.deferred) await interaction.deferUpdate().catch(() => {});
        await interaction.followUp({
            content: '❌ Erro ao salvar no banco.',
            flags: MessageFlags.Ephemeral
        });
    }
}
            // TICKET: AÇÕES DOS OFICIAIS DENTRO DO CANAL
            else if (interaction.customId === 'btn_ticket_chamar') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                let userId = interaction.channel.topic;
                if (!userId) {
                    const { getTicket } = await import('../utils/database.js');
                    const ticket = await getTicket(interaction.channel.id);
                    if (ticket) userId = ticket.user_id;
                }
                if (!userId) return interaction.editReply('❌ Erro: Não foi possível identificar o cliente dono deste ticket.');

                try {
                    const criador = await interaction.guild.members.fetch(userId);
                    const containerDM = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔔 Notificação de Suporte\nOlá, a equipa da Valkyria solicitou a sua presença no atendimento <#${interaction.channel.id}>.`))
                        .addSeparatorComponents(new SeparatorBuilder())
                        .addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('Clique abaixo para se dirigir ao canal.')).setButtonAccessory(new ButtonBuilder().setLabel('Ir para o Chamado').setURL(`https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}`).setStyle(ButtonStyle.Link).setEmoji('🎫')));
                    
                    await criador.send({ components: [containerDM], flags: MessageFlags.IsComponentsV2 });
                    await interaction.editReply(`✅ O cliente (<@${userId}>) foi notificado via DM com sucesso!`);
                    await interaction.channel.send({ content: `🔔 Atenção <@${userId}>, a sua presença foi solicitada por ${interaction.user.toString()}.` });
                } catch (error) {
                    await interaction.editReply(`❌ O cliente <@${userId}> tem as **Mensagens Diretas fechadas**. Notifiquei-o apenas aqui no canal.`);
                    await interaction.channel.send({ content: `🔔 Atenção <@${userId}>, a sua presença foi solicitada por ${interaction.user.toString()}.\n*(⚠️ Aviso: A notificação via DM falhou).*` });
                }
            }
            else if (interaction.customId === 'btn_ticket_add_user') {
                const menu = new UserSelectMenuBuilder().setCustomId('select_ticket_add_user').setPlaceholder('➕ Selecione a pessoa');
                await interaction.reply({ content: 'Selecione abaixo quem você deseja **adicionar** a esta sala:', components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral });
            }
            else if (interaction.customId === 'btn_ticket_rem_user') {
                const menu = new UserSelectMenuBuilder().setCustomId('select_ticket_rem_user').setPlaceholder('❌ Selecione a pessoa');
                await interaction.reply({ content: 'Selecione abaixo quem você deseja **remover** desta sala:', components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral });
            }
            else if (interaction.customId === 'btn_ticket_mover') {
                const menu = new ChannelSelectMenuBuilder().setCustomId('select_ticket_mover').setPlaceholder('🔄 Selecione a nova categoria').setChannelTypes(ChannelType.GuildCategory);
                await interaction.reply({ content: 'Selecione abaixo a **nova Categoria** para onde deseja despachar este ticket:', components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral });
            }
            else if (interaction.customId === 'btn_ticket_rename') {
                try {
                    const modal = new ModalBuilder().setCustomId('modal_ticket_rename').setTitle('Renomear Documento');
                    const inputNome = new TextInputBuilder().setCustomId('input_new_name').setLabel('Novo nome para o chamado').setPlaceholder('Ex: aguardando-resposta').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(inputNome));
                    await interaction.showModal(modal);
                } catch (error) { }
            }
            else if (interaction.customId === 'btn_assumir_ticket') {
    // 1. Importa a função getTicket para descobrirmos a categoria real
    const { claimTicket, saveStaffStats, getTicket } = await import('../utils/database.js');
    
    // 2. Procura qual é a categoria verdadeira que este ticket tem no banco
    const ticket = await getTicket(interaction.channel.id);
    const categoriaReal = ticket && ticket.categoria ? ticket.categoria : 'Geral'; 
    // Se por acaso não achar, ele joga para 'Geral' em vez de 'suporte' fixo

    // 3. Salva no banco de dados com o nome verdadeiro da categoria!
    await claimTicket(interaction.channel.id, interaction.user.id);
    await saveStaffStats(interaction.guild.id, interaction.user.id, interaction.user.username, categoriaReal, null);

    // 4. Resposta visual para o staff
    await interaction.reply({ content: `✅ Você assumiu este atendimento!`, flags: MessageFlags.Ephemeral });

    // ... (MANTENHA O RESTO DO SEU CÓDIGO DAQUI PARA BAIXO - A PARTE DO TRY CATCH E DOS BOTÕES) ...
    // 3. Atualiza os botões do painel do canal (desativando o botão de assumir)
    try {
        // Recria os componentes de forma limpa para evitar duplicidade
        const containerAtendimento = new ContainerBuilder()
            .addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔒 **Assumido por:** ${interaction.user.toString()}`)).setButtonAccessory(new ButtonBuilder().setCustomId('btn_assumir_ticket_off').setLabel('Assumido').setStyle(ButtonStyle.Success).setDisabled(true)))
            .addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('✅ **Finalizar Chamado**')).setButtonAccessory(new ButtonBuilder().setCustomId('btn_fechar_ticket').setLabel('Finalizar').setStyle(ButtonStyle.Danger)));

        const actionRowInferior = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_ticket_chamar').setLabel('Notificar').setStyle(ButtonStyle.Secondary).setEmoji('🔔'),
            new ButtonBuilder().setCustomId('btn_ticket_add_user').setLabel('Adicionar').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
            new ButtonBuilder().setCustomId('btn_ticket_rem_user').setLabel('Remover').setStyle(ButtonStyle.Secondary).setEmoji('➖'),
            new ButtonBuilder().setCustomId('btn_ticket_mover').setLabel('Transferir').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
            new ButtonBuilder().setCustomId('btn_ticket_rename').setLabel('Renomear').setStyle(ButtonStyle.Secondary).setEmoji('✏️')
        );

        // Edita a mensagem original do ticket onde o botão foi Clicado
        await interaction.message.edit({
            components: [containerAtendimento, actionRowInferior],
            flags: MessageFlags.IsComponentsV2
        });
    } catch (e) {
        console.error("Erro ao atualizar os botões do painel:", e);
    }
}
            else if (interaction.customId === 'btn_fechar_ticket') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    // Como não há mais modal, deixamos uma mensagem padrão
    const consideracoes = 'Ticket encerrado rapidamente pelo painel.';
    const staffUser = interaction.user;
    
    try {
        await interaction.editReply('🔒 Gerando transcript e finalizando o atendimento...');

        const discordTranscripts = await import('discord-html-transcripts');
        const crypto = await import('crypto');
        const bcrypt = await import('bcryptjs');
        const { salvarTranscript, getTicket, closeTicketAssumido, incrementStaffTickets } = await import('../utils/database.js');

        // Busca o ticket UMA VEZ
        const ticket = await getTicket(interaction.channel.id) || {};

        // 1. Lógica do staff ganhar ponto (Funciona se ele assumiu ou se apenas clicou em fechar)
        const staffIdParaPontuar = ticket.assumido_por || interaction.user.id;
        const staffNomeParaPontuar = interaction.user.username;
        const categoriaDoTicket = ticket.categoria || 'Suporte';

        try {
            await incrementStaffTickets(interaction.guild.id, staffIdParaPontuar, categoriaDoTicket, staffNomeParaPontuar);
            await closeTicketAssumido(interaction.channel.id);
        } catch (err) {
            console.error(`[ERRO STAFF] Falha ao salvar o ponto no banco de dados:`, err);
        }

        // 2. Gera o HTML como string
        const htmlContent = await discordTranscripts.createTranscript(interaction.channel, {
            limit: -1, returnType: 'string', filename: `ticket-${interaction.channel.name}.html`, saveImages: false, poweredBy: false
        });

        let userId = interaction.channel.topic;
        if (!userId && ticket) userId = ticket.user_id;

        // 3. Envia a DM com o Transcript
        if (userId) {
            try {
                const jogador = await interaction.guild.members.fetch(userId);
                
                const ticketId = interaction.channel.name.split('-')[1] || Math.floor(Math.random() * 90000);
                const categoriaNome = ticket.categoria || 'Suporte';

                const senhaAcesso = Math.floor(1000000 + Math.random() * 9000000).toString();
                const senhaHash = await bcrypt.hash(senhaAcesso, 10);
                const tokenTranscript = crypto.randomBytes(16).toString('hex');

                await salvarTranscript({
                    id: tokenTranscript,
                    channel_id: interaction.channel.id,
                    guild_id: interaction.guild.id,
                    senha_hash: senhaHash,
                    html_content: htmlContent
                });

                const linkTranscript = `${process.env.TRANSCRIPT_DOMAIN}/transcript/${tokenTranscript}`;

                // A Embed que criamos antes!
                const embedDM = new EmbedBuilder()
                    .setTitle('📋 Ticket Finalizado')
                    .setColor('#ff4747')
                    .setDescription(`Seu chamado de protocolo \`${ticketId}\` no departamento de **${categoriaNome}** foi encerrado.`)
                    .addFields(
                        { name: 'Staff Responsável', value: `\`${staffUser.username}\``, inline: true },
                        { name: 'Senha de Acesso', value: `\`${senhaAcesso}\``, inline: true },
                        { name: 'Considerações', value: `> ${consideracoes}` }
                    )
                    .setFooter({ text: 'Clique no botão abaixo para acessar o histórico completo da conversa.' });

                const botoesFinais = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('📄 Ver Transcript').setStyle(ButtonStyle.Link).setURL(linkTranscript),
                    new ButtonBuilder().setCustomId(`avaliar_ticket_${staffUser.id}`).setLabel('Avaliar Atendimento').setStyle(ButtonStyle.Success).setEmoji('⭐')
                );
                
                await jogador.send({ embeds: [embedDM], components: [botoesFinais] });
                
            } catch (err) {
                console.error(`[ERRO] Falha ao enviar DM para ${userId}:`, err.message);
            }
        }
        
        // 4. Exclui o canal do ticket após 3 segundos
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (e) {
                console.error("Erro ao deletar canal do ticket:", e);
            }
        }, 3000);

    } catch (errorGlobal) {
        console.error("Erro fatal ao fechar ticket:", errorGlobal);
    }
}
        }

        // ==========================================
        // 2. PROCESSAMENTO DE MODAIS (SUBMIT)
        // ==========================================
        else if (interaction.isModalSubmit()) {

            if (interaction.customId === 'modal_welcome') {
                const mensagem = interaction.fields.getTextInputValue('welcome_msg');
                const imagem = interaction.fields.getTextInputValue('welcome_img');
                const filePath = path.resolve('data/memberlogs.json');
                if (!fs.existsSync('data')) fs.mkdirSync('data');
                let data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : {};
                if (!data[interaction.guild.id]) data[interaction.guild.id] = {};
                data[interaction.guild.id].welcome_msg = mensagem;
                if (imagem) data[interaction.guild.id].welcome_img = imagem;
                fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
                await interaction.reply({ content: '✅ Sistema de Boas-Vindas atualizado com sucesso!', flags: MessageFlags.Ephemeral });
            }
            else if (interaction.customId === 'modal_ticket_rename') {
                const novoNome = interaction.fields.getTextInputValue('input_new_name');
                try {
                    await interaction.channel.setName(novoNome, `Ticket renomeado por ${interaction.user.tag}`);
                    await interaction.reply({ content: `✅ O registro do chamado foi alterado com sucesso!`, flags: MessageFlags.Ephemeral });
                    const containerRename = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 📝 Ticket Renomeado\nO nome deste chamado foi alterado para \`${novoNome}\` pelo Staff ${interaction.user.toString()}.`));
                    await interaction.channel.send({ components: [containerRename], flags: MessageFlags.IsComponentsV2 });
                } catch (error) {
                    await interaction.reply({ content: '❌ Erro ao renomear o documento.\n**Aviso:** O Discord só permite alterar o nome de uma sala **2 vezes a cada 10 minutos**.', flags: MessageFlags.Ephemeral });
                }
            }
            else if (interaction.customId === 'modal_ticket_setup') {const { getCategorias } = await import('../utils/database.js');
const categorias = await getCategorias(interaction.guild.id);

if (categorias.length === 0) return interaction.reply({ content: '❌ Nenhum departamento registrado.', flags: MessageFlags.Ephemeral });

const titulo = interaction.fields.getTextInputValue('painel_titulo');
let descricao = interaction.fields.getTextInputValue('painel_descricao');
const imagem = interaction.fields.getTextInputValue('painel_imagem');
const footer = interaction.fields.getTextInputValue('painel_footer');

const select = new StringSelectMenuBuilder()
    .setCustomId('ticket_abrir_select')
    .setPlaceholder('Selecione o departamento desejado...');

categorias.forEach(cat => {
    select.addOptions({ 
        label: cat.nome,
        value: String(cat.id),
        emoji: cat.emoji 
    });
});

if (!descricao) {
    descricao = `### Central de Atendimento\nSeja bem-vindo(a) à nossa central. Para iniciar o seu atendimento de forma rápida e segura, direcione seu chamado ao departamento correto abaixo.\n\n\`\`\`🔐 Suporte Profissional e Seguro\`\`\`\n> ⏰ **Horário Comercial:**\n> Segunda a Sexta, das 09h às 18h.\n\n*Por favor, evite abrir múltiplos tickets.*`;
}

const tituloV2 = titulo ? titulo.split('').join(' ') : 'V A L K Y R I A  O P T I M I Z A T I O N';
const footerText = footer || 'Valkyria Optimization • Sistema Automatizado';

const embedPainel = new EmbedBuilder()
    .setColor('#ff7300')
    .setTitle(tituloV2)
    .setDescription(descricao)
    .setFooter({ text: footerText });

// Se o usuário colocou uma URL de imagem válida, adiciona
if (imagem && imagem.startsWith('http')) {
    embedPainel.setImage(imagem);
}

await interaction.channel.send({ 
    embeds: [embedPainel],
    components: [new ActionRowBuilder().addComponents(select)]
});

await interaction.reply({ content: '✅ Painel de Atendimento instalado com sucesso!', flags: MessageFlags.Ephemeral });}
            else if (interaction.customId === 'modal_fechar_ticket') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const consideracoes = interaction.fields.getTextInputValue('motivo_fechamento');
    const staffUser = interaction.user;
    
    try {
        await interaction.editReply('🔒 Gerando transcript e finalizando o atendimento...');

        const discordTranscripts = await import('discord-html-transcripts');
        const crypto = await import('crypto');
        const bcrypt = await import('bcryptjs');
        const { salvarTranscript, getTicket, closeTicketAssumido, incrementStaffTickets } = await import('../utils/database.js');

        // Busca o ticket UMA VEZ AQUI
        const ticket = await getTicket(interaction.channel.id) || {};

        // Se o ticket foi encontrado e tem staff assumido, incrementa e marca como fechado
        if (ticket && ticket.assumido_por) {
            await incrementStaffTickets(interaction.guild.id, ticket.assumido_por);
            await closeTicketAssumido(interaction.channel.id);
        }

        // Gera o HTML como string
        const htmlContent = await discordTranscripts.createTranscript(interaction.channel, {
            limit: -1, returnType: 'string', filename: `ticket-${interaction.channel.name}.html`, saveImages: false, poweredBy: false
        });

        // Anexo para arquivar no canal de logs
        const attachment = new AttachmentBuilder(Buffer.from(htmlContent), { name: `ticket-${interaction.channel.name}.html` });

        let userId = interaction.channel.topic;
        if (!userId && ticket) userId = ticket.user_id;

        if (userId) {
            try {
                const jogador = await interaction.guild.members.fetch(userId);
                const ticketId = interaction.channel.name.split('-')[1] || Math.floor(Math.random() * 90000);
                const categoriaNome = ticket.categoria || 'Suporte';

                const senhaAcesso = Math.floor(1000000 + Math.random() * 9000000).toString();
                const senhaHash = await bcrypt.hash(senhaAcesso, 10);
                const tokenTranscript = crypto.randomBytes(16).toString('hex');

                await salvarTranscript({
                    id: tokenTranscript,
                    channel_id: interaction.channel.id,
                    guild_id: interaction.guild.id,
                    senha_hash: senhaHash,
                    html_content: htmlContent
                });

                const linkTranscript = `${process.env.TRANSCRIPT_DOMAIN}/transcript/${tokenTranscript}`;

                const containerDM = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `# 📋 Ticket Finalizado\nSeu chamado de protocolo \`${ticketId}\` no departamento de **${categoriaNome}** foi encerrado.\n\n` +
                        `**Staff Responsável:** \`${staffUser.username}\`\n**Considerações Finais:**\n> ${consideracoes}\n\n` +
                        `**🔑 Senha de Acesso ao Transcript:** \`${senhaAcesso}\`\n\nClique no botão abaixo para acessar o histórico completo da conversa.`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder())
                    .addSectionComponents(
                        new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('Avalie o atendimento através do botão abaixo.'))
                    );

                const botoesFinais = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('📄 Ver Transcript').setStyle(ButtonStyle.Link).setURL(linkTranscript),
                    new ButtonBuilder().setCustomId(`avaliar_ticket_${staffUser.id}`).setLabel('Avaliar Atendimento').setStyle(ButtonStyle.Success).setEmoji('⭐')
                );

                await jogador.send({ components: [containerDM, botoesFinais], flags: MessageFlags.IsComponentsV2 });
            } catch (err) {
                console.log(`DM fechada para o jogador ${userId}. Impossível entregar transcript.`);
            }
        }

                    const fs = await import('fs');
                    const path = await import('path');
                    const filePathLog = path.resolve('data/memberlogs.json');
                    let logChannelId = null;
                    if (fs.existsSync(filePathLog)) {
                        const dataLog = JSON.parse(fs.readFileSync(filePathLog, 'utf-8'));
                        logChannelId = dataLog[interaction.guild.id]?.canal_ticket_logs;
                    }

                    if (logChannelId) {
                        const logChannel = interaction.guild.channels.cache.get(logChannelId);
                        if (logChannel) {
                            const donoMention = userId ? `<@${userId}>` : '`Desconhecido`';
                            const staffMention = ticket && ticket.claimed_by ? `<@${ticket.claimed_by}>` : '`Ninguém`';
                            
                            const containerLog = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 📁 Ticket Fechado \nO atendimento foi encerrado. Registos e Histórico em anexo.`))
                                .addSeparatorComponents(new SeparatorBuilder())
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**👤 Cliente:** ${donoMention}\n**👮 Staff:** ${staffMention}\n**🔒 Fechado por:** ${interaction.user.toString()}\n**📌 Protocolo:** ${interaction.channel.name}`))
                                .addSeparatorComponents(new SeparatorBuilder())
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent('*Valkyria Optimization • Arquivo Digital*'));

                            await logChannel.send({ components: [containerLog], files: [attachment], flags: MessageFlags.IsComponentsV2 });
                        }
                    }
                    
                    await interaction.editReply({ content: '✅ Ticket finalizado com sucesso!' });
        setTimeout(async () => { await interaction.channel.delete(`Ticket arquivado por ${interaction.user.tag}`); }, 3000);

    } catch (error) {
        console.error('Erro ao arquivar:', error);
        await interaction.editReply({ content: '❌ Erro ao arquivar o ticket.' });
    }
}
            else if (interaction.customId.startsWith('modal_avaliacao_')) {
                const staffId = interaction.customId.replace('modal_avaliacao_', '');
                const nota = parseInt(interaction.fields.getTextInputValue('nota_staff'));
                const feedback = interaction.fields.getTextInputValue('feedback_staff') || 'Sem comentários.';

                if (isNaN(nota) || nota < 1 || nota > 5) return interaction.reply({ content: '❌ Nota inválida! Apenas números entre 1 e 5.', flags: MessageFlags.Ephemeral });

                const filePath = path.resolve('data/avaliacoes.json');
                if (!fs.existsSync('data')) fs.mkdirSync('data');
                let db = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : {};
                if (!db[staffId]) db[staffId] = { total: 0, soma_notas: 0, media: 0.0 };

                db[staffId].total += 1;
                db[staffId].soma_notas += nota;
                db[staffId].media = db[staffId].soma_notas / db[staffId].total;
                fs.writeFileSync(filePath, JSON.stringify(db, null, 4));
                
                await interaction.reply({ content: `✅ **Obrigado pelo seu feedback!**\nVocê avaliou o atendimento com **${nota} Estrelas**.\n*Comentário: "${feedback}"*`, flags: MessageFlags.Ephemeral });
            }
        }

        // ==========================================
        // 3. PROCESSAMENTO DE SELECT MENUS
        // ==========================================
        else if (interaction.isAnySelectMenu()) {
            try { 

                if (interaction.customId === 'ticket_abrir_select') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const canais = await interaction.guild.channels.fetch();
        const ticketExistente = canais.find(c => c.name.startsWith('ticket-') && c.topic === interaction.user.id);
        
        if (ticketExistente) {
            return interaction.editReply({ content: `❌ Você já possui um atendimento aberto: ${ticketExistente.toString()}!` });
        }

        const valorSelecionado = interaction.values[0];
        // Importamos o getCategorias e o createTicket diretamente!
        const { getCategorias, createTicket } = await import('../utils/database.js');
        const categorias = await getCategorias(interaction.guild.id);
        const categoria = categorias.find(cat => String(cat.id) === valorSelecionado || String(cat.categoria_id) === valorSelecionado);

        if (!categoria) {
            return interaction.editReply({ content: '❌ Erro: Departamento não configurado.' });
        }

        // 2. Criação do Canal no Discord
        const canal = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: 0,
            topic: interaction.user.id,
            parent: categoria.categoria_id || null,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: ['ViewChannel'] },
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
                { id: categoria.cargo_id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
            ]
        });

        // ==========================================
        // AQUI ESTÁ A CORREÇÃO MÁGICA!
        // Salvamos o ticket no banco de dados IMEDIATAMENTE após ele ser criado no Discord.
        await createTicket(canal.id, interaction.guild.id, interaction.user.id, categoria.nome, 1);
        // ==========================================

        // 3. Primeira Mensagem (Embed)
        const embedVisual = new EmbedBuilder()
            .setTitle('Ticket Criado com Sucesso! 📌')
            .setColor('#2ecc71')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `**Todos os responsáveis pelo ticket já estão cientes da abertura**\n` +
                `${interaction.user.toString()} | \`${interaction.user.id}\`\n\n` +
                `**Categoria:** \`📂 ${categoria.nome}\`\n\n` +
                `**\`DESCREVA O MOTIVO DO CONTATO COM O MÁXIMO DE DETALHES!\`**`
            );

        await canal.send({
            content: `||${interaction.user.toString()} | <@&${categoria.cargo_id}>||`,
            embeds: [embedVisual]
        });

        // 4. Segunda Mensagem (Botões V2)
        const containerAtendimento = new ContainerBuilder()
            .addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('😉 **Assumir Responsabilidade**')).setButtonAccessory(new ButtonBuilder().setCustomId('btn_assumir_ticket').setLabel('Assumir').setStyle(ButtonStyle.Success)))
            .addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('✅ **Finalizar Chamado**')).setButtonAccessory(new ButtonBuilder().setCustomId('btn_fechar_ticket').setLabel('Finalizar').setStyle(ButtonStyle.Danger)));

        const actionRowInferior = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_ticket_chamar').setLabel('Notificar').setStyle(ButtonStyle.Secondary).setEmoji('🔔'),
            new ButtonBuilder().setCustomId('btn_ticket_add_user').setLabel('Adicionar').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
            new ButtonBuilder().setCustomId('btn_ticket_rem_user').setLabel('Remover').setStyle(ButtonStyle.Secondary).setEmoji('➖'),
            new ButtonBuilder().setCustomId('btn_ticket_mover').setLabel('Transferir').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
            new ButtonBuilder().setCustomId('btn_ticket_rename').setLabel('Renomear').setStyle(ButtonStyle.Secondary).setEmoji('✏️')
        );
        
        await canal.send({
            components: [containerAtendimento, actionRowInferior],
            flags: MessageFlags.IsComponentsV2
        });

        // 5. Feedback final
        await interaction.editReply({ content: `✅ Ticket aberto com sucesso: ${canal.toString()}` });

    } catch (error) {
        console.error('ERRO DETALHADO NO TICKET:', error);
        await interaction.editReply({ content: '❌ Ocorreu um erro crítico ao criar o ticket.' }).catch(() => {});
    }
}


                
                else if (interaction.customId === 'select_stats_categoria') {
                    // Estatisticas de categoria intocadas...
                }

                // GESTÃO TICKET
                else if (interaction.customId === 'select_ticket_add_user') {
                    const userId = interaction.values[0];
                    await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true });
                    await interaction.update({ content: `<@${userId}> adicionado com sucesso!`, components: [] });
                    await interaction.channel.send(`👋 <@${userId}>, você foi adicionado ao suporte por ${interaction.user.toString()}.`);
                }
                else if (interaction.customId === 'select_ticket_rem_user') {
                    const userId = interaction.values[0];
                    await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: false });
                    await interaction.update({ content: `✅ <@${userId}> retirado com sucesso!`, components: [] });
                }
                else if (interaction.customId === 'select_ticket_mover') {
                    const novaCategoriaId = interaction.values[0];
                    try {
                        await interaction.channel.setParent(novaCategoriaId, { lockPermissions: false });
                        await interaction.update({ content: `✅ Ticket despachado com sucesso!`, components: [] });
                        const containerMove = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔄 Transferência\nEste suporte foi transferido para o departamento <#${novaCategoriaId}> pelo Staff ${interaction.user.toString()}.`));
                        await interaction.channel.send({ components: [containerMove], flags: MessageFlags.IsComponentsV2 });
                    } catch (error) {
                        await interaction.update({ content: '❌ Erro ao mover a sala. Verifique as credenciais.', components: [] });
                    }
                }

else if (interaction.customId.startsWith('wizard_cat_')) {
    const nome = interaction.customId.replace('wizard_cat_', '');
    const categoriaId = interaction.values[0];

    const roleMenu = new RoleSelectMenuBuilder()
        .setCustomId(`wizard_role_${categoriaId}_${nome}`)
        .setPlaceholder('👮 Selecione o Cargo Staff');

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `Departamento: **${nome}** (<#${categoriaId}>)\nAgora selecione o cargo que atenderá estes tickets:`
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(roleMenu)
        );

    try {
        await interaction.update({
            content: null,
            embeds: [],           // <-- limpa qualquer embed anterior
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    } catch (err) {
        console.error("ERRO NO UPDATE (wizard_cat_):", err);
    }
}

// D) Finalização (Salvar no banco de dados)
else if (interaction.customId.startsWith('wizard_role_')) {
    const partes = interaction.customId.replace('wizard_role_', '').split('_');
    const categoriaId = partes[0];
    const nome = partes.slice(1).join('_');
    const cargoId = interaction.values[0];

    const { addCategoria } = await import('../utils/database.js');
    try {
        await addCategoria(interaction.guild.id, nome, '🎟️', categoriaId, cargoId);

        const containerSucesso = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`✅ Departamento **${nome}** configurado com sucesso!`)
            );

        await interaction.update({
            embeds: [],           // <-- limpa o embed que possa ter sobrado
            components: [containerSucesso],
            flags: MessageFlags.IsComponentsV2
        });
    } catch (error) {
        console.error(error);
        const containerErro = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('❌ Erro ao salvar no banco.')
            );
        try {
            await interaction.update({
                embeds: [],
                components: [containerErro],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (e2) {
            console.error("Falha até no update de erro:", e2);
        }
    }
}
                else if (interaction.customId === 'select_del_categoria') {
                    const idCategoria = interaction.values[0];
                    const { removeCategoria } = await import('../utils/database.js');
                    await removeCategoria(idCategoria);
                    await interaction.update({ content: '✅ Departamento desativado com sucesso!', components: [] });
                }

                // CONFIGURAÇÃO DE LOGS
                else if (['cfg_log_entrada', 'cfg_log_saida', 'cfg_log_ticket'].includes(interaction.customId)) {
                    const fs = await import('fs');
                    const path = await import('path');
                    const filePath = path.resolve('data/memberlogs.json');
                    if (!fs.existsSync('data')) fs.mkdirSync('data');
                    let data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : {};
                    if (!data[interaction.guild.id]) data[interaction.guild.id] = {};
                    
                    if (interaction.customId === 'cfg_log_entrada') {
                        data[interaction.guild.id].canal_entrada = interaction.values[0];
                        await interaction.reply({ content: `✅ Canal de **Entrada** salvo com sucesso!`, flags: MessageFlags.Ephemeral });
                    } else if (interaction.customId === 'cfg_log_saida') {
                        data[interaction.guild.id].canal_saida = interaction.values[0];
                        await interaction.reply({ content: `✅ Canal de **Saída** salvo com sucesso!`, flags: MessageFlags.Ephemeral });
                    } else if (interaction.customId === 'cfg_log_ticket') {
                        data[interaction.guild.id].canal_ticket_logs = interaction.values[0];
                        await interaction.reply({ content: `✅ Canal de **Logs de Tickets** salvo com sucesso!`, flags: MessageFlags.Ephemeral });
                    }
                    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
                }

            } catch (err) {
                console.error("ERRO NO SELECT MENU:", err);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: "❌ Ocorreu um erro no processamento do componente.", flags: MessageFlags.Ephemeral });
                }
            }
        }
    }
}