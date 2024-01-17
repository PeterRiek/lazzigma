const { Client, GatewayIntentBits } = require('discord.js')
const { createAudioPlayer, createAudioResource, joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice')
const { createReadStream } = require('fs')
const ffmpeg = require('ffmpeg-static')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
    ],
})

const { token, defaultTarget } = require('./config.json')
const { measureMemory } = require('vm')
const { userInfo } = require('os')
const audioPlayer = createAudioPlayer()

var running = false
var timeStop = 0
var timeBuf = 500
var targetUserId = defaultTarget

client.on('ready', () => {
    console.log(`Online as ${client.user.username}`)
    client.user.setStatus('invisible');
})

client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.member.user.id != targetUserId) return;
    if (newState.channelId === null) {
        const connection = getVoiceConnection(oldState.guild.id)
        if (connection) connection.destroy()
    } else if (oldState.channelId === null) {
        joinFor(newState.guild, newState.member.user.id)
    } else {
        joinFor(newState.guild, newState.member.user.id)
    }
});

function joinFor(guild, userId) {
    const voiceChannel = guild.members.cache.get(userId)

    if (!voiceChannel) return

    const connection = joinVoiceChannel({
        channelId: voiceChannel.voice.channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
    })
    connection.receiver.speaking.on('start', (_userId) => {
        if (_userId != targetUserId) return
        if (!running) {
            running = true
            const resource = createAudioResource('sfx/bmth.mp3')

            audioPlayer.play(resource)

            audioPlayer.on('error', error => {
                console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`)
                audioPlayer.play(getNextResource())
            })
        } else {
            audioPlayer.unpause()
        }
        
    })
    connection.receiver.speaking.on('end', (_userId) => {
        if (_userId != targetUserId) return
        timeStop = (new Date()).getTime() + timeBuf
        setTimeout(() => {

            if (timeStop <= (new Date()).getTime()) {
                audioPlayer.pause()
            }
        }, timeBuf)
    })
    connection.subscribe(audioPlayer)

}

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('$')) return;
    const args = message.content.replace('$', '').split(' ')

    if (args[0] === 'join') {
        joinFor(message.guild, message.author.id)
    }

    if (args[0] == 'set') {
        if (args.length < 2) return;
        targetUserId = args[1];
        message.reply('Target set.')
    }

    if (args[0] == 'whoami') {
        message.reply(message.author.id)
    }

    if (args[0] === 'play') {
        const connection = getVoiceConnection(message.guild.id)

        if (!connection) {
            return message.reply('I must be in a voice channel before you can play music!')
        }

        const resource = createAudioResource('sfx/bmth.mp3')

        audioPlayer.play(resource)

        audioPlayer.on('error', error => {
            console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`)
            audioPlayer.play(getNextResource())
        })
    }

    if (args[0] == 'stop') {
        audioPlayer.stop()
        running = false;
    }

    if (args[0] === 'destroy') {
        const connection = getVoiceConnection(message.guild.id)

        if (connection) {
            connection.destroy()
        }
    }

    if (args[0] == 'listall') {
        const guild = message.guild;

        // Fetch all members in the guild
        await guild.members.fetch();

        // Iterate over the members and log their username and ID
        guild.members.cache.forEach((member) => {
            console.log(`Username: ${member.user.tag}, ID: ${member.user.id}`);
        });
    }
})

client.login(token)
