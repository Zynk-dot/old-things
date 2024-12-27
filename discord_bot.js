/* 
This Discord bot was the first project I created after learning Node.js. The code is about two years old (from 2022), 
and while I'm not sure if Discord has updated its API since then, 
I'm sharing it here as a nostalgic reminder of my journey.
*/

import { Client, GatewayIntentBits, Partials, AttachmentBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnectionStatus, AudioPlayerStatus } from '@discordjs/voice';
import gTTS from 'gtts';
import nerdamer from 'nerdamer';
import 'nerdamer/Solve.js';
import 'nerdamer/Calculus.js';
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import dotenv from 'dotenv';
import { Readable } from 'stream';
import sodium from 'libsodium-wrappers';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import natural from 'natural';

// Load environment variables from .env file
dotenv.config();

// Initialize libsodium-wrappers
await sodium.ready;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates // Required for voice functionality
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User]
});

let timerInterval;
let remainingTime;
let timerMessage;

const commands = [
  {
    name: 'solveexp',
    description: 'Solves an equation or performs differentiation/integration with step-by-step explanation.',
    options: [
      {
        name: 'input',
        type: 3, // STRING type
        description: 'The equation, differentiation (d/dx), or integration (∫) expression to solve',
        required: true,
      },
    ],
  },
  {
    name: 'timer',
    description: 'Sets a timer for the specified duration with interactive controls.',
    options: [
      {
        name: 'duration',
        type: 3, // STRING type
        description: 'The duration for the timer (e.g., "1h", "30m", "20s")',
        required: true,
      },
    ],
  },
  {
    name: 'ping',
    description: 'Checks the bot\'s latency.'
  },
  {
    name: 'note',
    description: 'Generate bullet point notes from a URL or text',
    options: [
      {
        name: 'input',
        type: 3, // STRING type
        description: 'The URL or text to generate notes from',
        required: true,
      },
    ],
  },
  {
    name: 'tictactoe',
    description: 'Play a game of tic-tac-toe.',
    options: [
      {
        name: 'mode',
        type: 3, // STRING type
        description: 'Choose between "new" for a new game or "bot" for playing against the bot',
        required: true,
      },
      {
        name: 'difficulty',
        type: 3, // STRING type
        description: 'Bot difficulty level ("easy", "medium", "hard")',
        required: false,
      },
    ],
  },
];

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // Register commands globally
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
    console.log('Bot is online!');
  } catch (error) {
    console.error(error);
  }
})();

function getStepByStepExplanation(input) {
  let explanation = "**Step-by-step Explanation:**\n";
  if (input.includes('=')) {
    // Solving equations
    const solutions = nerdamer(input).solveFor('x');
    const result = solutions.toString();
    const degree = input.split('x').length - 1;
    explanation += `1. **Original Equation**: ${input}\n`;
    explanation += `2. **Degree of Equation**: Degree ${degree}\n`;

    if (degree === 1) {
      explanation += `3. **Method Used**: Linear equations are typically solved by isolating x.\n`;
      explanation += `4. **Steps**:\n`;
      explanation += `   - Isolate the variable x on one side of the equation.\n`;
    } else if (degree === 2) {
      explanation += `3. **Method Used**: Quadratic equations are solved using the quadratic formula, completing the square, or factoring.\n`;
      explanation += `4. **Steps**:\n`;
      explanation += `   - If the equation is in the form ax^2 + bx + c = 0, use the quadratic formula: x = (-b ± √(b^2 - 4ac)) / 2a.\n`;
      explanation += `   - Alternatively, factor the equation if possible.\n`;
      explanation += `   - Another method is completing the square.\n`;
    } else {
      explanation += `3. **Method Used**: Higher-degree polynomials might be solved using numerical methods, synthetic division, or the rational root theorem.\n`;
      explanation += `4. **Steps**:\n`;
      explanation += `   - For polynomials of degree 3 or higher, finding roots can be complex and may involve trial and error, graphing, or more advanced algebraic techniques.\n`;
    }
    explanation += `5. **Solution**: x = ${result}`;
  } else if (input.startsWith('d/dx')) {
    // Differentiation
    const expression = input.replace('d/dx', '').trim();
    const derivative = nerdamer(`diff(${expression}, x)`).text();
    explanation += `1. **Original Expression**: ${expression}\n`;
    explanation += `2. **Operation**: Differentiation with respect to x\n`;
    explanation += `3. **Result**: ${derivative}`;
  } else if (input.startsWith('∫')) {
    // Integration
    const expression = input.replace('∫', '').trim();
    const integral = nerdamer(`integrate(${expression}, x)`).text();
    explanation += `1. **Original Expression**: ${expression}\n`;
    explanation += `2. **Operation**: Integration with respect to x\n`;
    explanation += `3. **Result**: ${integral} + C`;
  } else {
    explanation += `Invalid input. Please provide an equation, differentiation (d/dx), or integration (∫) expression.`;
  }

  return explanation;
}

