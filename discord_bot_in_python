# This is another version of the Discord bot—it's a bit newer but still from 2023. 
# I worked on this one with a friend, and now that I've found it again, 
# I want to share it as a reminder of our collaboration and the memories we made.
#–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––#
# Nexium Discord Bot
# Created by: @TheCoolDoggo, and @Edisni Krad.
import discord
import json
import asyncio
import time
import os
import numpy as np
from dotenv import load_dotenv
from discord import app_commands, Interaction, File, Object
from discord import Member 
from discord import Embed
import sympy as sp
import math
from sympy import symbols, Eq, solve
import re
import matplotlib.pyplot as plt
import numpy as np
from sympy import symbols, lambdify, sympify
from io import BytesIO

intents = discord.Intents.default() 
client = discord.Client(intents=intents)
tree = app_commands.CommandTree(client)
intents.members = True

with open("embeds/embed.json", "r") as f:
    embed_data = json.load(f)

with open("embeds/detention.json", "r") as f:
    detention_data = json.load(f)

with open("embeds/let-free.json", "r") as f:
    let_free_data = json.load(f)

with open("embeds/welcome.json", "r") as f:
    welcome_data = json.load(f)

detention_embed_data = detention_data['embeds'][0]
detention_embed = Embed.from_dict(detention_embed_data)

embed_data = embed_data['embeds'][0]
embed = Embed.from_dict(embed_data)

let_free_embed_data = let_free_data['embeds'][0]
let_free_embed = Embed.from_dict(let_free_embed_data)

welcome_data = welcome_data['embeds'][0]

welcome_embed = Embed.from_dict(welcome_data)

last_message_id = None

@tree.command(name="solve-math", description='Solve a mathematical expression or equation.', guild=discord.Object(id=1209634066924572704))
async def math(ctx: discord.Interaction, expression_or_equation: str):
    try:
        # Add * between coefficient and variable
        expression_or_equation = re.sub(r'(\d)([a-zA-Z])', r'\1*\2', expression_or_equation)1

        if "=" in expression_or_equation:
            left, right = expression_or_equation.split("=")
            expr = sp.sympify(left) - sp.sympify(right)
        else:
            expr = sp.sympify(expression_or_equation)

        if expr.is_Atom:
            response = str(expr)
        else:
            solution = sp.solve(expr)
            if isinstance(solution,list):
                response=', '.join(map(str, solution))
            else:
                response = str(solution)
        await ctx.response.send_message(f'The result of `{expression_or_equation}` is `{response}`')
    except Exception as e:
        await ctx.response.send_message(f'Error {e}')


#bot = Bot()

@bot.tree.command(name="plot", description="Plots a graph of the specified mathematical expression.", guild=Object(id=1209634066924572704))
@app_commands.describe(expression="Enter the mathematical expression to plot",
                       x_start="Start of the x-axis range",
                       x_end="End of the x-axis range")
async def plot_command(interaction: Interaction, expression: str, x_start: float = -10, x_end: float = 10):
    """ Slash command to plot a mathematical expression. """
    try:
        x = sp.symbols('x')
        expr = sp.sympify(expression)

        x_values = np.linspace(x_start, x_end, 100)
        y_values = [float(expr.subs(x, val)) for val in x_values]

        plt.figure(figsize=(8, 6))
        plt.plot(x_values, y_values, label=f'Plot of {expression}', color='cyan')
        plt.xlabel('x')
        plt.ylabel('y')
        plt.title(f'Plot of {expression}')
        plt.legend()

        buffer = BytesIO()
        plt.savefig(buffer, format='png')
        buffer.seek(0)
        plt.close()

        file = File(fp=buffer, filename='plot.png')
        await interaction.response.send_message(file=file)
    except Exception as e:
        await interaction.response.send_message(f"Failed to generate plot: {str(e)}", ephemeral=True)



@tree.command(name="contact", description="📝 Contact us. (can be used for mod actions)", guild=discord.Object(id=1209634066924572704))
async def suggestions(ctx: discord.Interaction, reason: str):
    channel = client.get_channel(1185602980947439707)
    try:
        await channel.send(f"Suggestion from {ctx.user.mention}: **{reason}**")
        await ctx.response.send_message("Your suggestion has been sent. We may DM you asking for more info.", ephemeral=True)
    except discord.Forbidden:
        print(f"Cannot send message to the channel due to permissions.")
    except discord.NotFound:
        print("Interaction not found or already responded to.")

@tree.command(name="verify", description="🔐 Verification required to talk", guild=discord.Object(id=1209634066924572704))
async def verify(ctx: discord.Interaction, name: str, grade: str, team_if_any: str):
    if ctx.channel.id != 1204594857784647720:
        await ctx.response.send_message(f"You are already verified.", ephemeral=True)
        return

    channel = client.get_channel(1185602980947439707)
    try:
        await channel.send(f"✅ <@948690883488907284> New user verification. Use /approve to approve it {ctx.user.mention}: Name: **{name}** Grade: **{grade}** Team: **{team_if_any}**")
        await ctx.response.send_message("Your verification has been sent.", ephemeral=True)
    except discord.Forbidden:
        print(f"Cannot send message to the channel due to permissions.")
    except discord.NotFound:
        print("Interaction not found or already responded to.")

