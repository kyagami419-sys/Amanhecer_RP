import discordTranscripts from 'discord-html-transcripts';

export async function gerarTranscript(channel) {
    try {
        const attachment = await discordTranscripts.createTranscript(channel, {
            limit: -1, // Busca todas as mensagens
            returnType: 'attachment', // Retorna como ficheiro para enviar
            filename: `${channel.name}.html`,
            saveImages: true,
            poweredBy: false
        });

        return attachment;
    } catch (error) {
        console.error("ERRO AO GERAR TRANSCRIPT:", error);
        return null;
    }
}