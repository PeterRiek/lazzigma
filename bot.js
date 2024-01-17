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
    console.log(client.user.username)
})

client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.member.user.id != targetUserId) return;
    if (newState.channelId === null) {
        // console.log('user left channel', newState.channelId)
        const connection = getVoiceConnection(oldState.guild.id)
        if (connection) connection.destroy()
    } else if (oldState.channelId === null) {
        // console.log('user joined channel', newState.channelId)
        joinFor(newState.guild, newState.member.user.id)
    } else {
        // console.log('user moved channels', oldState.channelId, newState.channelId)
        console.log(oldState)
        console.log(newState)
        joinFor(newState.guild, newState.m6ember.user.id)
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
})

client.login(token)
