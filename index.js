require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());
const sessions = new Map();

app.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message and sessionId are required' });
  }
  const previousId = sessions.get(sessionId);

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        signal: AbortSignal.timeout(90000),
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.API_KEY,
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          input: [{ type: 'text', text: message }],
          previous_interaction_id: previousId,
        }),
      }
    );

    const data = await response.json();          // 1. read the body first

    if (!response.ok) {                          // 2. then check errors
      console.error('LLM error:', data);
      return res.status(502).json({ error: 'AI service failed' });
    }

    const output = data.steps?.find((s) => s.type === 'model_output');
    const reply = output?.content.find((c) => c.type === 'text')?.text;
    if (!reply) {
      return res.status(502).json({ error: 'No reply from AI' });
    }

    sessions.set(sessionId, data.id);            // 3. save history id
    console.log('usage:', data.usage);
    res.json({ reply });                         // 4. send once, at the end
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 