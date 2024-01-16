import discord
from discord.ext import commands
import youtube_dl
import os

intents = discord.Intents.default()
intents.members = True
intents.message_content = True

target_user_id = ''

bot = commands.Bot(command_prefix='$', intents=intents)

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user.name}')

@bot.command()
async def join(ctx):
    print('join')
    channel = ctx.author.voice.channel
    await channel.connect()

@bot.command(name='leave')
async def leave(ctx):
    await ctx.voice_client.disconnect()

@bot.command(name='play')
async def play(ctx, filename):
    voice_channel = ctx.author.voice.channel
    voice_client = ctx.voice_client
    voice_channel.connect()

    if not voice_client.is_playing():
        mp3_file_path = os.path.join('sfx', filename)  # Update with your actual folder path
        if os.path.exists(mp3_file_path):
            voice_client.stop()
            voice_client.play(discord.FFmpegPCMAudio(mp3_file_path))
        else:
            await ctx.send(f"File not found: {filename}")
    else:
        await ctx.send("Bot is already playing audio.")

@bot.command(name='pause')
async def pause(ctx):
    ctx.voice_client.pause()

@bot.command(name='resume')
async def resume(ctx):
    ctx.voice_client.resume()

@bot.command(name='stop')
async def stop(ctx):
    ctx.voice_client.stop()

@bot.event
async def on_voice_state_update(member, before, after):
    if member.id == target_user_id:
        # Check if the user has joined or left a voice channel
        if before.channel != after.channel:
            if after.channel is not None:
                print(f'{member.name} has joined voice channel: {after.channel.name}')
            else:
                print(f'{member.name} has left voice channel.')

@bot.event
async def on_voice_state_update(member, before, after):
    if member.id == target_user_id:
        # Check if the user has started or stopped speaking
        if before.self_mute != after.self_mute or before.self_deaf != after.self_deaf:
            if after.self_mute or after.self_deaf:
                print(f'{member.name} has stopped speaking.')
            else:
                print(f'{member.name} has started speaking.')

bot.run('token')