function parseDuration(input) {
  const durationRegex = /^(\d+h)?(\d+m)?(\d+s)?$/;
  const match = input.match(durationRegex);

  if (!match) return null;

  let totalSeconds = 0;
  if (match[1]) totalSeconds += parseInt(match[1]) * 3600;
  if (match[2]) totalSeconds += parseInt(match[2]) * 60;
  if (match[3]) totalSeconds += parseInt(match[3]);

  return totalSeconds;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

async function updateTimer(interaction) {
  if (!timerMessage) return;

  if (remainingTime <= 0) {
    clearInterval(timerInterval);
    await timerMessage.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle('Timer')
          .setDescription(`Time's up!`)
          .setColor(0xFF0000) // Red for finished
      ],
      components: []
    });
    return;
  }

  await timerMessage.edit({
    embeds: [
      new EmbedBuilder()
        .setTitle('Timer')
        .setDescription(`Remaining Time: ${formatTime(remainingTime)}`)
        .setColor(0x00FF00) // Green for ongoing
    ],
    components: [getTimerButtons()]
  });

  remainingTime--;
}

function getTimerButtons() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('start')
        .setLabel('Start')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('pause')
        .setLabel('Pause')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('stop')
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('restart')
        .setLabel('Restart')
        .setStyle(ButtonStyle.Primary)
    );
}

async function generateDynamicPlot(expression, xStart = -10, xEnd = 10) {
  try {
    const width = 800;
    const height = 600;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

    let xValues = Array.from({ length: 100 }, (_, i) => xStart + (xEnd - xStart) * i / 99);
    let yValues = xValues.map(x => {
      try {
        let y = nerdamer(expression.replace(/x/g, `(${x})`)).evaluate().text();
        return parseFloat(y);
      } catch (error) {
        return null;
      }
    }).filter(y => y !== null);

    let yMin = Math.min(...yValues);
    let yMax = Math.max(...yValues);
    let yRange = yMax - yMin;
    yMin -= yRange * 0.1;
    yMax += yRange * 0.1;

    const configuration = {
      type: 'line',
      data: {
        labels: xValues,
        datasets: [{
          label: 'Plot of ' + expression,
          data: xValues.map((x, i) => ({ x, y: yValues[i] })),
          borderColor: 'rgb(75, 192, 192)',
          fill: false,
        }]
      },
      options: {
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            min: xStart,
            max: xEnd
          },
          y: {
            min: yMin,
            max: yMax
          }
        }
      }
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
  } catch (error) {
    console.error('Error generating plot:', error);
    throw new Error('Failed to generate plot.');
  }
}

async function getWikipediaSummary(pageTitle) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const summary = data.extract || "No summary found for this topic.";
    const pageUrl = data.content_urls.desktop.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;
    return { summary, pageUrl };
  } catch (error) {
    console.error('Failed to fetch Wikipedia data:', error);
    return { summary: "Failed to retrieve information.", pageUrl: null };
  }
}

function getEducationalContent(topic) {
  const sources = {
    Google: `https://www.google.com/search?q=${encodeURIComponent(topic)}`,
    KhanAcademy: `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(topic)}`,
    Coursera: `https://www.coursera.org/search?query=${encodeURIComponent(topic)}`,
    edX: `https://www.edx.org/search?q=${encodeURIComponent(topic)}`,
    YouTube: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}`
  };

  return sources;
}

async function fetchLyrics(song) {
  const url = `https://api.lyrics.ovh/v1/${song.artist}/${song.title}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.lyrics) {
      return data.lyrics;
    } else {
      throw new Error('Lyrics not found');
    }
  } catch (error) {
    console.error('Lyrics fetch error:', error);
    throw new Error('Failed to fetch lyrics');
  }
}