@tree.command(name="approve", description="✅ Approve verification", guild=discord.Object(id=1209634066924572704)) 
@app_commands.default_permissions(administrator=True)
async def undetain(ctx: discord.Interaction, member: discord.Member, team: discord.Role):
    role_id = 1184982967156744293
    if role_id in [role.id for role in ctx.user.roles]:
        await member.add_roles(team) 
    if role_id in [role.id for role in ctx.user.roles]:
        verification_role = discord.Object(id=1204591881552396318)
        await member.add_roles(verification_role) 
        try:
            await ctx.response.send_message(f"{member.mention} has been verified. Welcome in!")
            await member.send(embed=embed)
        except discord.Forbidden:
            print(f"Cannot DM {member.name} due to privacy settings.")
        except discord.NotFound:
            print("Interaction not found or already responded to.")
    else:
        await ctx.response.send_message("❌ You do not have permission to use this command." , ephemeral=True)

@tree.command(name = "ping", description = "🏓 Returns pong + latency", guild=discord.Object(id=1209634066924572704))
async def ping_command(interaction):
    latency = client.latency 
    latency_ms = round(latency * 1000, 1)
    await interaction.response.send_message(f"🏓 Pong! Bot is working. Latency: **{latency_ms}** ms")

@tree.command(name="detention", description="🚫 Sends a user to detention", guild=discord.Object(id=1209634066924572704)) 
@app_commands.default_permissions(administrator=True)
async def detention(ctx: discord.Interaction, member: discord.Member, time_in_hours: int, reason: str = "No reason provided"):
    role_id = 1184982967156744293
    if role_id in [role.id for role in ctx.user.roles]:
        detention_role = discord.Object(id=1185745503909068930) 
        await member.add_roles(detention_role) 
        release_time = int(time.time()) + time_in_hours * 3600
        try:
            await ctx.response.send_message(f"{member.mention} has been sent to detention for: {reason}.", ephemeral=True)
            detention_embed = Embed.from_dict(detention_embed_data)
            detention_embed.description += f"\nReason: {reason}\nRelease Time: <t:{release_time}:R>"
            await member.send(embed=detention_embed)
        except discord.Forbidden:
            print(f"Cannot DM {member.name} due to privacy settings.")
        except discord.NotFound:
            print("Interaction not found or already responded to.")
        await asyncio.sleep(time_in_hours * 3600)
        await member.remove_roles(detention_role) 
        try:
            await ctx.response.send_message(f"{member.mention} has been let free and was in detention for {reason}.")
            await member.send(embed=let_free_embed)
        except discord.Forbidden:
            print(f"Cannot DM {member.name} due to privacy settings.")
        except discord.NotFound:
            print("Interaction not found or already responded to.")
    else:
        await ctx.response.send_message("❌ You do not have permission to use this command.", empheemral=True)

@tree.command(name="undetain", description="🔓 Removes a user from detention", guild=discord.Object(id=1209634066924572704)) 
@app_commands.default_permissions(administrator=True)
async def undetain(ctx: discord.Interaction, member: discord.Member):
    role_id = 1184982967156744293
    if role_id in [role.id for role in ctx.user.roles]:
        detention_role = discord.Object(id=1185745503909068930) 
        await member.remove_roles(detention_role) 
        try:
            await ctx.response.send_message(f"{member.mention} has been let free.", emphemeral=True)
            await member.send(embed=let_free_embed)
        except discord.Forbidden:
            print(f"Cannot DM {member.name} due to privacy settings.")
        except discord.NotFound:
            print("Interaction not found or already responded to.")
    else:
        await ctx.response.send_message("❌ You do not have permission to use this command.", empheemral=True)

@tree.command(name = "echo", description = "🔊 Echo what you say", guild=discord.Object(id=1209634066924572704))
@app_commands.default_permissions(administrator=True)
async def echo_command(interaction, message: str):
    await interaction.response.send_message("Sent", ephemeral=True)
    await interaction.channel.send(message)

@client.event
async def on_member_join(member: Member):
    try:
        await member.send(embed=welcome_embed)
    except discord.Forbidden:
        print(f"Cannot DM {member.name} due to privacy settings.")

@client.event
async def on_ready():
    client.loop.create_task(change_presence())
    await tree.sync(guild=discord.Object(id=1209634066924572704))
    print("Ready!")

async def change_presence():
    await client.wait_until_ready()
    messages = ["pain pls help my devs"]
    while not client.is_closed():
        for message in messages:
            await client.change_presence(activity=discord.Game(name=message))
            await asyncio.sleep(255)

load_dotenv('token.env')
token = os.getenv('TOKEN')
client.run(token)
