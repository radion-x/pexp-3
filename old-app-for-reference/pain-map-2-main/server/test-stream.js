const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

console.log('Testing Claude API streaming...');
console.log('API Key present:', !!process.env.CLAUDE_API_KEY);
console.log('Model:', process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022');

async function testStream() {
  try {
    const stream = anthropic.messages.stream({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: 'Say hello world and explain what you are in one sentence.' }],
    });

    stream.on('text', (text) => {
      process.stdout.write(text);
    });

    await stream.finalMessage();
    console.log('\n✅ Stream test successful!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Stream test failed:', error);
    process.exit(1);
  }
}

testStream();