async function fetchContent(url) {
  const response = await fetch(url);
  const body = await response.text();
  const dom = new JSDOM(body, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  return article ? article.textContent : null;
}

function summarizeText(text, sentenceCount) {
  const tokenizer = new natural.SentenceTokenizer();
  const sentences = tokenizer.tokenize(text);
  const summary = sentences.slice(0, sentenceCount);
  const bulletPoints = summary.map(sentence => `- ${sentence.replace(/\[\d+\]/g, '').trim()}`);
  return bulletPoints;
}

async function executeNoteCommand(interaction) {
  const input = interaction.options.getString('input');

  let text;
  if (input.startsWith('http')) {
    text = await fetchContent(input);
    if (!text) {
      await interaction.reply('Failed to extract content from the provided URL. Please try a different link.');
      return;
    }
  } else {
    text = input;
  }

  const bulletPoints = summarizeText(text, 10); // Summarize into 10 sentences

  if (bulletPoints.join('\n').length > 2000) {
    const parts = [];
    let part = '';
    for (let i = 0; i < bulletPoints.length; i++) {
      if ((part + bulletPoints[i]).length > 2000) {
        parts.push(part);
        part = '';
      }
      part += `${bulletPoints[i]}\n`;
    }
    if (part) {
      parts.push(part);
    }

    for (const messagePart of parts) {
      await interaction.reply(`**Notes:**\n${messagePart}`);
    }
  } else {
    await interaction.reply(`**Notes:**\n${bulletPoints.join('\n')}`);
  }
}

let gameBoard = [
  [' ', ' ', ' '],
  [' ', ' ', ' '],
  [' ', ' ', ' ']
];

let currentPlayer = 'X';
let gameMessage = null;
let isSinglePlayer = false;
let botDifficulty = 'easy';

async function newGame(interaction, singlePlayer = false, difficulty = 'easy') {
  gameBoard = [
    [' ', ' ', ' '],
    [' ', ' ', ' '],
    [' ', ' ', ' ']
  ];
  currentPlayer = 'X';
  isSinglePlayer = singlePlayer;
  botDifficulty = difficulty;

  const gameEmbed = new EmbedBuilder()
    .setTitle('Tic-Tac-Toe Game Board')
    .setDescription(getBoardString())
    .setColor(0x0000FF); // Use hexadecimal for blue

  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('0 0')
        .setLabel(gameBoard[0][0] === ' ' ? '\u200B' : gameBoard[0][0]) // Use Zero Width Space for empty labels
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('0 1')
        .setLabel(gameBoard[0][1] === ' ' ? '\u200B' : gameBoard[0][1]) // Use Zero Width Space for empty labels
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('0 2')
        .setLabel(gameBoard[0][2] === ' ' ? '\u200B' : gameBoard[0][2]) // Use Zero Width Space for empty labels
        .setStyle(ButtonStyle.Secondary)
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('1 0')
        .setLabel(gameBoard[1][0] === ' ' ? '\u200B' : gameBoard[1][0]) // Use Zero Width Space for empty labels
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('1 1')
        .setLabel(gameBoard[1][1] === ' ' ? '\u200B' : gameBoard[1][1]) // Use Zero Width Space for empty labels
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('1 2')
        .setLabel(gameBoard[1][2] === ' ' ? '\u200B' : gameBoard[1][2]) // Use Zero Width Space for empty labels
        .setStyle(ButtonStyle.Secondary)
    );

  const row3 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('2 0')
        .setLabel(gameBoard[2][0] === ' ' ? '\u200B' : gameBoard[2][0]) // Use Zero Width Space for empty labels
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('2 1')
        .setLabel(gameBoard[2][1] === ' ' ? '\u200B' : gameBoard[2][1]) // Use Zero Width Space for empty labels
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('2 2')
        .setLabel(gameBoard[2][2] === ' ' ? '\u200B' : gameBoard[2][2]) // Use Zero Width Space for empty labels
        .setStyle(ButtonStyle.Secondary)
    );

  gameMessage = await interaction.reply({ embeds: [gameEmbed], components: [row1, row2, row3] });

  const collector = gameMessage.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async (button) => {
    const [row, col] = button.customId.split(' ').map(Number);
    if (gameBoard[row][col] !== ' ') {
      await button.reply({ content: 'Cell already occupied! Try again.', ephemeral: true });
    } else {
      gameBoard[row][col] = currentPlayer;
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      await button.deferUpdate();

      if (isSinglePlayer && currentPlayer === 'O') {
        makeBotMove();
        currentPlayer = 'X';
      }

      const newEmbed = new EmbedBuilder()
        .setTitle('Tic-Tac-Toe Game Board')
        .setDescription(getBoardString())
        .setColor(0x0000FF); // Use hexadecimal for blue
      await gameMessage.edit({ embeds: [newEmbed], components: [getRowComponents(gameBoard, 0), getRowComponents(gameBoard, 1), getRowComponents(gameBoard, 2)] });

      checkWin(interaction);
    }
  });
}

function getBoardString() {
  return `${gameBoard[0].join(' | ')}
---+---+---
${gameBoard[1].join(' | ')}
---+---+---
${gameBoard[2].join(' | ')}`;
}

function getRowComponents(board, row) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`${row} 0`)
        .setLabel(board[row][0] === ' ' ? '\u200B' : board[row][0]) // Use Zero Width Space for empty labels
        .setStyle(board[row][0] === ' ' ? ButtonStyle.Secondary : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${row} 1`)
        .setLabel(board[row][1] === ' ' ? '\u200B' : board[row][1]) // Use Zero Width Space for empty labels
        .setStyle(board[row][1] === ' ' ? ButtonStyle.Secondary : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${row} 2`)
        .setLabel(board[row][2] === ' ' ? '\u200B' : board[row][2]) // Use Zero Width Space for empty labels
        .setStyle(board[row][2] === ' ' ? ButtonStyle.Secondary : ButtonStyle.Success)
    );
}

function checkWin(interaction) {
  for (let i = 0; i < 3; i++) {
    if (gameBoard[i][0] === gameBoard[i][1] && gameBoard[i][1] === gameBoard[i][2] && gameBoard[i][0] !== ' ') {
      interaction.followUp(`Player ${gameBoard[i][0]} wins!`);
      resetGame();
      return;
    }
    if (gameBoard[0][i] === gameBoard[1][i] && gameBoard[1][i] === gameBoard[2][i] && gameBoard[0][i] !== ' ') {
      interaction.followUp(`Player ${gameBoard[0][i]} wins!`);
      resetGame();
      return;
    }
  }
  if (gameBoard[0][0] === gameBoard[1][1] && gameBoard[1][1] === gameBoard[2][2] && gameBoard[0][0] !== ' ') {
    interaction.followUp(`Player ${gameBoard[0][0]} wins!`);
    resetGame();
    return;
  }
  if (gameBoard[0][2] === gameBoard[1][1] && gameBoard[1][1] === gameBoard[2][0] && gameBoard[0][2] !== ' ') {
    interaction.followUp(`Player ${gameBoard[0][2]} wins!`);
    resetGame();
    return;
  }
  if (isDraw()) {
    interaction.followUp('The game is a draw!');
    resetGame();
  }
}

function resetGame() {
  gameBoard = [
    [' ', ' ', ' '],
    [' ', ' ', ' '],
    [' ', ' ', ' ']
  ];
  currentPlayer = 'X';
}

function makeBotMove() {
  const emptyCells = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (gameBoard[row][col] === ' ') {
        emptyCells.push({ row, col });
      }
    }
  }

  if (botDifficulty === 'easy') {
    const move = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    gameBoard[move.row][move.col] = 'O';
  } else if (botDifficulty === 'medium') {
    if (Math.random() < 0.5) {
      const move = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      gameBoard[move.row][move.col] = 'O';
    } else {
      makeStrategicMove();
    }
  } else if (botDifficulty === 'hard') {
    makeBestMove();
  }
}

function makeStrategicMove() {
  const emptyCells = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (gameBoard[row][col] === ' ') {
        emptyCells.push({ row, col });
      }
    }
  }

  for (let cell of emptyCells) {
    const { row, col } = cell;
    gameBoard[row][col] = 'O';
    if (checkPotentialWin('O')) {
      return;
    }
    gameBoard[row][col] = ' ';
  }

  for (let cell of emptyCells) {
    const { row, col } = cell;
    gameBoard[row][col] = 'X';
    if (checkPotentialWin('X')) {
      gameBoard[row][col] = 'O';
      return;
    }
    gameBoard[row][col] = ' ';
  }

  const move = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  gameBoard[move.row][move.col] = 'O';
}

function makeBestMove() {
  let bestScore = -Infinity;
  let move;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (gameBoard[row][col] === ' ') {
        gameBoard[row][col] = 'O';
        let score = minimax(gameBoard, 0, false);
        gameBoard[row][col] = ' ';
        if (score > bestScore) {
          bestScore = score;
          move = { row, col };
        }
      }
    }
  }
  gameBoard[move.row][move.col] = 'O';
}

function minimax(board, depth, isMaximizing) {
  const winner = checkPotentialWin('O') ? 'O' : checkPotentialWin('X') ? 'X' : null;
  if (winner === 'O') return 1;
  if (winner === 'X') return -1;
  if (isDraw()) return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (board[row][col] === ' ') {
          board[row][col] = 'O';
          let score = minimax(board, depth + 1, false);
          board[row][col] = ' ';
          bestScore = Math.max(score, bestScore);
        }
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (board[row][col] === ' ') {
          board[row][col] = 'X';
          let score = minimax(board, depth + 1, true);
          board[row][col] = ' ';
          bestScore = Math.min(score, bestScore);
        }
      }
    }
    return bestScore;
  }
}

function checkPotentialWin(player) {
  for (let i = 0; i < 3; i++) {
    if (gameBoard[i][0] === player && gameBoard[i][1] === player && gameBoard[i][2] === player) return true;
    if (gameBoard[0][i] === player && gameBoard[1][i] === player && gameBoard[2][i] === player) return true;
  }
  if (gameBoard[0][0] === player && gameBoard[1][1] === player && gameBoard[2][2] === player) return true;
  if (gameBoard[0][2] === player && gameBoard[1][1] === player && gameBoard[2][0] === player) return true;
  return false;
}

function isDraw() {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (gameBoard[row][col] === ' ') return false;
    }
  }
  return true;
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  try {
    if (commandName === 'solveexp') {
      const input = options.getString('input');
      try {
        const explanation = getStepByStepExplanation(input);
        await interaction.reply(explanation);
      } catch (error) {
        await interaction.reply('There was an error solving the equation. Please ensure it is correctly formatted.');
      }
    } else if (commandName === 'plot') {
      const expression = options.getString('expression');
      generateDynamicPlot(expression).then(async buffer => {
        const attachment = new AttachmentBuilder(buffer, { name: 'plot.png' });
        await interaction.reply({ files: [attachment] });
      }).catch(async error => {
        console.error(`Failed to generate plot: ${error}`);
        await interaction.reply('Failed to plot the equation.');
      });
    } else if (commandName === 'timer') {
      const durationInput = options.getString('duration');
      remainingTime = parseDuration(durationInput);

      if (remainingTime === null) {
        await interaction.reply('Invalid duration format. Please use something like "1h", "30m", "20s".');
        return;
      }

      clearInterval(timerInterval);
      timerMessage = await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Timer')
            .setDescription(`Remaining Time: ${formatTime(remainingTime)}`)
            .setColor(0x00FF00) // Green for ongoing
        ],
        components: [getTimerButtons()],
        fetchReply: true
      });

      timerInterval = setInterval(() => updateTimer(interaction), 1000);
    } else if (commandName === 'ping') {
      const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
      await interaction.editReply(`Pong! Latency is ${sent.createdTimestamp - interaction.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms.`);
    } else if (commandName === 'note') {
      await executeNoteCommand(interaction);
    } else if (commandName === 'tictactoe') {
      const mode = options.getString('mode');
      const difficulty = options.getString('difficulty');
      if (mode === 'new') {
        await newGame(interaction);
      } else if (mode === 'bot') {
        await newGame(interaction, true, difficulty);
      } else {
        await interaction.reply('To start a new game, use `/tictactoe new`. To play against a bot, use `/tictactoe bot [easy|medium|hard]`.');
      }
    } else {
      await interaction.reply("Unknown command. Try /helpbot for a list of available commands.");
    }
  } catch (error) {
    console.error(`Error in command handling: ${error}`);
    await interaction.reply(`Error processing your request: ${error.message}`);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const { customId } = interaction;

  if (!timerMessage || interaction.message.id !== timerMessage.id) return;

  if (customId === 'start') {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => updateTimer(interaction), 1000);
    await interaction.update({
      components: [getTimerButtons()]
    });
  } else if (customId === 'pause') {
    clearInterval(timerInterval);
    await interaction.update({
      components: [getTimerButtons()]
    });
  } else if (customId === 'stop') {
    clearInterval(timerInterval);
    remainingTime = 0;
    await updateTimer(interaction);
  } else if (customId === 'restart') {
    remainingTime = parseDuration(interaction.message.embeds[0].description.split(' ')[2]);
    clearInterval(timerInterval);
    timerInterval = setInterval(() => updateTimer(interaction), 1000);
    await interaction.update({
      components: [getTimerButtons()]
    });
  }
});

client.login(process.env.TOKEN); // Make sure to set your bot's token in the environment variables
